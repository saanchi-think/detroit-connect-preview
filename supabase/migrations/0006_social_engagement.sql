-- Forum engagement, threaded replies, and one-to-one member messages.

alter table public.forum_comments
  add column if not exists parent_comment_id uuid references public.forum_comments(id) on delete cascade;

create index if not exists forum_comments_parent_comment_id_idx
  on public.forum_comments(parent_comment_id);

create or replace function public.ensure_forum_comment_parent_matches_post()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_post_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select post_id into parent_post_id
  from public.forum_comments
  where id = new.parent_comment_id;

  if parent_post_id is null or parent_post_id <> new.post_id then
    raise exception 'Replies must belong to the same forum post.';
  end if;

  return new;
end;
$$;

drop trigger if exists forum_comments_parent_post_match on public.forum_comments;
create trigger forum_comments_parent_post_match
  before insert or update of post_id, parent_comment_id on public.forum_comments
  for each row execute procedure public.ensure_forum_comment_parent_matches_post();

create table if not exists public.forum_post_likes (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.forum_post_likes enable row level security;

drop policy if exists "Forum post likes are public"
  on public.forum_post_likes;
drop policy if exists "Members can like forum posts"
  on public.forum_post_likes;
drop policy if exists "Members can remove their own forum likes"
  on public.forum_post_likes;

create policy "Forum post likes are public"
  on public.forum_post_likes for select
  to anon, authenticated
  using (true);

create policy "Members can like forum posts"
  on public.forum_post_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members can remove their own forum likes"
  on public.forum_post_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

create index if not exists forum_post_likes_user_id_idx
  on public.forum_post_likes(user_id);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  member_one_id uuid not null references public.user_profiles(id) on delete cascade,
  member_two_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_one_id < member_two_id),
  unique (member_one_id, member_two_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create or replace function public.touch_direct_conversation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.direct_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists direct_messages_touch_conversation on public.direct_messages;
create trigger direct_messages_touch_conversation
  after insert on public.direct_messages
  for each row execute procedure public.touch_direct_conversation();

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "Members can read their direct conversations"
  on public.direct_conversations;
drop policy if exists "Members can read messages in their conversations"
  on public.direct_messages;
drop policy if exists "Members can send messages in their conversations"
  on public.direct_messages;

create policy "Members can read their direct conversations"
  on public.direct_conversations for select
  to authenticated
  using (
    member_one_id = (select auth.uid())
    or member_two_id = (select auth.uid())
  );

create policy "Members can read messages in their conversations"
  on public.direct_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.direct_conversations c
      where c.id = conversation_id
      and (c.member_one_id = (select auth.uid()) or c.member_two_id = (select auth.uid()))
    )
  );

create policy "Members can send messages in their conversations"
  on public.direct_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.direct_conversations c
      where c.id = conversation_id
      and (c.member_one_id = (select auth.uid()) or c.member_two_id = (select auth.uid()))
    )
  );

create or replace function public.start_direct_conversation(other_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member_id uuid := auth.uid();
  conversation_id uuid;
begin
  if current_member_id is null then
    raise exception 'Sign in before starting a conversation.';
  end if;

  if current_member_id = other_member_id then
    raise exception 'You cannot start a conversation with yourself.';
  end if;

  insert into public.direct_conversations (member_one_id, member_two_id)
  values (least(current_member_id, other_member_id), greatest(current_member_id, other_member_id))
  on conflict (member_one_id, member_two_id) do update
    set updated_at = public.direct_conversations.updated_at
  returning id into conversation_id;

  return conversation_id;
end;
$$;

revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

create index if not exists direct_conversations_member_one_id_idx
  on public.direct_conversations(member_one_id);
create index if not exists direct_conversations_member_two_id_idx
  on public.direct_conversations(member_two_id);
create index if not exists direct_messages_conversation_created_idx
  on public.direct_messages(conversation_id, created_at);
