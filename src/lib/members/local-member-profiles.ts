type LocalMemberProfile = {
  memberIds: string[];
  names: string[];
  profileId: string;
};

export const localMemberProfiles: LocalMemberProfile[] = [
  {
    memberIds: ["local-maria"],
    names: ["Maria Rodriguez"],
    profileId: "11111111-1111-4111-8111-000000000001",
  },
  {
    memberIds: ["local-darnell"],
    names: ["Darnell Williams"],
    profileId: "11111111-1111-4111-8111-000000000002",
  },
  {
    memberIds: ["local-aisha"],
    names: ["Aisha King"],
    profileId: "11111111-1111-4111-8111-000000000003",
  },
  {
    memberIds: ["local-amara"],
    names: ["Amara King"],
    profileId: "11111111-1111-4111-8111-000000000004",
  },
  {
    memberIds: ["local-devon"],
    names: ["Devon Taylor"],
    profileId: "11111111-1111-4111-8111-000000000005",
  },
  {
    memberIds: ["local-jalen"],
    names: ["Jalen P.", "Jalen Parker"],
    profileId: "11111111-1111-4111-8111-000000000006",
  },
  {
    memberIds: ["local-nina"],
    names: ["Nina S.", "Nina Sanders"],
    profileId: "11111111-1111-4111-8111-000000000007",
  },
  {
    memberIds: ["local-friend-nia", "local-nia"],
    names: ["Nia Patel"],
    profileId: "11111111-1111-4111-8111-000000000008",
  },
  {
    memberIds: ["local-friend-marcus", "local-marcus"],
    names: ["Marcus Bell"],
    profileId: "11111111-1111-4111-8111-000000000009",
  },
  {
    memberIds: ["local-friend-lina", "local-lina"],
    names: ["Lina Chen"],
    profileId: "11111111-1111-4111-8111-000000000010",
  },
  {
    memberIds: ["local-request-andre", "local-andre"],
    names: ["Andre Brooks"],
    profileId: "11111111-1111-4111-8111-000000000011",
  },
  {
    memberIds: ["local-priya"],
    names: ["Priya M.", "Priya Mehta"],
    profileId: "11111111-1111-4111-8111-000000000012",
  },
];

export function getLocalConnectorProfileId(memberId?: string | null, name?: string | null) {
  if (memberId === "local-dev-user") {
    return null;
  }

  return localMemberProfiles.find(
    (profile) =>
      (memberId ? profile.memberIds.includes(memberId) : false) ||
      (name ? profile.names.includes(name) : false),
  )?.profileId ?? null;
}

export function getLocalProfileHref(memberId?: string | null, name?: string | null) {
  if (memberId === "local-dev-user") {
    return "/profile";
  }

  const profileId = getLocalConnectorProfileId(memberId, name);
  return profileId ? `/connectors/${profileId}` : memberId ? `/members/${encodeURIComponent(memberId)}` : null;
}

export function getLocalMemberIdsForProfile(profileId: string) {
  return localMemberProfiles.find((profile) => profile.profileId === profileId)?.memberIds ?? [];
}
