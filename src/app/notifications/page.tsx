import Link from "next/link";
import { BellRing, CheckCheck, Settings } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { markAllNotificationsReadAction } from "@/app/notifications/actions";
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

type NotificationsPageProps = {
  searchParams: Promise<{ error?: string; read?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const notifications = needsSignIn ? [] : await getNotifications(user);
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);
  const earlierNotifications = notifications.filter((notification) => notification.isRead);
  const groups = [
    { id: "new", label: "New", items: unreadNotifications },
    { id: "earlier", label: "Earlier", items: earlierNotifications },
  ].filter((group) => group.items.length > 0);

  return (
    <main className="page-shell notifications-page">
      <AppHeader />
      <section className="page-hero compact notifications-hero">
        <div className="notifications-title">
          <h1>Notifications</h1>
          {unreadNotifications.length > 0 ? (
            <span aria-label={`${unreadNotifications.length} unread notifications`}>
              {unreadNotifications.length}
            </span>
          ) : null}
        </div>
        <div className="notification-page-actions">
          {unreadNotifications.length > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit">
                <CheckCheck aria-hidden="true" size={16} />
                Mark all as read
              </button>
            </form>
          ) : null}
          <Link aria-label="Notification settings" href="/settings#notification-delivery" title="Notification settings">
            <Settings aria-hidden="true" size={17} />
          </Link>
        </div>
      </section>

      {params.error ? <p className="page-notice is-error" role="alert">{params.error}</p> : null}
      {params.read === "all" ? <p className="page-notice" role="status">All notifications marked as read.</p> : null}

      {needsSignIn ? (
        <section className="empty-panel notification-empty">
          <p>Sign in to see updates from your Detroit Connect circle.</p>
          <Link href="/login?next=/notifications">Sign in</Link>
        </section>
      ) : notifications.length ? (
        <section className="notification-list" aria-label="Notifications">
          {groups.map((group) => (
            <section className="notification-group" aria-labelledby={`notification-group-${group.id}`} key={group.id}>
              <header className="notification-group-heading">
                <h2 id={`notification-group-${group.id}`}>{group.label}</h2>
                <span>{group.items.length}</span>
              </header>
              <div>
                {group.items.map((notification) => (
                  <Link
                    className={`notification-item${notification.isRead ? "" : " is-unread"}`}
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
              </div>
            </section>
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
