import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { KnowledgeMatch } from "@/lib/ai-search/types";

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

type KnowledgeRpcRow = {
  chunk_id: string;
  source_id: string;
  source_kind: "website" | "file";
  source_title: string;
  source_url: string | null;
  storage_path: string | null;
  heading: string | null;
  content: string;
  similarity: number;
};

async function createQueryEmbedding(query: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: query,
        model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as EmbeddingResponse;
    return payload.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function retrieveApprovedKnowledge(query: string, limit = 5): Promise<KnowledgeMatch[]> {
  if (!isSupabaseConfigured()) return [];

  const embedding = await createQueryEmbedding(query);
  if (!embedding) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      match_count: Math.min(Math.max(limit, 1), 8),
      match_threshold: 0.28,
      query_embedding: JSON.stringify(embedding),
    });

    if (error || !data) return [];

    return (data as KnowledgeRpcRow[]).map((row) => ({
      id: row.chunk_id,
      sourceId: row.source_id,
      kind: row.source_kind,
      title: row.source_title,
      href: row.source_url,
      heading: row.heading,
      content: row.content,
      similarity: row.similarity,
    }));
  } catch {
    return [];
  }
}
