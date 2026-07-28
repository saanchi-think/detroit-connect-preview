import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type NotificationPreferences = {
  connectionRequests: boolean;
  directMessages: boolean;
  forumReplies: boolean;
  recommendations: boolean;
};

const defaultPreferences: NotificationPreferences = {
  connectionRequests: true,
  directMessages: true,
  forumReplies: true,
  recommendations: true,
};

type LocalSettingsStore = Record<string, NotificationPreferences>;

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
    return store[user?.id ?? LOCAL_USER_ID] ?? defaultPreferences;
  }

  if (!user) {
    return defaultPreferences;
  }

  const supabase = (await createClient()) as SupabaseClient<Database>;
  const { data, error } = await supabase
    .from("user_settings")
    .select("connection_requests, direct_messages, forum_replies, recommendations")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load settings: ${error.message}`);
  }

  return data
    ? {
        connectionRequests: data.connection_requests,
        directMessages: data.direct_messages,
        forumReplies: data.forum_replies,
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
    store[user?.id ?? LOCAL_USER_ID] = preferences;
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
    forum_replies: preferences.forumReplies,
    recommendations: preferences.recommendations,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Could not save settings: ${error.message}`);
  }
}
