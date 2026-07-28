import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getConnectorCardsByIds,
  getConnectorProfileById,
  searchConnectorCards,
  searchConnectorProfiles,
} from "@/lib/connectors/repository";
import type { ConnectorCardModel, ConnectorProfileModel } from "@/lib/connectors/types";
import type { Database, FriendStatus } from "@/lib/database.types";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import {
  getLocalConnectorProfileId,
  getLocalProfileHref,
} from "@/lib/members/local-member-profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type FriendModel = {
  id: string;
  initials: string;
  name: string;
  detail: string;
  email: string | null;
  profileHref: string;
  status: FriendStatus;
  direction: FriendDirection;
  createdAt: string;
  updatedAt: string;
};

type FriendDirection = "connected" | "incoming" | "outgoing";
type FriendRequestOperation = "accept" | "decline" | "cancel" | "remove";

type FriendRecommendationModel = {
  id: string;
  recommenderName: string;
  recommenderInitials: string;
  recommenderProfileHref: string;
  connector: ConnectorCardModel;
  note: string;
  createdAt: string;
};

type FriendsDashboard = {
  friends: FriendModel[];
  incomingRequests: FriendModel[];
  outgoingRequests: FriendModel[];
  recommendations: FriendRecommendationModel[];
};

type FriendSearchCandidate = {
  id: string;
  initials: string;
  name: string;
  role: string;
  neighborhood: string;
  profileHref: string;
  relationship: FriendDirection | "none";
  canRequest: boolean;
};

type ProfileRelationshipStatus =
  | "self"
  | "friends"
  | "incoming"
  | "outgoing"
  | "none"
  | "unavailable";

type ProfileSocialPerson = {
  id: string;
  name: string;
  role: string;
  neighborhood: string;
  profileHref: string;
  avatarKey: ConnectorCardModel["avatarKey"];
  avatarUrl: ConnectorCardModel["avatarUrl"];
  note: string | null;
  isMutualFriend: boolean;
};

type ProfileSocialContext = {
  relationship: ProfileRelationshipStatus;
  relationshipId: string | null;
  friends: ProfileSocialPerson[];
  recommendedBy: ProfileSocialPerson[];
  recommendations: ConnectorCardModel[];
  mutualFriendCount: number;
};

type LocalFriendRecord = {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  detail: string;
  status: FriendStatus;
  direction?: "incoming" | "outgoing";
  created_at: string;
  updated_at: string;
};

type LocalRecommendationRecord = {
  id: string;
  user_id: string;
  recommender_name: string;
  connector_profile_id: string;
  note: string;
  created_at: string;
};

type SupabaseFriendshipRow = Pick<
  Database["public"]["Tables"]["friendships"]["Row"],
  "requester_id" | "addressee_id" | "status" | "created_at" | "updated_at"
>;

type SupabaseUserProfileRow = Pick<
  Database["public"]["Tables"]["user_profiles"]["Row"],
  "id" | "display_name" | "email"
>;

type SupabaseRecommendationRow = Pick<
  Database["public"]["Tables"]["profile_recommendations"]["Row"],
  "id" | "recommender_id" | "connector_profile_id" | "note" | "created_at"
>;

const LOCAL_FRIENDS_PATH = getLocalDataPath("local-dev-friends.json");
const LOCAL_RECOMMENDATIONS_PATH = getLocalDataPath("local-dev-recommendations.json");
const LOCAL_DEV_USER_ID = "local-dev-user";

const defaultFriends: LocalFriendRecord[] = [
  {
    id: "local-friend-nia",
    user_id: LOCAL_DEV_USER_ID,
    display_name: "Nia Patel",
    email: "nia.patel@example.com",
    detail: "Midtown resident",
    status: "accepted",
    created_at: "2026-07-01T14:00:00.000Z",
    updated_at: "2026-07-01T14:00:00.000Z",
  },
  {
    id: "local-friend-marcus",
    user_id: LOCAL_DEV_USER_ID,
    display_name: "Marcus Bell",
    email: "marcus.bell@example.com",
    detail: "Bagley homeowner",
    status: "accepted",
    created_at: "2026-07-02T14:00:00.000Z",
    updated_at: "2026-07-02T14:00:00.000Z",
  },
  {
    id: "local-friend-lina",
    user_id: LOCAL_DEV_USER_ID,
    display_name: "Lina Chen",
    email: "lina.chen@example.com",
    detail: "Corktown business owner",
    status: "accepted",
    created_at: "2026-07-03T14:00:00.000Z",
    updated_at: "2026-07-03T14:00:00.000Z",
  },
  {
    id: "local-request-andre",
    user_id: LOCAL_DEV_USER_ID,
    display_name: "Andre Brooks",
    email: "andre.brooks@example.com",
    detail: "East English Village resident",
    status: "pending",
    direction: "incoming",
    created_at: "2026-07-07T14:00:00.000Z",
    updated_at: "2026-07-07T14:00:00.000Z",
  },
];

const defaultRecommendations: LocalRecommendationRecord[] = [
  {
    id: "local-recommendation-maria",
    user_id: LOCAL_DEV_USER_ID,
    recommender_name: "Nia Patel",
    connector_profile_id: "11111111-1111-4111-8111-000000000001",
    note: "Helpful for comparing housing options, schools, and Southwest Detroit blocks.",
    created_at: "2026-07-04T14:00:00.000Z",
  },
  {
    id: "local-recommendation-darnell",
    user_id: LOCAL_DEV_USER_ID,
    recommender_name: "Marcus Bell",
    connector_profile_id: "11111111-1111-4111-8111-000000000002",
    note: "Fast, practical answers for utilities, moving logistics, and city services.",
    created_at: "2026-07-05T14:00:00.000Z",
  },
  {
    id: "local-recommendation-aisha",
    user_id: LOCAL_DEV_USER_ID,
    recommender_name: "Lina Chen",
    connector_profile_id: "11111111-1111-4111-8111-000000000003",
    note: "Strong guide for permits, small business setup, and local referrals.",
    created_at: "2026-07-06T14:00:00.000Z",
  },
];

function friendsUserId() {
  return LOCAL_DEV_USER_ID;
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "DC";
}

function normalizeFriendQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "Detroit friend";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function localFriendToModel(friend: LocalFriendRecord): FriendModel {
  return {
    id: friend.id,
    initials: getInitials(friend.display_name),
    name: friend.display_name,
    detail: friend.detail,
    email: friend.email,
    profileHref: getLocalProfileHref(friend.id, friend.display_name) ?? `/members/${encodeURIComponent(friend.id)}`,
    status: friend.status,
    direction: friend.status === "accepted" ? "connected" : (friend.direction ?? "outgoing"),
    createdAt: friend.created_at,
    updatedAt: friend.updated_at,
  };
}

function emptyProfileSocialContext(
  relationship: ProfileRelationshipStatus = "unavailable",
): ProfileSocialContext {
  return {
    relationship,
    relationshipId: null,
    friends: [],
    recommendedBy: [],
    recommendations: [],
    mutualFriendCount: 0,
  };
}

function cardToSocialPerson(
  connector: ConnectorCardModel,
  options: { note?: string | null; isMutualFriend?: boolean } = {},
): ProfileSocialPerson {
  return {
    id: connector.id,
    name: connector.name,
    role: connector.role,
    neighborhood: connector.neighborhood,
    profileHref: `/connectors/${connector.id}`,
    avatarKey: connector.avatarKey,
    avatarUrl: connector.avatarUrl,
    note: options.note ?? null,
    isMutualFriend: options.isMutualFriend ?? false,
  };
}

function deterministicStart(value: string, size: number) {
  if (size === 0) return 0;
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % size;
}

function rotatedProfiles(
  profiles: ConnectorCardModel[],
  currentProfileId: string,
  count: number,
  offset: number,
) {
  const candidates = profiles.filter((profile) => profile.id !== currentProfileId);

  if (candidates.length === 0) return [];

  const start = (deterministicStart(currentProfileId, candidates.length) + offset) % candidates.length;
  return Array.from({ length: Math.min(count, candidates.length) }, (_, index) =>
    candidates[(start + index) % candidates.length],
  );
}

async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    await writeJsonFile(filePath, fallback);
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, records: T) {
  await writeLocalJson(filePath, records);
}

async function readLocalFriends() {
  return readJsonFile<LocalFriendRecord[]>(LOCAL_FRIENDS_PATH, defaultFriends);
}

async function writeLocalFriends(records: LocalFriendRecord[]) {
  await writeJsonFile(LOCAL_FRIENDS_PATH, records);
}

async function readLocalRecommendations() {
  return readJsonFile<LocalRecommendationRecord[]>(LOCAL_RECOMMENDATIONS_PATH, defaultRecommendations);
}

async function writeLocalRecommendations(records: LocalRecommendationRecord[]) {
  await writeJsonFile(LOCAL_RECOMMENDATIONS_PATH, records);
}

async function getLocalDashboard(): Promise<FriendsDashboard> {
  const userId = friendsUserId();
  const relationships = (await readLocalFriends())
    .filter((friend) => friend.user_id === userId)
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .map(localFriendToModel);
  const acceptedFriendNames = new Set(
    relationships
      .filter((friend) => friend.direction === "connected")
      .map((friend) => friend.name),
  );
  const recommendationRecords = (await readLocalRecommendations())
    .filter(
      (recommendation) =>
        recommendation.user_id === userId &&
        acceptedFriendNames.has(recommendation.recommender_name),
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
  const connectors = await getConnectorCardsByIds(
    recommendationRecords.map((recommendation) => recommendation.connector_profile_id),
  );
  const connectorsById = new Map(connectors.map((connector) => [connector.id, connector]));

  return {
    friends: relationships.filter((friend) => friend.direction === "connected"),
    incomingRequests: relationships.filter((friend) => friend.direction === "incoming"),
    outgoingRequests: relationships.filter((friend) => friend.direction === "outgoing"),
    recommendations: recommendationRecords.flatMap((recommendation) => {
      const connector = connectorsById.get(recommendation.connector_profile_id);

      if (!connector) {
        return [];
      }

      return {
        id: recommendation.id,
        recommenderName: recommendation.recommender_name,
        recommenderInitials: getInitials(recommendation.recommender_name),
        recommenderProfileHref:
          getLocalProfileHref(null, recommendation.recommender_name) ?? "/network",
        connector,
        note: recommendation.note,
        createdAt: recommendation.created_at,
      };
    }),
  };
}

async function getUserProfilesById(ids: string[], userClient?: SupabaseClient) {
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0) {
    return new Map<string, SupabaseUserProfileRow>();
  }

  if (!userClient) {
    return new Map<string, SupabaseUserProfileRow>();
  }

  const { data, error } = await userClient
    .from("user_profiles")
    .select("id, display_name, email")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(`Could not load friend profiles: ${error.message}`);
  }

  const profiles = data as SupabaseUserProfileRow[];
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

async function getConnectorProfileIdsByOwner(ids: string[], userClient?: SupabaseClient) {
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length === 0 || !userClient) {
    return new Map<string, string>();
  }

  const { data, error } = await userClient
    .from("connector_profiles")
    .select("id, owner_id")
    .in("owner_id", uniqueIds)
    .eq("status", "published");

  if (error) {
    throw new Error(`Could not load member connector profiles: ${error.message}`);
  }

  return new Map(
    (data ?? []).flatMap((profile) =>
      profile.owner_id ? [[profile.owner_id, profile.id] as const] : [],
    ),
  );
}

async function getSupabaseDashboard(user?: User | null): Promise<FriendsDashboard | null> {
  if (!isSupabaseConfigured() || !user) {
    return null;
  }

  try {
    const supabase = (await createClient()) as SupabaseClient;
    const { data, error } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id, status, created_at, updated_at")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Could not load friendships: ${error.message}`);
    }

    const friendshipRows = (data ?? []) as SupabaseFriendshipRow[];
    const friendIds = friendshipRows.map((friendship) =>
      friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id,
    );
    const [profileMap, connectorProfileIdsByOwner] = await Promise.all([
      getUserProfilesById(friendIds, supabase),
      getConnectorProfileIdsByOwner(friendIds, supabase),
    ]);
    const relationships = friendshipRows.flatMap((friendship) => {
      const friendId = friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id;
      const profile = profileMap.get(friendId);
      const name = profile?.display_name ?? "Detroit Connect member";

      if (friendship.status === "blocked") {
        return [];
      }

      const direction: FriendDirection =
        friendship.status === "accepted"
          ? "connected"
          : friendship.addressee_id === user.id
            ? "incoming"
            : "outgoing";

      return {
        id: friendId,
        initials: getInitials(name),
        name,
        detail: friendship.status === "accepted" ? "Connected friend" : "Pending connection",
        email: profile?.email ?? null,
        profileHref: connectorProfileIdsByOwner.get(friendId)
          ? `/connectors/${connectorProfileIdsByOwner.get(friendId)}`
          : `/members/${friendId}`,
        status: friendship.status,
        direction,
        createdAt: friendship.created_at,
        updatedAt: friendship.updated_at,
      };
    });
    const friends = relationships.filter((friend) => friend.direction === "connected");
    const incomingRequests = relationships.filter((friend) => friend.direction === "incoming");
    const outgoingRequests = relationships.filter((friend) => friend.direction === "outgoing");
    const acceptedFriendIds = friendshipRows
      .filter((friendship) => friendship.status === "accepted")
      .map((friendship) => (friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id));

    if (acceptedFriendIds.length === 0) {
      return { friends, incomingRequests, outgoingRequests, recommendations: [] };
    }

    const { data: recommendationData, error: recommendationError } = await supabase
      .from("profile_recommendations")
      .select("id, recommender_id, connector_profile_id, note, created_at")
      .in("recommender_id", acceptedFriendIds)
      .order("created_at", { ascending: false })
      .limit(12);

    if (recommendationError) {
      throw new Error(`Could not load friend recommendations: ${recommendationError.message}`);
    }

    const recommendationRows = (recommendationData ?? []) as SupabaseRecommendationRow[];
    const connectors = await getConnectorCardsByIds(
      recommendationRows.map((recommendation) => recommendation.connector_profile_id),
    );
    const connectorsById = new Map(connectors.map((connector) => [connector.id, connector]));

    return {
      friends,
      incomingRequests,
      outgoingRequests,
      recommendations: recommendationRows.flatMap((recommendation) => {
        const connector = connectorsById.get(recommendation.connector_profile_id);
        const recommender = profileMap.get(recommendation.recommender_id);
        const recommenderName = recommender?.display_name ?? "A friend";

        if (!connector) {
          return [];
        }

        return {
          id: recommendation.id,
          recommenderName,
          recommenderInitials: getInitials(recommenderName),
          recommenderProfileHref: connectorProfileIdsByOwner.get(recommendation.recommender_id)
            ? `/connectors/${connectorProfileIdsByOwner.get(recommendation.recommender_id)}`
            : `/members/${recommendation.recommender_id}`,
          connector,
          note: recommendation.note ?? "Recommended by someone in your Detroit Connect circle.",
          createdAt: recommendation.created_at,
        };
      }),
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Could not load the friends dashboard.");
  }
}

async function addSupabaseFriend(friendQuery: string, user?: User | null) {
  if (!isSupabaseConfigured() || !user) {
    throw new Error("Sign in before adding a friend.");
  }

  const normalizedQuery = normalizeFriendQuery(friendQuery);
  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase.rpc("find_member", { search_term: normalizedQuery });

  if (error) {
    throw new Error(`Could not search members: ${error.message}`);
  }

  const friend = data?.[0];

  if (!friend) {
    return { mode: "supabase" as const, friendId: null };
  }

  const { error: friendshipError } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: friend.member_id,
    status: "pending",
  });

  if (friendshipError && friendshipError.code !== "23505") {
      throw new Error(`Could not send the connection request: ${friendshipError.message}`);
  }

  return { mode: "supabase" as const, friendId: friend.member_id };
}

async function addLocalFriend(friendQuery: string) {
  const normalizedQuery = normalizeFriendQuery(friendQuery);

  if (!normalizedQuery) {
    return { mode: "local" as const, friendId: null };
  }

  const userId = friendsUserId();
  const friends = await readLocalFriends();
  const normalizedLower = normalizedQuery.toLowerCase();
  const existing = friends.find((friend) => {
    if (friend.user_id !== userId) {
      return false;
    }

    return friend.display_name.toLowerCase() === normalizedLower || friend.email?.toLowerCase() === normalizedLower;
  });

  if (existing) {
    return { mode: "local" as const, friendId: existing.id };
  }

  const timestamp = new Date().toISOString();
  const email = isEmailLike(normalizedQuery) ? normalizedQuery : null;
  const displayName = email ? nameFromEmail(email) : normalizedQuery;
  const record: LocalFriendRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    display_name: displayName,
    email,
    detail: "Pending connection",
    status: "pending",
    direction: "outgoing",
    created_at: timestamp,
    updated_at: timestamp,
  };

  await writeLocalFriends([record, ...friends]);

  return { mode: "local" as const, friendId: record.id };
}

export async function getFriendsDashboard(user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) {
      return { friends: [], incomingRequests: [], outgoingRequests: [], recommendations: [] };
    }

    const dashboard = await getSupabaseDashboard(user);
    return dashboard ?? { friends: [], incomingRequests: [], outgoingRequests: [], recommendations: [] };
  }

  return getLocalDashboard();
}

async function getLocalProfileSocialContext(
  profile: ConnectorProfileModel,
): Promise<ProfileSocialContext> {
  if (profile.kind !== "person") {
    return emptyProfileSocialContext();
  }

  const dashboard = await getLocalDashboard();
  const relationships = [
    ...dashboard.friends,
    ...dashboard.incomingRequests,
    ...dashboard.outgoingRequests,
  ];
  const relationship = relationships.find(
    (friend) =>
      friend.name.toLowerCase() === profile.name.toLowerCase() ||
      (profile.email ? friend.email?.toLowerCase() === profile.email.toLowerCase() : false),
  );
  const relationshipStatus: ProfileRelationshipStatus =
    profile.ownerId === LOCAL_DEV_USER_ID
      ? "self"
      : relationship?.direction === "connected"
        ? "friends"
        : relationship?.direction === "incoming"
          ? "incoming"
          : relationship?.direction === "outgoing"
            ? "outgoing"
            : "none";

  const [personProfiles, recommendableProfiles] = await Promise.all([
    searchConnectorCards({ type: "person", pageSize: 24 }),
    searchConnectorCards({ pageSize: 24 }),
  ]);
  const knownFriendIds = dashboard.friends.flatMap((friend) => {
    const connectorProfileId = getLocalConnectorProfileId(friend.id, friend.name);
    return connectorProfileId ? [connectorProfileId] : [];
  });
  const knownFriendCards = await getConnectorCardsByIds(knownFriendIds);
  const generatedFriends = rotatedProfiles(personProfiles, profile.id, 6, 0);
  const friendCards = Array.from(
    new Map(
      [...knownFriendCards.slice(0, 2), ...generatedFriends]
        .filter((friend) => friend.id !== profile.id)
        .map((friend) => [friend.id, friend]),
    ).values(),
  ).slice(0, 6);
  const viewerFriendNames = new Set(dashboard.friends.map((friend) => friend.name.toLowerCase()));
  const friends = friendCards.map((friend) =>
    cardToSocialPerson(friend, {
      isMutualFriend: viewerFriendNames.has(friend.name.toLowerCase()),
    }),
  );

  const recommendationRecords = (await readLocalRecommendations())
    .filter((recommendation) => recommendation.connector_profile_id === profile.id)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
  const recommenderProfileIds = recommendationRecords.flatMap((recommendation) => {
    const connectorProfileId = getLocalConnectorProfileId(null, recommendation.recommender_name);
    return connectorProfileId ? [connectorProfileId] : [];
  });
  const recommenderCards = await getConnectorCardsByIds(recommenderProfileIds);
  const recommenderCardsByName = new Map(
    recommenderCards.map((connector) => [connector.name.toLowerCase(), connector]),
  );
  const recordedRecommenders = recommendationRecords.map((recommendation) => {
    const recommender = recommenderCardsByName.get(recommendation.recommender_name.toLowerCase());

    if (recommender) {
      return cardToSocialPerson(recommender, {
        note: recommendation.note,
        isMutualFriend: viewerFriendNames.has(recommender.name.toLowerCase()),
      });
    }

    return {
      id: recommendation.id,
      name: recommendation.recommender_name,
      role: recommendation.recommender_name === "You" ? "Your profile" : "Detroit Connect member",
      neighborhood: "Detroit",
      profileHref: recommendation.recommender_name === "You" ? "/profile" : "/network",
      avatarKey: null,
      avatarUrl: null,
      note: recommendation.note,
      isMutualFriend: recommendation.recommender_name === "You",
    };
  });
  const recommendedBy =
    recordedRecommenders.length > 0
      ? recordedRecommenders
      : friends.slice(0, 2).map((friend) => ({
          ...friend,
          note: `Recommended ${profile.name} to their Detroit Connect circle.`,
        }));
  const recommendations = rotatedProfiles(recommendableProfiles, profile.id, 4, 8);

  return {
    relationship: relationshipStatus,
    relationshipId: relationship?.id ?? null,
    friends,
    recommendedBy,
    recommendations,
    mutualFriendCount: friends.filter((friend) => friend.isMutualFriend).length,
  };
}

type SupabaseSocialPersonPayload = {
  connector_profile_id?: string | null;
  member_id?: string | null;
  name?: string | null;
  role?: string | null;
  neighborhood?: string | null;
  avatar_key?: ConnectorCardModel["avatarKey"];
  avatar_url?: string | null;
  note?: string | null;
  is_mutual_friend?: boolean | null;
};

type SupabaseSocialContextPayload = {
  relationship?: ProfileRelationshipStatus;
  relationship_id?: string | null;
  friends?: SupabaseSocialPersonPayload[];
  recommended_by?: SupabaseSocialPersonPayload[];
  recommendations?: SupabaseSocialPersonPayload[];
};

function payloadToSocialPerson(person: SupabaseSocialPersonPayload): ProfileSocialPerson {
  const profileId = person.connector_profile_id ?? null;
  const memberId = person.member_id ?? person.name ?? crypto.randomUUID();

  return {
    id: profileId ?? memberId,
    name: person.name ?? "Detroit Connect member",
    role: person.role ?? "Detroit connector",
    neighborhood: person.neighborhood ?? "Detroit",
    profileHref: profileId ? `/connectors/${profileId}` : `/members/${encodeURIComponent(memberId)}`,
    avatarKey: person.avatar_key ?? null,
    avatarUrl: person.avatar_url ?? null,
    note: person.note ?? null,
    isMutualFriend: person.is_mutual_friend ?? false,
  };
}

function payloadToConnectorCard(person: SupabaseSocialPersonPayload): ConnectorCardModel | null {
  if (!person.connector_profile_id) return null;

  return {
    id: person.connector_profile_id,
    kind: "person",
    name: person.name ?? "Detroit connector",
    role: person.role ?? "Detroit connector",
    neighborhood: person.neighborhood ?? "Detroit",
    topics: [],
    languages: [],
    friendSignal: "Recommended by this connector",
    avatarKey: person.avatar_key ?? null,
    avatarUrl: person.avatar_url ?? null,
  };
}

async function getSupabaseProfileSocialContext(
  profile: ConnectorProfileModel,
  user?: User | null,
): Promise<ProfileSocialContext> {
  if (profile.kind !== "person") {
    return emptyProfileSocialContext();
  }

  if (!user) {
    return emptyProfileSocialContext("none");
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase.rpc("get_profile_social_context", {
    target_connector_profile_id: profile.id,
  });

  if (error) {
    throw new Error(`Could not load this profile's connections: ${error.message}`);
  }

  const payload = (data ?? {}) as SupabaseSocialContextPayload;
  const friends = (payload.friends ?? []).map(payloadToSocialPerson);

  return {
    relationship: payload.relationship ?? "none",
    relationshipId: payload.relationship_id ?? null,
    friends,
    recommendedBy: (payload.recommended_by ?? []).map(payloadToSocialPerson),
    recommendations: (payload.recommendations ?? []).flatMap((item) => {
      const connector = payloadToConnectorCard(item);
      return connector ? [connector] : [];
    }),
    mutualFriendCount: friends.filter((friend) => friend.isMutualFriend).length,
  };
}

export async function getProfileSocialContext(
  profile: ConnectorProfileModel,
  user?: User | null,
) {
  return isSupabaseConfigured()
    ? getSupabaseProfileSocialContext(profile, user)
    : getLocalProfileSocialContext(profile);
}

export async function getFriendById(friendId: string, user?: User | null) {
  const dashboard = await getFriendsDashboard(user);
  return dashboard.friends.find((friend) => friend.id === friendId) ?? null;
}

export async function searchFriendCandidates(
  friendQuery: string,
  user?: User | null,
): Promise<FriendSearchCandidate[]> {
  const normalizedQuery = normalizeFriendQuery(friendQuery);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const [profiles, dashboard] = await Promise.all([
    searchConnectorProfiles({ query: normalizedQuery, type: "person", pageSize: 8 }),
    getFriendsDashboard(user),
  ]);
  const relationships = [
    ...dashboard.friends,
    ...dashboard.incomingRequests,
    ...dashboard.outgoingRequests,
  ];
  const queryLower = normalizedQuery.toLowerCase();

  return profiles
    .flatMap((profile) => {
      if (!profile || profile.kind !== "person" || (user && profile.ownerId === user.id)) {
        return [];
      }

      const relationship = relationships.find(
        (friend) =>
          (profile.ownerId ? friend.id === profile.ownerId : false) ||
          friend.name.toLowerCase() === profile.name.toLowerCase() ||
          (profile.email ? friend.email?.toLowerCase() === profile.email.toLowerCase() : false),
      );

      const candidate: FriendSearchCandidate = {
        id: profile.id,
        initials: getInitials(profile.name),
        name: profile.name,
        role: profile.role,
        neighborhood: profile.neighborhood,
        profileHref: `/connectors/${profile.id}`,
        relationship: relationship?.direction ?? "none",
        canRequest: !isSupabaseConfigured() || Boolean(profile.ownerId),
      };

      return [candidate];
    })
    .sort((left, right) => {
      const leftName = left.name.toLowerCase();
      const rightName = right.name.toLowerCase();
      const leftScore = leftName === queryLower ? 0 : leftName.startsWith(queryLower) ? 1 : 2;
      const rightScore = rightName === queryLower ? 0 : rightName.startsWith(queryLower) ? 1 : 2;
      return leftScore - rightScore || leftName.localeCompare(rightName);
    });
}

export async function addFriendByConnectorProfileId(
  connectorProfileId: string,
  user?: User | null,
) {
  const profile = await getConnectorProfileById(connectorProfileId);

  if (!profile || profile.kind !== "person") {
    return { mode: isSupabaseConfigured() ? "supabase" as const : "local" as const, friendId: null };
  }

  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before adding a friend.");
    }
    if (!profile.ownerId) {
      return { mode: "supabase" as const, friendId: null };
    }

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: profile.ownerId,
      status: "pending",
    });

    if (error && error.code !== "23505") {
      throw new Error(`Could not send the connection request: ${error.message}`);
    }

    return { mode: "supabase" as const, friendId: profile.ownerId };
  }

  return addLocalFriend(profile.email ?? profile.name);
}

export async function addFriendByNameOrEmail(friendQuery: string, user?: User | null) {
  const normalizedQuery = normalizeFriendQuery(friendQuery);

  if (!normalizedQuery) {
    return { mode: "local" as const, friendId: null };
  }

  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before adding a friend.");
    }

    return addSupabaseFriend(normalizedQuery, user);
  }

  return addLocalFriend(normalizedQuery);
}

async function updateSupabaseFriendRequest(
  friendId: string,
  operation: FriendRequestOperation,
  user?: User | null,
) {
  if (!isSupabaseConfigured() || !user) {
    return null;
  }

  const supabase = (await createClient()) as SupabaseClient;

  if (operation === "accept") {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("requester_id", friendId)
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (error) {
      throw new Error(`Could not accept the friend request: ${error.message}`);
    }

    return { mode: "supabase" as const };
  }

  if (operation === "remove") {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`,
      );

    if (error) {
      throw new Error(`Could not remove this friend: ${error.message}`);
    }

    return { mode: "supabase" as const };
  }

  const query = supabase.from("friendships").delete().eq("status", "pending");
  const { error } =
    operation === "decline"
      ? await query.eq("requester_id", friendId).eq("addressee_id", user.id)
      : await query.eq("requester_id", user.id).eq("addressee_id", friendId);

  if (error) {
    throw new Error(`Could not ${operation} the connection request: ${error.message}`);
  }

  return { mode: "supabase" as const };
}

async function updateLocalFriendRequest(
  relationshipId: string,
  operation: FriendRequestOperation,
) {
  const userId = friendsUserId();
  const records = await readLocalFriends();
  const recordIndex = records.findIndex(
    (record) => record.user_id === userId && record.id === relationshipId,
  );

  if (recordIndex < 0) {
    return { mode: "local" as const, updated: false };
  }

  const record = records[recordIndex];
  const isIncoming = record.direction === "incoming";
  const canUpdate =
    (record.status === "pending" && operation === "accept" && isIncoming) ||
    (record.status === "pending" && operation === "decline" && isIncoming) ||
    (record.status === "pending" && operation === "cancel" && !isIncoming) ||
    (record.status === "accepted" && operation === "remove");

  if (!canUpdate) {
    return { mode: "local" as const, updated: false };
  }

  if (operation === "accept") {
    records[recordIndex] = {
      ...record,
      status: "accepted",
      direction: undefined,
      detail: record.detail === "Pending connection" ? "Connected friend" : record.detail,
      updated_at: new Date().toISOString(),
    };
  } else {
    records.splice(recordIndex, 1);
  }

  await writeLocalFriends(records);
  return { mode: "local" as const, updated: true };
}

export async function updateFriendRequest(
  friendId: string,
  operation: FriendRequestOperation,
  user?: User | null,
) {
  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before updating a connection request.");
    }

    return updateSupabaseFriendRequest(friendId, operation, user);
  }

  return updateLocalFriendRequest(friendId, operation);
}

export async function recommendConnectorToFriends(
  connectorProfileId: string,
  note: string,
  user?: User | null,
) {
  const [connector] = await getConnectorCardsByIds([connectorProfileId]);

  if (!connector) {
    return { mode: "local" as const, created: false };
  }

  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before recommending a connector.");
    }

    const supabase = (await createClient()) as SupabaseClient;
    const { error } = await supabase.from("profile_recommendations").upsert(
      {
        recommender_id: user.id,
        connector_profile_id: connectorProfileId,
        note: note || null,
      },
      { onConflict: "recommender_id,connector_profile_id" },
    );

    if (error) {
      throw new Error(`Could not share the recommendation: ${error.message}`);
    }

    return { mode: "supabase" as const, created: true };
  }

  const userId = friendsUserId();
  const recommendations = await readLocalRecommendations();
  const existingIndex = recommendations.findIndex(
    (recommendation) =>
      recommendation.user_id === userId &&
      recommendation.recommender_name === "You" &&
      recommendation.connector_profile_id === connectorProfileId,
  );
  const record: LocalRecommendationRecord = {
    id: existingIndex >= 0 ? recommendations[existingIndex].id : crypto.randomUUID(),
    user_id: userId,
    recommender_name: "You",
    connector_profile_id: connectorProfileId,
    note: note || `Recommended ${connector.name} to your Detroit Connect circle.`,
    created_at: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    recommendations[existingIndex] = record;
  } else {
    recommendations.unshift(record);
  }

  await writeLocalRecommendations(recommendations);
  return { mode: "local" as const, created: true };
}

export async function getRecommendationsYouMade(user?: User | null): Promise<FriendRecommendationModel[]> {
  if (isSupabaseConfigured()) {
    if (!user) return [];
    const supabase = (await createClient()) as SupabaseClient;
    const { data, error } = await supabase
      .from("profile_recommendations")
      .select("id, recommender_id, connector_profile_id, note, created_at")
      .eq("recommender_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Could not load your recommendations: ${error.message}`);
    const records = (data ?? []) as SupabaseRecommendationRow[];
    const connectors = await getConnectorCardsByIds(records.map((record) => record.connector_profile_id));
    const connectorsById = new Map(connectors.map((connector) => [connector.id, connector]));
    return records.flatMap((record) => {
      const connector = connectorsById.get(record.connector_profile_id);
      return connector ? [{
        id: record.id, recommenderName: "You", recommenderInitials: "YO", recommenderProfileHref: "/profile", connector,
        note: record.note ?? `You recommended ${connector.name}.`, createdAt: record.created_at,
      }] : [];
    });
  }

  const records = (await readLocalRecommendations())
    .filter((record) => record.user_id === friendsUserId() && record.recommender_name === "You")
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
  const connectors = await getConnectorCardsByIds(records.map((record) => record.connector_profile_id));
  const connectorsById = new Map(connectors.map((connector) => [connector.id, connector]));
  return records.flatMap((record) => {
    const connector = connectorsById.get(record.connector_profile_id);
    return connector ? [{
      id: record.id, recommenderName: "You", recommenderInitials: "YO", recommenderProfileHref: "/profile", connector,
      note: record.note, createdAt: record.created_at,
    }] : [];
  });
}

export type {
  FriendSearchCandidate,
  FriendDirection,
  FriendModel,
  FriendRecommendationModel,
  FriendRequestOperation,
  FriendsDashboard,
  ProfileRelationshipStatus,
  ProfileSocialContext,
  ProfileSocialPerson,
};
