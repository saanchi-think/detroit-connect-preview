-- Removes only the synthetic profiles created by 1000_synthetic_connector_profiles.sql.
delete from public.connector_profiles
where id::text like 'f0000000-0000-4000-8000-%'
  and trust_badges @> array['Synthetic test profile'];
