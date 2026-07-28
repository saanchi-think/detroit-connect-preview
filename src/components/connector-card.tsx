import Link from "next/link";
import { ConnectorAvatar } from "@/components/connector-avatar";
import type { ConnectorCardModel } from "@/lib/connectors/types";
import { toggleFavoriteAction } from "@/lib/favorites/actions";

type ConnectorCardProps = {
  connector: ConnectorCardModel;
  isHighlighted?: boolean;
  isSaved?: boolean;
  saveRedirectPath?: string;
};

export function ConnectorCard({
  connector,
  isHighlighted = false,
  isSaved = false,
  saveRedirectPath = "/connectors",
}: ConnectorCardProps) {
  const kindLabel = connector.kind === "organization" ? "Organization" : "User";

  return (
    <article className={`connector-card${isHighlighted ? " is-highlighted" : ""}`}>
      <div className="connector-avatar" aria-hidden="true">
        <ConnectorAvatar
          avatarKey={connector.avatarKey}
          avatarUrl={connector.avatarUrl}
          name={connector.name}
        />
      </div>
      <div className="connector-body">
        <div className="connector-heading">
          <div>
            <span className="profile-kind">{kindLabel}</span>
            <h2>
              <Link href={`/connectors/${connector.id}`}>{connector.name}</Link>
            </h2>
            <p>{connector.role}</p>
          </div>
          <form action={toggleFavoriteAction} className="save-form">
            <input name="connectorProfileId" type="hidden" value={connector.id} />
            <input name="redirectTo" type="hidden" value={saveRedirectPath} />
            <button
              type="submit"
              className={`save-button${isSaved ? " is-saved" : ""}`}
              aria-pressed={isSaved}
            >
              {isSaved ? "Saved" : "Save"}
            </button>
          </form>
        </div>
        <div className="connector-meta">
          <span><small>Neighborhood</small><strong>{connector.neighborhood}</strong></span>
          <span><small>Languages</small><strong>{connector.languages.join(", ")}</strong></span>
        </div>
        <div className="connector-topics">
          <small>Can help with</small>
          <div className="tag-row">
            {connector.topics.map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
        </div>
        <div className="connector-card-footer">
          <p className="friend-note">{connector.friendSignal}</p>
          <Link className="connector-profile-link" href={`/connectors/${connector.id}`}>
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
