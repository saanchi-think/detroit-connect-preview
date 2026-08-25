"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  forwardDirectMessage,
  sendDirectMessage,
  setDirectConversationArchived,
  toggleDirectMessageReaction,
} from "@/lib/messages/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SUPPORTED_REACTIONS = new Set(["👍", "❤️", "😂", "🙌", "🎉"]);

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

export async function setDirectConversationArchivedAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const archived = String(formData.get("archived") ?? "") === "true";
  const requestedReturnTo = String(formData.get("returnTo") ?? "/messages");
  const returnTo =
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/messages";
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!conversationId) {
    redirect("/messages?error=That+conversation+is+not+available.");
  }

  try {
    await setDirectConversationArchived(conversationId, archived, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the conversation.";
    redirect(`/messages?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/messages");
  redirect(returnTo);
}

export async function forwardDirectMessageAction(formData: FormData) {
  const sourceMessageId = String(formData.get("sourceMessageId") ?? "").trim();
  const currentRecipientId = String(formData.get("currentRecipientId") ?? "").trim();
  const recipientProfileIds = formData
    .getAll("recipientProfileIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const returnPath = currentRecipientId
    ? `/messages/${encodeURIComponent(currentRecipientId)}`
    : "/messages";
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }
  if (!sourceMessageId || recipientProfileIds.length < 1 || recipientProfileIds.length > 10) {
    redirect(`${returnPath}?forwardError=${encodeURIComponent("Choose up to 10 people.")}`);
  }

  let result;
  try {
    result = await forwardDirectMessage(sourceMessageId, recipientProfileIds, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not forward the message.";
    redirect(`${returnPath}?forwardError=${encodeURIComponent(message)}`);
  }

  revalidatePath("/messages");
  recipientProfileIds.forEach((recipientId) => {
    revalidatePath(`/messages/${encodeURIComponent(recipientId)}`);
  });
  revalidatePath(returnPath);

  const query = new URLSearchParams({ forwarded: String(result.sentCount) });
  if (result.failedCount > 0) query.set("forwardFailed", String(result.failedCount));
  redirect(`${returnPath}?${query.toString()}`);
}

export async function toggleDirectMessageReactionAction(formData: FormData) {
  const messageId = String(formData.get("messageId") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();
  const requestedReturnTo = String(formData.get("returnTo") ?? "/messages");
  const returnTo =
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/messages";
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!messageId || !SUPPORTED_REACTIONS.has(emoji)) {
    redirect(`${returnTo}?reactionError=${encodeURIComponent("Could not save that reaction.")}`);
  }

  try {
    await toggleDirectMessageReaction(messageId, emoji, user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that reaction.";
    redirect(`${returnTo}?reactionError=${encodeURIComponent(message)}`);
  }

  revalidatePath("/messages");
  revalidatePath(returnTo);
  redirect(returnTo);
}
