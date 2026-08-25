-- Permission-aware hybrid search over Detroit Connect platform content.

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm;

create table if not exists public.platform_search_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (
    source_type in ('connector_profile', 'forum_post', 'forum_comment', 'recommendation')
  ),
  source_id uuid not null,
  parent_id uuid,
  author_id uuid references public.user_profiles(id) on delete set null,
  connector_profile_id uuid references public.connector_profiles(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'network')),
  title text not null,
  content text not null,
  href text not null,
  topics text[] not null default '{}',
  neighborhood text,
  languages text[] not null default '{}',
  profile_kind text,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  embedding_model text,
  search_document tsvector not null default ''::tsvector,
  source_updated_at timestamptz not null default timezone('utc', now()),
  indexed_at timestamptz not null default timezone('utc', now()),
  unique (source_type, source_id)
);

create index if not exists platform_search_documents_source_idx
  on public.platform_search_documents(source_type, source_id);
create index if not exists platform_search_documents_connector_idx
  on public.platform_search_documents(connector_profile_id)
  where connector_profile_id is not null;
create index if not exists platform_search_documents_author_idx
  on public.platform_search_documents(author_id)
  where author_id is not null;
create index if not exists platform_search_documents_search_idx
  on public.platform_search_documents using gin(search_document);
create index if not exists platform_search_documents_title_trgm_idx
  on public.platform_search_documents using gin(title gin_trgm_ops);
create index if not exists platform_search_documents_content_trgm_idx
  on public.platform_search_documents using gin(content gin_trgm_ops);
create index if not exists platform_search_documents_topics_idx
  on public.platform_search_documents using gin(topics);
create index if not exists platform_search_documents_languages_idx
  on public.platform_search_documents using gin(languages);
create index if not exists platform_search_documents_embedding_idx
  on public.platform_search_documents
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

alter table public.platform_search_documents enable row level security;

create or replace function public.set_platform_search_document()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_document :=
    setweight(to_tsvector('english'::regconfig, coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.content, '')), 'B') ||
    setweight(
      to_tsvector(
        'english'::regconfig,
        coalesce(new.neighborhood, '') || ' ' ||
        coalesce(array_to_string(new.topics, ' '), '') || ' ' ||
        coalesce(array_to_string(new.languages, ' '), '')
      ),
      'A'
    );
  return new;
end;
$$;

drop trigger if exists platform_search_documents_set_search on public.platform_search_documents;
create trigger platform_search_documents_set_search
  before insert or update of title, content, topics, neighborhood, languages
  on public.platform_search_documents
  for each row execute procedure public.set_platform_search_document();

create or replace function public.platform_search_actor_is_visible(target_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_author_id is null
    or auth.uid() is null
    or not exists (
      select 1
      from public.user_safety_controls control
      where
        (
          control.blocked_at is not null
          and (
            (control.actor_id = auth.uid() and control.target_id = target_author_id)
            or (control.actor_id = target_author_id and control.target_id = auth.uid())
          )
        )
        or (
          control.actor_id = auth.uid()
          and control.target_id = target_author_id
          and control.muted_at is not null
        )
    );
$$;

revoke all on function public.platform_search_actor_is_visible(uuid) from public;
grant execute on function public.platform_search_actor_is_visible(uuid) to anon, authenticated;

drop policy if exists "Anonymous users can search public platform documents"
  on public.platform_search_documents;
drop policy if exists "Members can search visible public platform documents"
  on public.platform_search_documents;
drop policy if exists "Members can search visible network recommendations"
  on public.platform_search_documents;

create policy "Anonymous users can search public platform documents"
  on public.platform_search_documents
  for select
  to anon
  using (visibility = 'public');

create policy "Members can search visible public platform documents"
  on public.platform_search_documents
  for select
  to authenticated
  using (
    visibility = 'public'
    and public.platform_search_actor_is_visible(author_id)
  );

create policy "Members can search visible network recommendations"
  on public.platform_search_documents
  for select
  to authenticated
  using (
    visibility = 'network'
    and public.platform_search_actor_is_visible(author_id)
    and (
      author_id = auth.uid()
      or exists (
        select 1
        from public.connector_profiles profile
        where profile.id = connector_profile_id
          and profile.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.friendships friendship
        where friendship.status = 'accepted'
          and (
            (friendship.requester_id = auth.uid() and friendship.addressee_id = author_id)
            or (friendship.addressee_id = auth.uid() and friendship.requester_id = author_id)
          )
      )
    )
  );

create or replace function public.upsert_connector_platform_search_document(profile_row public.connector_profiles)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if profile_row.status <> 'published' then
    delete from public.platform_search_documents
    where source_type = 'connector_profile' and source_id = profile_row.id;
    return;
  end if;

  insert into public.platform_search_documents (
    source_type,
    source_id,
    author_id,
    connector_profile_id,
    visibility,
    title,
    content,
    href,
    topics,
    neighborhood,
    languages,
    profile_kind,
    metadata,
    source_updated_at
  )
  values (
    'connector_profile',
    profile_row.id,
    profile_row.owner_id,
    profile_row.id,
    'public',
    profile_row.name,
    concat_ws(
      '. ',
      nullif(profile_row.headline, ''),
      nullif(profile_row.bio, ''),
      case when cardinality(profile_row.skills) > 0
        then 'Skills: ' || array_to_string(profile_row.skills, ', ')
      end,
      case when cardinality(profile_row.availability) > 0
        then 'Available for: ' || array_to_string(profile_row.availability, ', ')
      end
    ),
    '/connectors/' || profile_row.id::text,
    profile_row.topics,
    profile_row.neighborhood,
    profile_row.languages,
    case when profile_row.kind::text = 'vendor' then 'organization' else profile_row.kind::text end,
    jsonb_build_object('organizationName', profile_row.organization_name),
    profile_row.updated_at
  )
  on conflict (source_type, source_id) do update set
    author_id = excluded.author_id,
    connector_profile_id = excluded.connector_profile_id,
    visibility = excluded.visibility,
    title = excluded.title,
    content = excluded.content,
    href = excluded.href,
    topics = excluded.topics,
    neighborhood = excluded.neighborhood,
    languages = excluded.languages,
    profile_kind = excluded.profile_kind,
    metadata = excluded.metadata,
    source_updated_at = excluded.source_updated_at,
    embedding = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
        and public.platform_search_documents.neighborhood is not distinct from excluded.neighborhood
        and public.platform_search_documents.languages = excluded.languages
      then public.platform_search_documents.embedding
      else null
    end,
    embedding_model = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
        and public.platform_search_documents.neighborhood is not distinct from excluded.neighborhood
        and public.platform_search_documents.languages = excluded.languages
      then public.platform_search_documents.embedding_model
      else null
    end,
    indexed_at = timezone('utc', now());
end;
$$;

create or replace function public.sync_connector_platform_search_document()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.platform_search_documents
    where source_type = 'connector_profile' and source_id = old.id;
    return old;
  end if;

  perform public.upsert_connector_platform_search_document(new);
  return new;
end;
$$;

create or replace function public.sync_forum_post_platform_search_document()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.platform_search_documents
    where (source_type = 'forum_post' and source_id = old.id)
      or (source_type = 'forum_comment' and parent_id = old.id);
    return old;
  end if;

  insert into public.platform_search_documents (
    source_type,
    source_id,
    parent_id,
    author_id,
    visibility,
    title,
    content,
    href,
    topics,
    source_updated_at
  )
  values (
    'forum_post',
    new.id,
    new.id,
    new.author_id,
    'public',
    new.title,
    new.body,
    '/forum#post-' || new.id::text,
    array[new.topic],
    new.updated_at
  )
  on conflict (source_type, source_id) do update set
    parent_id = excluded.parent_id,
    author_id = excluded.author_id,
    title = excluded.title,
    content = excluded.content,
    href = excluded.href,
    topics = excluded.topics,
    source_updated_at = excluded.source_updated_at,
    embedding = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding
      else null
    end,
    embedding_model = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding_model
      else null
    end,
    indexed_at = timezone('utc', now());

  if tg_op = 'UPDATE' then
    update public.platform_search_documents document
    set
      title = 'Reply to ' || new.title,
      topics = array[new.topic],
      href = '/forum#post-' || new.id::text,
      embedding = case
        when document.title = 'Reply to ' || new.title
          and document.topics = array[new.topic]
        then document.embedding
        else null
      end,
      embedding_model = case
        when document.title = 'Reply to ' || new.title
          and document.topics = array[new.topic]
        then document.embedding_model
        else null
      end,
      source_updated_at = greatest(document.source_updated_at, new.updated_at),
      indexed_at = timezone('utc', now())
    where document.source_type = 'forum_comment'
      and document.parent_id = new.id;
  end if;

  return new;
end;
$$;

create or replace function public.sync_forum_comment_platform_search_document()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  parent_post public.forum_posts;
begin
  if tg_op = 'DELETE' then
    delete from public.platform_search_documents
    where source_type = 'forum_comment' and source_id = old.id;
    return old;
  end if;

  select * into parent_post from public.forum_posts where id = new.post_id;
  if parent_post.id is null then
    return new;
  end if;

  insert into public.platform_search_documents (
    source_type,
    source_id,
    parent_id,
    author_id,
    visibility,
    title,
    content,
    href,
    topics,
    metadata,
    source_updated_at
  )
  values (
    'forum_comment',
    new.id,
    new.post_id,
    new.author_id,
    'public',
    'Reply to ' || parent_post.title,
    new.body,
    '/forum#post-' || new.post_id::text,
    array[parent_post.topic],
    jsonb_build_object('parentCommentId', new.parent_comment_id),
    new.updated_at
  )
  on conflict (source_type, source_id) do update set
    parent_id = excluded.parent_id,
    author_id = excluded.author_id,
    title = excluded.title,
    content = excluded.content,
    href = excluded.href,
    topics = excluded.topics,
    metadata = excluded.metadata,
    source_updated_at = excluded.source_updated_at,
    embedding = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding
      else null
    end,
    embedding_model = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding_model
      else null
    end,
    indexed_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.sync_recommendation_platform_search_document()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_profile public.connector_profiles;
  recommender_name text;
begin
  if tg_op = 'DELETE' then
    delete from public.platform_search_documents
    where source_type = 'recommendation' and source_id = old.id;
    return old;
  end if;

  select * into target_profile
  from public.connector_profiles
  where id = new.connector_profile_id and status = 'published';
  if target_profile.id is null then
    delete from public.platform_search_documents
    where source_type = 'recommendation' and source_id = new.id;
    return new;
  end if;

  select display_name into recommender_name
  from public.user_profiles
  where id = new.recommender_id;

  insert into public.platform_search_documents (
    source_type,
    source_id,
    author_id,
    connector_profile_id,
    visibility,
    title,
    content,
    href,
    topics,
    neighborhood,
    languages,
    profile_kind,
    metadata,
    source_updated_at
  )
  values (
    'recommendation',
    new.id,
    new.recommender_id,
    new.connector_profile_id,
    'network',
    coalesce(recommender_name, 'A Detroit Connect member') || ' recommended ' || target_profile.name,
    concat_ws(
      '. ',
      nullif(new.note, ''),
      nullif(target_profile.headline, ''),
      case when cardinality(target_profile.topics) > 0
        then 'Topics: ' || array_to_string(target_profile.topics, ', ')
      end
    ),
    '/connectors/' || new.connector_profile_id::text,
    target_profile.topics,
    target_profile.neighborhood,
    target_profile.languages,
    case when target_profile.kind::text = 'vendor' then 'organization' else target_profile.kind::text end,
    jsonb_build_object('recommenderName', recommender_name),
    new.created_at
  )
  on conflict (source_type, source_id) do update set
    author_id = excluded.author_id,
    connector_profile_id = excluded.connector_profile_id,
    title = excluded.title,
    content = excluded.content,
    href = excluded.href,
    topics = excluded.topics,
    neighborhood = excluded.neighborhood,
    languages = excluded.languages,
    profile_kind = excluded.profile_kind,
    metadata = excluded.metadata,
    source_updated_at = excluded.source_updated_at,
    embedding = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
      then public.platform_search_documents.embedding
      else null
    end,
    embedding_model = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
      then public.platform_search_documents.embedding_model
      else null
    end,
    indexed_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists connector_profiles_sync_platform_search on public.connector_profiles;
create trigger connector_profiles_sync_platform_search
  after insert or update or delete on public.connector_profiles
  for each row execute procedure public.sync_connector_platform_search_document();

drop trigger if exists forum_posts_sync_platform_search on public.forum_posts;
create trigger forum_posts_sync_platform_search
  after insert or update or delete on public.forum_posts
  for each row execute procedure public.sync_forum_post_platform_search_document();

drop trigger if exists forum_comments_sync_platform_search on public.forum_comments;
create trigger forum_comments_sync_platform_search
  after insert or update or delete on public.forum_comments
  for each row execute procedure public.sync_forum_comment_platform_search_document();

drop trigger if exists recommendations_sync_platform_search on public.profile_recommendations;
create trigger recommendations_sync_platform_search
  after insert or update or delete on public.profile_recommendations
  for each row execute procedure public.sync_recommendation_platform_search_document();

-- Row helpers let the refresh function reuse trigger-safe indexing logic.
create or replace function public.sync_forum_post_platform_search_document_for_row(post_row public.forum_posts)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.platform_search_documents (
    source_type, source_id, parent_id, author_id, visibility, title, content, href,
    topics, source_updated_at
  ) values (
    'forum_post', post_row.id, post_row.id, post_row.author_id, 'public', post_row.title,
    post_row.body, '/forum#post-' || post_row.id::text, array[post_row.topic], post_row.updated_at
  )
  on conflict (source_type, source_id) do update set
    parent_id = excluded.parent_id,
    author_id = excluded.author_id,
    title = excluded.title,
    content = excluded.content,
    href = excluded.href,
    topics = excluded.topics,
    source_updated_at = excluded.source_updated_at,
    embedding = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding else null end,
    embedding_model = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding_model else null end,
    indexed_at = timezone('utc', now());
end;
$$;

create or replace function public.sync_forum_comment_platform_search_document_for_row(comment_row public.forum_comments)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  parent_post public.forum_posts;
begin
  select * into parent_post from public.forum_posts where id = comment_row.post_id;
  if parent_post.id is null then return; end if;

  insert into public.platform_search_documents (
    source_type, source_id, parent_id, author_id, visibility, title, content, href,
    topics, metadata, source_updated_at
  ) values (
    'forum_comment', comment_row.id, comment_row.post_id, comment_row.author_id, 'public',
    'Reply to ' || parent_post.title, comment_row.body,
    '/forum#post-' || comment_row.post_id::text, array[parent_post.topic],
    jsonb_build_object('parentCommentId', comment_row.parent_comment_id), comment_row.updated_at
  )
  on conflict (source_type, source_id) do update set
    parent_id = excluded.parent_id,
    author_id = excluded.author_id,
    title = excluded.title,
    content = excluded.content,
    href = excluded.href,
    topics = excluded.topics,
    metadata = excluded.metadata,
    source_updated_at = excluded.source_updated_at,
    embedding = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding else null end,
    embedding_model = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
        and public.platform_search_documents.topics = excluded.topics
      then public.platform_search_documents.embedding_model else null end,
    indexed_at = timezone('utc', now());
end;
$$;

create or replace function public.sync_recommendation_platform_search_document_for_row(recommendation_row public.profile_recommendations)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_profile public.connector_profiles;
  recommender_name text;
begin
  select * into target_profile
  from public.connector_profiles
  where id = recommendation_row.connector_profile_id and status = 'published';
  if target_profile.id is null then return; end if;

  select display_name into recommender_name
  from public.user_profiles where id = recommendation_row.recommender_id;

  insert into public.platform_search_documents (
    source_type, source_id, author_id, connector_profile_id, visibility, title, content,
    href, topics, neighborhood, languages, profile_kind, metadata, source_updated_at
  ) values (
    'recommendation', recommendation_row.id, recommendation_row.recommender_id,
    recommendation_row.connector_profile_id, 'network',
    coalesce(recommender_name, 'A Detroit Connect member') || ' recommended ' || target_profile.name,
    concat_ws(
      '. ', nullif(recommendation_row.note, ''), nullif(target_profile.headline, ''),
      case when cardinality(target_profile.topics) > 0
        then 'Topics: ' || array_to_string(target_profile.topics, ', ') end
    ),
    '/connectors/' || recommendation_row.connector_profile_id::text,
    target_profile.topics, target_profile.neighborhood, target_profile.languages,
    case when target_profile.kind::text = 'vendor' then 'organization' else target_profile.kind::text end,
    jsonb_build_object('recommenderName', recommender_name), recommendation_row.created_at
  )
  on conflict (source_type, source_id) do update set
    author_id = excluded.author_id,
    connector_profile_id = excluded.connector_profile_id,
    title = excluded.title,
    content = excluded.content,
    href = excluded.href,
    topics = excluded.topics,
    neighborhood = excluded.neighborhood,
    languages = excluded.languages,
    profile_kind = excluded.profile_kind,
    metadata = excluded.metadata,
    source_updated_at = excluded.source_updated_at,
    embedding = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
      then public.platform_search_documents.embedding else null end,
    embedding_model = case
      when public.platform_search_documents.title = excluded.title
        and public.platform_search_documents.content = excluded.content
      then public.platform_search_documents.embedding_model else null end,
    indexed_at = timezone('utc', now());
end;
$$;

-- Recreate refresh now that all row helpers exist.
create or replace function public.refresh_platform_search_documents()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  profile_row public.connector_profiles;
  post_row public.forum_posts;
  comment_row public.forum_comments;
  recommendation_row public.profile_recommendations;
begin
  for profile_row in select * from public.connector_profiles loop
    perform public.upsert_connector_platform_search_document(profile_row);
  end loop;
  for post_row in select * from public.forum_posts loop
    perform public.sync_forum_post_platform_search_document_for_row(post_row);
  end loop;
  for comment_row in select * from public.forum_comments loop
    perform public.sync_forum_comment_platform_search_document_for_row(comment_row);
  end loop;
  for recommendation_row in select * from public.profile_recommendations loop
    perform public.sync_recommendation_platform_search_document_for_row(recommendation_row);
  end loop;

  delete from public.platform_search_documents document
  where
    (document.source_type = 'connector_profile' and not exists (
      select 1 from public.connector_profiles profile
      where profile.id = document.source_id and profile.status = 'published'
    ))
    or (document.source_type = 'forum_post' and not exists (
      select 1 from public.forum_posts post where post.id = document.source_id
    ))
    or (document.source_type = 'forum_comment' and not exists (
      select 1 from public.forum_comments comment where comment.id = document.source_id
    ))
    or (document.source_type = 'recommendation' and not exists (
      select 1 from public.profile_recommendations recommendation where recommendation.id = document.source_id
    ));

  return jsonb_build_object(
    'documents', (select count(*) from public.platform_search_documents),
    'missingEmbeddings', (
      select count(*) from public.platform_search_documents where embedding is null
    )
  );
end;
$$;

revoke all on function public.upsert_connector_platform_search_document(public.connector_profiles) from public;
revoke all on function public.set_platform_search_document() from public;
revoke all on function public.sync_connector_platform_search_document() from public;
revoke all on function public.sync_forum_post_platform_search_document() from public;
revoke all on function public.sync_forum_comment_platform_search_document() from public;
revoke all on function public.sync_recommendation_platform_search_document() from public;
revoke all on function public.sync_forum_post_platform_search_document_for_row(public.forum_posts) from public;
revoke all on function public.sync_forum_comment_platform_search_document_for_row(public.forum_comments) from public;
revoke all on function public.sync_recommendation_platform_search_document_for_row(public.profile_recommendations) from public;
revoke all on function public.refresh_platform_search_documents() from public, anon, authenticated;
grant execute on function public.refresh_platform_search_documents() to service_role;

create or replace function public.search_platform_documents(
  query_text text,
  query_embedding extensions.vector(1536) default null,
  source_types text[] default null,
  topic_filters text[] default null,
  neighborhood_filters text[] default null,
  language_filters text[] default null,
  profile_type_filter text default null,
  match_count integer default 16
)
returns table (
  document_id uuid,
  source_type text,
  source_id uuid,
  parent_id uuid,
  author_id uuid,
  connector_profile_id uuid,
  title text,
  content text,
  href text,
  topics text[],
  neighborhood text,
  languages text[],
  profile_kind text,
  metadata jsonb,
  score double precision,
  lexical_score double precision,
  semantic_score double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with query_values as (
    select
      nullif(trim(query_text), '') as cleaned_query,
      case
        when nullif(trim(query_text), '') is null then null
        else websearch_to_tsquery('english'::regconfig, trim(query_text))
      end as text_query
  ),
  ranked as (
    select
      document.*,
      case
        when query_values.text_query is null then 0::double precision
        else ts_rank_cd(document.search_document, query_values.text_query, 32)::double precision
      end as fts_score,
      case
        when query_values.cleaned_query is null then 0::double precision
        else greatest(
          similarity(lower(document.title), lower(query_values.cleaned_query)),
          similarity(lower(document.content), lower(query_values.cleaned_query))
        )::double precision
      end as typo_score,
      case
        when query_embedding is null or document.embedding is null then 0::double precision
        else (1 - (document.embedding <=> query_embedding))::double precision
      end as vector_score
    from public.platform_search_documents document
    cross join query_values
    where
      (source_types is null or document.source_type = any(source_types))
      and (topic_filters is null or document.topics && topic_filters)
      and (
        neighborhood_filters is null
        or lower(coalesce(document.neighborhood, '')) = any(
          select lower(filter_value)
          from unnest(neighborhood_filters) as neighborhood_filter(filter_value)
        )
      )
      and (
        language_filters is null
        or exists (
          select 1
          from unnest(document.languages) as document_language(value)
          cross join unnest(language_filters) as requested_language(value)
          where lower(document_language.value) = lower(requested_language.value)
        )
      )
      and (profile_type_filter is null or document.profile_kind = profile_type_filter)
  )
  select
    ranked.id,
    ranked.source_type,
    ranked.source_id,
    ranked.parent_id,
    ranked.author_id,
    ranked.connector_profile_id,
    ranked.title,
    ranked.content,
    ranked.href,
    ranked.topics,
    ranked.neighborhood,
    ranked.languages,
    ranked.profile_kind,
    ranked.metadata,
    (
      0.50 * greatest(ranked.vector_score, 0) +
      0.35 * least(ranked.fts_score * 4, 1) +
      0.15 * greatest(ranked.typo_score, 0)
    )::double precision as score,
    greatest(ranked.fts_score, ranked.typo_score)::double precision as lexical_score,
    ranked.vector_score::double precision as semantic_score
  from ranked
  where
    trim(query_text) = ''
    or ranked.fts_score > 0
    or ranked.typo_score >= 0.08
    or ranked.vector_score >= 0.22
  order by score desc, ranked.source_updated_at desc
  limit least(greatest(match_count, 1), 40);
$$;

grant execute on function public.search_platform_documents(
  text,
  extensions.vector,
  text[],
  text[],
  text[],
  text[],
  text,
  integer
) to anon, authenticated;

select public.refresh_platform_search_documents();

comment on table public.platform_search_documents is
  'Search index for public profiles and forum content plus permission-scoped recommendations.';
comment on function public.search_platform_documents is
  'Permission-aware hybrid full-text, typo-tolerant, and semantic platform search.';
