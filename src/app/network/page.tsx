import { MapPin, MessageCircle, MoreHorizontal, UserMinus } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { FriendFinder } from "@/components/friend-finder";
import { getCurrentUser } from "@/lib/auth/user";
import { updateFriendRequestAction } from "@/lib/friends/actions";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type NetworkPageProps = {
  searchParams: Promise<{ error?: string; request?: string }>;
};

export default async function NetworkPage({ searchParams }: NetworkPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const dashboard = needsSignIn
    ? { friends: [], incomingRequests: [], outgoingRequests: [], recommendations: [] }
    : await getFriendsDashboard(user);

  return (
    <main className="page-shell friends-page network-page">
      <AppHeader />
      <section className="page-hero compact">
        <h1>Network</h1>
        {params.error ? <div className="page-notice is-error">{params.error}</div> : null}
        {params.request === "sent" ? <div className="page-notice">Connection request sent.</div> : null}
      </section>
      <section className="friends-layout">
        <section
          className="recommendation-panel"
          aria-label="Recommended by your network"
          aria-labelledby="recommendations-title"
        >
          <div className="panel-head friends-recommendation-head">
            <h2 id="recommendations-title">Recommended by your network</h2>
            <span aria-label={`${dashboard.recommendations.length} recommendations`}>
              {dashboard.recommendations.length}
            </span>
          </div>
          {needsSignIn ? (
            <div className="empty-panel compact-empty">
              <p>Sign in to see recommendations from your circle.</p>
              <Link href="/login?next=/network">Sign in</Link>
            </div>
          ) : dashboard.recommendations.length > 0 ? (
            <div className="recommendation-list">
              {dashboard.recommendations.map((recommendation) => (
                <article className="recommendation-card" key={recommendation.id}>
                  <div className="recommendation-signal">
                    <Link
                      aria-label={`View ${recommendation.recommenderName}'s profile`}
                      className="friend-avatar"
                      href={recommendation.recommenderProfileHref}
                    >
                      {recommendation.recommenderInitials}
                    </Link>
                    <div>
                      <Link href={recommendation.recommenderProfileHref}>
                        <strong>{recommendation.recommenderName}</strong>
                      </Link>
                      <span>recommended this connector</span>
                    </div>
                    <Link
                      aria-label={`Message ${recommendation.connector.name}`}
                      className="recommendation-message"
                      href={`/messages/${recommendation.connector.id}`}
                      title={`Message ${recommendation.connector.name}`}
                    >
                      <MessageCircle aria-hidden="true" size={17} />
                    </Link>
                  </div>
                  <div className="recommendation-profile">
                    <div className="connector-avatar" aria-hidden="true">
                      {recommendation.connector.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
                    </div>
                    <div className="recommendation-copy">
                      {recommendation.connector.kind === "organization" ? (
                        <span className="profile-kind">Organization</span>
                      ) : null}
                      <h3>
                        <Link href={`/connectors/${recommendation.connector.id}`}>{recommendation.connector.name}</Link>
                      </h3>
                      <p>{recommendation.connector.role}</p>
                      <p className="recommendation-meta">
                        <MapPin aria-hidden="true" size={13} />
                        <span>{recommendation.connector.neighborhood}</span>
                        <span aria-hidden="true">·</span>
                        <span>{recommendation.connector.languages.join(", ")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="recommendation-note">
                    <p>{recommendation.note}</p>
                  </div>
                  <div className="recommendation-footer">
                    <div className="tag-row" aria-label="Topics">
                      {recommendation.connector.topics.slice(0, 3).map((topic) => (
                        <span key={topic}>{topic}</span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel compact-empty">
              <p>Recommendations from people in your network will appear here.</p>
            </div>
          )}
        </section>
        <aside className="people-panel">
          <div className="panel-head">
            <h2>Your network</h2>
            <span aria-label={`${dashboard.friends.length} connections`}>{dashboard.friends.length}</span>
          </div>
          <FriendFinder disabled={needsSignIn} />

          {needsSignIn ? null : dashboard.incomingRequests.length > 0 ? (
            <section className="friend-request-block" aria-labelledby="friend-requests-title">
              <div className="friend-section-head">
                <h3 id="friend-requests-title">Requests</h3>
                <span>{dashboard.incomingRequests.length}</span>
              </div>
              <div className="friend-list">
                {dashboard.incomingRequests.map((friend) => (
                  <article className="friend-card request-card" key={friend.id}>
                    <div className="friend-avatar">{friend.initials}</div>
                    <div>
                      <h3><Link href={friend.profileHref}>{friend.name}</Link></h3>
                      <p>{friend.detail}</p>
                    </div>
                    <form className="friend-request-actions" action={updateFriendRequestAction}>
                      <input name="friendId" type="hidden" value={friend.id} />
                      <button className="accept" name="operation" type="submit" value="accept">
                        Accept
                      </button>
                      <button name="operation" type="submit" value="decline">
                        Decline
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="friend-list">
            {needsSignIn ? null : dashboard.friends.map((friend) => (
              <article className="friend-card" key={friend.id}>
                <div className="friend-avatar">{friend.initials}</div>
                <div>
                  <h3><Link href={friend.profileHref}>{friend.name}</Link></h3>
                  <p>{friend.detail}</p>
                </div>
                <div className="friend-card-actions">
                  <Link
                    aria-label={`Message ${friend.name}`}
                    className="friend-message-link"
                    href={`/messages/friend:${encodeURIComponent(friend.id)}`}
                  >
                    <MessageCircle aria-hidden="true" size={16} />
                  </Link>
                  <details className="friend-card-menu">
                    <summary aria-label={`Manage connection with ${friend.name}`} title="Manage connection">
                      <MoreHorizontal aria-hidden="true" size={16} />
                    </summary>
                    <form action={updateFriendRequestAction}>
                      <input name="friendId" type="hidden" value={friend.id} />
                      <button name="operation" type="submit" value="remove">
                        <UserMinus aria-hidden="true" size={14} />
                        Remove connection
                      </button>
                    </form>
                  </details>
                </div>
              </article>
            ))}
          </div>

          {needsSignIn ? null : dashboard.outgoingRequests.length > 0 ? (
            <section className="friend-request-block outgoing" aria-labelledby="sent-requests-title">
              <div className="friend-section-head">
                <h3 id="sent-requests-title">Sent</h3>
                <span>{dashboard.outgoingRequests.length}</span>
              </div>
              <div className="friend-list">
                {dashboard.outgoingRequests.map((friend) => (
                  <article className="friend-card" key={friend.id}>
                    <div className="friend-avatar">{friend.initials}</div>
                    <div>
                      <h3><Link href={friend.profileHref}>{friend.name}</Link></h3>
                      <p>Awaiting response</p>
                    </div>
                    <form action={updateFriendRequestAction}>
                      <input name="friendId" type="hidden" value={friend.id} />
                      <button className="cancel-request" name="operation" type="submit" value="cancel">
                        Cancel
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
