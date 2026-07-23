alter table public.connector_profiles
  add column if not exists avatar_key text
  check (avatar_key is null or avatar_key in ('tire', 'boat', 'car', 'pizza'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Detroit Connect member'
    ),
    new.email,
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.user_profiles (id, display_name, email, avatar_url)
select
  id,
  coalesce(
    nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    'Detroit Connect member'
  ),
  email,
  nullif(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do nothing;

drop policy if exists "Users can create their own account profile"
  on public.user_profiles;

create policy "Users can create their own account profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create or replace view public.public_member_profiles
with (security_barrier = true)
as
select id, display_name, avatar_url
from public.user_profiles;

revoke all on public.public_member_profiles from public;
grant select on public.public_member_profiles to anon, authenticated;

create or replace function public.find_member(search_term text)
returns table(member_id uuid, display_name text)
language sql
stable
security definer set search_path = public
as $$
  select up.id, up.display_name
  from public.user_profiles up
  where auth.uid() is not null
    and up.id <> auth.uid()
    and length(trim(search_term)) >= 2
    and (
      lower(up.email) = lower(trim(search_term))
      or up.display_name ilike '%' || trim(search_term) || '%'
    )
  order by
    case when lower(up.email) = lower(trim(search_term)) then 0 else 1 end,
    up.display_name
  limit 8;
$$;

revoke all on function public.find_member(text) from public;
grant execute on function public.find_member(text) to authenticated;

delete from public.friendships older
using public.friendships newer
where older.ctid < newer.ctid
  and least(older.requester_id, older.addressee_id) = least(newer.requester_id, newer.addressee_id)
  and greatest(older.requester_id, older.addressee_id) = greatest(newer.requester_id, newer.addressee_id);

create unique index if not exists friendships_unique_pair_idx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

drop policy if exists "Addressees can accept friendship requests"
  on public.friendships;

create policy "Addressees can accept friendship requests"
  on public.friendships for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status = 'accepted');

delete from public.profile_recommendations older
using public.profile_recommendations newer
where older.ctid < newer.ctid
  and older.recommender_id = newer.recommender_id
  and older.connector_profile_id = newer.connector_profile_id;

create unique index if not exists profile_recommendations_unique_idx
  on public.profile_recommendations (recommender_id, connector_profile_id);

create policy "Users can update their recommendations"
  on public.profile_recommendations for update
  using (auth.uid() = recommender_id)
  with check (auth.uid() = recommender_id);

create policy "Users can delete their recommendations"
  on public.profile_recommendations for delete
  using (auth.uid() = recommender_id);

create policy "Authors can update their forum posts"
  on public.forum_posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete their forum posts"
  on public.forum_posts for delete
  using (auth.uid() = author_id);

create policy "Authors can update their forum comments"
  on public.forum_comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete their forum comments"
  on public.forum_comments for delete
  using (auth.uid() = author_id);
