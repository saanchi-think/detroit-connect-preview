import Link from "next/link";
import { BellRing } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth/user";
import { getNotifications } from "@/lib/notifications/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const notifications = needsSignIn ? [] : await getNotifications(user);

  return (
    <main className="page-shell notifications-page">
      <AppHeader />
      <section className="page-hero compact">
        <h1>Notifications</h1>
      </section>

      {needsSignIn ? (
        <section className="empty-panel notification-empty">
          <p>Sign in to see updates from your Detroit Connect circle.</p>
          <Link href="/login?next=/notifications">Sign in</Link>
        </section>
      ) : notifications.length ? (
        <section className="notification-list" aria-label="Notifications">
          {notifications.map((notification) => (
            <Link
              className="notification-item"
              href={notification.href}
              key={notification.id}
            >
              <span
                aria-hidden="true"
                className={`notification-mark is-${notification.type}`}
              />
              <span className="notification-copy">
                <strong>{notification.title}</strong>
                <span>{notification.detail}</span>
              </span>
              <time dateTime={notification.createdAt}>
                {formatNotificationTime(notification.createdAt)}
              </time>
            </Link>
          ))}
        </section>
      ) : (
        <section className="empty-panel notification-empty">
          <BellRing aria-hidden="true" size={24} />
          <span>You&apos;re all caught up</span>
          <p>Network activity, recommendations, replies, and messages will appear here.</p>
        </section>
      )}
    </main>
  );
}
