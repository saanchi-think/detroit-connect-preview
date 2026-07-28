import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  LOCAL_DEMO_USER_ID,
  getOwnedConnectorProfileId,
} from "@/lib/connectors/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function MyProfilePage() {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/profile");
  }

  const profileId = await getOwnedConnectorProfileId(user?.id ?? LOCAL_DEMO_USER_ID);
  redirect(profileId ? `/connectors/${profileId}` : "/create-profile");
}
