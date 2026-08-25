-- Durable notification events, read checkpoints, and optional email delivery.

alter table public.user_settings
  add column if not exists email_notifications boolean not null default false,
  add column if not exists email_digest_frequency text not null default 'daily',
  add column if not exists notifications_read_at timestamptz,
  add column if not exists last_email_digest_at timestamptz;

alter table public.user_settings
  drop constraint if exists user_settings_email_digest_frequency_check;

alter table public.user_settings
  add constraint user_settings_email_digest_frequency_check
  check (email_digest_frequency in ('immediate', 'daily', 'weekly'));

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.user_profiles(id) on delete cascade,
  actor_id uuid references public.user_profiles(id) on delete set null,
  kind text not null check (kind in ('friend', 'recommendation', 'comment', 'mention', 'message')),
  title text not null,
  detail text not null default '',
  href text not null default '/notifications',
  source_kind text not null,
  source_id text not null,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (recipient_id, source_kind, source_id)
);

create index if not exists notification_events_recipient_created_idx
  on public.notification_events (recipient_id, created_at desc);

create index if not exists notification_events_pending_email_idx
  on public.notification_events (recipient_id, created_at)
  where email_sent_at is null;

alter table public.notification_events enable row level security;

drop policy if exists "Members can read their notifications" on public.notification_events;
drop policy if exists "Members can update their notifications" on public.notification_events;

create policy "Members can read their notifications"
  on public.notification_events
  for select
  to authenticated
  using (recipient_id = (select auth.uid()));

create policy "Members can update their notifications"
  on public.notification_events
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notification_actor_name(actor_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select display_name from public.user_profiles where id = actor_user_id),
    'A Detroit Connect member'
  );
$$;

revoke all on function public.notification_actor_name(uuid) from public, anon, authenticated;

create or replace function public.record_friendship_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    actor_name := public.notification_actor_name(new.requester_id);
    insert into public.notification_events (
      recipient_id, actor_id, kind, title, detail, href, source_kind, source_id, created_at
    )
    values (
      new.addressee_id,
      new.requester_id,
      'friend',
      actor_name || ' sent you a connection request',
      'Review the request in Network.',
      '/network',
      'friend_request',
      new.requester_id::text || ':' || new.addressee_id::text,
      new.created_at
    )
    on conflict (recipient_id, source_kind, source_id) do update set
      title = excluded.title,
      detail = excluded.detail,
      read_at = null,
      email_sent_at = null,
      created_at = excluded.created_at;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'accepted' then
    actor_name := public.notification_actor_name(new.addressee_id);
    insert into public.notification_events (
      recipient_id, actor_id, kind, title, detail, href, source_kind, source_id, created_at
    )
    values (
      new.requester_id,
      new.addressee_id,
      'friend',
      actor_name || ' accepted your connection request',
      'You can now exchange messages and recommendations.',
      '/network',
      'friend_accepted',
      new.requester_id::text || ':' || new.addressee_id::text,
      new.updated_at
    )
    on conflict (recipient_id, source_kind, source_id) do update set
      title = excluded.title,
      detail = excluded.detail,
      read_at = null,
      email_sent_at = null,
      created_at = excluded.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists friendships_record_notification on public.friendships;
create trigger friendships_record_notification
  after insert or update of status on public.friendships
  for each row execute procedure public.record_friendship_notification();

create or replace function public.record_recommendation_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_owner uuid;
  profile_name text;
  actor_name text;
begin
  select owner_id, name
  into profile_owner, profile_name
  from public.connector_profiles
  where id = new.connector_profile_id;

  if profile_owner is null or profile_owner = new.recommender_id then
    return new;
  end if;

  actor_name := public.notification_actor_name(new.recommender_id);
  insert into public.notification_events (
    recipient_id, actor_id, kind, title, detail, href, source_kind, source_id, created_at
  )
  values (
    profile_owner,
    new.recommender_id,
    'recommendation',
    actor_name || ' recommended your profile',
    coalesce(nullif(trim(new.note), ''), 'A new recommendation is available.'),
    '/connectors/' || new.connector_profile_id::text,
    'profile_recommendation',
    new.id::text,
    new.created_at
  )
  on conflict (recipient_id, source_kind, source_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profile_recommendations_record_notification on public.profile_recommendations;
create trigger profile_recommendations_record_notification
  after insert on public.profile_recommendations
  for each row execute procedure public.record_recommendation_notification();

create or replace function public.record_direct_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_user_id uuid;
  actor_name text;
begin
  select
    case
      when member_one_id = new.sender_id then member_two_id
      else member_one_id
    end
  into recipient_user_id
  from public.direct_conversations
  where id = new.conversation_id;

  if recipient_user_id is null then
    return new;
  end if;

  actor_name := public.notification_actor_name(new.sender_id);
  insert into public.notification_events (
    recipient_id, actor_id, kind, title, detail, href, source_kind, source_id, created_at
  )
  values (
    recipient_user_id,
    new.sender_id,
    'message',
    actor_name || ' sent you a message',
    left(new.body, 240),
    '/messages/' || new.sender_id::text,
    'direct_message',
    new.id::text,
    new.created_at
  )
  on conflict (recipient_id, source_kind, source_id) do nothing;

  return new;
end;
$$;

drop trigger if exists direct_messages_record_notification on public.direct_messages;
create trigger direct_messages_record_notification
  after insert on public.direct_messages
  for each row execute procedure public.record_direct_message_notification();

create or replace function public.record_forum_comment_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_user_id uuid;
  actor_name text;
  post_title text;
begin
  actor_name := public.notification_actor_name(new.author_id);
  select title into post_title from public.forum_posts where id = new.post_id;

  for recipient_user_id in
    select distinct recipient_id
    from (
      select author_id as recipient_id
      from public.forum_posts
      where id = new.post_id

      union

      select author_id as recipient_id
      from public.forum_comments
      where id = new.parent_comment_id

      union

      select user_id as recipient_id
      from public.forum_post_subscriptions
      where post_id = new.post_id and status = 'following'
    ) recipients
    where recipient_id is not null and recipient_id <> new.author_id
  loop
    insert into public.notification_events (
      recipient_id, actor_id, kind, title, detail, href, source_kind, source_id, created_at
    )
    values (
      recipient_user_id,
      new.author_id,
      'comment',
      actor_name || ' replied to a conversation',
      coalesce(post_title, 'Community post') || ': ' || left(new.body, 220),
      '/forum#comment-' || new.id::text,
      'forum_comment',
      new.id::text,
      new.created_at
    )
    on conflict (recipient_id, source_kind, source_id) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists forum_comments_record_notification on public.forum_comments;
create trigger forum_comments_record_notification
  after insert on public.forum_comments
  for each row execute procedure public.record_forum_comment_notifications();

create or replace function public.record_forum_mention_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  post_title text;
begin
  if new.comment_id is not null then
    delete from public.notification_events
    where recipient_id = new.mentioned_user_id
      and source_kind = 'forum_comment'
      and source_id = new.comment_id::text;
  end if;

  actor_name := public.notification_actor_name(new.actor_id);
  select title into post_title from public.forum_posts where id = new.post_id;

  insert into public.notification_events (
    recipient_id, actor_id, kind, title, detail, href, source_kind, source_id, created_at
  )
  values (
    new.mentioned_user_id,
    new.actor_id,
    'mention',
    actor_name || ' mentioned you',
    coalesce(post_title, 'Community post'),
    case
      when new.comment_id is null then '/forum#post-' || new.post_id::text
      else '/forum#comment-' || new.comment_id::text
    end,
    'forum_mention',
    new.id::text,
    new.created_at
  )
  on conflict (recipient_id, source_kind, source_id) do nothing;

  return new;
end;
$$;

drop trigger if exists forum_mentions_record_notification on public.forum_mentions;
create trigger forum_mentions_record_notification
  after insert on public.forum_mentions
  for each row execute procedure public.record_forum_mention_notification();

create or replace function public.mark_all_notifications_read()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  read_time timestamptz := timezone('utc', now());
begin
  insert into public.user_settings (user_id, notifications_read_at, updated_at)
  values (auth.uid(), read_time, read_time)
  on conflict (user_id) do update set
    notifications_read_at = excluded.notifications_read_at,
    updated_at = excluded.updated_at;

  update public.notification_events
  set read_at = coalesce(read_at, read_time)
  where recipient_id = auth.uid()
    and read_at is null;

  return read_time;
end;
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;
