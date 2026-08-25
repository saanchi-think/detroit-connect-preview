import {
  Activity,
  Download,
  FileWarning,
  MessageSquareText,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  updateAdminMemberAction,
  updateModerationReportAction,
} from "@/lib/admin/actions";
import { getAdminDashboard } from "@/lib/admin/repository";
import { getCurrentUser } from "@/lib/auth/user";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{ error?: string; updated?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

const reportReasonLabels: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  unsafe_advice: "Unsafe advice",
  impersonation: "Impersonation",
  other: "Other",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const dashboard = await getAdminDashboard(user);

  if (!dashboard) {
    return (
      <main className="page-shell admin-page">
        <AppHeader />
        <section className="empty-panel">
          <ShieldCheck aria-hidden="true" size={24} />
          <h1>Administrator access required</h1>
          <p>This workspace is only available to Detroit Connect administrators.</p>
          <Link href="/">Return home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell admin-page">
      <AppHeader />
      <section className="page-hero compact admin-hero">
        <div>
          <span className="admin-eyebrow"><ShieldCheck aria-hidden="true" size={15} /> Administration</span>
          <h1>Community operations</h1>
        </div>
      </section>

      {params.error ? <div className="page-notice is-error">{params.error}</div> : null}
      {params.updated ? <div className="page-notice" role="status">Changes saved.</div> : null}

      <section className="admin-stats" aria-label="Platform overview">
        <article><Users aria-hidden="true" size={19} /><strong>{dashboard.counts.members}</strong><span>Members</span></article>
        <article><UserRoundCheck aria-hidden="true" size={19} /><strong>{dashboard.counts.profiles}</strong><span>Profiles</span></article>
        <article><MessageSquareText aria-hidden="true" size={19} /><strong>{dashboard.counts.forumPosts}</strong><span>Forum posts</span></article>
        <article className={dashboard.counts.openReports > 0 ? "needs-attention" : ""}><FileWarning aria-hidden="true" size={19} /><strong>{dashboard.counts.openReports}</strong><span>Open reports</span></article>
      </section>

      <div className="admin-layout">
        <section className="admin-panel" aria-labelledby="reports-title">
          <header>
            <div>
              <h2 id="reports-title">Moderation queue</h2>
              <p>Review reports and record a clear outcome.</p>
            </div>
          </header>
          <div className="admin-report-list">
            {dashboard.reports.length > 0 ? dashboard.reports.map((report) => (
              <article className="admin-report-row" key={report.id}>
                <div className="admin-report-main">
                  <div>
                    <span className={`admin-status status-${report.status}`}>{report.status}</span>
                    <strong>{reportReasonLabels[report.reason] ?? report.reason}</strong>
                  </div>
                  <p>{report.reporterName} reported {report.reportedName}&apos;s {report.targetType}.</p>
                  {report.details ? <blockquote>{report.details}</blockquote> : null}
                  <small>{formatDate(report.createdAt)} · Reference {report.targetId.slice(0, 12)}</small>
                </div>
                <form action={updateModerationReportAction}>
                  <input name="reportId" type="hidden" value={report.id} />
                  <label>
                    <span className="sr-only">Report status</span>
                    <select defaultValue={report.status} name="status">
                      <option value="open">Open</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </label>
                  <button type="submit">Update</button>
                </form>
              </article>
            )) : (
              <div className="admin-empty-state">
                <ShieldCheck aria-hidden="true" size={22} />
                <p>No reports need review.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="admin-side-column">
          <section className="admin-panel admin-search-health" aria-labelledby="search-health-title">
            <header>
              <div>
                <h2 id="search-health-title">Search health</h2>
                <p>Last {dashboard.searchOperations.periodDays} days</p>
              </div>
              <Activity aria-hidden="true" size={17} />
            </header>
            <dl className="admin-search-metrics">
              <div><dt>Searches</dt><dd>{dashboard.searchOperations.searches}</dd></div>
              <div><dt>No results</dt><dd>{dashboard.searchOperations.zeroResults}</dd></div>
              <div><dt>Result clicks</dt><dd>{dashboard.searchOperations.resultClicks}</dd></div>
              <div><dt>Avg. response</dt><dd>{dashboard.searchOperations.averageLatencyMs} ms</dd></div>
            </dl>
            <div className="admin-search-feedback-summary">
              <span>{dashboard.searchOperations.positiveFeedback} helpful</span>
              <span>{dashboard.searchOperations.negativeFeedback} not helpful</span>
            </div>
            <div className="admin-index-health">
              <strong>Index queue</strong>
              <span>{dashboard.searchOperations.indexQueue.queued} queued</span>
              <span>{dashboard.searchOperations.indexQueue.retrying} retrying</span>
              <span className={dashboard.searchOperations.indexQueue.failed > 0 ? "has-failures" : ""}>
                {dashboard.searchOperations.indexQueue.failed} failed
              </span>
            </div>
            {dashboard.searchOperations.topQueries.length > 0 ? (
              <div className="admin-top-queries">
                <strong>Frequent searches</strong>
                {dashboard.searchOperations.topQueries.slice(0, 4).map((query) => (
                  <div key={query.query}>
                    <span title={query.query}>{query.query}</span>
                    <small>{query.searches}</small>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
          <section className="admin-panel admin-export-panel" aria-labelledby="exports-title">
            <header>
              <div>
                <h2 id="exports-title">Data exports</h2>
                <p>Download administrator-only JSON snapshots.</p>
              </div>
            </header>
            <div className="admin-export-list">
              {(["members", "profiles", "forum", "reports"] as const).map((dataset) => (
                <a href={`/api/admin/export?dataset=${dataset}`} key={dataset}>
                  <span>{dataset[0].toUpperCase() + dataset.slice(1)}</span>
                  <Download aria-hidden="true" size={16} />
                </a>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="admin-panel admin-members-panel" aria-labelledby="members-title">
        <header>
          <div>
            <h2 id="members-title">Member access</h2>
            <p>Suspend an account only when continued access creates a community risk.</p>
          </div>
        </header>
        <div className="admin-member-table">
          {dashboard.members.map((member) => (
            <article key={member.id}>
              <div className="admin-member-avatar" aria-hidden="true">
                {member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
              </div>
              <div className="admin-member-copy">
                <strong>{member.name}</strong>
                <span>{member.email ?? "No email"} · {member.role}</span>
              </div>
              <span className={`admin-status status-${member.status}`}>{member.status}</span>
              <form action={updateAdminMemberAction}>
                <input name="memberId" type="hidden" value={member.id} />
                <input name="status" type="hidden" value={member.status === "active" ? "suspended" : "active"} />
                {member.status === "active" ? (
                  <ConfirmSubmitButton
                    confirmMessage={`Suspend ${member.name}? They will lose access until an administrator restores the account.`}
                    type="submit"
                  >
                    Suspend
                  </ConfirmSubmitButton>
                ) : (
                  <button type="submit">Restore</button>
                )}
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
