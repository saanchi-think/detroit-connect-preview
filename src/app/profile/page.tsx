import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getOwnedConnectorProfileId } from "@/lib/connectors/repository";

export default async function MyProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const profileId = await getOwnedConnectorProfileId(user.id);
  redirect(profileId ? `/connectors/${profileId}` : "/create-profile");
}
