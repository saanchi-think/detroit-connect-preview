"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  addFriendByConnectorProfileId,
  addFriendByNameOrEmail,
  recommendConnectorToFriends,
  updateFriendRequest,
} from "@/lib/friends/repository";
import type { FriendRequestOperation } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function requireFriendsUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent("/network")}`);
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

function normalizeFriendRedirect(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  const url = new URL(value, "http://detroit-connect.local");
  url.searchParams.set("friend", "sent");
  return `${url.pathname}${url.search}`;
}

export async function addFriendAction(formData: FormData) {
  const friendQuery = String(formData.get("friendQuery") ?? "").trim();
  const connectorProfileId = String(formData.get("connectorProfileId") ?? "").trim();
  const profileRedirect = normalizeFriendRedirect(formData.get("redirectTo"));
  const user = await getCurrentUser();

  requireFriendsUser(user);

  let friendId: string | null = null;
  let errorMessage = "";

  if (connectorProfileId || friendQuery) {
    try {
      friendId = connectorProfileId
        ? (await addFriendByConnectorProfileId(connectorProfileId, user)).friendId
        : (await addFriendByNameOrEmail(friendQuery, user)).friendId;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Could not send the connection request.";
    }
  }

  if (errorMessage) {
    redirect(`/network?error=${encodeURIComponent(errorMessage)}`);
  }

  if ((connectorProfileId || friendQuery) && !friendId) {
    redirect("/network?error=No+matching+member+was+found.");
  }

  revalidatePath("/friends");
  revalidatePath("/network");
  if (connectorProfileId) {
    revalidatePath(`/connectors/${connectorProfileId}`);
  }
  if (friendId && profileRedirect) {
    redirect(profileRedirect);
  }
  redirect(friendId ? "/network?request=sent" : "/network");
}

export async function updateFriendRequestAction(formData: FormData) {
  const friendId = String(formData.get("friendId") ?? "").trim();
  const operation = String(formData.get("operation") ?? "") as FriendRequestOperation;
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  const user = await getCurrentUser();

  requireFriendsUser(user);

  let errorMessage = "";

  if (
    friendId &&
    (operation === "accept" || operation === "decline" || operation === "cancel" || operation === "remove")
  ) {
    try {
      await updateFriendRequest(friendId, operation, user);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Could not update the connection request.";
    }
  }

  if (errorMessage) {
    redirect(`/network?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/friends");
  revalidatePath("/network");
  if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    revalidatePath(redirectTo);
    const url = new URL(redirectTo, "http://detroit-connect.local");
    if (operation === "remove") {
      url.searchParams.set("friend", "removed");
    }
    redirect(`${url.pathname}${url.search}`);
  }
  redirect(`/network?request=${encodeURIComponent(operation || "updated")}`);
}

export async function recommendConnectorAction(formData: FormData) {
  const connectorProfileId = String(formData.get("connectorProfileId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 50);
  const user = await getCurrentUser();

  if (!connectorProfileId) {
    redirect("/connectors");
  }

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(`/connectors/${connectorProfileId}`)}`);
  }

  await recommendConnectorToFriends(connectorProfileId, note, user);
  revalidatePath("/friends");
  revalidatePath("/network");
  revalidatePath("/favorites");
  revalidatePath(`/connectors/${connectorProfileId}`);
  redirect(normalizeProfileRedirect(formData.get("redirectTo"), connectorProfileId));
}
