import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ProfileAvatar } from "@/components/profile-avatar";
import { getCurrentUser } from "@/lib/auth/user";
import { getConnectorProfileById } from "@/lib/connectors/repository";
import { toggleFavoriteAction } from "@/lib/favorites/actions";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";
import { addFriendAction, recommendConnectorAction } from "@/lib/friends/actions";
import { getFriendsDashboard } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type ConnectorProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ recommended?: string }>;
};

function profileKindLabel(kind: "person" | "vendor" | "organization") {
  if (kind === "vendor") {
    return "Vendor";
  }

  if (kind === "organization") {
    return "Organization";
  }

  return "Connector";
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ConnectorProfilePage({ params, searchParams }: ConnectorProfilePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [profile, user] = await Promise.all([getConnectorProfileById(id), getCurrentUser()]);

  if (!profile) {
    notFound();
  }

  const [favoriteIds, friendsDashboard] = await Promise.all([
    getFavoriteConnectorIds(user),
    isSupabaseConfigured() && !user ? null : getFriendsDashboard(user),
  ]);
  const isSaved = favoriteIds.includes(profile.id);
  const contactHref = profile.email
    ? `mailto:${profile.email}`
    : profile.phone
      ? `tel:${profile.phone}`
      : null;
  const friendQuery = profile.email ?? profile.name;
  const recommendationSignals =
    friendsDashboard?.recommendations.filter(
      (recommendation) => recommendation.connector.id === profile.id,
    ) ?? [];
  const circleSignal =
    recommendationSignals.length > 0
      ? `Recommended by ${recommendationSignals.map((recommendation) => recommendation.recommenderName).join(", ")}`
      : profile.friendSignal;

  return (
    <main className="page-shell connector-profile-page">
      <AppHeader />
      <Link className="profile-back-link" href="/connectors">
        <span aria-hidden="true">←</span> Back to connectors
      </Link>

      <section className="connector-profile-hero" aria-labelledby="connector-name">
        <div className="profile-identity">
          <div className={`profile-portrait${profile.avatarKey ? " has-graphic" : ""}`} aria-hidden="true">
            {profile.avatarKey ? (
              <ProfileAvatar avatar={profile.avatarKey} />
            ) : (
              <span>{getInitials(profile.name)}</span>
            )}
          </div>
          <div className="profile-identity-copy">
            <span className="profile-kind">{profileKindLabel(profile.kind)}</span>
            <h1 id="connector-name">{profile.name}</h1>
            <p className="profile-role">{profile.role}</p>
            <div className="profile-location-row">
              <span>{profile.neighborhood}</span>
              {profile.zipCode ? <span>{profile.zipCode}</span> : null}
              <span>{profile.languages.join(", ")}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <form action={toggleFavoriteAction}>
            <input name="connectorProfileId" type="hidden" value={profile.id} />
            <input name="redirectTo" type="hidden" value={`/connectors/${profile.id}`} />
            <button className={`profile-action-button save${isSaved ? " is-saved" : ""}`} type="submit">
              {isSaved ? "Saved" : "Save profile"}
            </button>
          </form>
          <form action={addFriendAction}>
            <input name="friendQuery" type="hidden" value={friendQuery} />
            <button className="profile-action-button" type="submit">
              Add friend
            </button>
          </form>
          <details className="profile-recommend-control">
            <summary className="profile-action-button">Recommend</summary>
            <form action={recommendConnectorAction}>
              <input name="connectorProfileId" type="hidden" value={profile.id} />
              <input name="redirectTo" type="hidden" value={`/connectors/${profile.id}`} />
              <label>
                <span>Recommendation note</span>
                <textarea
                  maxLength={280}
                  name="note"
                  placeholder="Why should your friends contact this connector?"
                />
              </label>
              <button type="submit">Share with friends</button>
            </form>
          </details>
          {contactHref ? (
            <a className="profile-action-button primary" href={contactHref}>
              Contact
            </a>
          ) : null}
        </div>

        <div className="profile-trust-signal">
          <span>Circle signal</span>
          <strong>{circleSignal}</strong>
        </div>
        {query.recommended === "1" ? (
          <div className="profile-share-notice" role="status">
            Recommendation shared with your friends.
          </div>
        ) : null}
      </section>

      <div className="connector-profile-content">
        <div className="profile-main-content">
          <section className="profile-section" aria-labelledby="help-topics-title">
            <span className="profile-section-label">Expertise</span>
            <h2 id="help-topics-title">Can help with</h2>
            <div className="profile-topic-list">
              {profile.topics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
          </section>

          {profile.bio ? (
            <section className="profile-section" aria-labelledby="about-profile-title">
              <span className="profile-section-label">About</span>
              <h2 id="about-profile-title">Detroit connection</h2>
              <p>{profile.bio}</p>
            </section>
          ) : null}

          {profile.skills.length > 0 ? (
            <section className="profile-section" aria-labelledby="skills-title">
              <span className="profile-section-label">Background</span>
              <h2 id="skills-title">Skills</h2>
              <div className="profile-skill-list">
                {profile.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="profile-facts" aria-labelledby="profile-details-title">
          <h2 id="profile-details-title">Profile details</h2>
          <dl>
            <div>
              <dt>Neighborhood</dt>
              <dd>{profile.neighborhood}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{profile.languages.join(", ")}</dd>
            </div>
            {profile.yearsConnected ? (
              <div>
                <dt>Connected to Detroit</dt>
                <dd>{profile.yearsConnected}</dd>
              </div>
            ) : null}
            <div>
              <dt>Available for</dt>
              <dd>{profile.availability.length > 0 ? profile.availability.join(", ") : "Messages"}</dd>
            </div>
            {profile.preferredContactMethod ? (
              <div>
                <dt>Preferred contact</dt>
                <dd>{profile.preferredContactMethod}</dd>
              </div>
            ) : null}
            {profile.organizationName ? (
              <div>
                <dt>Organization</dt>
                <dd>{profile.organizationName}</dd>
              </div>
            ) : null}
          </dl>

          {profile.trustBadges.length > 0 ? (
            <div className="profile-badges">
              {profile.trustBadges.map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
