create table if not exists public.forum_saved_posts (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, post_id)
);

create table if not exists public.forum_post_subscriptions (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  status text not null default 'following' check (status in ('following', 'muted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, post_id)
);

create table if not exists public.forum_mentions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.user_profiles(id) on delete cascade,
  mentioned_user_id uuid not null references public.user_profiles(id) on delete cascade,
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  comment_id uuid references public.forum_comments(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  check (actor_id <> mentioned_user_id)
);

create unique index if not exists forum_mentions_unique_target
  on public.forum_mentions (
    actor_id,
    mentioned_user_id,
    post_id,
    coalesce(comment_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists forum_saved_posts_user_created_idx
  on public.forum_saved_posts (user_id, created_at desc);

create index if not exists forum_post_subscriptions_user_status_idx
  on public.forum_post_subscriptions (user_id, status);

create index if not exists forum_mentions_recipient_created_idx
  on public.forum_mentions (mentioned_user_id, created_at desc);

alter table public.forum_saved_posts enable row level security;
alter table public.forum_post_subscriptions enable row level security;
alter table public.forum_mentions enable row level security;

drop policy if exists "Members can manage their saved forum posts"
  on public.forum_saved_posts;
drop policy if exists "Members can manage their forum subscriptions"
  on public.forum_post_subscriptions;
drop policy if exists "Mention participants can read mentions"
  on public.forum_mentions;
drop policy if exists "Members can create mentions"
  on public.forum_mentions;
drop policy if exists "Members can remove mentions they created"
  on public.forum_mentions;

create policy "Members can manage their saved forum posts"
  on public.forum_saved_posts
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Members can manage their forum subscriptions"
  on public.forum_post_subscriptions
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Mention participants can read mentions"
  on public.forum_mentions
  for select
  to authenticated
  using (
    actor_id = (select auth.uid())
    or mentioned_user_id = (select auth.uid())
  );

create policy "Members can create mentions"
  on public.forum_mentions
  for insert
  to authenticated
  with check (
    actor_id = (select auth.uid())
    and actor_id <> mentioned_user_id
  );

create policy "Members can remove mentions they created"
  on public.forum_mentions
  for delete
  to authenticated
  using (actor_id = (select auth.uid()));
