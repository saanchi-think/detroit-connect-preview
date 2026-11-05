"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import {
  saveAccountPrivacyPreferences,
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/settings/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function saveSettingsAction(formData: FormData) {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/settings");
  }

  try {
    const currentPreferences = await getNotificationPreferences(user);
    const requestedDigestFrequency = String(
      formData.get("digestSchedule") ?? formData.get("digestFrequency") ?? "off",
    );
    const digestFrequency =
      requestedDigestFrequency === "immediate" || requestedDigestFrequency === "weekly"
        ? requestedDigestFrequency
        : "daily";

    await saveNotificationPreferences(
      {
        connectionRequests: formData.get("connectionRequests") === "on",
        directMessages: formData.get("directMessages") === "on",
        emailNotifications: requestedDigestFrequency !== "off",
        digestFrequency,
        forumReplies: formData.get("forumReplies") === "on",
        notificationsReadAt: currentPreferences.notificationsReadAt,
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

const privacySchema = z.object({
  contactVisibility: z.enum(["members", "network", "private"]),
  messagePermission: z.enum(["members", "network", "none"]),
  profileVisibility: z.enum(["public", "members", "network"]),
});

export async function savePrivacySettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/settings");
  }

  const parsed = privacySchema.safeParse({
    contactVisibility: String(formData.get("contactVisibility") ?? "network"),
    messagePermission: String(formData.get("messagePermission") ?? "members"),
    profileVisibility: String(formData.get("profileVisibility") ?? "public"),
  });
  if (!parsed.success) {
    redirect("/settings?accountError=Choose+valid+privacy+options.#privacy-controls");
  }

  try {
    await saveAccountPrivacyPreferences(parsed.data, user);
  } catch (error) {
    redirect(`/settings?accountError=${encodeURIComponent(error instanceof Error ? error.message : "Could not save privacy settings.")}#privacy-controls`);
  }

  revalidatePath("/settings");
  revalidatePath("/connectors");
  redirect("/settings?privacy=saved#privacy-controls");
}
