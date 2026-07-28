"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { saveNotificationPreferences } from "@/lib/settings/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function saveSettingsAction(formData: FormData) {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/settings");
  }

  try {
    await saveNotificationPreferences(
      {
        connectionRequests: formData.get("connectionRequests") === "on",
        directMessages: formData.get("directMessages") === "on",
        forumReplies: formData.get("forumReplies") === "on",
        recommendations: formData.get("recommendations") === "on",
      },
      user,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save settings.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/notifications");
  redirect("/settings?saved=1");
}
