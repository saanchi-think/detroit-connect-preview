"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  addFriendByNameOrEmail,
  recommendConnectorToFriends,
  updateFriendRequest,
} from "@/lib/friends/repository";
import type { FriendRequestOperation } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function requireFriendsUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/friends")}`);
  }
}

function normalizeProfileRedirect(value: FormDataEntryValue | null, connectorProfileId: string) {
  const fallback = `/connectors/${connectorProfileId}`;
  const redirectTo = typeof value === "string" && value.startsWith("/") ? value : fallback;

  if (redirectTo.startsWith("//")) {
    return fallback;
  }

  const url = new URL(redirectTo, "http://detroit-connect.local");
  url.searchParams.set("recommended", "1");
  return `${url.pathname}${url.search}`;
}

export async function addFriendAction(formData: FormData) {
  const friendQuery = String(formData.get("friendQuery") ?? "").trim();
  const user = await getCurrentUser();

  requireFriendsUser(user);

  let friendId: string | null = null;
  let errorMessage = "";

  if (friendQuery) {
    try {
      friendId = (await addFriendByNameOrEmail(friendQuery, user)).friendId;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Could not send the friend request.";
    }
  }

  if (errorMessage) {
    redirect(`/friends?error=${encodeURIComponent(errorMessage)}`);
  }

  if (friendQuery && !friendId) {
    redirect("/friends?error=No+matching+member+was+found.");
  }

  revalidatePath("/friends");
  redirect(friendId ? "/friends?request=sent" : "/friends");
}

export async function updateFriendRequestAction(formData: FormData) {
  const friendId = String(formData.get("friendId") ?? "").trim();
  const operation = String(formData.get("operation") ?? "") as FriendRequestOperation;
  const user = await getCurrentUser();

  requireFriendsUser(user);

  let errorMessage = "";

  if (friendId && (operation === "accept" || operation === "decline" || operation === "cancel")) {
    try {
      await updateFriendRequest(friendId, operation, user);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Could not update the friend request.";
    }
  }

  if (errorMessage) {
    redirect(`/friends?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/friends");
  redirect("/friends");
}

export async function recommendConnectorAction(formData: FormData) {
  const connectorProfileId = String(formData.get("connectorProfileId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 280);
  const user = await getCurrentUser();

  if (!connectorProfileId) {
    redirect("/connectors");
  }

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/connectors/${connectorProfileId}`)}`);
  }

  await recommendConnectorToFriends(connectorProfileId, note, user);
  revalidatePath("/friends");
  revalidatePath(`/connectors/${connectorProfileId}`);
  redirect(normalizeProfileRedirect(formData.get("redirectTo"), connectorProfileId));
}
