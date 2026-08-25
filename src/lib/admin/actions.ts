"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  setAdminMemberStatus,
  updateModerationReportStatus,
  type AdminReportModel,
} from "@/lib/admin/repository";
import { getCurrentUser } from "@/lib/auth/user";

export async function updateModerationReportAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const status = String(formData.get("status") ?? "") as AdminReportModel["status"];
  const allowed: AdminReportModel["status"][] = ["open", "reviewing", "resolved", "dismissed"];
  const user = await getCurrentUser();

  if (!reportId || !allowed.includes(status)) {
    redirect("/admin?error=Invalid+report+update.");
  }

  try {
    await updateModerationReportStatus(reportId, status, user);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not update the report.")}`);
  }

  revalidatePath("/admin");
  redirect("/admin?updated=report");
}

export async function updateAdminMemberAction(formData: FormData) {
  const memberId = String(formData.get("memberId") ?? "").trim();
  const status = String(formData.get("status") ?? "") as "active" | "suspended";
  const user = await getCurrentUser();

  if (!memberId || (status !== "active" && status !== "suspended")) {
    redirect("/admin?error=Invalid+member+update.");
  }

  try {
    await setAdminMemberStatus(memberId, status, user);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not update the member.")}`);
  }

  revalidatePath("/admin");
  redirect("/admin?updated=member");
}
