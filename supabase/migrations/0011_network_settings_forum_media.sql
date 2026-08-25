alter table public.forum_posts
  add column if not exists image_urls text[] not null default '{}'::text[];

alter table public.forum_comments
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.forum_comments
set updated_at = created_at
where updated_at is null;

drop policy if exists "Authors can update their forum comments" on public.forum_comments;
drop policy if exists "Authors can update their forum comments for two minutes"
  on public.forum_comments;

create policy "Authors can update their forum comments for two minutes"
  on public.forum_comments
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and created_at >= timezone('utc', now()) - interval '2 minutes'
  )
  with check (
    author_id = (select auth.uid())
    and created_at >= timezone('utc', now()) - interval '2 minutes'
  );

create table if not exists public.user_settings (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  connection_requests boolean not null default true,
  direct_messages boolean not null default true,
  forum_replies boolean not null default true,
  recommendations boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_settings enable row level security;

drop policy if exists "Members can read their settings" on public.user_settings;
drop policy if exists "Members can create their settings" on public.user_settings;
drop policy if exists "Members can update their settings" on public.user_settings;

create policy "Members can read their settings"
  on public.user_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Members can create their settings"
  on public.user_settings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members can update their settings"
  on public.user_settings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'forum-images',
  'forum-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Forum images are publicly readable" on storage.objects;
drop policy if exists "Members can upload forum images" on storage.objects;
drop policy if exists "Members can update forum images" on storage.objects;
drop policy if exists "Members can delete forum images" on storage.objects;

create policy "Forum images are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'forum-images');

create policy "Members can upload forum images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members can update forum images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members can delete forum images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read friend recommendations" on public.profile_recommendations;

create policy "Users can read network and profile recommendations"
  on public.profile_recommendations
  for select
  to authenticated
  using (
    recommender_id = (select auth.uid())
    or exists (
      select 1
      from public.connector_profiles profile
      where profile.id = connector_profile_id
      and profile.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.friendships friendship
      where friendship.status = 'accepted'
      and (
        (
          friendship.requester_id = (select auth.uid())
          and friendship.addressee_id = recommender_id
        )
        or (
          friendship.addressee_id = (select auth.uid())
          and friendship.requester_id = recommender_id
        )
      )
    )
  );
