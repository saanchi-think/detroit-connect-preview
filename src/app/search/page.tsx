import { ArrowLeft, BookOpen, FileText, Globe2, Search, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { AiSearchAnswer } from "@/components/ai-search-answer";
import { AppHeader } from "@/components/app-header";
import { ConnectorSearchInput } from "@/components/connector-search-input";
import { ProfileSnapshot } from "@/components/profile-snapshot";
import { runAiSearch } from "@/lib/ai-search/search";
import { getCurrentUser } from "@/lib/auth/user";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function SourceIcon({ kind }: { kind: "profile" | "website" | "file" }) {
  if (kind === "website") return <Globe2 aria-hidden="true" size={16} />;
  if (kind === "file") return <FileText aria-hidden="true" size={16} />;
  return <UserRound aria-hidden="true" size={16} />;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const [result, user] = await Promise.all([
    query ? runAiSearch(query) : null,
    getCurrentUser(),
  ]);
  const favoriteIds = new Set(await getFavoriteConnectorIds(user));

  return (
    <main className="page-shell ai-search-page">
      <AppHeader />
      <section className="ai-search-header" aria-labelledby="ai-search-title">
        <Link className="ai-search-back" href="/">
          <ArrowLeft aria-hidden="true" size={16} />
          Home
        </Link>
        <div>
          <span className="ai-search-kicker">
            <Sparkles aria-hidden="true" size={15} />
            Detroit Connect search
          </span>
          <h1 id="ai-search-title">What can we help you find?</h1>
        </div>
        <form action="/search" className="ai-results-search" role="search">
          <ConnectorSearchInput
            ariaLabel="Ask Detroit Connect"
            defaultValue={query}
            placeholder="Ask about housing, schools, moving, business..."
            suggestionsEnabled={false}
          />
          <button aria-label="Search" type="submit">
            <Search aria-hidden="true" size={20} />
          </button>
        </form>
      </section>

      {result ? (
        <div className="ai-search-layout">
          <section className="ai-search-main" aria-label="Search answer and connector matches">
            <article className="ai-answer-panel">
              <div className="ai-answer-heading">
                <span aria-hidden="true"><Sparkles size={18} /></span>
                <div>
                  <small>{result.usedAi ? "AI answer" : "Smart match"}</small>
                  <h2>{result.query}</h2>
                </div>
              </div>
              <AiSearchAnswer
                answer={result.answer}
                citationIndexes={result.citations.map((citation) => citation.index)}
              />
              {result.unableToVerify ? (
                <p className="ai-answer-note">
                  This could not be verified from the approved resources currently available.
                </p>
              ) : null}
              {result.intent.topics.length ||
              result.intent.languages.length ||
              result.intent.neighborhoods.length ? (
                <div className="ai-intent-row" aria-label="Search understood as">
                  {[...result.intent.topics, ...result.intent.neighborhoods, ...result.intent.languages]
                    .slice(0, 6)
                    .map((value) => <span key={value}>{value}</span>)}
                </div>
              ) : null}
            </article>

            <div className="ai-result-heading">
              <div>
                <h2>Recommended connectors</h2>
                <p>{result.connectors.length} relevant {result.connectors.length === 1 ? "match" : "matches"}</p>
              </div>
              <Link href={`/connectors?q=${encodeURIComponent(query)}`}>Browse directory</Link>
            </div>
            <div className="ai-connector-list">
              {result.connectors.map(({ connector, reason, citationIndex }) => (
                <ProfileSnapshot
                  connector={connector}
                  isSaved={favoriteIds.has(connector.id)}
                  key={connector.id}
                  note={`${reason} Source ${citationIndex}`}
                  saveRedirectPath={`/search?q=${encodeURIComponent(query)}`}
                  showProfileKind
                  showSaveAction
                />
              ))}
              {result.connectors.length === 0 ? (
                <div className="ai-empty-results">
                  <Search aria-hidden="true" size={22} />
                  <h2>No clear match yet</h2>
                  <Link href="/connectors">Browse all connectors</Link>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="ai-source-panel" aria-label="Sources">
            <details open>
              <summary>
                <span><BookOpen aria-hidden="true" size={17} /> Sources</span>
                <small>{result.citations.length}</small>
              </summary>
              <div className="ai-source-list">
                {result.citations.map((citation) => {
                  const content = (
                    <>
                      <span className="ai-source-number">{citation.index}</span>
                      <span className="ai-source-icon"><SourceIcon kind={citation.kind} /></span>
                      <span className="ai-source-copy">
                        <strong>{citation.title}</strong>
                        <small>{citation.kind === "profile" ? "Public profile" : citation.kind}</small>
                        <p>{citation.excerpt}</p>
                      </span>
                    </>
                  );

                  return citation.href ? (
                    <Link
                      className="ai-source-item"
                      href={citation.href}
                      id={`source-${citation.index}`}
                      key={citation.id}
                    >
                      {content}
                    </Link>
                  ) : (
                    <article
                      className="ai-source-item"
                      id={`source-${citation.index}`}
                      key={citation.id}
                    >
                      {content}
                    </article>
                  );
                })}
              </div>
            </details>
          </aside>
        </div>
      ) : (
        <section className="ai-search-empty">
          <Sparkles aria-hidden="true" size={22} />
          <h2>Search people, organizations, and approved Detroit resources.</h2>
        </section>
      )}
    </main>
  );
}
