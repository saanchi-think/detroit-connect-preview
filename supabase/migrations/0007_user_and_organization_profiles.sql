-- Detroit Connect exposes only user and organization profiles.
-- The legacy vendor enum value remains for PostgreSQL migration safety, but
-- existing vendor records are converted and new vendor records are rejected.

update public.connector_profiles
set kind = 'organization'::public.profile_kind,
    updated_at = now()
where kind = 'vendor'::public.profile_kind;

alter table public.connector_profiles
  drop constraint if exists connector_profiles_supported_kind;

alter table public.connector_profiles
  add constraint connector_profiles_supported_kind
  check (kind in ('person'::public.profile_kind, 'organization'::public.profile_kind));
