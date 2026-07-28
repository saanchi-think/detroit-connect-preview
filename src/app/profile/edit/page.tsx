import { redirect } from "next/navigation";
import { EditProfileForm } from "@/components/edit-profile-form";
import { getCurrentUser } from "@/lib/auth/user";
import {
  LOCAL_DEMO_USER_ID,
  getConnectorProfileById,
  getOwnedConnectorProfileId,
} from "@/lib/connectors/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function EditProfilePage() {
  const user = await getCurrentUser();

  if (isSupabaseConfigured() && !user) {
    redirect("/login?next=/profile/edit");
  }

  const ownerId = user?.id ?? LOCAL_DEMO_USER_ID;
  const profileId = await getOwnedConnectorProfileId(ownerId);

  if (!profileId) {
    redirect("/create-profile");
  }

  const profile = await getConnectorProfileById(profileId);

  if (!profile || profile.ownerId !== ownerId) {
    redirect("/create-profile");
  }

  return <EditProfileForm profile={profile} />;
}
