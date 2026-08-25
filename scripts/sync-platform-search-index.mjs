import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openAiKey = process.env.OPENAI_API_KEY;
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const temporaryIndexToken = process.env.PLATFORM_INDEX_TOKEN;

if (
  !supabaseUrl ||
  !openAiKey ||
  (!serviceRoleKey && (!anonKey || !temporaryIndexToken))
) {
  console.error(
    "Set Supabase URL, OpenAI key, and either the service-role key or the temporary index token.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey ?? anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function refreshDocuments() {
  if (!serviceRoleKey) return { mode: "temporary", refresh: "already completed" };
  const { data, error } = await supabase.rpc("refresh_platform_search_documents");
  if (error) throw new Error(`Could not refresh platform documents: ${error.message}`);
  return data;
}

async function loadMissingDocuments() {
  const pageSize = 1000;
  const documents = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("platform_search_documents")
      .select("id, title, content, topics, neighborhood, languages")
      .is("embedding", null)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not load platform documents: ${error.message}`);
    documents.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }

  return documents;
}

function embeddingText(document) {
  return [
    document.title,
    document.content,
    document.neighborhood ? `Neighborhood: ${document.neighborhood}` : "",
    document.topics?.length ? `Topics: ${document.topics.join(", ")}` : "",
    document.languages?.length ? `Languages: ${document.languages.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 12_000);
}

async function createEmbeddings(inputs) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: embeddingModel,
      input: inputs,
      dimensions: 1536,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embeddings failed (${response.status}): ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.data
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

async function updateEmbeddings(batch, embeddings) {
  if (temporaryIndexToken) {
    const updates = batch.map((document, index) => ({
      id: document.id,
      embedding: JSON.stringify(embeddings[index]),
      model: embeddingModel,
    }));
    const { error } = await supabase.rpc("temporary_set_platform_embeddings", {
      batch_token: temporaryIndexToken,
      updates,
    });
    if (error) throw new Error(`Could not save embedding batch: ${error.message}`);
    return;
  }

  for (let start = 0; start < batch.length; start += 8) {
    await Promise.all(
      batch.slice(start, start + 8).map(async (document, index) => {
        const { error } = await supabase
          .from("platform_search_documents")
          .update({
            embedding: JSON.stringify(embeddings[start + index]),
            embedding_model: embeddingModel,
            indexed_at: new Date().toISOString(),
          })
          .eq("id", document.id);
        if (error) {
          throw new Error(`Could not save embedding for ${document.id}: ${error.message}`);
        }
      }),
    );
  }
}

const refreshResult = await refreshDocuments();
const documents = await loadMissingDocuments();
console.log(`Platform documents refreshed: ${JSON.stringify(refreshResult)}`);
console.log(`Embedding ${documents.length} changed or new documents with ${embeddingModel}.`);

const batchSize = temporaryIndexToken ? 32 : 64;
for (let start = 0; start < documents.length; start += batchSize) {
  const batch = documents.slice(start, start + batchSize);
  const embeddings = await createEmbeddings(batch.map(embeddingText));
  await updateEmbeddings(batch, embeddings);

  console.log(`Indexed ${Math.min(start + batch.length, documents.length)}/${documents.length}`);
}

console.log("Platform search index is current.");
