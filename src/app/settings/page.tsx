import { Bell, MessageCircle, Share2, UserPlus } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth/user";
import { getNotificationPreferences } from "@/lib/settings/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { saveSettingsAction } from "@/app/settings/actions";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const preferenceRows = [
  {
    name: "connectionRequests",
    label: "Connection requests",
    detail: "When someone asks to join your network.",
    icon: UserPlus,
  },
  {
    name: "directMessages",
    label: "Direct messages",
    detail: "When a new private message is waiting.",
    icon: MessageCircle,
  },
  {
    name: "forumReplies",
    label: "Forum replies",
    detail: "When someone replies to your post or comment.",
    icon: Bell,
  },
  {
    name: "recommendations",
    label: "Recommendations",
    detail: "When someone recommends you or shares a recommendation.",
    icon: Share2,
  },
] as const;

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const preferences = await getNotificationPreferences(user);

  return (
    <main className="page-shell settings-page">
      <AppHeader />
      <section className="page-hero compact">
        <h1>Settings</h1>
      </section>

      {needsSignIn ? (
        <section className="empty-panel settings-sign-in">
          <p>Sign in to manage your account settings.</p>
          <Link href="/login?next=/settings">Sign in</Link>
        </section>
      ) : (
        <form action={saveSettingsAction} className="settings-panel">
          <header>
            <div>
              <h2>Notifications</h2>
              <p>Choose which activity appears in your notifications.</p>
            </div>
          </header>
          {params.error ? <div className="page-notice is-error">{params.error}</div> : null}
          {params.saved === "1" ? <div className="page-notice" role="status">Settings saved.</div> : null}
          <div className="settings-list">
            {preferenceRows.map(({ detail, icon: Icon, label, name }) => (
              <label className="settings-row" key={name}>
                <span className="settings-row-icon"><Icon aria-hidden="true" size={18} /></span>
                <span className="settings-row-copy">
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <input defaultChecked={preferences[name]} name={name} type="checkbox" />
                <span aria-hidden="true" className="settings-toggle" />
              </label>
            ))}
          </div>
          <button className="settings-save" type="submit">Save changes</button>
        </form>
      )}
    </main>
  );
}
