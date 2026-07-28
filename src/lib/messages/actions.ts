"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { sendDirectMessage } from "@/lib/messages/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function sendDirectMessageAction(formData: FormData) {
  const connectorProfileId = String(formData.get("connectorProfileId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const user = await getCurrentUser();
  const returnPath = `/messages/${connectorProfileId}`;

  if (isSupabaseConfigured() && !user) redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  if (!connectorProfileId || body.length < 1 || body.length > 2000) {
    redirect(`${returnPath}?error=Write+a+short+message.`);
  }

  try {
    await sendDirectMessage(connectorProfileId, body, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the message.";
    redirect(`${returnPath}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(returnPath);
  redirect(`${returnPath}?sent=1`);
}
