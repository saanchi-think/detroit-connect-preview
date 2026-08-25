import { readFile } from "node:fs/promises";
import type { User } from "@supabase/supabase-js";
import { isUuid } from "@/lib/identifiers";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type SafetyState = {
  isBlocked: boolean;
  isMuted: boolean;
};

export type SafetyControlModel = SafetyState & {
  targetId: string;
  targetName: string;
  profileHref: string;
  updatedAt: string;
};

export type ReportReason =
  | "spam"
  | "harassment"
  | "misinformation"
  | "unsafe_advice"
  | "impersonation"
  | "other";

type LocalSafetyControl = {
  actor_id: string;
  target_id: string;
  target_name: string;
  profile_href: string;
  blocked_at: string | null;
  muted_at: string | null;
  created_at: string;
  updated_at: string;
};

type LocalReport = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  target_type: "profile" | "post" | "comment" | "message";
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
};

type LocalSafetyStore = {
  controls: LocalSafetyControl[];
  reports: LocalReport[];
};

const LOCAL_SAFETY_PATH = getLocalDataPath("local-dev-safety.json");
const LOCAL_USER_ID = "local-dev-user";

function currentLocalUserId(user?: User | null) {
  return user?.id ?? LOCAL_USER_ID;
}

async function readLocalSafetyStore(): Promise<LocalSafetyStore> {
  try {
    const parsed = JSON.parse(await readFile(LOCAL_SAFETY_PATH, "utf8")) as Partial<LocalSafetyStore>;
    return {
      controls: parsed.controls ?? [],
      reports: parsed.reports ?? [],
    };
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
    return { controls: [], reports: [] };
  }
}

async function writeLocalSafetyStore(store: LocalSafetyStore) {
  await writeLocalJson(LOCAL_SAFETY_PATH, store);
}

export async function getSafetyState(targetId: string | null, user?: User | null): Promise<SafetyState> {
  if (!targetId || targetId === user?.id) {
    return { isBlocked: false, isMuted: false };
  }

  if (!isSupabaseConfigured()) {
    const store = await readLocalSafetyStore();
    const control = store.controls.find(
      (item) => item.actor_id === currentLocalUserId(user) && item.target_id === targetId,
    );
    return {
      isBlocked: Boolean(control?.blocked_at),
      isMuted: Boolean(control?.muted_at),
    };
  }

  if (!user) {
    return { isBlocked: false, isMuted: false };
  }
  if (!isUuid(targetId)) {
    return { isBlocked: false, isMuted: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_safety_controls")
    .select("blocked_at, muted_at")
    .eq("actor_id", user.id)
    .eq("target_id", targetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load safety controls: ${error.message}`);
  }

  return {
    isBlocked: Boolean(data?.blocked_at),
    isMuted: Boolean(data?.muted_at),
  };
}

export async function getSafetyControls(user?: User | null): Promise<SafetyControlModel[]> {
  if (!isSupabaseConfigured()) {
    const userId = currentLocalUserId(user);
    return (await readLocalSafetyStore()).controls
      .filter((control) => control.actor_id === userId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .map((control) => ({
        targetId: control.target_id,
        targetName: control.target_name,
        profileHref: control.profile_href,
        isBlocked: Boolean(control.blocked_at),
        isMuted: Boolean(control.muted_at),
        updatedAt: control.updated_at,
      }));
  }

  if (!user) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_safety_controls")
    .select("target_id, blocked_at, muted_at, updated_at")
    .eq("actor_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load safety controls: ${error.message}`);
  }

  const targetIds = (data ?? []).map((control) => control.target_id);
  const { data: members, error: memberError } = targetIds.length
    ? await supabase
        .from("public_member_profiles")
        .select("id, display_name")
        .in("id", targetIds)
    : { data: [], error: null };

  if (memberError) {
    throw new Error(`Could not load member names: ${memberError.message}`);
  }

  const memberNames = new Map(
    (members ?? []).map((member) => [member.id, member.display_name]),
  );
  const { data: profiles, error: profileError } = targetIds.length
    ? await supabase
        .from("connector_profiles")
        .select("id, owner_id")
        .in("owner_id", targetIds)
        .eq("status", "published")
    : { data: [], error: null };

  if (profileError) {
    throw new Error(`Could not load profile links: ${profileError.message}`);
  }

  const profileIds = new Map(
    (profiles ?? []).flatMap((profile) =>
      profile.owner_id ? [[profile.owner_id, profile.id] as const] : [],
    ),
  );

  return (data ?? []).map((control) => ({
    targetId: control.target_id,
    targetName: memberNames.get(control.target_id) ?? "Detroit Connect member",
    profileHref: profileIds.has(control.target_id)
      ? `/connectors/${profileIds.get(control.target_id)}`
      : `/members/${control.target_id}`,
    isBlocked: Boolean(control.blocked_at),
    isMuted: Boolean(control.muted_at),
    updatedAt: control.updated_at,
  }));
}

export async function getSuppressedUserIds(user?: User | null) {
  if (isSupabaseConfigured() && user) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_hidden_member_ids");
    if (error) {
      throw new Error(`Could not load hidden members: ${error.message}`);
    }
    return {
      blockedIds: new Set(
        (data ?? []).filter((control) => control.is_blocked).map((control) => control.member_id),
      ),
      mutedIds: new Set(
        (data ?? []).filter((control) => control.is_muted).map((control) => control.member_id),
      ),
    };
  }

  const controls = await getSafetyControls(user);
  return {
    blockedIds: new Set(
      controls.filter((control) => control.isBlocked).map((control) => control.targetId),
    ),
    mutedIds: new Set(
      controls.filter((control) => control.isMuted).map((control) => control.targetId),
    ),
  };
}

async function setLocalSafetyControl(
  targetId: string,
  kind: "blocked" | "muted",
  enabled: boolean,
  metadata: { targetName: string; profileHref: string },
  user?: User | null,
) {
  const store = await readLocalSafetyStore();
  const userId = currentLocalUserId(user);
  const timestamp = new Date().toISOString();
  const index = store.controls.findIndex(
    (control) => control.actor_id === userId && control.target_id === targetId,
  );
  const existing = index >= 0 ? store.controls[index] : null;
  const next: LocalSafetyControl = {
    actor_id: userId,
    target_id: targetId,
    target_name: metadata.targetName || existing?.target_name || "Detroit Connect member",
    profile_href: metadata.profileHref || existing?.profile_href || `/members/${targetId}`,
    blocked_at: kind === "blocked" ? (enabled ? timestamp : null) : (existing?.blocked_at ?? null),
    muted_at: kind === "muted" ? (enabled ? timestamp : null) : (existing?.muted_at ?? null),
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
  };

  if (!next.blocked_at && !next.muted_at) {
    if (index >= 0) store.controls.splice(index, 1);
  } else if (index >= 0) {
    store.controls[index] = next;
  } else {
    store.controls.push(next);
  }

  if (kind === "blocked" && enabled) {
    try {
      const friendsPath = getLocalDataPath("local-dev-friends.json");
      const friends = JSON.parse(await readFile(friendsPath, "utf8")) as Array<{
        id: string;
        user_id: string;
      }>;
      await writeLocalJson(
        friendsPath,
        friends.filter(
          (friend) =>
            !(friend.user_id === userId && friend.id === targetId),
        ),
      );
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  await writeLocalSafetyStore(store);
}

export async function setMemberBlocked(
  targetId: string,
  blocked: boolean,
  metadata: { targetName: string; profileHref: string },
  user?: User | null,
) {
  if (!targetId) throw new Error("This member could not be found.");

  if (!isSupabaseConfigured()) {
    await setLocalSafetyControl(targetId, "blocked", blocked, metadata, user);
    return;
  }
  if (!user) throw new Error("Sign in before changing safety controls.");
  if (!isUuid(targetId)) {
    throw new Error("Safety controls are not available for this demo profile.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_block", {
    target_user_id: targetId,
    should_block: blocked,
  });
  if (error) throw new Error(`Could not ${blocked ? "block" : "unblock"} this member: ${error.message}`);
}

export async function setMemberMuted(
  targetId: string,
  muted: boolean,
  metadata: { targetName: string; profileHref: string },
  user?: User | null,
) {
  if (!targetId) throw new Error("This member could not be found.");

  if (!isSupabaseConfigured()) {
    await setLocalSafetyControl(targetId, "muted", muted, metadata, user);
    return;
  }
  if (!user) throw new Error("Sign in before changing safety controls.");
  if (!isUuid(targetId)) {
    throw new Error("Safety controls are not available for this demo profile.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_mute", {
    target_user_id: targetId,
    should_mute: muted,
  });
  if (error) throw new Error(`Could not ${muted ? "mute" : "unmute"} this member: ${error.message}`);
}

export async function createModerationReport(
  input: {
    reportedUserId: string | null;
    targetType: "profile" | "post" | "comment" | "message";
    targetId: string;
    reason: ReportReason;
    details: string;
  },
  user?: User | null,
) {
  if (!isSupabaseConfigured()) {
    const store = await readLocalSafetyStore();
    const timestamp = new Date().toISOString();
    store.reports.unshift({
      id: crypto.randomUUID(),
      reporter_id: currentLocalUserId(user),
      reported_user_id: input.reportedUserId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      details: input.details || null,
      status: "open",
      created_at: timestamp,
      updated_at: timestamp,
    });
    await writeLocalSafetyStore(store);
    return;
  }
  if (!user) throw new Error("Sign in before reporting content.");

  const supabase = await createClient();
  const { error } = await supabase.from("moderation_reports").insert({
    reporter_id: user.id,
    reported_user_id: isUuid(input.reportedUserId) ? input.reportedUserId : null,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details || null,
  });
  if (error) throw new Error(`Could not submit the report: ${error.message}`);
}

export async function getLocalModerationReports() {
  return (await readLocalSafetyStore()).reports;
}
