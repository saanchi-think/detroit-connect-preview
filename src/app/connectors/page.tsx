import { AppHeader } from "@/components/app-header";
import { ConnectorCard } from "@/components/connector-card";
import { getCurrentUser } from "@/lib/auth/user";
import { searchConnectorCards } from "@/lib/connectors/repository";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";

type ConnectorsPageProps = {
  searchParams: Promise<{ q?: string; type?: string; created?: string }>;
};

export default async function ConnectorsPage({ searchParams }: ConnectorsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const type = params.type ?? "all";
  const createdId = params.created ?? "";
  const [connectors, user] = await Promise.all([searchConnectorCards({ query, type }), getCurrentUser()]);
  const favoriteIds = new Set(await getFavoriteConnectorIds(user));
  const redirectParams = new URLSearchParams();

  if (params.q) {
    redirectParams.set("q", params.q);
  }

  if (type !== "all") {
    redirectParams.set("type", type);
  }

  if (createdId) {
    redirectParams.set("created", createdId);
  }

  const saveRedirectPath = `/connectors${redirectParams.toString() ? `?${redirectParams.toString()}` : ""}`;

  return (
    <main className="page-shell">
      <AppHeader />
      <section className="page-hero">
        <h1>Connectors</h1>
        {createdId ? (
          <div className="page-notice" role="status">
            Profile created. It is now live in your connector results.
          </div>
        ) : null}
        <form className="results-search" action="/connectors">
          <input name="q" type="search" placeholder="Housing, schools, business..." defaultValue={params.q ?? ""} />
          <select name="type" defaultValue={type}>
            <option value="all">All profiles</option>
            <option value="person">People</option>
            <option value="vendor">Vendors</option>
            <option value="organization">Organizations</option>
          </select>
          <button type="submit">Search</button>
        </form>
      </section>
      <section className="connector-grid" aria-label="Connector results">
        {connectors.map((connector) => (
          <ConnectorCard
            connector={connector}
            isHighlighted={connector.id === createdId}
            isSaved={favoriteIds.has(connector.id)}
            key={connector.id}
            saveRedirectPath={saveRedirectPath}
          />
        ))}
      </section>
    </main>
  );
}
