-- Staging/test only. This creates no auth users and must not be run in production.
with fixture_values as (
  select
    array['Avery', 'Brianna', 'Caleb', 'Danielle', 'Elijah', 'Farah', 'Gabriel', 'Hana', 'Isaiah', 'Jasmine']::text[] as first_names,
    array['Adams', 'Bennett', 'Campbell', 'Davis', 'Ellis', 'Foster', 'Grant', 'Hughes', 'Irving', 'Johnson']::text[] as last_names,
    array['Midtown', 'Corktown', 'Southwest Detroit', 'Downtown', 'New Center', 'Bagley', 'East English Village', 'Rosedale Park', 'Woodbridge', 'West Village']::text[] as neighborhoods,
    array['Housing', 'Schools', 'Business', 'Moving', 'City Services', 'Finances', 'Medical', 'Legal', 'Arts & Culture', 'Jobs']::text[] as topics,
    array['New to Detroit', '1-3 years', '4-10 years', '10+ years', 'Lifelong Detroiter']::text[] as years_connected
)
insert into public.connector_profiles (
  id,
  owner_id,
  kind,
  status,
  name,
  headline,
  bio,
  organization_name,
  email,
  website_url,
  preferred_contact_method,
  neighborhood,
  zip_code,
  years_connected,
  languages,
  topics,
  skills,
  availability,
  trust_badges,
  avatar_key,
  created_at,
  updated_at
)
select
  format('f0000000-0000-4000-8000-%s', lpad(series_id::text, 12, '0'))::uuid,
  null,
  case
    when series_id % 4 = 3 then 'organization'::public.profile_kind
    else 'person'::public.profile_kind
  end,
  'published'::public.profile_status,
  case
    when series_id % 10 = 9 then format('%s Community Collective %s', neighborhoods[1 + (series_id % array_length(neighborhoods, 1))], lpad(series_id::text, 3, '0'))
    else format('%s %s %s', first_names[1 + (series_id % array_length(first_names, 1))], last_names[1 + ((series_id / array_length(first_names, 1)) % array_length(last_names, 1))], lpad(series_id::text, 3, '0'))
  end,
  format('%s connector', topics[1 + (series_id % array_length(topics, 1))]),
  format('Synthetic Detroit Connect profile for %s support in %s.', topics[1 + (series_id % array_length(topics, 1))], neighborhoods[1 + (series_id % array_length(neighborhoods, 1))]),
  case when series_id % 10 < 6 then null else format('%s Network', neighborhoods[1 + (series_id % array_length(neighborhoods, 1))]) end,
  format('profile-%s@example.test', lpad(series_id::text, 4, '0')),
  'https://example.test/detroit-connect',
  case when series_id % 3 = 0 then 'Messages' else 'Email' end,
  neighborhoods[1 + (series_id % array_length(neighborhoods, 1))],
  format('482%s', lpad(((series_id % 28) + 1)::text, 2, '0')),
  years_connected[1 + (series_id % array_length(years_connected, 1))],
  case when series_id % 5 = 0 then array['English', 'Spanish'] else array['English'] end,
  array[topics[1 + (series_id % array_length(topics, 1))]],
  array['Synthetic test data'],
  array['Messages'],
  array['Synthetic test profile'],
  case (series_id % 5) when 1 then 'tire' when 2 then 'boat' when 3 then 'car' when 4 then 'pizza' else null end,
  timestamptz '2026-01-01 12:00:00+00' + (series_id || ' days')::interval,
  timestamptz '2026-01-01 12:00:00+00' + (series_id || ' days')::interval
from generate_series(1, 1000) as fixture(series_id)
cross join fixture_values
on conflict (id) do update set
  kind = excluded.kind,
  status = excluded.status,
  name = excluded.name,
  headline = excluded.headline,
  bio = excluded.bio,
  organization_name = excluded.organization_name,
  email = excluded.email,
  website_url = excluded.website_url,
  preferred_contact_method = excluded.preferred_contact_method,
  neighborhood = excluded.neighborhood,
  zip_code = excluded.zip_code,
  years_connected = excluded.years_connected,
  languages = excluded.languages,
  topics = excluded.topics,
  skills = excluded.skills,
  availability = excluded.availability,
  trust_badges = excluded.trust_badges,
  avatar_key = excluded.avatar_key,
  updated_at = excluded.updated_at;
