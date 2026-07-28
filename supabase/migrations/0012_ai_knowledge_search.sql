create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('website', 'file')),
  title text not null,
  source_url text,
  storage_path text,
  status text not null default 'draft' check (status in ('draft', 'indexing', 'approved', 'disabled', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  last_indexed_at timestamptz,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (kind = 'website' and source_url is not null)
    or (kind = 'file' and storage_path is not null)
  )
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  heading text,
  content text not null check (length(trim(content)) > 0),
  token_count integer,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_id, chunk_index)
);

create index if not exists knowledge_chunks_source_idx
  on public.knowledge_chunks(source_id, chunk_index);

create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "Approved knowledge sources are publicly readable" on public.knowledge_sources;
drop policy if exists "Approved knowledge chunks are publicly readable" on public.knowledge_chunks;

create policy "Approved knowledge sources are publicly readable"
  on public.knowledge_sources
  for select
  to anon, authenticated
  using (status = 'approved');

create policy "Approved knowledge chunks are publicly readable"
  on public.knowledge_chunks
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.knowledge_sources source
      where source.id = source_id
      and source.status = 'approved'
    )
  );

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_threshold double precision default 0.28,
  match_count integer default 5
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_kind text,
  source_title text,
  source_url text,
  storage_path text,
  heading text,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    chunk.id as chunk_id,
    source.id as source_id,
    source.kind as source_kind,
    source.title as source_title,
    source.source_url,
    source.storage_path,
    chunk.heading,
    chunk.content,
    1 - (chunk.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks chunk
  join public.knowledge_sources source on source.id = chunk.source_id
  where
    source.status = 'approved'
    and chunk.embedding is not null
    and 1 - (chunk.embedding <=> query_embedding) >= match_threshold
  order by chunk.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 8);
$$;

grant execute on function public.match_knowledge_chunks(
  extensions.vector,
  double precision,
  integer
) to anon, authenticated;

comment on table public.knowledge_sources is
  'Administrator-approved website and file sources available to Detroit Connect search.';

comment on table public.knowledge_chunks is
  'Traceable source excerpts and embeddings used for cited semantic retrieval.';
