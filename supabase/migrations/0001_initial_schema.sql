create extension if not exists pg_trgm;

create type public.profile_kind as enum ('person', 'vendor', 'organization');
create type public.profile_status as enum ('draft', 'pending_review', 'published', 'rejected', 'archived');
create type public.friend_status as enum ('pending', 'accepted', 'blocked');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.connector_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.user_profiles(id) on delete set null,
  kind public.profile_kind not null default 'person',
  status public.profile_status not null default 'draft',
  name text not null,
  headline text,
  bio text,
  organization_name text,
  email text,
  phone text,
  website_url text,
  preferred_contact_method text,
  neighborhood text,
  zip_code text,
  years_connected text,
  languages text[] not null default '{}',
  topics text[] not null default '{}',
  skills text[] not null default '{}',
  availability text[] not null default '{}',
  trust_badges text[] not null default '{}',
  search_document tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favorite_profiles (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  connector_profile_id uuid not null references public.connector_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, connector_profile_id)
);

create table public.friendships (
  requester_id uuid not null references public.user_profiles(id) on delete cascade,
  addressee_id uuid not null references public.user_profiles(id) on delete cascade,
  status public.friend_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.profile_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommender_id uuid not null references public.user_profiles(id) on delete cascade,
  connector_profile_id uuid not null references public.connector_profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.user_profiles(id) on delete set null,
  title text not null,
  body text not null,
  topic text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid references public.user_profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create function public.set_connector_search_document()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_document := to_tsvector(
    'english',
    concat_ws(
      ' ',
      new.name,
      new.headline,
      new.bio,
      new.organization_name,
      new.neighborhood,
      array_to_string(new.topics, ' '),
      array_to_string(new.skills, ' '),
      array_to_string(new.languages, ' ')
    )
  );

  return new;
end;
$$;

create trigger connector_profiles_search_document
  before insert or update of
    name,
    headline,
    bio,
    organization_name,
    neighborhood,
    topics,
    skills,
    languages
  on public.connector_profiles
  for each row execute procedure public.set_connector_search_document();

create index connector_profiles_status_idx on public.connector_profiles(status);
create index connector_profiles_kind_idx on public.connector_profiles(kind);
create index connector_profiles_topics_idx on public.connector_profiles using gin(topics);
create index connector_profiles_languages_idx on public.connector_profiles using gin(languages);
create index connector_profiles_search_idx on public.connector_profiles using gin(search_document);
create index connector_profiles_name_trgm_idx on public.connector_profiles using gin(name gin_trgm_ops);
create index forum_posts_topic_idx on public.forum_posts(topic);

alter table public.user_profiles enable row level security;
alter table public.connector_profiles enable row level security;
alter table public.favorite_profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.profile_recommendations enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;

create policy "Published connector profiles are public"
  on public.connector_profiles for select
  using (status = 'published');

create policy "Owners can manage their connector profiles"
  on public.connector_profiles for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can read their own account profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update their own account profile"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can manage their favorites"
  on public.favorite_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read accepted friendships they are part of"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can request friendships"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Users can update friendships they are part of"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Published recommendations are readable through public profiles"
  on public.profile_recommendations for select
  using (
    exists (
      select 1
      from public.connector_profiles cp
      where cp.id = connector_profile_id
      and cp.status = 'published'
    )
  );

create policy "Users can create recommendations"
  on public.profile_recommendations for insert
  with check (auth.uid() = recommender_id);

create policy "Forum posts are public"
  on public.forum_posts for select
  using (true);

create policy "Signed in users can create forum posts"
  on public.forum_posts for insert
  with check (auth.uid() = author_id);

create policy "Forum comments are public"
  on public.forum_comments for select
  using (true);

create policy "Signed in users can create forum comments"
  on public.forum_comments for insert
  with check (auth.uid() = author_id);
