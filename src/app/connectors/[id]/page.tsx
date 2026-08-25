import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Clock3,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConnectorAvatar } from "@/components/connector-avatar";
import { ProfileSocialPanel } from "@/components/profile-social-panel";
import { ProfileSafetyMenu } from "@/components/profile-safety-menu";
import { ShareButton } from "@/components/share-button";
import { getCurrentUser } from "@/lib/auth/user";
import { getConnectorProfileById } from "@/lib/connectors/repository";
import { toggleFavoriteAction } from "@/lib/favorites/actions";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";
import { getForumPostsByProfile } from "@/lib/forum/repository";
import {
  addFriendAction,
  recommendConnectorAction,
  updateFriendRequestAction,
} from "@/lib/friends/actions";
import { getFriendsDashboard, getProfileSocialContext } from "@/lib/friends/repository";
import { isUuid } from "@/lib/identifiers";
import { getSafetyState } from "@/lib/safety/repository";
import { getMemberPrivacyContext } from "@/lib/settings/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type ConnectorProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    friend?: string;
    recommended?: string;
    reported?: string;
    safety?: string;
    safetyError?: string;
    updated?: string;
  }>;
};

function profileKindLabel(kind: "person" | "vendor" | "organization") {
  return kind === "organization" || kind === "vendor" ? "Organization" : "User";
}

export default async function ConnectorProfilePage({ params, searchParams }: ConnectorProfilePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [profile, user] = await Promise.all([getConnectorProfileById(id), getCurrentUser()]);

  if (!profile) {
    notFound();
  }

  const [favoriteIds, socialContext, dashboard, communityPosts, safetyState, privacyContext] = await Promise.all([
    getFavoriteConnectorIds(user),
    getProfileSocialContext(profile, user),
    getFriendsDashboard(user),
    getForumPostsByProfile(profile, user),
    getSafetyState(profile.ownerId, user),
    getMemberPrivacyContext(profile.ownerId, user),
  ]);
  const shareFriends = dashboard.friends.map(({ id, initials, name, profileHref }) => ({
    id,
    initials,
    name,
    profileHref,
  }));
  const isSaved = favoriteIds.includes(profile.id);
  const isSelf = socialContext.relationship === "self";
  const contactHref = privacyContext.canViewContact && profile.email
    ? `mailto:${profile.email}`
    : privacyContext.canViewContact && profile.phone
      ? `tel:${profile.phone}`
      : null;
  const circleSignal =
    socialContext.recommendedBy.length > 0
      ? `Recommended by ${socialContext.recommendedBy.length} ${
          socialContext.recommendedBy.length === 1 ? "user" : "users"
        }`
      : socialContext.mutualFriendCount > 0
        ? `${socialContext.mutualFriendCount} mutual ${socialContext.mutualFriendCount === 1 ? "connection" : "connections"}`
        : profile.friendSignal;

  return (
    <main className="page-shell connector-profile-page">
      <AppHeader />
      <Link className="profile-back-link" href="/connectors">
        <ArrowLeft aria-hidden="true" size={16} /> Back to connectors
      </Link>

      <section className="social-profile-header" aria-labelledby="connector-name">
        <div className="social-profile-cover" aria-hidden="true">
          <span>Detroit Connect</span>
        </div>

        <div className="social-profile-header-body">
          <div className="social-profile-identity">
            <div
              className={`profile-portrait${profile.avatarKey || profile.avatarUrl ? " has-graphic" : ""}`}
              aria-hidden="true"
            >
              <ConnectorAvatar
                avatarKey={profile.avatarKey}
                avatarUrl={profile.avatarUrl}
                name={profile.name}
              />
            </div>
            <div className="profile-identity-copy">
              <div className="profile-name-row">
                <h1 id="connector-name">{profile.name}</h1>
                <span className="profile-kind">{profileKindLabel(profile.kind)}</span>
              </div>
              <p className="profile-role">{profile.role}</p>
              <div className="profile-location-row">
                <span><MapPin aria-hidden="true" size={14} />{profile.neighborhood}</span>
                {profile.zipCode ? <span>{profile.zipCode}</span> : null}
                <span><Languages aria-hidden="true" size={14} />{profile.languages.join(", ")}</span>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <div className="profile-primary-actions">
            {isSelf ? (
              <Link className="profile-action-button primary" href="/profile/edit">
                Edit profile
              </Link>
            ) : null}
            {!isSelf && !safetyState.isBlocked && privacyContext.canMessage ? (
              <Link className="profile-action-button primary" href={`/messages/${profile.id}`}>
                <MessageCircle aria-hidden="true" size={16} />
                Message
              </Link>
            ) : null}
            {profile.kind === "person" && !safetyState.isBlocked && socialContext.relationship === "none" ? (
              <form action={addFriendAction}>
                <input name="connectorProfileId" type="hidden" value={profile.id} />
                <input name="redirectTo" type="hidden" value={`/connectors/${profile.id}`} />
                <button className="profile-action-button" type="submit">
                  <UserPlus aria-hidden="true" size={16} />
                  Add to network
                </button>
              </form>
            ) : null}
            {socialContext.relationship === "friends" ? (
              <details className="profile-friend-control">
                <summary className="profile-action-button relationship is-friend">
                  <UserCheck aria-hidden="true" size={16} />
                  Connected
                </summary>
                <form action={updateFriendRequestAction}>
                  <input name="friendId" type="hidden" value={socialContext.relationshipId ?? ""} />
                  <input name="redirectTo" type="hidden" value={`/connectors/${profile.id}`} />
                  <button name="operation" type="submit" value="remove">
                    <UserMinus aria-hidden="true" size={15} />
                    Remove connection
                  </button>
                </form>
              </details>
            ) : null}
            {socialContext.relationship === "outgoing" ? (
              <Link className="profile-action-button relationship" href="/network">
                <Clock3 aria-hidden="true" size={16} />
                Request sent
              </Link>
            ) : null}
            {socialContext.relationship === "incoming" ? (
              <Link className="profile-action-button relationship is-incoming" href="/network">
                <UsersRound aria-hidden="true" size={16} />
                Respond to request
              </Link>
            ) : null}
            </div>
            <div className="profile-utility-actions">
            {!isSelf && !safetyState.isBlocked ? (
              <form action={toggleFavoriteAction}>
                <input name="connectorProfileId" type="hidden" value={profile.id} />
                <input name="redirectTo" type="hidden" value={`/connectors/${profile.id}`} />
                <button
                  aria-label={isSaved ? "Saved" : "Save profile"}
                  aria-pressed={isSaved}
                  className={`profile-action-button save${isSaved ? " is-saved" : ""}`}
                  data-tooltip={isSaved ? "Remove from favorites" : "Save profile"}
                  title={isSaved ? "Remove from favorites" : "Save profile"}
                  type="submit"
                >
                  <Bookmark aria-hidden="true" fill={isSaved ? "currentColor" : "none"} size={16} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>
              </form>
            ) : null}
            {!isSelf && !safetyState.isBlocked ? (
              <ShareButton
                friends={shareFriends}
                path={`/connectors/${profile.id}`}
                title={`${profile.name} on Detroit Connect`}
                variant="profile"
              />
            ) : null}
            {!isSelf && !safetyState.isBlocked ? (
              <details className="profile-recommend-control">
                <summary className="profile-action-button" data-tooltip="Recommend" title="Recommend this profile">
                  <Share2 aria-hidden="true" size={16} />
                  <span>Recommend</span>
                </summary>
                <form action={recommendConnectorAction}>
                  <input name="connectorProfileId" type="hidden" value={profile.id} />
                  <input name="redirectTo" type="hidden" value={`/connectors/${profile.id}`} />
                  <label>
                    <span>Recommendation note (optional, 50 characters)</span>
                    <textarea
                      maxLength={50}
                      name="note"
                      placeholder="Add a short recommendation"
                    />
                  </label>
                  <button type="submit">Recommend to network</button>
                </form>
              </details>
            ) : null}
            {!isSelf && !safetyState.isBlocked && contactHref ? (
              <a className="profile-action-button contact" data-tooltip="Contact" href={contactHref} title="Contact">
                <Mail aria-hidden="true" size={16} />
                <span>Contact</span>
              </a>
            ) : null}
            {!isSelf && profile.ownerId && (!isSupabaseConfigured() || isUuid(profile.ownerId)) ? (
              <ProfileSafetyMenu
                profileHref={`/connectors/${profile.id}`}
                profileId={profile.id}
                state={safetyState}
                targetId={profile.ownerId}
                targetName={profile.name}
              />
            ) : null}
            </div>
          </div>
        </div>

        <div className="profile-trust-signal">
          <UsersRound aria-hidden="true" size={16} />
          <span>{circleSignal}</span>
        </div>
        {query.recommended === "1" ? (
          <div className="profile-share-notice" role="status">
            Recommendation shared with your network.
          </div>
        ) : null}
        {query.friend === "sent" ? (
          <div className="profile-share-notice" role="status">
            Connection request sent.
          </div>
        ) : null}
        {query.friend === "removed" ? (
          <div className="profile-share-notice" role="status">
            Connection removed.
          </div>
        ) : null}
        {query.updated === "1" ? (
          <div className="profile-share-notice" role="status">
            Profile updated.
          </div>
        ) : null}
        {query.safety === "muted" ? (
          <div className="profile-share-notice" role="status">
            Notifications from {profile.name} are muted. <Link href="/settings#safety-controls">Manage</Link>
          </div>
        ) : null}
        {query.safety === "unmuted" ? (
          <div className="profile-share-notice" role="status">
            Notifications from {profile.name} are on.
          </div>
        ) : null}
        {query.reported === "1" ? (
          <div className="profile-share-notice" role="status">
            Report submitted for review.
          </div>
        ) : null}
        {query.safetyError ? (
          <div className="profile-share-notice is-error" role="alert">
            {query.safetyError}
          </div>
        ) : null}

        <nav className="social-profile-tabs" aria-label="Profile sections">
          {profile.bio ? <a href="#profile-about">About</a> : null}
          {profile.kind === "person" ? <a href="#profile-connections">Connections</a> : null}
          {isSelf ? <Link href="/profile/activity">Activity</Link> : null}
          {communityPosts.length > 0 ? <a href="#profile-posts">Posts</a> : null}
          <a href="#profile-expertise">Expertise</a>
          {profile.skills.length > 0 ? <a href="#profile-skills">Skills</a> : null}
          <a href="#profile-details">Details</a>
        </nav>
      </section>

      <div className="social-profile-layout">
        <div className="social-profile-feed">
          {profile.bio ? (
            <section className="social-profile-section" id="profile-about" aria-labelledby="about-profile-title">
              <h2 id="about-profile-title">About</h2>
              <p>{profile.bio}</p>
            </section>
          ) : null}

          {profile.kind === "person" ? (
            <ProfileSocialPanel
              friends={socialContext.friends}
              mutualFriendCount={socialContext.mutualFriendCount}
              profileName={profile.name}
              recommendedBy={socialContext.recommendedBy}
              recommendations={socialContext.recommendations}
            />
          ) : null}

          {communityPosts.length > 0 ? (
            <section className="social-profile-section profile-community-posts" id="profile-posts" aria-labelledby="profile-posts-title">
              <div className="profile-section-heading">
                <h2 id="profile-posts-title">Community posts</h2>
                <Link href={isSelf ? "/profile/activity" : `/forum#post-${communityPosts[0].id}`}>
                  {isSelf ? "View all posts" : "View in forum"}
                </Link>
              </div>
              <div className="profile-post-list">
                {communityPosts.map((post) => (
                  <Link className="profile-post-preview" href={`/forum#post-${post.id}`} key={post.id}>
                    <span>{post.topic}</span>
                    <h3>{post.title}</h3>
                    <p>{post.body}</p>
                    <small>{post.meta}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="social-profile-section" id="profile-expertise" aria-labelledby="help-topics-title">
            <h2 id="help-topics-title">Can help with</h2>
            <div className="profile-topic-list">
              {profile.topics.map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
          </section>

          {profile.skills.length > 0 ? (
            <section className="social-profile-section" id="profile-skills" aria-labelledby="skills-title">
              <h2 id="skills-title">Skills</h2>
              <div className="profile-skill-list">
                {profile.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="social-profile-sidebar" id="profile-details" aria-labelledby="profile-details-title">
          <h2 id="profile-details-title">Details</h2>
          <dl>
            <div>
              <MapPin aria-hidden="true" size={17} />
              <div><dt>Neighborhood</dt><dd>{profile.neighborhood}</dd></div>
            </div>
            <div>
              <Languages aria-hidden="true" size={17} />
              <div><dt>Languages</dt><dd>{profile.languages.join(", ")}</dd></div>
            </div>
            {profile.yearsConnected ? (
              <div>
                <Clock3 aria-hidden="true" size={17} />
                <div><dt>Connected to Detroit</dt><dd>{profile.yearsConnected}</dd></div>
              </div>
            ) : null}
            <div>
              <MessageCircle aria-hidden="true" size={17} />
              <div><dt>Available for</dt><dd>{profile.availability.length > 0 ? profile.availability.join(", ") : "Messages"}</dd></div>
            </div>
            {profile.preferredContactMethod ? (
              <div>
                <Mail aria-hidden="true" size={17} />
                <div><dt>Preferred contact</dt><dd>{profile.preferredContactMethod}</dd></div>
              </div>
            ) : null}
            {profile.organizationName ? (
              <div>
                <BriefcaseBusiness aria-hidden="true" size={17} />
                <div><dt>Organization</dt><dd>{profile.organizationName}</dd></div>
              </div>
            ) : null}
          </dl>

          {profile.trustBadges.length > 0 ? (
            <div className="social-profile-verification">
              <ShieldCheck aria-hidden="true" size={17} />
              <div>
                <span>Profile signals</span>
                <div className="profile-badges">
                  {profile.trustBadges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
