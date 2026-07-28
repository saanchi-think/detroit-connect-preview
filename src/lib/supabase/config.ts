export function isSupabaseConfigured() {
  if (process.env.DETROIT_CONNECT_DATA_MODE === "local") {
    return false;
  }

  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
