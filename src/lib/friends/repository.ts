import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getConnectorCardsByIds } from "@/lib/connectors/repository";
import type { ConnectorCardModel } from "@/lib/connectors/types";
import type { Database, FriendStatus } from "@/lib/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type FriendModel = {
  id: string;
  initials: string;
  name: string;
  detail: string;
  email: string | null;
  status: FriendStatus;
  direction: FriendDirection;
};

type FriendDirection = "connected" | "incoming" | "outgoing";
type FriendRequestOperation = "accept" | "decline" | "cancel";

type FriendRecommendationModel = {
  id: string;
  recommenderName: string;
  recommenderInitials: string;
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

const LOCAL_FRIENDS_PATH = path.join(process.cwd(), "data", "local-dev-friends.json");
const LOCAL_RECOMMENDATIONS_PATH = path.join(process.cwd(), "data", "local-dev-recommendations.json");
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

function friendsUserId(user?: User | null) {
  return user?.id ?? LOCAL_DEV_USER_ID;
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
    status: friend.status,
    direction: friend.status === "accepted" ? "connected" : (friend.direction ?? "outgoing"),
  };
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
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
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

async function getLocalDashboard(user?: User | null): Promise<FriendsDashboard> {
  const userId = friendsUserId(user);
  const relationships = (await readLocalFriends())
    .filter((friend) => friend.user_id === userId)
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .map(localFriendToModel);
  const recommendationRecords = (await readLocalRecommendations())
    .filter((recommendation) => recommendation.user_id === userId)
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
    const profileMap = await getUserProfilesById(friendIds, supabase);
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
        status: friendship.status,
        direction,
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
    throw new Error(`Could not send the friend request: ${friendshipError.message}`);
  }

  return { mode: "supabase" as const, friendId: friend.member_id };
}

async function addLocalFriend(friendQuery: string, user?: User | null) {
  const normalizedQuery = normalizeFriendQuery(friendQuery);

  if (!normalizedQuery) {
    return { mode: "local" as const, friendId: null };
  }

  const userId = friendsUserId(user);
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

  return getLocalDashboard(user);
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

  return addLocalFriend(normalizedQuery, user);
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

  const query = supabase.from("friendships").delete().eq("status", "pending");
  const { error } =
    operation === "decline"
      ? await query.eq("requester_id", friendId).eq("addressee_id", user.id)
      : await query.eq("requester_id", user.id).eq("addressee_id", friendId);

  if (error) {
    throw new Error(`Could not ${operation} the friend request: ${error.message}`);
  }

  return { mode: "supabase" as const };
}

async function updateLocalFriendRequest(
  relationshipId: string,
  operation: FriendRequestOperation,
  user?: User | null,
) {
  const userId = friendsUserId(user);
  const records = await readLocalFriends();
  const recordIndex = records.findIndex(
    (record) => record.user_id === userId && record.id === relationshipId && record.status === "pending",
  );

  if (recordIndex < 0) {
    return { mode: "local" as const, updated: false };
  }

  const record = records[recordIndex];
  const isIncoming = record.direction === "incoming";
  const canUpdate =
    (operation === "accept" && isIncoming) ||
    (operation === "decline" && isIncoming) ||
    (operation === "cancel" && !isIncoming);

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
      throw new Error("Sign in before updating a friend request.");
    }

    return updateSupabaseFriendRequest(friendId, operation, user);
  }

  return updateLocalFriendRequest(friendId, operation, user);
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

  const userId = friendsUserId(user);
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

export type {
  FriendDirection,
  FriendModel,
  FriendRecommendationModel,
  FriendRequestOperation,
  FriendsDashboard,
};
