"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  createModerationReport,
  setMemberBlocked,
  setMemberMuted,
  type ReportReason,
} from "@/lib/safety/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function safeReturnTo(value: FormDataEntryValue | null, fallback = "/settings") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  const url = new URL(value, "http://detroit-connect.local");
  return `${url.pathname}${url.search}${url.hash}`;
}

function withStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://detroit-connect.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function requireUser(user: Awaited<ReturnType<typeof getCurrentUser>>, next: string) {
  if (isSupabaseConfigured() && !user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
}

export async function setMemberBlockedAction(formData: FormData) {
  const targetId = String(formData.get("targetId") ?? "").trim();
  const targetName = String(formData.get("targetName") ?? "").trim().slice(0, 120);
  const profileHref = safeReturnTo(formData.get("profileHref"), "/network");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const blocked = String(formData.get("blocked")) === "true";
  const user = await getCurrentUser();
  requireUser(user, returnTo);

  try {
    await setMemberBlocked(targetId, blocked, { targetName, profileHref }, user);
  } catch (error) {
    redirect(withStatus(returnTo, "safetyError", error instanceof Error ? error.message : "Could not update this member."));
  }

  revalidatePath("/network");
  revalidatePath("/messages");
  revalidatePath("/forum");
  revalidatePath("/notifications");
  revalidatePath("/settings");
  revalidatePath(profileHref);
  redirect(withStatus(returnTo, "safety", blocked ? "blocked" : "unblocked"));
}

export async function setMemberMutedAction(formData: FormData) {
  const targetId = String(formData.get("targetId") ?? "").trim();
  const targetName = String(formData.get("targetName") ?? "").trim().slice(0, 120);
  const profileHref = safeReturnTo(formData.get("profileHref"), "/network");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const muted = String(formData.get("muted")) === "true";
  const user = await getCurrentUser();
  requireUser(user, returnTo);

  try {
    await setMemberMuted(targetId, muted, { targetName, profileHref }, user);
  } catch (error) {
    redirect(withStatus(returnTo, "safetyError", error instanceof Error ? error.message : "Could not update this member."));
  }

  revalidatePath("/forum");
  revalidatePath("/notifications");
  revalidatePath("/settings");
  revalidatePath(profileHref);
  redirect(withStatus(returnTo, "safety", muted ? "muted" : "unmuted"));
}

export async function reportContentAction(formData: FormData) {
  const reportedUserId = String(formData.get("reportedUserId") ?? "").trim() || null;
  const targetType = String(formData.get("targetType") ?? "profile") as "profile" | "post" | "comment" | "message";
  const targetId = String(formData.get("targetId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "") as ReportReason;
  const details = String(formData.get("details") ?? "").trim().slice(0, 600);
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  const user = await getCurrentUser();
  requireUser(user, returnTo);

  const reasons: ReportReason[] = [
    "spam",
    "harassment",
    "misinformation",
    "unsafe_advice",
    "impersonation",
    "other",
  ];

  if (!targetId || !reasons.includes(reason)) {
    redirect(withStatus(returnTo, "safetyError", "Choose a reason before submitting the report."));
  }

  try {
    await createModerationReport(
      { reportedUserId, targetType, targetId, reason, details },
      user,
    );
  } catch (error) {
    redirect(withStatus(returnTo, "safetyError", error instanceof Error ? error.message : "Could not submit the report."));
  }

  revalidatePath("/admin");
  redirect(withStatus(returnTo, "reported", "1"));
}
