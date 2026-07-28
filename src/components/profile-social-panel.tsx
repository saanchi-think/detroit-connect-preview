"use client";

import { BadgeCheck, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConnectorAvatar } from "@/components/connector-avatar";
import type { ConnectorCardModel } from "@/lib/connectors/types";
import type { ProfileSocialPerson } from "@/lib/friends/repository";

type SocialTab = "friends" | "recommended-by" | "recommendations";

type ProfileSocialPanelProps = {
  friends: ProfileSocialPerson[];
  profileName: string;
  recommendedBy: ProfileSocialPerson[];
  recommendations: ConnectorCardModel[];
  mutualFriendCount: number;
};

function SocialPersonRow({ person }: { person: ProfileSocialPerson }) {
  return (
    <Link className="profile-social-row" href={person.profileHref}>
      <span className="profile-social-avatar" aria-hidden="true">
        <ConnectorAvatar
          avatarKey={person.avatarKey}
          avatarUrl={person.avatarUrl}
          name={person.name}
        />
      </span>
      <span className="profile-social-copy">
        <strong>{person.name}</strong>
        <small>{person.role}</small>
        <span>
          <MapPin aria-hidden="true" size={12} />
          {person.neighborhood}
          {person.isMutualFriend ? <em>Mutual friend</em> : null}
        </span>
        {person.note ? <q>{person.note}</q> : null}
      </span>
    </Link>
  );
}

function RecommendedProfileRow({ connector }: { connector: ConnectorCardModel }) {
  return (
    <Link className="profile-social-row" href={`/connectors/${connector.id}`}>
      <span className="profile-social-avatar" aria-hidden="true">
        <ConnectorAvatar
          avatarKey={connector.avatarKey}
          avatarUrl={connector.avatarUrl}
          name={connector.name}
        />
      </span>
      <span className="profile-social-copy">
        <strong>{connector.name}</strong>
        <small>{connector.role}</small>
        <span>
          <MapPin aria-hidden="true" size={12} />
          {connector.neighborhood}
        </span>
      </span>
    </Link>
  );
}

export function ProfileSocialPanel({
  friends,
  profileName,
  recommendedBy,
  recommendations,
  mutualFriendCount,
}: ProfileSocialPanelProps) {
  const [activeTab, setActiveTab] = useState<SocialTab>("friends");
  const firstName = profileName.split(/\s+/)[0] || profileName;

  return (
    <section className="social-profile-section profile-connections" id="profile-connections" aria-labelledby="profile-connections-title">
      <div className="profile-connections-heading">
        <div>
          <h2 id="profile-connections-title">Connections</h2>
          <p>
            {mutualFriendCount > 0
              ? `${mutualFriendCount} mutual ${mutualFriendCount === 1 ? "connection" : "connections"}`
              : `${friends.length} ${friends.length === 1 ? "connection" : "connections"}`}
          </p>
        </div>
        <UsersRound aria-hidden="true" size={19} />
      </div>

      <div className="profile-social-tabs" role="tablist" aria-label={`${profileName}'s connections`}>
        <button
          aria-selected={activeTab === "friends"}
          onClick={() => setActiveTab("friends")}
          role="tab"
          type="button"
        >
          Network <span>{friends.length}</span>
        </button>
        <button
          aria-selected={activeTab === "recommended-by"}
          onClick={() => setActiveTab("recommended-by")}
          role="tab"
          type="button"
        >
          Recommended by <span>{recommendedBy.length}</span>
        </button>
        <button
          aria-selected={activeTab === "recommendations"}
          onClick={() => setActiveTab("recommendations")}
          role="tab"
          type="button"
        >
          Recommendations <span>{recommendations.length}</span>
        </button>
      </div>

      <div className={`profile-social-list is-${activeTab}`} role="tabpanel">
        {activeTab === "friends" ? (
          friends.length > 0 ? (
            friends.map((friend) => <SocialPersonRow key={friend.id} person={friend} />)
          ) : (
            <p className="profile-social-empty">No network connections are visible yet.</p>
          )
        ) : null}

        {activeTab === "recommended-by" ? (
          recommendedBy.length > 0 ? (
            recommendedBy.map((person) => <SocialPersonRow key={person.id} person={person} />)
          ) : (
            <p className="profile-social-empty">No recommendations yet.</p>
          )
        ) : null}

        {activeTab === "recommendations" ? (
          recommendations.length > 0 ? (
            <>
              <div className="profile-recommendation-intro">
                <BadgeCheck aria-hidden="true" size={16} />
                People and organizations {firstName} recommends
              </div>
              {recommendations.map((connector) => (
                <RecommendedProfileRow connector={connector} key={connector.id} />
              ))}
            </>
          ) : (
            <p className="profile-social-empty">{firstName} has not recommended anyone yet.</p>
          )
        ) : null}
      </div>
    </section>
  );
}
