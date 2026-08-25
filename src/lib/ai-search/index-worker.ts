import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type SearchIndexJob = {
  document_id: string;
  content_hash: string;
  attempt_count: number;
  title: string;
  content: string;
  topics: string[];
  neighborhood: string | null;
  languages: string[];
};

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[]; index?: number }>;
  error?: { message?: string };
};

export type SearchIndexWorkerResult = {
  batches: number;
  claimed: number;
  completed: number;
  retried: number;
  failed: number;
  skipped: number;
};

function embeddingInput(job: SearchIndexJob) {
  return [
    job.title,
    job.content,
    job.topics.length ? `Topics: ${job.topics.join(", ")}` : null,
    job.neighborhood ? `Neighborhood: ${job.neighborhood}` : null,
    job.languages.length ? `Languages: ${job.languages.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 12_000);
}

async function createEmbeddings(jobs: SearchIndexJob[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required to index search documents.");

  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dimensions: 1536,
      input: jobs.map(embeddingInput),
      model,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json()) as EmbeddingResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Embedding request failed (${response.status}).`);
  }

  const embeddings = [...(payload.data ?? [])]
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
    .map((item) => item.embedding);
  if (embeddings.length !== jobs.length || embeddings.some((embedding) => !embedding)) {
    throw new Error("The embedding response did not contain one vector per search document.");
  }

  return { embeddings: embeddings as number[][], model };
}

async function markFailedJobs(jobs: SearchIndexJob[], message: string) {
  const supabase = createAdminClient();
  return Promise.all(
    jobs.map(async (job) => {
      const { data, error } = await supabase.rpc("fail_platform_search_index_job", {
        error_detail: message,
        expected_content_hash: job.content_hash,
        target_document_id: job.document_id,
      });
      if (error) throw error;
      return data;
    }),
  );
}

export async function runPlatformSearchIndexWorker({
  batchSize = 32,
  maxBatches = 3,
}: {
  batchSize?: number;
  maxBatches?: number;
} = {}): Promise<SearchIndexWorkerResult> {
  const result: SearchIndexWorkerResult = {
    batches: 0,
    claimed: 0,
    completed: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
  };
  const supabase = createAdminClient();
  const normalizedBatchSize = Math.min(Math.max(batchSize, 1), 64);
  const normalizedMaxBatches = Math.min(Math.max(maxBatches, 1), 10);

  for (let batch = 0; batch < normalizedMaxBatches; batch += 1) {
    const { data, error } = await supabase.rpc("claim_platform_search_index_jobs", {
      requested_count: normalizedBatchSize,
    });
    if (error) throw new Error(`Could not claim search indexing work: ${error.message}`);

    const jobs = (data ?? []) as SearchIndexJob[];
    if (jobs.length === 0) break;
    result.batches += 1;
    result.claimed += jobs.length;

    let embeddings: number[][];
    let model: string;
    try {
      ({ embeddings, model } = await createEmbeddings(jobs));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Embedding generation failed.";
      const statuses = await markFailedJobs(jobs, message);
      result.retried += statuses.filter((status) => status === "retry").length;
      result.failed += statuses.filter((status) => status === "failed").length;
      throw error;
    }

    for (const [index, job] of jobs.entries()) {
      try {
        const { data: completed, error: completionError } = await supabase.rpc(
          "complete_platform_search_index_job",
          {
            document_embedding: JSON.stringify(embeddings[index]),
            embedding_model_name: model,
            expected_content_hash: job.content_hash,
            target_document_id: job.document_id,
          },
        );
        if (completionError) throw completionError;
        if (completed) result.completed += 1;
        else result.skipped += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not store the embedding.";
        const [status] = await markFailedJobs([job], message);
        if (status === "retry") result.retried += 1;
        if (status === "failed") result.failed += 1;
      }
    }
  }

  return result;
}
