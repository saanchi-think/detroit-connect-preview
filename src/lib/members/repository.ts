import type { User } from "@supabase/supabase-js";
import { getConnectorProfileById } from "@/lib/connectors/repository";
import { getFriendById } from "@/lib/friends/repository";
import { getLocalConnectorProfileId } from "@/lib/members/local-member-profiles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type PublicMemberProfile = {
  id: string;
  name: string;
  detail: string;
  email: string | null;
  connectorProfileId: string | null;
  isFriend: boolean;
};

export async function getPublicMemberProfile(
  memberId: string,
  currentUser?: User | null,
): Promise<PublicMemberProfile | null> {
  if (!isSupabaseConfigured()) {
    const connectorProfileId = getLocalConnectorProfileId(memberId);

    if (connectorProfileId) {
      const connector = await getConnectorProfileById(connectorProfileId);

      if (connector) {
        return {
          id: memberId,
          name: connector.name,
          detail: connector.role,
          email: connector.email,
          connectorProfileId,
          isFriend: Boolean(await getFriendById(memberId, currentUser)),
        };
      }
    }

    const friend = await getFriendById(memberId, currentUser);
    return friend
      ? {
          id: memberId,
          name: friend.name,
          detail: friend.detail,
          email: friend.email,
          connectorProfileId: null,
          isFriend: true,
        }
      : null;
  }

  const supabase = await createClient();
  const [{ data: member, error: memberError }, { data: connector, error: connectorError }] =
    await Promise.all([
      supabase
        .from("public_member_profiles")
        .select("id, display_name")
        .eq("id", memberId)
        .maybeSingle(),
      supabase
        .from("connector_profiles")
        .select("id, headline")
        .eq("owner_id", memberId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (memberError || connectorError) {
    throw new Error(
      `Could not load this member profile: ${memberError?.message ?? connectorError?.message}`,
    );
  }

  if (!member) {
    return null;
  }

  const friend = currentUser ? await getFriendById(memberId, currentUser) : null;

  return {
    id: member.id,
    name: member.display_name,
    detail: connector?.headline ?? "Detroit Connect community member",
    email: null,
    connectorProfileId: connector?.id ?? null,
    isFriend: Boolean(friend),
  };
}
