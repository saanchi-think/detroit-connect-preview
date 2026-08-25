-- User-owned Detroit place saves from the Explore map.

create table if not exists public.favorite_places (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  place_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, place_id)
);

create index if not exists favorite_places_user_created_idx
  on public.favorite_places (user_id, created_at desc);

alter table public.favorite_places enable row level security;

drop policy if exists "Members can manage their saved places" on public.favorite_places;

create policy "Members can manage their saved places"
  on public.favorite_places
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
