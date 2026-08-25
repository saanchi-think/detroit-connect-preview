-- Repair the live enqueue function with a minimal insert that relies on table defaults.

create or replace function public.enqueue_platform_search_embedding()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  next_content_hash text;
begin
  next_content_hash := public.platform_search_document_content_hash(new);

  if tg_op = 'UPDATE'
    and public.platform_search_document_content_hash(old) = next_content_hash then
    return new;
  end if;

  update public.platform_search_documents
  set
    embedding = null,
    embedding_model = null,
    indexed_at = timezone('utc', now())
  where id = new.id
    and (embedding is not null or embedding_model is not null);

  insert into public.platform_search_index_jobs (
    document_id,
    content_hash,
    status,
    attempt_count,
    next_attempt_at
  )
  values (
    new.id,
    next_content_hash,
    'queued',
    0,
    timezone('utc', now())
  )
  on conflict (document_id) do update set
    content_hash = excluded.content_hash,
    status = 'queued',
    attempt_count = 0,
    next_attempt_at = excluded.next_attempt_at,
    locked_at = null,
    completed_at = null,
    last_error = null,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

revoke all on function public.enqueue_platform_search_embedding()
  from public, anon, authenticated;
