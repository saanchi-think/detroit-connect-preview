create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.find_member(text) from public, anon;
grant execute on function public.find_member(text) to authenticated;

drop view if exists public.public_member_profiles;

create table public.public_member_profiles (
  id uuid primary key references public.user_profiles(id) on delete cascade,
  display_name text not null,
  avatar_url text
);

alter table public.public_member_profiles enable row level security;

create policy "Public member profiles are readable"
  on public.public_member_profiles for select
  to anon, authenticated
  using (true);

revoke all on public.public_member_profiles from public;
grant select on public.public_member_profiles to anon, authenticated;

insert into public.public_member_profiles (id, display_name, avatar_url)
select id, display_name, avatar_url
from public.user_profiles
on conflict (id) do update set
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url;

create or replace function public.sync_public_member_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.public_member_profiles (id, display_name, avatar_url)
  values (new.id, new.display_name, new.avatar_url)
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url;

  return new;
end;
$$;

revoke execute on function public.sync_public_member_profile() from public, anon, authenticated;

create trigger sync_public_member_profile
  after insert or update of display_name, avatar_url on public.user_profiles
  for each row execute procedure public.sync_public_member_profile();

drop policy if exists "Published connector profiles are public" on public.connector_profiles;
drop policy if exists "Owners can manage their connector profiles" on public.connector_profiles;

create policy "Published or owned connector profiles are readable"
  on public.connector_profiles for select
  to anon, authenticated
  using (status = 'published' or owner_id = (select auth.uid()));

create policy "Owners can create connector profiles"
  on public.connector_profiles for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can update connector profiles"
  on public.connector_profiles for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners can delete connector profiles"
  on public.connector_profiles for delete
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Users can read their own account profile" on public.user_profiles;
drop policy if exists "Users can read related account profiles" on public.user_profiles;
drop policy if exists "Users can create their own account profile" on public.user_profiles;
drop policy if exists "Users can update their own account profile" on public.user_profiles;

create policy "Users can read related account profiles"
  on public.user_profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.friendships f
      where
        (f.requester_id = (select auth.uid()) and f.addressee_id = id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = id)
    )
  );

create policy "Users can create their own account profile"
  on public.user_profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Users can update their own account profile"
  on public.user_profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Users can manage their favorites" on public.favorite_profiles;

create policy "Users can manage their favorites"
  on public.favorite_profiles for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can read accepted friendships they are part of" on public.friendships;
drop policy if exists "Users can request friendships" on public.friendships;
drop policy if exists "Addressees can accept friendship requests" on public.friendships;
drop policy if exists "Users can remove their friendship requests" on public.friendships;

create policy "Users can read friendships they are part of"
  on public.friendships for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

create policy "Users can request friendships"
  on public.friendships for insert
  to authenticated
  with check (requester_id = (select auth.uid()));

create policy "Addressees can accept friendship requests"
  on public.friendships for update
  to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

create policy "Users can remove their friendship requests"
  on public.friendships for delete
  to authenticated
  using (
    requester_id = (select auth.uid())
    or (addressee_id = (select auth.uid()) and status = 'pending')
  );

drop policy if exists "Users can read friend recommendations" on public.profile_recommendations;
drop policy if exists "Users can create recommendations" on public.profile_recommendations;
drop policy if exists "Users can update their recommendations" on public.profile_recommendations;
drop policy if exists "Users can delete their recommendations" on public.profile_recommendations;

create policy "Users can read friend recommendations"
  on public.profile_recommendations for select
  to authenticated
  using (
    recommender_id = (select auth.uid())
    or exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
      and (
        (f.requester_id = (select auth.uid()) and f.addressee_id = recommender_id)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = recommender_id)
      )
    )
  );

create policy "Users can create recommendations"
  on public.profile_recommendations for insert
  to authenticated
  with check (recommender_id = (select auth.uid()));

create policy "Users can update their recommendations"
  on public.profile_recommendations for update
  to authenticated
  using (recommender_id = (select auth.uid()))
  with check (recommender_id = (select auth.uid()));

create policy "Users can delete their recommendations"
  on public.profile_recommendations for delete
  to authenticated
  using (recommender_id = (select auth.uid()));

drop policy if exists "Forum posts are public" on public.forum_posts;
drop policy if exists "Signed in users can create forum posts" on public.forum_posts;
drop policy if exists "Authors can update their forum posts" on public.forum_posts;
drop policy if exists "Authors can delete their forum posts" on public.forum_posts;

create policy "Forum posts are public"
  on public.forum_posts for select
  to anon, authenticated
  using (true);

create policy "Signed in users can create forum posts"
  on public.forum_posts for insert
  to authenticated
  with check (author_id = (select auth.uid()));

create policy "Authors can update their forum posts"
  on public.forum_posts for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors can delete their forum posts"
  on public.forum_posts for delete
  to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "Forum comments are public" on public.forum_comments;
drop policy if exists "Signed in users can create forum comments" on public.forum_comments;
drop policy if exists "Authors can update their forum comments" on public.forum_comments;
drop policy if exists "Authors can delete their forum comments" on public.forum_comments;

create policy "Forum comments are public"
  on public.forum_comments for select
  to anon, authenticated
  using (true);

create policy "Signed in users can create forum comments"
  on public.forum_comments for insert
  to authenticated
  with check (author_id = (select auth.uid()));

create policy "Authors can update their forum comments"
  on public.forum_comments for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors can delete their forum comments"
  on public.forum_comments for delete
  to authenticated
  using (author_id = (select auth.uid()));

create index if not exists connector_profiles_owner_id_idx
  on public.connector_profiles(owner_id);
create index if not exists favorite_profiles_connector_profile_id_idx
  on public.favorite_profiles(connector_profile_id);
create index if not exists forum_comments_author_id_idx
  on public.forum_comments(author_id);
create index if not exists forum_comments_post_id_idx
  on public.forum_comments(post_id);
create index if not exists forum_posts_author_id_idx
  on public.forum_posts(author_id);
create index if not exists friendships_addressee_id_idx
  on public.friendships(addressee_id);
create index if not exists profile_recommendations_connector_profile_id_idx
  on public.profile_recommendations(connector_profile_id);
