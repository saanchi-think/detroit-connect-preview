"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { markAllNotificationsRead } from "@/lib/settings/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/notifications");
  }

  try {
    await markAllNotificationsRead(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update notifications.";
    redirect(`/notifications?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/notifications");
  redirect("/notifications?read=all");
}
