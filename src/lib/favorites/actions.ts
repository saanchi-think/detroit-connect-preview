"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { toggleFavoriteConnector } from "@/lib/favorites/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function normalizeRedirect(value: FormDataEntryValue | null) {
  const redirectTo = typeof value === "string" && value.startsWith("/") ? value : "/connectors";

  if (redirectTo.startsWith("//")) {
    return "/connectors";
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
