import { MessageCircle, SquarePen, Users } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth/user";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { getDirectConversationSummaries } from "@/lib/messages/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type MessagesPageProps = {
  searchParams: Promise<{ filter?: string }>;
};

function formatInboxTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const [summaries, dashboard] = needsSignIn
    ? [[], { friends: [], incomingRequests: [], outgoingRequests: [], recommendations: [] }]
    : await Promise.all([getDirectConversationSummaries(user), getFriendsDashboard(user)]);
  const activeFilter = query.filter === "unread" ? "unread" : "all";
  const unreadTotal = summaries.reduce((total, summary) => total + summary.unreadCount, 0);
  const visibleSummaries =
    activeFilter === "unread"
      ? summaries.filter((summary) => summary.unreadCount > 0)
      : summaries;

  return (
    <main className="page-shell messages-page">
      <AppHeader />
      <section className="page-hero compact messages-hero">
        <div className="messages-title">
          <h1>Messages</h1>
          {unreadTotal > 0 ? (
            <span aria-label={`${unreadTotal} unread ${unreadTotal === 1 ? "message" : "messages"}`}>
              {unreadTotal}
            </span>
          ) : null}
        </div>
        {!needsSignIn ? (
          <details className="new-message-control">
            <summary>
              <SquarePen aria-hidden="true" size={17} />
              New message
            </summary>
            <div className="new-message-menu">
              <strong>Message a friend</strong>
              {dashboard.friends.length > 0 ? (
                <div className="new-message-friends">
                  {dashboard.friends.map((friend) => (
                    <Link href={`/messages/friend:${encodeURIComponent(friend.id)}`} key={friend.id}>
                      <span>{friend.initials}</span>
                      <span><strong>{friend.name}</strong><small>{friend.detail}</small></span>
                      <MessageCircle aria-hidden="true" size={15} />
                    </Link>
                  ))}
                </div>
              ) : <p>Add people to your network to start a private conversation.</p>}
              <Link className="find-message-contact" href="/connectors">
                <Users aria-hidden="true" size={15} />
                Find another connector
              </Link>
            </div>
          </details>
        ) : null}
      </section>

      {needsSignIn ? (
        <section className="empty-panel">
          <span>Sign in required</span>
          <p>Sign in to view your private conversations.</p>
          <Link href="/login?next=/messages">Sign in</Link>
        </section>
      ) : summaries.length > 0 ? (
        <section className="messages-inbox" aria-label="Your messages">
          <nav className="message-filters" aria-label="Filter conversations">
            <Link className={activeFilter === "all" ? "is-active" : ""} href="/messages">
              All <span>{summaries.length}</span>
            </Link>
            <Link className={activeFilter === "unread" ? "is-active" : ""} href="/messages?filter=unread">
              Unread <span>{unreadTotal}</span>
            </Link>
          </nav>
          {visibleSummaries.length > 0 ? (
            <div className="conversation-list" aria-label={`${activeFilter === "unread" ? "Unread" : "All"} conversations`}>
              {visibleSummaries.map((summary) => (
                <Link
                  aria-label={`Open conversation with ${summary.recipientName}${summary.unreadCount ? `, ${summary.unreadCount} unread` : ""}`}
                  className={`conversation-list-item${summary.unreadCount ? " is-unread" : ""}`}
                  href={`/messages/${summary.recipientId}`}
                  key={summary.id}
                >
                  <span className="conversation-profile-avatar" aria-hidden="true">
                    {summary.recipientInitials}
                  </span>
                  <span className="conversation-list-copy">
                    <span className="conversation-list-heading">
                      <strong>{summary.recipientName}</strong>
                      <time dateTime={summary.updatedAt}>{formatInboxTime(summary.updatedAt)}</time>
                    </span>
                    <small>{summary.recipientRole}</small>
                    <span className="conversation-preview">
                      {summary.lastMessageIsMine ? "You: " : ""}{summary.lastMessage}
                    </span>
                  </span>
                  {summary.unreadCount > 0 ? (
                    <span className="conversation-unread-count" aria-label={`${summary.unreadCount} unread`}>
                      {summary.unreadCount}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className="message-filter-empty">
              <MessageCircle aria-hidden="true" size={20} />
              <strong>No unread messages</strong>
              <Link href="/messages">View all conversations</Link>
            </div>
          )}
        </section>
      ) : (
        <section className="empty-panel">
          <span>No messages yet</span>
          <p>Start a private conversation with a friend or connector.</p>
          <Link href="/connectors">Find someone to message</Link>
        </section>
      )}
    </main>
  );
}
