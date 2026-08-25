import { readFile } from "node:fs/promises";
import type { User } from "@supabase/supabase-js";
import { getLocalDataPath } from "@/lib/local-data";
import { getLocalModerationReports } from "@/lib/safety/repository";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AdminMemberModel = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  status: "active" | "suspended";
  createdAt: string;
};

export type AdminReportModel = {
  id: string;
  reporterName: string;
  reportedName: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
};

export type AdminDashboardModel = {
  counts: {
    members: number;
    profiles: number;
    forumPosts: number;
    openReports: number;
  };
  members: AdminMemberModel[];
  reports: AdminReportModel[];
  searchOperations: {
    periodDays: number;
    searches: number;
    zeroResults: number;
    resultClicks: number;
    averageLatencyMs: number;
    positiveFeedback: number;
    negativeFeedback: number;
    topQueries: Array<{
      query: string;
      searches: number;
      zeroResults: number;
    }>;
    indexQueue: {
      queued: number;
      processing: number;
      retrying: number;
      failed: number;
    };
  };
};

const emptySearchOperations: AdminDashboardModel["searchOperations"] = {
  periodDays: 7,
  searches: 0,
  zeroResults: 0,
  resultClicks: 0,
  averageLatencyMs: 0,
  positiveFeedback: 0,
  negativeFeedback: 0,
  topQueries: [],
  indexQueue: { queued: 0, processing: 0, retrying: 0, failed: 0 },
};

function parseSearchOperations(value: unknown): AdminDashboardModel["searchOperations"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptySearchOperations;
  const data = value as Record<string, unknown>;
  const queue = data.indexQueue && typeof data.indexQueue === "object"
    ? data.indexQueue as Record<string, unknown>
    : {};
  const topQueries = Array.isArray(data.topQueries)
    ? data.topQueries.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const query = item as Record<string, unknown>;
        return typeof query.query === "string" ? [{
          query: query.query,
          searches: Number(query.searches) || 0,
          zeroResults: Number(query.zero_results) || 0,
        }] : [];
      })
    : [];

  return {
    periodDays: 7,
    searches: Number(data.searches) || 0,
    zeroResults: Number(data.zeroResults) || 0,
    resultClicks: Number(data.resultClicks) || 0,
    averageLatencyMs: Number(data.averageLatencyMs) || 0,
    positiveFeedback: Number(data.positiveFeedback) || 0,
    negativeFeedback: Number(data.negativeFeedback) || 0,
    topQueries,
    indexQueue: {
      queued: Number(queue.queued) || 0,
      processing: Number(queue.processing) || 0,
      retrying: Number(queue.retrying) || 0,
      failed: Number(queue.failed) || 0,
    },
  };
}

type LocalProfileRow = {
  id: string;
  owner_id: string | null;
  name: string;
  email?: string | null;
  created_at: string;
};

type LocalForumStore = {
  posts?: unknown[];
  comments?: unknown[];
};

async function readLocalJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(getLocalDataPath(name), "utf8")) as T;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
    return fallback;
  }
}

export async function isCurrentUserAdmin(user?: User | null) {
  if (!isSupabaseConfigured()) return true;
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin", {
    check_user_id: user.id,
  });
  if (error) return false;
  return Boolean(data);
}

async function getLocalAdminDashboard(): Promise<AdminDashboardModel> {
  const [profiles, forum, reports] = await Promise.all([
    readLocalJson<LocalProfileRow[]>("local-dev-store.json", []),
    readLocalJson<LocalForumStore>("local-dev-forum.json", {}),
    getLocalModerationReports(),
  ]);
  const allMembers = Array.from(
    new Map(
      profiles.map((profile) => [
        profile.owner_id ?? profile.id,
        {
          id: profile.owner_id ?? profile.id,
          name: profile.name,
          email: profile.email ?? null,
          role: "member",
          status: "active" as const,
          createdAt: profile.created_at,
        },
      ]),
    ).values(),
  );
  const members = allMembers.slice(0, 40);

  return {
    counts: {
      members: allMembers.length,
      profiles: profiles.length,
      forumPosts: forum.posts?.length ?? 0,
      openReports: reports.filter((report) => report.status === "open" || report.status === "reviewing").length,
    },
    members,
    reports: reports.map((report) => ({
      id: report.id,
      reporterName: "Local demo user",
      reportedName: report.reported_user_id ?? "Unknown member",
      targetType: report.target_type,
      targetId: report.target_id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.created_at,
    })),
    searchOperations: emptySearchOperations,
  };
}

export async function getAdminDashboard(user?: User | null): Promise<AdminDashboardModel | null> {
  if (!(await isCurrentUserAdmin(user))) return null;
  if (!isSupabaseConfigured()) return getLocalAdminDashboard();

  const supabase = await createClient();
  const [memberResult, profileResult, postResult, reportResult, searchOperationsResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, display_name, email, role, account_status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("connector_profiles").select("id", { count: "exact", head: true }),
    supabase.from("forum_posts").select("id", { count: "exact", head: true }),
    supabase
      .from("moderation_reports")
      .select(
        "id, reporter_id, reported_user_id, target_type, target_id, reason, details, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.rpc("get_search_operations_summary", { lookback_days: 7 }),
  ]);

  const error =
    memberResult.error ??
    profileResult.error ??
    postResult.error ??
    reportResult.error ??
    searchOperationsResult.error;
  if (error) throw new Error(`Could not load the admin dashboard: ${error.message}`);

  const reports = reportResult.data ?? [];
  const memberIds = Array.from(
    new Set(
      reports.flatMap((report) => [
        report.reporter_id,
        ...(report.reported_user_id ? [report.reported_user_id] : []),
      ]),
    ),
  );
  const { data: reportMembers, error: reportMemberError } = memberIds.length
    ? await supabase
        .from("user_profiles")
        .select("id, display_name")
        .in("id", memberIds)
    : { data: [], error: null };
  if (reportMemberError) {
    throw new Error(`Could not load report members: ${reportMemberError.message}`);
  }
  const memberNames = new Map(
    (reportMembers ?? []).map((member) => [member.id, member.display_name]),
  );

  return {
    counts: {
      members: memberResult.count ?? 0,
      profiles: profileResult.count ?? 0,
      forumPosts: postResult.count ?? 0,
      openReports: reports.filter(
        (report) => report.status === "open" || report.status === "reviewing",
      ).length,
    },
    members: (memberResult.data ?? []).map((member) => ({
      id: member.id,
      name: member.display_name,
      email: member.email,
      role: member.role,
      status: member.account_status === "suspended" ? "suspended" : "active",
      createdAt: member.created_at,
    })),
    reports: reports.map((report) => ({
      id: report.id,
      reporterName: memberNames.get(report.reporter_id) ?? "Detroit Connect member",
      reportedName: report.reported_user_id
        ? (memberNames.get(report.reported_user_id) ?? "Detroit Connect member")
        : "No member attached",
      targetType: report.target_type,
      targetId: report.target_id,
      reason: report.reason,
      details: report.details,
      status: (
        report.status === "reviewing" ||
        report.status === "resolved" ||
        report.status === "dismissed"
      ) ? report.status : "open",
      createdAt: report.created_at,
    })),
    searchOperations: parseSearchOperations(searchOperationsResult.data),
  };
}

export async function updateModerationReportStatus(
  reportId: string,
  status: AdminReportModel["status"],
  user?: User | null,
) {
  if (!(await isCurrentUserAdmin(user))) throw new Error("Administrator access required.");

  if (!isSupabaseConfigured()) {
    const store = await readLocalJson<{
      controls?: unknown[];
      reports?: Array<Record<string, unknown>>;
    }>("local-dev-safety.json", {});
    const reports = store.reports ?? [];
    const index = reports.findIndex((report) => report.id === reportId);
    if (index >= 0) {
      reports[index] = {
        ...reports[index],
        status,
        updated_at: new Date().toISOString(),
      };
      const { writeLocalJson } = await import("@/lib/local-data");
      await writeLocalJson(getLocalDataPath("local-dev-safety.json"), {
        controls: store.controls ?? [],
        reports,
      });
    }
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("moderation_reports")
    .update({
      status,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) throw new Error(`Could not update the report: ${error.message}`);
}

export async function setAdminMemberStatus(
  memberId: string,
  status: "active" | "suspended",
  user?: User | null,
) {
  if (!(await isCurrentUserAdmin(user))) throw new Error("Administrator access required.");
  if (!isSupabaseConfigured()) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_account_status", {
    target_user_id: memberId,
    next_status: status,
  });
  if (error) throw new Error(`Could not update the member: ${error.message}`);
}

export async function getAdminExport(
  dataset: "members" | "profiles" | "forum" | "reports",
  user?: User | null,
) {
  if (!(await isCurrentUserAdmin(user))) throw new Error("Administrator access required.");

  if (!isSupabaseConfigured()) {
    if (dataset === "reports") return getLocalModerationReports();
    if (dataset === "forum") return readLocalJson("local-dev-forum.json", {});
    if (dataset === "profiles") return readLocalJson("local-dev-store.json", []);
    const dashboard = await getLocalAdminDashboard();
    return dashboard.members;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_export_data", {
    export_kind: dataset,
  });
  if (error) throw new Error(`Could not export ${dataset}: ${error.message}`);
  return data;
}
