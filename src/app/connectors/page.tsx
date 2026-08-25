import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ConnectorSearchInput } from "@/components/connector-search-input";
import { ProfileSnapshot } from "@/components/profile-snapshot";
import { getCurrentUser } from "@/lib/auth/user";
import {
  getConnectorFilterOptions,
  searchConnectorCardPage,
} from "@/lib/connectors/repository";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";

export const dynamic = "force-dynamic";

type ConnectorsPageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sort?: string;
    language?: string;
    neighborhood?: string;
    topic?: string;
    created?: string;
    page?: string;
  }>;
};

export default async function ConnectorsPage({ searchParams }: ConnectorsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const type = params.type ?? "all";
  const sort = ["relevance", "newest", "name", "neighborhood"].includes(params.sort ?? "")
    ? params.sort!
    : query
      ? "relevance"
      : "newest";
  const createdId = params.created ?? "";
  const requestedPage = Number(params.page ?? "1");
  const [results, user, filterOptions] = await Promise.all([
    searchConnectorCardPage({
      query,
      type,
      sort,
      language: params.language,
      neighborhood: params.neighborhood,
      topic: params.topic,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
    }),
    getCurrentUser(),
    getConnectorFilterOptions(),
  ]);
  const { connectors, page, total, totalPages } = results;
  const favoriteIds = new Set(await getFavoriteConnectorIds(user));
  const redirectParams = new URLSearchParams();

  if (params.q) {
    redirectParams.set("q", params.q);
  }

  if (type !== "all") {
    redirectParams.set("type", type);
  }

  if (sort !== (query ? "relevance" : "newest")) {
    redirectParams.set("sort", sort);
  }

  if (params.language) redirectParams.set("language", params.language);
  if (params.neighborhood) redirectParams.set("neighborhood", params.neighborhood);
  if (params.topic) redirectParams.set("topic", params.topic);

  if (createdId) {
    redirectParams.set("created", createdId);
  }

  function pageHref(nextPage: number) {
    const pageParams = new URLSearchParams(redirectParams);
    pageParams.set("page", String(nextPage));
    return `/connectors?${pageParams.toString()}`;
  }

  const saveRedirectPath = `/connectors${redirectParams.toString() ? `?${redirectParams.toString()}` : ""}`;

  return (
    <main className="page-shell connectors-page">
      <AppHeader />
      <section className="page-hero connectors-hero">
        <h1>Connectors</h1>
        {createdId ? (
          <div className="page-notice" role="status">
            Profile created. It is now live in your connector results.
          </div>
        ) : null}
        <form className="results-search connector-directory-search" action="/connectors">
          <div className="connector-search-row">
            <ConnectorSearchInput
              ariaLabel="Search connectors"
              defaultValue={params.q ?? ""}
              label="Search by name, topic, or need"
              placeholder="Try housing, schools, or small business"
              profileType={type}
            />
            <label className="connector-control-field connector-sort-field">
              <span>Sort by</span>
              <select aria-label="Sort profiles" className="profile-sort" name="sort" defaultValue={sort}>
                <option value="relevance">Most relevant</option>
                <option value="newest">Newest</option>
                <option value="name">Name A–Z</option>
                <option value="neighborhood">Neighborhood</option>
              </select>
            </label>
            <button className="connector-search-submit" type="submit">
              <Search aria-hidden="true" size={17} />
              <span>Search</span>
            </button>
          </div>
          <div className="connector-filter-row">
            <div className="connector-filter-title">
              <SlidersHorizontal aria-hidden="true" size={16} />
              <span>Filters</span>
            </div>
            <label className="connector-control-field">
              <span>Profile</span>
              <select aria-label="Filter by profile type" className="profile-type-filter" name="type" defaultValue={type}>
                <option value="all">All profiles</option>
                <option value="person">Users</option>
                <option value="organization">Organizations</option>
              </select>
            </label>
            <label className="connector-control-field">
              <span>Language</span>
              <select aria-label="Filter by language" name="language" defaultValue={params.language ?? ""}>
                <option value="">All languages</option>
                {filterOptions.languages.map((language) => <option key={language}>{language}</option>)}
              </select>
            </label>
            <label className="connector-control-field">
              <span>Neighborhood</span>
              <select aria-label="Filter by neighborhood" name="neighborhood" defaultValue={params.neighborhood ?? ""}>
                <option value="">All neighborhoods</option>
                {filterOptions.neighborhoods.map((neighborhood) => <option key={neighborhood}>{neighborhood}</option>)}
              </select>
            </label>
            <label className="connector-control-field">
              <span>Topic</span>
              <select aria-label="Filter by topic" name="topic" defaultValue={params.topic ?? ""}>
                <option value="">All topics</option>
                {filterOptions.topics.map((topic) => <option key={topic}>{topic}</option>)}
              </select>
            </label>
            {params.language || params.neighborhood || params.topic ? (
              <Link className="clear-connector-filters" href={`/connectors${query ? `?q=${encodeURIComponent(query)}` : ""}`}>
                Clear filters
              </Link>
            ) : null}
          </div>
        </form>
      </section>
      <section className="connector-grid" aria-label="Connector results">
        {connectors.map((connector) => (
          <ProfileSnapshot
            connector={connector}
            isHighlighted={connector.id === createdId}
            isSaved={favoriteIds.has(connector.id)}
            key={connector.id}
            saveRedirectPath={saveRedirectPath}
            showProfileKind
            showSaveAction
          />
        ))}
      </section>
      <nav className="result-pagination" aria-label="Connector results pagination">
        <span>
          {total === 0
            ? "No profiles found"
            : `Showing ${(page - 1) * results.pageSize + 1}–${Math.min(page * results.pageSize, total)} of ${total}`}
        </span>
        {totalPages > 1 ? (
          <div>
            {page > 1 ? <Link href={pageHref(page - 1)}>Previous</Link> : <span aria-hidden="true">Previous</span>}
            <strong>Page {page} of {totalPages}</strong>
            {page < totalPages ? <Link href={pageHref(page + 1)}>Next</Link> : <span aria-hidden="true">Next</span>}
          </div>
        ) : null}
      </nav>
    </main>
  );
}
