-- Automatic platform-search indexing, retry controls, and private search analytics.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.platform_search_index_jobs (
  document_id uuid primary key
    references public.platform_search_documents(id) on delete cascade,
  content_hash text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'retry', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 12),
  next_attempt_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists platform_search_index_jobs_ready_idx
  on public.platform_search_index_jobs(status, next_attempt_at, created_at)
  where status in ('queued', 'retry', 'processing');

alter table public.platform_search_index_jobs enable row level security;

drop policy if exists "Admins can read search indexing jobs"
  on public.platform_search_index_jobs;
create policy "Admins can read search indexing jobs"
  on public.platform_search_index_jobs for select to authenticated
  using (public.is_admin());

create or replace function public.platform_search_document_content_hash(
  document public.platform_search_documents
)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select encode(
    extensions.digest(
      jsonb_build_object(
        'title', document.title,
        'content', document.content,
        'topics', document.topics,
        'neighborhood', document.neighborhood,
        'languages', document.languages,
        'profile_kind', document.profile_kind
      )::text,
      'sha256'
    ),
    'hex'
  );
$$;

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
    next_attempt_at,
    locked_at,
    completed_at,
    last_error,
    updated_at
  )
  values (
    new.id,
    next_content_hash,
    'queued',
    0,
    timezone('utc', now()),
    null,
    null,
    null,
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
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists platform_search_documents_enqueue_embedding
  on public.platform_search_documents;
create trigger platform_search_documents_enqueue_embedding
  after insert or update of title, content, topics, neighborhood, languages, profile_kind
  on public.platform_search_documents
  for each row execute procedure public.enqueue_platform_search_embedding();

insert into public.platform_search_index_jobs (document_id, content_hash)
select
  document.id,
  public.platform_search_document_content_hash(document)
from public.platform_search_documents document
where document.embedding is null
on conflict (document_id) do nothing;

create or replace function public.claim_platform_search_index_jobs(
  requested_count integer default 32
)
returns table (
  document_id uuid,
  content_hash text,
  attempt_count integer,
  title text,
  content text,
  topics text[],
  neighborhood text,
  languages text[]
)
language sql
security definer
set search_path = public, extensions
as $$
  with candidates as materialized (
    select job.document_id
    from public.platform_search_index_jobs job
    where (
      job.status in ('queued', 'retry')
      and job.next_attempt_at <= timezone('utc', now())
    ) or (
      job.status = 'processing'
      and job.locked_at < timezone('utc', now()) - interval '10 minutes'
    )
    order by job.next_attempt_at, job.created_at
    for update skip locked
    limit least(greatest(requested_count, 1), 64)
  ),
  claimed as (
    update public.platform_search_index_jobs job
    set
      status = 'processing',
      attempt_count = job.attempt_count + 1,
      locked_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    from candidates
    where job.document_id = candidates.document_id
    returning job.document_id, job.content_hash, job.attempt_count
  )
  select
    claimed.document_id,
    claimed.content_hash,
    claimed.attempt_count,
    document.title,
    document.content,
    document.topics,
    document.neighborhood,
    document.languages
  from claimed
  join public.platform_search_documents document
    on document.id = claimed.document_id;
$$;

create or replace function public.complete_platform_search_index_job(
  target_document_id uuid,
  expected_content_hash text,
  document_embedding extensions.vector(1536),
  embedding_model_name text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  updated_documents integer;
begin
  update public.platform_search_documents document
  set
    embedding = document_embedding,
    embedding_model = left(embedding_model_name, 100),
    indexed_at = timezone('utc', now())
  where document.id = target_document_id
    and exists (
      select 1
      from public.platform_search_index_jobs job
      where job.document_id = target_document_id
        and job.content_hash = expected_content_hash
        and job.status = 'processing'
    );

  get diagnostics updated_documents = row_count;
  if updated_documents = 0 then
    return false;
  end if;

  update public.platform_search_index_jobs
  set
    status = 'completed',
    locked_at = null,
    completed_at = timezone('utc', now()),
    last_error = null,
    updated_at = timezone('utc', now())
  where document_id = target_document_id
    and content_hash = expected_content_hash;

  return true;
end;
$$;

create or replace function public.fail_platform_search_index_job(
  target_document_id uuid,
  expected_content_hash text,
  error_detail text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  update public.platform_search_index_jobs job
  set
    status = case when job.attempt_count >= job.max_attempts then 'failed' else 'retry' end,
    next_attempt_at = case
      when job.attempt_count >= job.max_attempts then job.next_attempt_at
      else timezone('utc', now()) + make_interval(
        secs => least(
          3600,
          (15 * power(2, greatest(job.attempt_count - 1, 0)))::integer
        )
      )
    end,
    locked_at = null,
    last_error = left(error_detail, 1000),
    updated_at = timezone('utc', now())
  where job.document_id = target_document_id
    and job.content_hash = expected_content_hash
    and job.status = 'processing'
  returning job.status into next_status;

  return next_status;
end;
$$;

create or replace function public.requeue_failed_platform_search_index_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_jobs integer;
begin
  update public.platform_search_index_jobs
  set
    status = 'queued',
    attempt_count = 0,
    next_attempt_at = timezone('utc', now()),
    locked_at = null,
    completed_at = null,
    last_error = null,
    updated_at = timezone('utc', now())
  where status = 'failed';

  get diagnostics updated_jobs = row_count;
  return updated_jobs;
end;
$$;

revoke all on function public.platform_search_document_content_hash(public.platform_search_documents)
  from public, anon, authenticated;
revoke all on function public.enqueue_platform_search_embedding()
  from public, anon, authenticated;
revoke all on function public.claim_platform_search_index_jobs(integer)
  from public, anon, authenticated;
revoke all on function public.complete_platform_search_index_job(
  uuid, text, extensions.vector, text
) from public, anon, authenticated;
revoke all on function public.fail_platform_search_index_job(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.requeue_failed_platform_search_index_jobs()
  from public, anon, authenticated;

grant execute on function public.claim_platform_search_index_jobs(integer)
  to service_role;
grant execute on function public.complete_platform_search_index_job(
  uuid, text, extensions.vector, text
) to service_role;
grant execute on function public.fail_platform_search_index_job(uuid, text, text)
  to service_role;
grant execute on function public.requeue_failed_platform_search_index_jobs()
  to service_role;

create table if not exists public.search_analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete set null default auth.uid(),
  event_type text not null
    check (event_type in ('search_completed', 'result_click', 'feedback')),
  query_text text not null check (char_length(query_text) between 1 and 240),
  query_fingerprint text not null,
  result_count integer check (result_count is null or result_count >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  used_ai boolean,
  unable_to_verify boolean,
  selected_connector_id uuid references public.connector_profiles(id) on delete set null,
  feedback_value smallint check (feedback_value is null or feedback_value in (-1, 1)),
  intent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint search_analytics_event_shape check (
    (
      event_type = 'search_completed'
      and result_count is not null
      and latency_ms is not null
      and used_ai is not null
      and unable_to_verify is not null
      and selected_connector_id is null
      and feedback_value is null
    )
    or (
      event_type = 'result_click'
      and selected_connector_id is not null
      and feedback_value is null
    )
    or (
      event_type = 'feedback'
      and selected_connector_id is null
      and feedback_value is not null
    )
  )
);

create index if not exists search_analytics_events_created_idx
  on public.search_analytics_events(created_at desc);
create index if not exists search_analytics_events_query_idx
  on public.search_analytics_events(query_fingerprint, created_at desc);
create index if not exists search_analytics_events_type_idx
  on public.search_analytics_events(event_type, created_at desc);

alter table public.search_analytics_events enable row level security;

drop policy if exists "Visitors can record search analytics"
  on public.search_analytics_events;
drop policy if exists "Admins can read search analytics"
  on public.search_analytics_events;

create policy "Visitors can record search analytics"
  on public.search_analytics_events for insert to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or user_id = (select auth.uid())
  );

create policy "Admins can read search analytics"
  on public.search_analytics_events for select to authenticated
  using (public.is_admin());

create or replace function public.get_search_operations_summary(
  lookback_days integer default 7
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := timezone('utc', now()) - make_interval(
    days => least(greatest(lookback_days, 1), 90)
  );
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.';
  end if;

  select jsonb_build_object(
    'searches', count(*) filter (where event_type = 'search_completed'),
    'zeroResults', count(*) filter (
      where event_type = 'search_completed' and result_count = 0
    ),
    'resultClicks', count(*) filter (where event_type = 'result_click'),
    'averageLatencyMs', coalesce(
      round(avg(latency_ms)) filter (where event_type = 'search_completed'),
      0
    ),
    'positiveFeedback', count(*) filter (
      where event_type = 'feedback' and feedback_value = 1
    ),
    'negativeFeedback', count(*) filter (
      where event_type = 'feedback' and feedback_value = -1
    ),
    'topQueries', (
      select coalesce(jsonb_agg(to_jsonb(query_row)), '[]'::jsonb)
      from (
        select
          query_text as query,
          count(*) as searches,
          count(*) filter (where result_count = 0) as zero_results
        from public.search_analytics_events
        where event_type = 'search_completed'
          and created_at >= cutoff
        group by query_text
        order by count(*) desc, query_text
        limit 8
      ) query_row
    ),
    'indexQueue', (
      select jsonb_build_object(
        'queued', count(*) filter (where status = 'queued'),
        'processing', count(*) filter (where status = 'processing'),
        'retrying', count(*) filter (where status = 'retry'),
        'failed', count(*) filter (where status = 'failed')
      )
      from public.platform_search_index_jobs
    )
  ) into result
  from public.search_analytics_events
  where created_at >= cutoff;

  return result;
end;
$$;

revoke all on function public.get_search_operations_summary(integer)
  from public, anon;
grant execute on function public.get_search_operations_summary(integer)
  to authenticated;

comment on table public.platform_search_index_jobs is
  'Durable retry queue for semantic embeddings of Detroit Connect platform search documents.';
comment on table public.search_analytics_events is
  'Private product analytics for search quality; query text is redacted by the application before insert.';
comment on function public.get_search_operations_summary is
  'Administrator-only aggregate search and indexing health for the operations dashboard.';
