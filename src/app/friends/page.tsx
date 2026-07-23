import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth/user";
import { addFriendAction, updateFriendRequestAction } from "@/lib/friends/actions";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type FriendsPageProps = {
  searchParams: Promise<{ error?: string; request?: string }>;
};

export default async function FriendsPage({ searchParams }: FriendsPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const dashboard = needsSignIn
    ? { friends: [], incomingRequests: [], outgoingRequests: [], recommendations: [] }
    : await getFriendsDashboard(user);

  return (
    <main className="page-shell friends-page">
      <AppHeader />
      <section className="page-hero compact">
        <h1>Friends</h1>
        {params.error ? <div className="page-notice is-error">{params.error}</div> : null}
        {params.request === "sent" ? <div className="page-notice">Friend request sent.</div> : null}
      </section>
      <section className="friends-layout">
        <section className="recommendation-panel" aria-labelledby="recommendations-title">
          <div className="panel-head">
            <h2 id="recommendations-title">Recommendations</h2>
            <span>{dashboard.recommendations.length}</span>
          </div>
          {needsSignIn ? (
            <div className="empty-panel compact-empty">
              <p>Sign in to see recommendations from your circle.</p>
              <Link href="/login?next=/friends">Sign in</Link>
            </div>
          ) : dashboard.recommendations.length > 0 ? (
            <div className="recommendation-list">
              {dashboard.recommendations.map((recommendation) => (
                <article className="recommendation-card" key={recommendation.id}>
                  <div className="recommendation-signal">
                    <div className="friend-avatar">{recommendation.recommenderInitials}</div>
                    <div>
                      <span>Recommended by</span>
                      <strong>{recommendation.recommenderName}</strong>
                    </div>
                  </div>
                  <div className="recommendation-copy">
                    <h3>{recommendation.connector.name}</h3>
                    <p>
                      {recommendation.connector.role} · {recommendation.connector.neighborhood}
                    </p>
                  </div>
                  <p className="recommendation-note">{recommendation.note}</p>
                  <div className="tag-row">
                    {recommendation.connector.topics.slice(0, 3).map((topic) => (
                      <span key={topic}>{topic}</span>
                    ))}
                  </div>
                  <Link href={`/connectors/${recommendation.connector.id}`}>View connector</Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-panel compact-empty">
              <p>Add friends to surface connectors they recommend.</p>
            </div>
          )}
        </section>
        <aside className="people-panel">
          <div className="panel-head">
            <h2>People</h2>
            <span>{dashboard.friends.length}</span>
          </div>
          <form className="friend-invite" action={addFriendAction}>
            <label>
              <span>Add by name or email</span>
              <input name="friendQuery" type="search" placeholder="nia@example.com" />
            </label>
            <button type="submit">Add</button>
          </form>

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
                      <h3>{friend.name}</h3>
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
                  <h3>{friend.name}</h3>
                  <p>{friend.detail}</p>
                </div>
                <span className={`friend-status is-${friend.status}`}>
                  {friend.status === "accepted" ? "Friend" : "Pending"}
                </span>
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
                      <h3>{friend.name}</h3>
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
