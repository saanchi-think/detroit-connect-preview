-- Per-member likes for forum comments and threaded replies.

create table if not exists public.forum_comment_likes (
  comment_id uuid not null references public.forum_comments(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (comment_id, user_id)
);

alter table public.forum_comment_likes enable row level security;

drop policy if exists "Forum comment likes are public" on public.forum_comment_likes;
drop policy if exists "Members can like forum comments" on public.forum_comment_likes;
drop policy if exists "Members can remove their own forum comment likes" on public.forum_comment_likes;

create policy "Forum comment likes are public"
  on public.forum_comment_likes for select
  to anon, authenticated
  using (true);

create policy "Members can like forum comments"
  on public.forum_comment_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members can remove their own forum comment likes"
  on public.forum_comment_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

create index if not exists forum_comment_likes_user_id_idx
  on public.forum_comment_likes(user_id);
