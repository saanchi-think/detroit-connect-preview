import Link from "next/link";
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
  const initials = connector.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  const kindLabel =
    connector.kind === "vendor" ? "Vendor" : connector.kind === "organization" ? "Organization" : "Person";

  return (
    <article className={`connector-card${isHighlighted ? " is-highlighted" : ""}`}>
      <div className="connector-avatar" aria-hidden="true">
        {initials}
      </div>
      <div className="connector-body">
        <div className="connector-heading">
          <div>
            <span className="profile-kind">{kindLabel}</span>
            <h2>{connector.name}</h2>
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
          <span>{connector.neighborhood}</span>
          <span>{connector.languages.join(", ")}</span>
        </div>
        <div className="tag-row">
          {connector.topics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
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
