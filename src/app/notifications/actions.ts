"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { setNotificationsRead } from "@/lib/notifications/repository";
import { markAllNotificationsRead } from "@/lib/settings/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function parseNotificationIds(formData: FormData) {
  try {
    const value = JSON.parse(String(formData.get("notificationIds") ?? "[]"));
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
  } catch {
    return [];
  }
}

function safeReturnTo(value: FormDataEntryValue | null, fallback = "/notifications") {
  const path = String(value ?? fallback);
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

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

export async function setNotificationReadAction(formData: FormData) {
  const user = await getCurrentUser();
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  try {
    await setNotificationsRead(
      parseNotificationIds(formData),
      String(formData.get("read")) === "true",
      user,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the notification.";
    redirect(`/notifications?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/notifications");
  redirect(returnTo);
}

export async function openNotificationAction(formData: FormData) {
  const user = await getCurrentUser();
  const href = safeReturnTo(formData.get("href"));

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(href)}`);
  }

  try {
    await setNotificationsRead(parseNotificationIds(formData), true, user);
  } catch {
    // Opening the destination is more important than blocking on read state.
  }

  revalidatePath("/notifications");
  redirect(href);
}
