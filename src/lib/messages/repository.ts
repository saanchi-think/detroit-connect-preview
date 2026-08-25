import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getConnectorProfileById } from "@/lib/connectors/repository";
import type { ConnectorProfileModel } from "@/lib/connectors/types";
import type { Database } from "@/lib/database.types";
import { getFriendById, getFriendsDashboard } from "@/lib/friends/repository";
import { isUuid } from "@/lib/identifiers";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { getSafetyState, getSuppressedUserIds } from "@/lib/safety/repository";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type DirectMessageModel = {
  id: string;
  body: string;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  isMine: boolean;
  isForwarded: boolean;
  reactions: DirectMessageReactionModel[];
};

type DirectMessageReactionModel = {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
};

type DirectConversationModel = {
  conversationId: string;
  recipientMemberId: string;
  profile: ConnectorProfileModel;
  profileHref: string;
  messages: DirectMessageModel[];
  isArchived: boolean;
};

type DirectConversationSummary = {
  id: string;
  recipientId: string;
  recipientMemberId: string;
  recipientName: string;
  recipientRole: string;
  recipientInitials: string;
  profileHref: string;
  lastMessage: string;
  lastMessageIsMine: boolean;
  unreadCount: number;
  updatedAt: string;
  isArchived: boolean;
};

type MessageForwardRecipient = {
  id: string;
  initials: string;
  name: string;
  role: string;
  profileHref: string;
};

type LocalConversation = {
  id: string;
  connector_profile_id: string;
  member_one_id: string;
  member_two_id: string;
  created_at: string;
  updated_at: string;
  archived_by?: string[];
};

type LocalMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  is_forwarded?: boolean;
};

type LocalMessageReaction = {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

type LocalMessageStore = {
  conversations: LocalConversation[];
  messages: LocalMessage[];
  reactions: LocalMessageReaction[];
};

const LOCAL_MESSAGES_PATH = getLocalDataPath("local-dev-messages.json");
const LOCAL_DEV_USER_ID = "local-dev-user";
const FRIEND_RECIPIENT_PREFIX = "friend:";
const DIRECT_MESSAGE_REACTIONS = ["👍", "❤️", "😂", "🙌", "🎉"] as const;

const defaultLocalMessageStore: LocalMessageStore = {
  conversations: [
    {
      id: "local-conversation-nia",
      connector_profile_id: "friend:local-friend-nia",
      member_one_id: LOCAL_DEV_USER_ID,
      member_two_id: "local-friend-nia",
      created_at: "2026-07-27T13:30:00.000Z",
      updated_at: "2026-07-27T17:42:00.000Z",
      archived_by: [],
    },
    {
      id: "local-conversation-maria",
      connector_profile_id: "11111111-1111-4111-8111-000000000001",
      member_one_id: LOCAL_DEV_USER_ID,
      member_two_id: "local-connector-11111111-1111-4111-8111-000000000001",
      created_at: "2026-07-26T16:10:00.000Z",
      updated_at: "2026-07-27T16:18:00.000Z",
      archived_by: [],
    },
    {
      id: "local-conversation-darnell",
      connector_profile_id: "11111111-1111-4111-8111-000000000002",
      member_one_id: LOCAL_DEV_USER_ID,
      member_two_id: "local-connector-11111111-1111-4111-8111-000000000002",
      created_at: "2026-07-24T14:05:00.000Z",
      updated_at: "2026-07-25T15:20:00.000Z",
      archived_by: [],
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
  reactions: [],
};

function localUserId(user?: User | null) {
  return user?.id ?? LOCAL_DEV_USER_ID;
}

function localRecipientId(profile: ConnectorProfileModel) {
  if (profile.id.startsWith(FRIEND_RECIPIENT_PREFIX)) {
    return profile.ownerId ?? profile.id.slice(FRIEND_RECIPIENT_PREFIX.length);
  }
  return hasSupabaseRecipient(profile)
    ? profile.ownerId
    : `local-connector-${profile.id}`;
}

function hasSupabaseRecipient(
  profile: ConnectorProfileModel,
): profile is ConnectorProfileModel & { ownerId: string } {
  return isUuid(profile.ownerId);
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
    const parsed = JSON.parse(await readFile(LOCAL_MESSAGES_PATH, "utf8")) as Partial<LocalMessageStore>;
    const store: LocalMessageStore = {
      conversations: parsed.conversations ?? [],
      messages: parsed.messages ?? [],
      reactions: parsed.reactions ?? [],
    };
    const conversationByParticipants = new Map<string, LocalConversation>();
    const conversationRedirects = new Map<string, string>();

    store.conversations.forEach((conversation) => {
      const canonicalLocalRecipient = conversation.connector_profile_id.startsWith(FRIEND_RECIPIENT_PREFIX)
        ? null
        : `local-connector-${conversation.connector_profile_id}`;
      const normalizedMembers = [conversation.member_one_id, conversation.member_two_id].map((memberId) =>
        canonicalLocalRecipient &&
        memberId !== LOCAL_DEV_USER_ID &&
        memberId.startsWith("local-")
          ? canonicalLocalRecipient
          : memberId,
      );
      const [memberOne, memberTwo] = normalizedMembers.sort();
      const normalizedConversation = {
        ...conversation,
        member_one_id: memberOne,
        member_two_id: memberTwo,
        archived_by: conversation.archived_by ?? [],
      };
      const conversationKey = `${conversation.connector_profile_id}:${memberOne}:${memberTwo}`;
      const existing = conversationByParticipants.get(conversationKey);

      if (existing) {
        conversationRedirects.set(conversation.id, existing.id);
        if (conversation.updated_at > existing.updated_at) {
          existing.updated_at = conversation.updated_at;
        }
      } else {
        conversationByParticipants.set(conversationKey, normalizedConversation);
      }
    });

    const normalized = {
      conversations: Array.from(conversationByParticipants.values()),
      messages: store.messages.map((message) => ({
        ...message,
        conversation_id: conversationRedirects.get(message.conversation_id) ?? message.conversation_id,
        delivered_at: message.delivered_at ?? message.created_at,
        read_at: message.read_at ?? null,
        is_forwarded: message.is_forwarded ?? false,
      })),
      reactions: store.reactions.filter(
        (reaction): reaction is LocalMessageReaction =>
          Boolean(reaction.message_id) &&
          Boolean(reaction.user_id) &&
          DIRECT_MESSAGE_REACTIONS.includes(
            reaction.emoji as (typeof DIRECT_MESSAGE_REACTIONS)[number],
          ),
      ),
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

function summarizeMessageReactions(
  reactions: Array<Pick<LocalMessageReaction, "emoji" | "user_id">>,
  currentUserId: string,
): DirectMessageReactionModel[] {
  return DIRECT_MESSAGE_REACTIONS.flatMap((emoji) => {
    const matching = reactions.filter((reaction) => reaction.emoji === emoji);
    if (matching.length === 0) return [];

    return [{
      emoji,
      count: matching.length,
      reactedByCurrentUser: matching.some((reaction) => reaction.user_id === currentUserId),
    }];
  });
}

async function getSupabaseConversation(profile: ConnectorProfileModel, user: User): Promise<DirectConversationModel> {
  if (!profile.ownerId) {
    throw new Error("This profile does not accept direct messages yet.");
  }
  if (profile.ownerId === user.id) {
    throw new Error("This is your profile. Choose another connector to send a message.");
  }
  const safetyState = await getSafetyState(profile.ownerId, user);
  if (safetyState.isBlocked) {
    throw new Error("Unblock this member in Settings before starting a conversation.");
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
    .select("id, sender_id, body, created_at, delivered_at, read_at, is_forwarded")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load messages: ${error.message}`);
  const messageIds = (data ?? []).map((message) => message.id);
  const { data: reactionData, error: reactionError } = messageIds.length
    ? await supabase
        .from("direct_message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", messageIds)
    : { data: [], error: null };
  if (reactionError) throw new Error(`Could not load message reactions: ${reactionError.message}`);
  const reactionsByMessage = new Map<string, Array<Pick<LocalMessageReaction, "emoji" | "user_id">>>();
  (reactionData ?? []).forEach((reaction) => {
    const reactions = reactionsByMessage.get(reaction.message_id) ?? [];
    reactions.push(reaction);
    reactionsByMessage.set(reaction.message_id, reactions);
  });
  const { data: preference, error: preferenceError } = await supabase
    .from("direct_conversation_preferences")
    .select("archived_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (preferenceError) {
    throw new Error(`Could not load conversation preferences: ${preferenceError.message}`);
  }

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
    recipientMemberId: profile.ownerId,
    profile,
    profileHref: profileHref(profile),
    isArchived: Boolean(preference),
    messages: (data ?? []).map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.created_at,
      deliveredAt: message.delivered_at,
      readAt: message.read_at ?? (message.sender_id !== user.id ? readAt : null),
      isMine: message.sender_id === user.id,
      isForwarded: message.is_forwarded,
      reactions: summarizeMessageReactions(reactionsByMessage.get(message.id) ?? [], user.id),
    })),
  };
}

async function getLocalConversation(
  profile: ConnectorProfileModel,
  user?: User | null,
): Promise<DirectConversationModel> {
  const store = await readLocalStore();
  const currentUserId = localUserId(user);
  const recipientId = localRecipientId(profile);
  const [memberOne, memberTwo] = [currentUserId, recipientId].sort();
  let conversation = store.conversations.find(
    (entry) =>
      entry.connector_profile_id === profile.id &&
      entry.member_one_id === memberOne &&
      entry.member_two_id === memberTwo,
  );
  if (!conversation) {
    const timestamp = new Date().toISOString();
    conversation = {
      id: crypto.randomUUID(), connector_profile_id: profile.id, member_one_id: memberOne, member_two_id: memberTwo,
      created_at: timestamp, updated_at: timestamp,
      archived_by: [],
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

  const reactionsByMessage = new Map<string, LocalMessageReaction[]>();
  store.reactions.forEach((reaction) => {
    const reactions = reactionsByMessage.get(reaction.message_id) ?? [];
    reactions.push(reaction);
    reactionsByMessage.set(reaction.message_id, reactions);
  });

  return {
    conversationId: conversation.id,
    recipientMemberId: recipientId,
    profile,
    profileHref: profileHref(profile),
    isArchived: (conversation.archived_by ?? []).includes(currentUserId),
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
        isForwarded: message.is_forwarded ?? false,
        reactions: summarizeMessageReactions(reactionsByMessage.get(message.id) ?? [], currentUserId),
      })),
  };
}

export async function getDirectConversation(connectorProfileId: string, user?: User | null) {
  const normalizedRecipientId = decodeURIComponent(connectorProfileId);
  const profile = await getMessageRecipientProfile(normalizedRecipientId, user);
  if (!profile) return null;

  if (isSupabaseConfigured() && hasSupabaseRecipient(profile)) {
    if (!user) throw new Error("Sign in before opening a conversation.");
    return getSupabaseConversation(profile, user);
  }

  if (!isSupabaseConfigured()) {
    const safetyState = await getSafetyState(localRecipientId(profile), user);
    if (safetyState.isBlocked) {
      throw new Error("Unblock this member in Settings before starting a conversation.");
    }
  }

  return getLocalConversation(profile, user);
}

export async function sendDirectMessage(
  connectorProfileId: string,
  body: string,
  user?: User | null,
  options: { isForwarded?: boolean } = {},
) {
  const conversation = await getDirectConversation(connectorProfileId, user);
  if (!conversation) throw new Error("That connector profile could not be found.");

  if (isSupabaseConfigured() && hasSupabaseRecipient(conversation.profile)) {
    if (!user) throw new Error("Sign in before sending a message.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { error } = await supabase.from("direct_messages").insert({
      conversation_id: conversation.conversationId,
      sender_id: user.id,
      body,
      is_forwarded: options.isForwarded ?? false,
    });
    if (error) throw new Error(`Could not send the message: ${error.message}`);
    return { mode: "supabase" as const };
  }

  const store = await readLocalStore();
  const timestamp = new Date().toISOString();
  store.messages.push({
    id: crypto.randomUUID(),
    conversation_id: conversation.conversationId,
    sender_id: localUserId(user),
    body,
    created_at: timestamp,
    delivered_at: timestamp,
    read_at: null,
    is_forwarded: options.isForwarded ?? false,
  });
  const index = store.conversations.findIndex((entry) => entry.id === conversation.conversationId);
  if (index >= 0) {
    store.conversations[index] = {
      ...store.conversations[index],
      archived_by: (store.conversations[index].archived_by ?? []).filter(
        (memberId) => memberId !== localUserId(user),
      ),
      updated_at: timestamp,
    };
  }
  await writeLocalStore(store);
  return { mode: "local" as const };
}

export async function toggleDirectMessageReaction(
  messageId: string,
  emoji: string,
  user?: User | null,
) {
  if (!DIRECT_MESSAGE_REACTIONS.includes(emoji as (typeof DIRECT_MESSAGE_REACTIONS)[number])) {
    throw new Error("Choose a supported reaction.");
  }

  const store = await readLocalStore();
  const currentUserId = localUserId(user);
  const localMessage = store.messages.find((message) => message.id === messageId);

  if (localMessage) {
    const conversation = store.conversations.find(
      (entry) =>
        entry.id === localMessage.conversation_id &&
        (entry.member_one_id === currentUserId || entry.member_two_id === currentUserId),
    );
    if (!conversation) throw new Error("That message is no longer available.");

    const reactionIndex = store.reactions.findIndex(
      (reaction) => reaction.message_id === messageId && reaction.user_id === currentUserId,
    );
    const existing = reactionIndex >= 0 ? store.reactions[reactionIndex] : null;
    let reacted = true;

    if (existing?.emoji === emoji) {
      store.reactions.splice(reactionIndex, 1);
      reacted = false;
    } else if (existing) {
      store.reactions[reactionIndex] = { ...existing, emoji };
    } else {
      store.reactions.push({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
        created_at: new Date().toISOString(),
      });
    }
    await writeLocalStore(store);
    return { reacted, emoji, mode: "local" as const };
  }

  if (!isSupabaseConfigured() || !user || !isUuid(messageId)) {
    throw new Error("That message is no longer available.");
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data: message, error: messageError } = await supabase
    .from("direct_messages")
    .select("id")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) throw new Error(`Could not open the message: ${messageError.message}`);
  if (!message) throw new Error("That message is no longer available.");

  const { data: existing, error: existingError } = await supabase
    .from("direct_message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingError) throw new Error(`Could not load your reaction: ${existingError.message}`);

  if (existing?.emoji === emoji) {
    const { error } = await supabase
      .from("direct_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id);
    if (error) throw new Error(`Could not remove your reaction: ${error.message}`);
    return { reacted: false, emoji, mode: "supabase" as const };
  }

  const { error } = existing
    ? await supabase
        .from("direct_message_reactions")
        .update({ emoji })
        .eq("message_id", messageId)
        .eq("user_id", user.id)
    : await supabase.from("direct_message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
  if (error) throw new Error(`Could not save your reaction: ${error.message}`);
  return { reacted: true, emoji, mode: "supabase" as const };
}

async function getForwardableMessage(messageId: string, user?: User | null) {
  const store = await readLocalStore();
  const localMessage = store.messages.find((message) => message.id === messageId);

  if (localMessage) {
    const currentUserId = localUserId(user);
    const conversation = store.conversations.find(
      (entry) =>
        entry.id === localMessage.conversation_id &&
        (entry.member_one_id === currentUserId || entry.member_two_id === currentUserId),
    );
    return conversation ? localMessage.body : null;
  }

  if (!isSupabaseConfigured() || !user || !isUuid(messageId)) return null;

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase
    .from("direct_messages")
    .select("body")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new Error(`Could not read the message: ${error.message}`);
  return data?.body ?? null;
}

export async function forwardDirectMessage(
  messageId: string,
  recipientProfileIds: string[],
  user?: User | null,
) {
  const recipients = Array.from(
    new Set(recipientProfileIds.map((recipientId) => recipientId.trim()).filter(Boolean)),
  );

  if (recipients.length < 1 || recipients.length > 10) {
    throw new Error("Choose between 1 and 10 people.");
  }

  const body = await getForwardableMessage(messageId, user);
  if (!body) throw new Error("That message is no longer available to forward.");

  const failures: string[] = [];
  let sentCount = 0;

  for (const recipientId of recipients) {
    try {
      await sendDirectMessage(recipientId, body, user, { isForwarded: true });
      sentCount += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Could not send to one recipient.");
    }
  }

  if (sentCount === 0) {
    throw new Error(failures[0] ?? "Could not forward the message.");
  }

  return {
    sentCount,
    failedCount: failures.length,
  };
}

function messageRecipientIdFromProfileHref(profileHref: string, memberId: string) {
  const connectorPrefix = "/connectors/";
  if (profileHref.startsWith(connectorPrefix)) {
    return decodeURIComponent(profileHref.slice(connectorPrefix.length));
  }
  return `${FRIEND_RECIPIENT_PREFIX}${memberId}`;
}

export async function getMessageForwardRecipients(
  excludedRecipientId: string,
  user?: User | null,
): Promise<MessageForwardRecipient[]> {
  const [summaries, dashboard] = await Promise.all([
    getDirectConversationSummaries(user),
    getFriendsDashboard(user),
  ]);
  const recipients = new Map<string, MessageForwardRecipient>();
  const knownNames = new Set<string>();

  function addRecipient(recipient: MessageForwardRecipient) {
    const normalizedName = recipient.name.trim().toLowerCase();
    if (
      !recipient.id ||
      recipient.id === excludedRecipientId ||
      !normalizedName ||
      knownNames.has(normalizedName)
    ) {
      return;
    }
    recipients.set(recipient.id, recipient);
    knownNames.add(normalizedName);
  }

  summaries.forEach((summary) => {
    addRecipient({
      id: summary.recipientId,
      initials: summary.recipientInitials,
      name: summary.recipientName,
      role: summary.recipientRole,
      profileHref: summary.profileHref,
    });
  });

  dashboard.friends.forEach((friend) => {
    addRecipient({
      id: messageRecipientIdFromProfileHref(friend.profileHref, friend.id),
      initials: friend.initials,
      name: friend.name,
      role: friend.detail || "Detroit Connect friend",
      profileHref: friend.profileHref,
    });
  });

  return Array.from(recipients.values()).sort((left, right) => left.name.localeCompare(right.name));
}

async function getSupabaseConversationSummaries(
  user: User,
): Promise<DirectConversationSummary[]> {
  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase
    .from("direct_conversations")
    .select("id, member_one_id, member_two_id, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load conversations: ${error.message}`);
  const conversationIds = (data ?? []).map((row) => row.id);
  const { data: preferenceData, error: preferenceError } = conversationIds.length
    ? await supabase
        .from("direct_conversation_preferences")
        .select("conversation_id")
        .eq("user_id", user.id)
        .in("conversation_id", conversationIds)
    : { data: [], error: null };
  if (preferenceError) {
    throw new Error(`Could not load conversation preferences: ${preferenceError.message}`);
  }
  const archivedConversationIds = new Set(
    (preferenceData ?? []).map((preference) => preference.conversation_id),
  );
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
  const participantIds = (data ?? []).map((row) =>
    row.member_one_id === user.id ? row.member_two_id : row.member_one_id,
  );
  const { data: profileData, error: profileError } = participantIds.length
    ? await supabase.from("connector_profiles").select("id, owner_id").in("owner_id", participantIds)
    : { data: [], error: null };
  if (profileError) throw new Error(`Could not load conversation profiles: ${profileError.message}`);
  const profileByOwner = new Map(
    (profileData ?? []).flatMap((profile) =>
      profile.owner_id ? [[profile.owner_id, profile.id] as const] : [],
    ),
  );
  const connectorProfiles = await Promise.all(
    Array.from(profileByOwner.values()).map((profileId) => getConnectorProfileById(profileId)),
  );
  const connectorsById = new Map(
    connectorProfiles.flatMap((profile) => profile ? [[profile.id, profile] as const] : []),
  );
  const dashboard = await getFriendsDashboard(user);
  const friendsById = new Map(dashboard.friends.map((friend) => [friend.id, friend]));
  const { blockedIds } = await getSuppressedUserIds(user);

  return (data ?? []).flatMap((row) => {
    const participantId = row.member_one_id === user.id ? row.member_two_id : row.member_one_id;
    if (blockedIds.has(participantId)) return [];
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
      recipientMemberId: participantId,
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
      isArchived: archivedConversationIds.has(row.id),
    }];
  });
}

async function getLocalConversationSummaries(
  user?: User | null,
): Promise<DirectConversationSummary[]> {
  const store = await readLocalStore();
  const userId = localUserId(user);
  const { blockedIds } = await getSuppressedUserIds(user);
  const conversations = store.conversations
    .filter((conversation) => conversation.member_one_id === userId || conversation.member_two_id === userId)
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));

  return (await Promise.all(conversations.map(async (conversation) => {
    try {
      const profile = await getMessageRecipientProfile(conversation.connector_profile_id, user);
      if (!profile) return null;
      if (isSupabaseConfigured() && hasSupabaseRecipient(profile)) return null;
      const recipientMemberId =
        conversation.member_one_id === userId
          ? conversation.member_two_id
          : conversation.member_one_id;
      if (blockedIds.has(recipientMemberId)) return null;
      const messages = store.messages
        .filter((message) => message.conversation_id === conversation.id)
        .sort((left, right) => right.created_at.localeCompare(left.created_at));
      const latestMessage = messages[0];
      return {
        id: conversation.id,
        recipientId: conversation.connector_profile_id,
        recipientMemberId,
        recipientName: profile.name,
        recipientRole: profile.role,
        recipientInitials: getInitials(profile.name),
        profileHref: profileHref(profile),
        lastMessage: latestMessage?.body ?? "No messages yet",
        lastMessageIsMine: latestMessage?.sender_id === userId,
        unreadCount: messages.filter((message) => message.sender_id !== userId && !message.read_at).length,
        updatedAt: latestMessage?.created_at ?? conversation.updated_at,
        isArchived: (conversation.archived_by ?? []).includes(userId),
      };
    } catch {
      return null;
    }
  }))).filter((summary): summary is DirectConversationSummary => summary !== null);
}

export async function getDirectConversationSummaries(
  user?: User | null,
): Promise<DirectConversationSummary[]> {
  if (isSupabaseConfigured()) {
    if (!user) return [];
    const [supabaseSummaries, localSummaries] = await Promise.all([
      getSupabaseConversationSummaries(user),
      getLocalConversationSummaries(user),
    ]);
    return [...supabaseSummaries, ...localSummaries].sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  return getLocalConversationSummaries(user);
}

export async function getUnreadDirectMessageCount(user?: User | null) {
  const summaries = await getDirectConversationSummaries(user);
  return summaries.reduce(
    (total, summary) => total + (summary.isArchived ? 0 : summary.unreadCount),
    0,
  );
}

export async function setDirectConversationArchived(
  conversationId: string,
  archived: boolean,
  user?: User | null,
) {
  const store = await readLocalStore();
  const userId = localUserId(user);
  const localIndex = store.conversations.findIndex(
    (conversation) =>
      conversation.id === conversationId &&
      (conversation.member_one_id === userId || conversation.member_two_id === userId),
  );

  if (localIndex >= 0) {
    const archivedBy = new Set(store.conversations[localIndex].archived_by ?? []);
    if (archived) archivedBy.add(userId);
    else archivedBy.delete(userId);
    store.conversations[localIndex] = {
      ...store.conversations[localIndex],
      archived_by: Array.from(archivedBy),
    };
    await writeLocalStore(store);
    return { archived };
  }

  if (isSupabaseConfigured()) {
    if (!user) throw new Error("Sign in before organizing conversations.");
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: conversation, error: conversationError } = await supabase
      .from("direct_conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (conversationError) {
      throw new Error(`Could not find the conversation: ${conversationError.message}`);
    }
    if (!conversation) throw new Error("That conversation is no longer available.");

    const { error } = archived
      ? await supabase.from("direct_conversation_preferences").upsert({
          conversation_id: conversationId,
          user_id: user.id,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      : await supabase
          .from("direct_conversation_preferences")
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id);
    if (error) {
      throw new Error(`Could not update the conversation: ${error.message}`);
    }
    return { archived };
  }

  throw new Error("That conversation is no longer available.");
}

export type {
  DirectConversationModel,
  DirectConversationSummary,
  DirectMessageModel,
  DirectMessageReactionModel,
  MessageForwardRecipient,
};
