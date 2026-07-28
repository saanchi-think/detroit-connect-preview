import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getConnectorProfileById } from "@/lib/connectors/repository";
import type { ConnectorProfileModel } from "@/lib/connectors/types";
import type { Database } from "@/lib/database.types";
import { getFriendById, getFriendsDashboard } from "@/lib/friends/repository";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type DirectMessageModel = {
  id: string;
  body: string;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  isMine: boolean;
};

type DirectConversationModel = {
  conversationId: string;
  profile: ConnectorProfileModel;
  profileHref: string;
  messages: DirectMessageModel[];
};

type DirectConversationSummary = {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  recipientInitials: string;
  profileHref: string;
  lastMessage: string;
  lastMessageIsMine: boolean;
  unreadCount: number;
  updatedAt: string;
};

type LocalConversation = {
  id: string;
  connector_profile_id: string;
  member_one_id: string;
  member_two_id: string;
  created_at: string;
  updated_at: string;
};

type LocalMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
};

type LocalMessageStore = { conversations: LocalConversation[]; messages: LocalMessage[] };

const LOCAL_MESSAGES_PATH = getLocalDataPath("local-dev-messages.json");
const LOCAL_DEV_USER_ID = "local-dev-user";
const FRIEND_RECIPIENT_PREFIX = "friend:";

const defaultLocalMessageStore: LocalMessageStore = {
  conversations: [
    {
      id: "local-conversation-nia",
      connector_profile_id: "friend:local-friend-nia",
      member_one_id: LOCAL_DEV_USER_ID,
      member_two_id: "local-friend-nia",
      created_at: "2026-07-27T13:30:00.000Z",
      updated_at: "2026-07-27T17:42:00.000Z",
    },
    {
      id: "local-conversation-maria",
      connector_profile_id: "11111111-1111-4111-8111-000000000001",
      member_one_id: LOCAL_DEV_USER_ID,
      member_two_id: "local-connector-11111111-1111-4111-8111-000000000001",
      created_at: "2026-07-26T16:10:00.000Z",
      updated_at: "2026-07-27T16:18:00.000Z",
    },
    {
      id: "local-conversation-darnell",
      connector_profile_id: "11111111-1111-4111-8111-000000000002",
      member_one_id: LOCAL_DEV_USER_ID,
      member_two_id: "local-connector-11111111-1111-4111-8111-000000000002",
      created_at: "2026-07-24T14:05:00.000Z",
      updated_at: "2026-07-25T15:20:00.000Z",
    },
  ],
  messages: [
    {
      id: "local-message-nia-1",
      conversation_id: "local-conversation-nia",
      sender_id: "local-friend-nia",
      body: "I have two housing connectors you may want to meet.",
      created_at: "2026-07-27T17:39:00.000Z",
      delivered_at: "2026-07-27T17:39:02.000Z",
      read_at: null,
    },
    {
      id: "local-message-nia-2",
      conversation_id: "local-conversation-nia",
      sender_id: "local-friend-nia",
      body: "One specializes in Midtown rentals and transit access.",
      created_at: "2026-07-27T17:42:00.000Z",
      delivered_at: "2026-07-27T17:42:02.000Z",
      read_at: null,
    },
    {
      id: "local-message-maria-1",
      conversation_id: "local-conversation-maria",
      sender_id: LOCAL_DEV_USER_ID,
      body: "Could we compare a few neighborhoods this week?",
      created_at: "2026-07-27T16:10:00.000Z",
      delivered_at: "2026-07-27T16:10:02.000Z",
      read_at: "2026-07-27T16:12:00.000Z",
    },
    {
      id: "local-message-maria-2",
      conversation_id: "local-conversation-maria",
      sender_id: "local-connector-11111111-1111-4111-8111-000000000001",
      body: "Absolutely. I can send a short list this afternoon.",
      created_at: "2026-07-27T16:18:00.000Z",
      delivered_at: "2026-07-27T16:18:02.000Z",
      read_at: null,
    },
    {
      id: "local-message-darnell-1",
      conversation_id: "local-conversation-darnell",
      sender_id: "local-connector-11111111-1111-4111-8111-000000000002",
      body: "The city services checklist is ready whenever you need it.",
      created_at: "2026-07-25T15:20:00.000Z",
      delivered_at: "2026-07-25T15:20:02.000Z",
      read_at: "2026-07-25T15:24:00.000Z",
    },
  ],
};

function localUserId() {
  return LOCAL_DEV_USER_ID;
}

function localRecipientId(profile: ConnectorProfileModel) {
  return profile.ownerId ?? `local-connector-${profile.id}`;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DC";
}

function profileHref(profile: ConnectorProfileModel) {
  if (profile.id.startsWith(FRIEND_RECIPIENT_PREFIX)) {
    return profile.ownerId ? `/members/${encodeURIComponent(profile.ownerId)}` : "/network";
  }

  return `/connectors/${profile.id}`;
}

async function getMessageRecipientProfile(recipientId: string, user?: User | null) {
  if (!recipientId.startsWith(FRIEND_RECIPIENT_PREFIX)) {
    return getConnectorProfileById(recipientId);
  }

  const friendId = recipientId.slice(FRIEND_RECIPIENT_PREFIX.length);
  const friend = await getFriendById(friendId, user);
  if (!friend) {
    throw new Error("This friend is no longer in your circle.");
  }

  return {
    id: recipientId,
    ownerId: friend.id,
    kind: "person" as const,
    name: friend.name,
    role: friend.detail || "Detroit Connect friend",
    neighborhood: "Detroit",
    topics: [],
    languages: [],
    friendSignal: "In your circle",
    bio: null,
    organizationName: null,
    email: friend.email,
    phone: null,
    websiteUrl: null,
    preferredContactMethod: "Platform messaging",
    zipCode: null,
    yearsConnected: null,
    skills: [],
    availability: ["Messages"],
    trustBadges: [],
    avatarKey: null,
    avatarUrl: null,
  } satisfies ConnectorProfileModel;
}

async function readLocalStore(): Promise<LocalMessageStore> {
  try {
    const store = JSON.parse(await readFile(LOCAL_MESSAGES_PATH, "utf8")) as LocalMessageStore;
    const conversationByProfile = new Map<string, LocalConversation>();
    const conversationRedirects = new Map<string, string>();

    store.conversations.forEach((conversation) => {
      const [memberOne, memberTwo] = [conversation.member_one_id, conversation.member_two_id].sort();
      const normalizedConversation = {
        ...conversation,
        member_one_id: memberOne,
        member_two_id: memberTwo,
      };
      const existing = conversationByProfile.get(conversation.connector_profile_id);

      if (existing) {
        conversationRedirects.set(conversation.id, existing.id);
        if (conversation.updated_at > existing.updated_at) {
          existing.updated_at = conversation.updated_at;
        }
      } else {
        conversationByProfile.set(conversation.connector_profile_id, normalizedConversation);
      }
    });

    const normalized = {
      conversations: Array.from(conversationByProfile.values()),
      messages: store.messages.map((message) => ({
        ...message,
        conversation_id: conversationRedirects.get(message.conversation_id) ?? message.conversation_id,
        delivered_at: message.delivered_at ?? message.created_at,
        read_at: message.read_at ?? null,
      })),
    };
    if (normalized.messages.length === 0) {
      const seeded = structuredClone(defaultLocalMessageStore);
      await writeLocalStore(seeded);
      return seeded;
    }
    if (JSON.stringify(normalized) !== JSON.stringify(store)) {
      await writeLocalStore(normalized);
    }
    return normalized;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    const initial = structuredClone(defaultLocalMessageStore);
    await writeLocalStore(initial);
    return initial;
  }
}

async function writeLocalStore(store: LocalMessageStore) {
  await writeLocalJson(LOCAL_MESSAGES_PATH, store);
}

async function getSupabaseConversation(profile: ConnectorProfileModel, user: User): Promise<DirectConversationModel> {
  if (!profile.ownerId) {
    throw new Error("This profile does not accept direct messages yet.");
  }
  if (profile.ownerId === user.id) {
    throw new Error("This is your profile. Choose another connector to send a message.");
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data: conversationId, error: conversationError } = await supabase.rpc("start_direct_conversation", {
    other_member_id: profile.ownerId,
  });
  if (conversationError || !conversationId) {
    throw new Error(`Could not open the conversation: ${conversationError?.message ?? "Unknown error"}`);
  }
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, body, created_at, delivered_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load messages: ${error.message}`);

  const readAt = new Date().toISOString();
  const hasUnreadMessages = (data ?? []).some(
    (message) => message.sender_id !== user.id && !message.read_at,
  );
  if (hasUnreadMessages) {
    const { error: readError } = await supabase.rpc("mark_direct_conversation_read", {
      target_conversation_id: conversationId,
    });
    if (readError) throw new Error(`Could not mark messages as read: ${readError.message}`);
  }

  return {
    conversationId,
    profile,
    profileHref: profileHref(profile),
    messages: (data ?? []).map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
      deliveredAt: message.delivered_at,
      readAt: message.read_at ?? (message.sender_id !== user.id ? readAt : null),
      isMine: message.sender_id === user.id,
    })),
  };
}

async function getLocalConversation(profile: ConnectorProfileModel): Promise<DirectConversationModel> {
  const store = await readLocalStore();
  const currentUserId = localUserId();
  const recipientId = localRecipientId(profile);
  const [memberOne, memberTwo] = [currentUserId, recipientId].sort();
  let conversation = store.conversations.find(
    (entry) => entry.connector_profile_id === profile.id ||
      (entry.member_one_id === memberOne && entry.member_two_id === memberTwo),
  );
  if (!conversation) {
    const timestamp = new Date().toISOString();
    conversation = {
      id: crypto.randomUUID(), connector_profile_id: profile.id, member_one_id: memberOne, member_two_id: memberTwo,
      created_at: timestamp, updated_at: timestamp,
    };
    store.conversations.unshift(conversation);
    await writeLocalStore(store);
  }

  const readAt = new Date().toISOString();
  let didMarkRead = false;
  store.messages = store.messages.map((message) => {
    if (
      message.conversation_id === conversation.id &&
      message.sender_id !== currentUserId &&
      !message.read_at
    ) {
      didMarkRead = true;
      return { ...message, read_at: readAt };
    }
    return message;
  });
  if (didMarkRead) {
    await writeLocalStore(store);
  }

  return {
    conversationId: conversation.id,
    profile,
    profileHref: profileHref(profile),
    messages: store.messages
      .filter((message) => message.conversation_id === conversation.id)
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.created_at,
        deliveredAt: message.delivered_at ?? message.created_at,
        readAt: message.read_at ?? null,
        isMine: message.sender_id === currentUserId,
      })),
  };
}

export async function getDirectConversation(connectorProfileId: string, user?: User | null) {
  const normalizedRecipientId = decodeURIComponent(connectorProfileId);
  const profile = await getMessageRecipientProfile(normalizedRecipientId, user);
  if (!profile) return null;
  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before opening a conversation.");
    return getSupabaseConversation(profile, user);
  }
  return getLocalConversation(profile);
}

export async function sendDirectMessage(connectorProfileId: string, body: string, user?: User | null) {
  const conversation = await getDirectConversation(connectorProfileId, user);
  if (!conversation) throw new Error("That connector profile could not be found.");

  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before sending a message.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { error } = await supabase.from("direct_messages").insert({
      conversation_id: conversation.conversationId, sender_id: user.id, body,
    });
    if (error) throw new Error(`Could not send the message: ${error.message}`);
    return { mode: "supabase" as const };
  }

  const store = await readLocalStore();
  const timestamp = new Date().toISOString();
  store.messages.push({
    id: crypto.randomUUID(),
    conversation_id: conversation.conversationId,
    sender_id: localUserId(),
    body,
    created_at: timestamp,
    delivered_at: timestamp,
    read_at: null,
  });
  const index = store.conversations.findIndex((entry) => entry.id === conversation.conversationId);
  if (index >= 0) store.conversations[index] = { ...store.conversations[index], updated_at: timestamp };
  await writeLocalStore(store);
  return { mode: "local" as const };
}

export async function getDirectConversationSummaries(user?: User | null): Promise<DirectConversationSummary[]> {
  if (isSupabaseConfigured()) {
    if (!user) return [];
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data, error } = await supabase
      .from("direct_conversations")
      .select("id, member_one_id, member_two_id, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`Could not load conversations: ${error.message}`);
    const conversationIds = (data ?? []).map((row) => row.id);
    const { data: messageData, error: messageError } = conversationIds.length
      ? await supabase
          .from("direct_messages")
          .select("conversation_id, sender_id, body, created_at, read_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (messageError) throw new Error(`Could not load message previews: ${messageError.message}`);
    const messagesByConversation = new Map<string, typeof messageData>();
    (messageData ?? []).forEach((message) => {
      const messages = messagesByConversation.get(message.conversation_id) ?? [];
      messages.push(message);
      messagesByConversation.set(message.conversation_id, messages);
    });
    const participantIds = (data ?? []).map((row) => row.member_one_id === user.id ? row.member_two_id : row.member_one_id);
    const { data: profileData, error: profileError } = participantIds.length
      ? await supabase.from("connector_profiles").select("id, owner_id").in("owner_id", participantIds)
      : { data: [], error: null };
    if (profileError) throw new Error(`Could not load conversation profiles: ${profileError.message}`);
    const profileByOwner = new Map((profileData ?? []).flatMap((profile) => profile.owner_id ? [[profile.owner_id, profile.id] as const] : []));
    const connectorProfiles = await Promise.all(
      Array.from(profileByOwner.values()).map((profileId) => getConnectorProfileById(profileId)),
    );
    const connectorsById = new Map(
      connectorProfiles.flatMap((profile) => profile ? [[profile.id, profile] as const] : []),
    );
    const dashboard = await getFriendsDashboard(user);
    const friendsById = new Map(dashboard.friends.map((friend) => [friend.id, friend]));

    return (data ?? []).flatMap((row) => {
      const participantId = row.member_one_id === user.id ? row.member_two_id : row.member_one_id;
      const profileId = profileByOwner.get(participantId);
      const profile = profileId ? connectorsById.get(profileId) : null;
      const friend = friendsById.get(participantId);
      const recipientId = profile?.id ?? (friend ? `${FRIEND_RECIPIENT_PREFIX}${friend.id}` : null);
      const recipientName = profile?.name ?? friend?.name;

      if (!recipientId || !recipientName) return [];
      const messages = messagesByConversation.get(row.id) ?? [];
      const latestMessage = messages[0];

      return [{
        id: row.id,
        recipientId,
        recipientName,
        recipientRole: profile?.role ?? friend?.detail ?? "Detroit Connect friend",
        recipientInitials: getInitials(recipientName),
        profileHref: profile
          ? `/connectors/${profile.id}`
          : friend?.profileHref ?? `/members/${participantId}`,
        lastMessage: latestMessage?.body ?? "No messages yet",
        lastMessageIsMine: latestMessage?.sender_id === user.id,
        unreadCount: messages.filter((message) => message.sender_id !== user.id && !message.read_at).length,
        updatedAt: latestMessage?.created_at ?? row.updated_at,
      }];
    });
  }
  const store = await readLocalStore();
  const userId = localUserId();
  const conversations = store.conversations
    .filter((conversation) => conversation.member_one_id === userId || conversation.member_two_id === userId)
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));

  return (await Promise.all(conversations.map(async (conversation) => {
    try {
      const profile = await getMessageRecipientProfile(conversation.connector_profile_id, user);
      if (!profile) return null;
      const messages = store.messages
        .filter((message) => message.conversation_id === conversation.id)
        .sort((left, right) => right.created_at.localeCompare(left.created_at));
      const latestMessage = messages[0];
      return {
        id: conversation.id,
        recipientId: conversation.connector_profile_id,
        recipientName: profile.name,
        recipientRole: profile.role,
        recipientInitials: getInitials(profile.name),
        profileHref: profileHref(profile),
        lastMessage: latestMessage?.body ?? "No messages yet",
        lastMessageIsMine: latestMessage?.sender_id === userId,
        unreadCount: messages.filter((message) => message.sender_id !== userId && !message.read_at).length,
        updatedAt: latestMessage?.created_at ?? conversation.updated_at,
      };
    } catch {
      return null;
    }
  }))).filter((summary): summary is DirectConversationSummary => summary !== null);
}

export async function getUnreadDirectMessageCount(user?: User | null) {
  const summaries = await getDirectConversationSummaries(user);
  return summaries.reduce((total, summary) => total + summary.unreadCount, 0);
}

export type { DirectConversationModel, DirectConversationSummary, DirectMessageModel };
