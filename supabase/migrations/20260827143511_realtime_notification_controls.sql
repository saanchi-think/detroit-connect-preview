-- Grouped, individually manageable notifications with live Postgres Changes.

alter table public.notification_events
  add column if not exists group_key text;

create or replace function public.notification_group_key(
  event_source_kind text,
  event_source_id text,
  event_actor_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  related_id uuid;
begin
  if event_source_kind = 'direct_message' then
    return 'message:' || coalesce(event_actor_id::text, event_source_id);
  end if;

  if event_source_kind = 'forum_comment' then
    select post_id into related_id
    from public.forum_comments
    where id = event_source_id::uuid;
    return 'forum-comment:' || coalesce(related_id::text, event_source_id);
  end if;

  if event_source_kind = 'forum_mention' then
    select post_id into related_id
    from public.forum_mentions
    where id = event_source_id::uuid;
    return 'forum-mention:' || coalesce(related_id::text, event_source_id);
  end if;

  if event_source_kind = 'profile_recommendation' then
    select connector_profile_id into related_id
    from public.profile_recommendations
    where id = event_source_id::uuid;
    return 'recommendation:' || coalesce(related_id::text, event_source_id);
  end if;

  return event_source_kind || ':' || event_source_id;
exception
  when invalid_text_representation then
    return event_source_kind || ':' || event_source_id;
end;
$$;

revoke all on function public.notification_group_key(text, text, uuid)
  from public, anon, authenticated;

create or replace function public.assign_notification_group_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.group_key := public.notification_group_key(
    new.source_kind,
    new.source_id,
    new.actor_id
  );
  return new;
end;
$$;

revoke all on function public.assign_notification_group_key()
  from public, anon, authenticated;

drop trigger if exists notification_events_assign_group_key
  on public.notification_events;
create trigger notification_events_assign_group_key
  before insert or update of source_kind, source_id, actor_id
  on public.notification_events
  for each row execute procedure public.assign_notification_group_key();

update public.notification_events
set group_key = public.notification_group_key(source_kind, source_id, actor_id)
where group_key is null;

alter table public.notification_events
  alter column group_key set not null;

create index if not exists notification_events_recipient_group_created_idx
  on public.notification_events (recipient_id, group_key, created_at desc);

revoke update on table public.notification_events from authenticated;
grant select on table public.notification_events to authenticated;

create or replace function public.set_notification_read(
  target_notification_ids uuid[],
  should_be_read boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.notification_events
  set read_at = case
    when should_be_read then coalesce(read_at, timezone('utc', now()))
    else null
  end
  where recipient_id = auth.uid()
    and id = any(target_notification_ids);

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke all on function public.set_notification_read(uuid[], boolean)
  from public, anon;
grant execute on function public.set_notification_read(uuid[], boolean)
  to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notification_events'
  ) then
    alter publication supabase_realtime add table public.notification_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end;
$$;
