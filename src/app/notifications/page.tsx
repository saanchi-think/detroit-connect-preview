import Link from "next/link";
import { BellOff, BellRing, CheckCheck, MoreHorizontal, Settings } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import {
  markAllNotificationsReadAction,
  openNotificationAction,
  setNotificationReadAction,
} from "@/app/notifications/actions";
import { RealtimePageRefresh } from "@/components/realtime-page-refresh";
import { getCurrentUser } from "@/lib/auth/user";
import { toggleForumPostMuteAction } from "@/lib/forum/actions";
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
  searchParams: Promise<{ error?: string; muted?: string; read?: string }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const notifications = needsSignIn ? [] : await getNotifications(user);
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);
  const unreadNotificationCount = unreadNotifications.reduce(
    (total, notification) => total + notification.groupCount,
    0,
  );
  const earlierNotifications = notifications.filter((notification) => notification.isRead);
  const groups = [
    { id: "new", label: "New", items: unreadNotifications },
    { id: "earlier", label: "Earlier", items: earlierNotifications },
  ].filter((group) => group.items.length > 0);

  return (
    <main className="page-shell notifications-page">
      <AppHeader />
      <RealtimePageRefresh eventName="notifications" />
      <section className="page-hero compact notifications-hero">
        <div className="notifications-title">
          <h1>Notifications</h1>
          {unreadNotificationCount > 0 ? (
            <span aria-label={`${unreadNotificationCount} unread notifications`}>
              {unreadNotificationCount}
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
      {params.muted === "1" ? <p className="page-notice" role="status">Conversation muted.</p> : null}

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
                {group.items.map((notification) => {
                  const serializedIds = JSON.stringify(notification.eventIds);
                  return (
                    <article
                      className={`notification-row${notification.isRead ? "" : " is-unread"}`}
                      key={notification.id}
                    >
                      <form action={openNotificationAction} className="notification-open-form">
                        <input name="href" type="hidden" value={notification.href} />
                        <input name="notificationIds" type="hidden" value={serializedIds} />
                        <button className="notification-item" type="submit">
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
                        </button>
                      </form>
                      {notification.eventIds.length > 0 || notification.postId ? (
                        <details className="notification-menu">
                          <summary aria-label={`More actions for ${notification.title}`} title="More actions">
                            <MoreHorizontal aria-hidden="true" size={18} />
                          </summary>
                          <div>
                            {notification.eventIds.length > 0 ? (
                              <form action={setNotificationReadAction}>
                                <input name="notificationIds" type="hidden" value={serializedIds} />
                                <input name="read" type="hidden" value={notification.isRead ? "false" : "true"} />
                                <input name="returnTo" type="hidden" value="/notifications" />
                                <button type="submit">
                                  <CheckCheck aria-hidden="true" size={15} />
                                  Mark as {notification.isRead ? "unread" : "read"}
                                </button>
                              </form>
                            ) : null}
                            {notification.postId ? (
                              <form action={toggleForumPostMuteAction}>
                                <input name="postId" type="hidden" value={notification.postId} />
                                <input name="returnTo" type="hidden" value="/notifications?muted=1" />
                                <button type="submit">
                                  <BellOff aria-hidden="true" size={15} />
                                  Mute this conversation
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </article>
                  );
                })}
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
