import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

export async function ensureUserProfile(supabase: SupabaseClient, user: User) {
  const displayName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : (user.email?.split("@")[0] ?? "Detroit Connect member");
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const { error: insertError } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      email: user.email ?? null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
      ignoreDuplicates: true,
    },
  );

  if (insertError) {
    throw new Error(`Could not create the account profile: ${insertError.message}`);
  }

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({
      email: user.email ?? null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    throw new Error(`Could not refresh the account profile: ${updateError.message}`);
  }
}
