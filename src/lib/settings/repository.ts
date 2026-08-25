import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type NotificationPreferences = {
  connectionRequests: boolean;
  directMessages: boolean;
  emailNotifications: boolean;
  digestFrequency: "immediate" | "daily" | "weekly";
  forumReplies: boolean;
  notificationsReadAt: string | null;
  recommendations: boolean;
};

export type AccountPrivacyPreferences = {
  contactVisibility: "members" | "network" | "private";
  messagePermission: "members" | "network" | "none";
  profileVisibility: "public" | "members" | "network";
};

export type MemberPrivacyContext = AccountPrivacyPreferences & {
  canMessage: boolean;
  canViewContact: boolean;
  canViewProfile: boolean;
};

const defaultPreferences: NotificationPreferences = {
  connectionRequests: true,
  directMessages: true,
  emailNotifications: false,
  digestFrequency: "daily",
  forumReplies: true,
  notificationsReadAt: null,
  recommendations: true,
};

export const defaultPrivacyPreferences: AccountPrivacyPreferences = {
  contactVisibility: "network",
  messagePermission: "members",
  profileVisibility: "public",
};

type LocalSettingsRecord = Partial<NotificationPreferences & AccountPrivacyPreferences>;
type LocalSettingsStore = Record<string, LocalSettingsRecord>;

const LOCAL_SETTINGS_PATH = getLocalDataPath("local-dev-settings.json");
const LOCAL_USER_ID = "local-dev-user";

async function readLocalSettings(): Promise<LocalSettingsStore> {
  try {
    return JSON.parse(await readFile(LOCAL_SETTINGS_PATH, "utf8")) as LocalSettingsStore;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    return {};
  }
}
export async function getNotificationPreferences(user?: User | null): Promise<NotificationPreferences> {
  if (!isSupabaseConfigured()) {
    const store = await readLocalSettings();
    return {
      ...defaultPreferences,
      ...(store[user?.id ?? LOCAL_USER_ID] ?? {}),
    };
  }

  if (!user) {
    return defaultPreferences;
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "connection_requests, direct_messages, email_notifications, email_digest_frequency, forum_replies, notifications_read_at, recommendations",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load settings: ${error.message}`);
  }

  return data
    ? {
        connectionRequests: data.connection_requests,
        directMessages: data.direct_messages,
        emailNotifications: data.email_notifications,
        digestFrequency:
          data.email_digest_frequency === "immediate" || data.email_digest_frequency === "weekly"
            ? data.email_digest_frequency
            : "daily",
        forumReplies: data.forum_replies,
        notificationsReadAt: data.notifications_read_at,
        recommendations: data.recommendations,
      }
    : defaultPreferences;
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
  user?: User | null,
) {
  if (!isSupabaseConfigured()) {
    const store = await readLocalSettings();
    const userId = user?.id ?? LOCAL_USER_ID;
    store[userId] = { ...(store[userId] ?? {}), ...preferences };
    await writeLocalJson(LOCAL_SETTINGS_PATH, store);
    return;
  }

  if (!user) {
    throw new Error("Sign in before changing settings.");
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    connection_requests: preferences.connectionRequests,
    direct_messages: preferences.directMessages,
    email_notifications: preferences.emailNotifications,
    email_digest_frequency: preferences.digestFrequency,
    forum_replies: preferences.forumReplies,
    notifications_read_at: preferences.notificationsReadAt,
    recommendations: preferences.recommendations,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Could not save settings: ${error.message}`);
  }
}

function normalizePrivacyPreferences(value?: Partial<AccountPrivacyPreferences> | null): AccountPrivacyPreferences {
  return {
    contactVisibility:
      value?.contactVisibility === "members" || value?.contactVisibility === "private"
        ? value.contactVisibility
        : "network",
    messagePermission:
      value?.messagePermission === "network" || value?.messagePermission === "none"
        ? value.messagePermission
        : "members",
    profileVisibility:
      value?.profileVisibility === "members" || value?.profileVisibility === "network"
        ? value.profileVisibility
        : "public",
  };
}

export async function getAccountPrivacyPreferences(
  user?: User | null,
): Promise<AccountPrivacyPreferences> {
  if (!isSupabaseConfigured()) {
    const store = await readLocalSettings();
    return normalizePrivacyPreferences(store[user?.id ?? LOCAL_USER_ID]);
  }

  if (!user) {
    return defaultPrivacyPreferences;
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase
    .from("user_settings")
    .select("contact_visibility, message_permission, profile_visibility")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load privacy settings: ${error.message}`);
  }

  return normalizePrivacyPreferences(
    data
      ? {
          contactVisibility: data.contact_visibility as AccountPrivacyPreferences["contactVisibility"],
          messagePermission: data.message_permission as AccountPrivacyPreferences["messagePermission"],
          profileVisibility: data.profile_visibility as AccountPrivacyPreferences["profileVisibility"],
        }
      : null,
  );
}

export async function saveAccountPrivacyPreferences(
  preferences: AccountPrivacyPreferences,
  user?: User | null,
) {
  if (!isSupabaseConfigured()) {
    const store = await readLocalSettings();
    const userId = user?.id ?? LOCAL_USER_ID;
    store[userId] = { ...(store[userId] ?? {}), ...preferences };
    await writeLocalJson(LOCAL_SETTINGS_PATH, store);
    return;
  }

  if (!user) {
    throw new Error("Sign in before changing privacy settings.");
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    contact_visibility: preferences.contactVisibility,
    message_permission: preferences.messagePermission,
    profile_visibility: preferences.profileVisibility,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Could not save privacy settings: ${error.message}`);
  }
}

export async function getMemberPrivacyContext(
  ownerId: string | null,
  viewer?: User | null,
): Promise<MemberPrivacyContext> {
  if (!ownerId) {
    return {
      ...defaultPrivacyPreferences,
      canMessage: false,
      canViewContact: Boolean(viewer) || !isSupabaseConfigured(),
      canViewProfile: true,
    };
  }

  if (!isSupabaseConfigured()) {
    const preferences = await getAccountPrivacyPreferences(viewer);
    return {
      ...preferences,
      canMessage: preferences.messagePermission !== "none",
      canViewContact: preferences.contactVisibility !== "private",
      canViewProfile: true,
    };
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase.rpc("get_member_privacy", {
    target_user_id: ownerId,
  });

  if (error) {
    throw new Error(`Could not load member privacy: ${error.message}`);
  }

  const context = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  const preferences = normalizePrivacyPreferences({
    contactVisibility: context.contactVisibility as AccountPrivacyPreferences["contactVisibility"],
    messagePermission: context.messagePermission as AccountPrivacyPreferences["messagePermission"],
    profileVisibility: context.profileVisibility as AccountPrivacyPreferences["profileVisibility"],
  });

  return {
    ...preferences,
    canMessage: context.canMessage === true,
    canViewContact: context.canViewContact === true,
    canViewProfile: context.canViewProfile === true,
  };
}

export async function markAllNotificationsRead(user?: User | null) {
  const readAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const store = await readLocalSettings();
    const userId = user?.id ?? LOCAL_USER_ID;
    store[userId] = {
      ...defaultPreferences,
      ...(store[userId] ?? {}),
      notificationsReadAt: readAt,
    };
    await writeLocalJson(LOCAL_SETTINGS_PATH, store);
    return readAt;
  }

  if (!user) {
    throw new Error("Sign in before updating notifications.");
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    throw new Error(`Could not mark notifications as read: ${error.message}`);
  }

  return data;
}
