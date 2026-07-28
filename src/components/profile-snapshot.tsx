import { Bookmark, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { ConnectorAvatar } from "@/components/connector-avatar";
import type { ConnectorCardModel } from "@/lib/connectors/types";
import { toggleFavoriteAction } from "@/lib/favorites/actions";

type ProfileSnapshotProps = {
  connector: ConnectorCardModel;
  isHighlighted?: boolean;
  isSaved?: boolean;
  note?: string | null;
  saveRedirectPath?: string;
  showSaveAction?: boolean;
  showProfileKind?: boolean;
};

export function ProfileSnapshot({
  connector,
  isHighlighted = false,
  isSaved = false,
  note = null,
  saveRedirectPath = "/favorites",
  showSaveAction = false,
  showProfileKind = false,
}: ProfileSnapshotProps) {
  const profileHref = `/connectors/${connector.id}`;
  const kindLabel = connector.kind === "organization" ? "Organization" : "User";

  return (
    <article className={`profile-snapshot${isHighlighted ? " is-highlighted" : ""}`}>
      <div className="profile-snapshot-head">
        <div className="profile-snapshot-avatar" aria-hidden="true">
          <ConnectorAvatar
            avatarKey={connector.avatarKey}
            avatarUrl={connector.avatarUrl}
            name={connector.name}
          />
        </div>
        <div className="profile-snapshot-copy">
          {showProfileKind || connector.kind === "organization" ? (
            <span className="profile-kind">{kindLabel}</span>
          ) : null}
          <h3><Link href={profileHref}>{connector.name}</Link></h3>
          <p>{connector.role}</p>
          <p className="profile-snapshot-meta">
            <MapPin aria-hidden="true" size={13} />
            <span>{connector.neighborhood}</span>
            <span aria-hidden="true">·</span>
            <span>{connector.languages.join(", ")}</span>
          </p>
        </div>
        <div className="profile-snapshot-actions">
          <Link
            aria-label={`Message ${connector.name}`}
            href={`/messages/${connector.id}`}
            title={`Message ${connector.name}`}
          >
            <MessageCircle aria-hidden="true" size={17} />
          </Link>
          {showSaveAction || isSaved ? (
            <form action={toggleFavoriteAction}>
              <input name="connectorProfileId" type="hidden" value={connector.id} />
              <input name="redirectTo" type="hidden" value={saveRedirectPath} />
              <button
                aria-label={showSaveAction
                  ? isSaved
                    ? `Remove ${connector.name} from favorites`
                    : `Save ${connector.name} to favorites`
                  : "Saved"}
                aria-pressed={isSaved}
                title={isSaved ? "Remove from favorites" : "Save to favorites"}
                type="submit"
              >
                <Bookmark aria-hidden="true" fill={isSaved ? "currentColor" : "none"} size={16} />
              </button>
            </form>
          ) : null}
        </div>
      </div>
      {note ? <p className="profile-snapshot-note">{note}</p> : null}
      <div className="profile-snapshot-topics" aria-label="Topics">
        {connector.topics.slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}
      </div>
    </article>
  );
}
