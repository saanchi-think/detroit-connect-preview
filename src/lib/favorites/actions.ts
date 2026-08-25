"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { detroitPlaceById } from "@/lib/explore/places";
import { toggleFavoriteConnector, toggleFavoritePlace } from "@/lib/favorites/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function normalizeRedirect(value: FormDataEntryValue | null, fallback = "/connectors") {
  const redirectTo = typeof value === "string" && value.startsWith("/") ? value : fallback;

  if (redirectTo.startsWith("//")) {
    return fallback;
  }

  return redirectTo;
}

export async function toggleFavoriteAction(formData: FormData) {
  const connectorProfileId = String(formData.get("connectorProfileId") ?? "");
  const redirectTo = normalizeRedirect(formData.get("redirectTo"));

  if (!connectorProfileId) {
    redirect(redirectTo);
  }

  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
  }

  await toggleFavoriteConnector(connectorProfileId, user);
  revalidatePath("/connectors");
  revalidatePath("/favorites");
  redirect(redirectTo);
}

export async function toggleFavoritePlaceAction(placeId: string) {
  if (!detroitPlaceById[placeId]) {
    throw new Error("This Detroit place is not available.");
  }

  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/explore");
  }

  const result = await toggleFavoritePlace(placeId, user);
  revalidatePath("/explore");
  revalidatePath("/favorites");
  return result;
}

export async function toggleFavoritePlaceFormAction(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const returnTo = normalizeRedirect(formData.get("returnTo"), "/favorites");

  if (!detroitPlaceById[placeId]) {
    redirect(returnTo);
  }

  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  await toggleFavoritePlace(placeId, user);
  revalidatePath("/explore");
  revalidatePath("/favorites");
  redirect(returnTo);
}
