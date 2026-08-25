import {
  ArrowLeft,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  AiSearchAnswer,
  AiSearchInlineText,
  cleanAiDisplayText,
  type AiSearchProfileLink,
} from "@/components/ai-search-answer";
import { AiSearchConversationForm } from "@/components/ai-search-conversation-form";
import { AiSearchPersonalizationToggle } from "@/components/ai-search-personalization-toggle";
import { AppHeader } from "@/components/app-header";
import { ProfileSnapshot } from "@/components/profile-snapshot";
import { SearchFeedback } from "@/components/search-feedback";
import { recordSearchCompleted } from "@/lib/ai-search/analytics";
import { runAiSearch } from "@/lib/ai-search/search";
import { getCurrentUser } from "@/lib/auth/user";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";
import { getConnectorCardsByIds } from "@/lib/connectors/repository";
import type { AiSearchConversationTurn } from "@/lib/ai-search/search";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<{ history?: string; personalized?: string; q?: string }>;
};

function readConversationHistory(value?: string): AiSearchConversationTurn[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .flatMap((turn): AiSearchConversationTurn[] => {
        if (!turn || typeof turn !== "object") return [];
        const candidate = turn as { role?: unknown; text?: unknown; connectorIds?: unknown };
        if (
          (candidate.role !== "user" && candidate.role !== "assistant") ||
          typeof candidate.text !== "string"
        ) {
          return [];
        }
        const text = candidate.text.trim().slice(0, 500);
        const connectorIds = Array.isArray(candidate.connectorIds)
          ? candidate.connectorIds.filter(
              (id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id),
            ).slice(0, 8)
          : [];
        return text ? [{ role: candidate.role, text, connectorIds }] : [];
      })
      .slice(-6);
  } catch {
    return [];
  }
}

function writeConversationHistory(history: AiSearchConversationTurn[]) {
  const compactHistory = history.slice(-6).map((turn) => ({
    role: turn.role,
    text: turn.text.trim().slice(0, 500),
    connectorIds: (turn.connectorIds ?? []).slice(0, 8),
  }));
  return Buffer.from(JSON.stringify(compactHistory)).toString("base64url");
}

async function runTimedAiSearch(
  query: string,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  personalize: boolean,
  conversation: AiSearchConversationTurn[],
) {
  const startedAt = performance.now();
  const result = await runAiSearch(query, user, { personalize, conversation });
  return { result, latencyMs: performance.now() - startedAt };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const personalizationEnabled = params.personalized !== "0";
  const conversationHistory = readConversationHistory(params.history);
  const user = await getCurrentUser();
  const historyProfileIds = conversationHistory.flatMap((turn) =>
    turn.role === "assistant" ? turn.connectorIds ?? [] : [],
  );
  const [searchOutcome, favoriteConnectorIds] = await Promise.all([
    query
      ? runTimedAiSearch(query, user, personalizationEnabled, conversationHistory)
      : Promise.resolve({ result: null, latencyMs: 0 }),
    getFavoriteConnectorIds(user),
  ]);
  const result = searchOutcome.result;
  const historyProfiles = await getConnectorCardsByIds(historyProfileIds);
  const answerProfiles = result
    ? (() => {
        const profiles = new Map<string, AiSearchProfileLink>();
        result.citations
          .filter((citation) => citation.kind === "profile" && Boolean(citation.href))
          .forEach((citation) => {
            profiles.set(citation.id, {
              id: citation.id.replace(/^profile:/, ""),
              name: citation.title,
              href: citation.href!,
            });
          });
        historyProfiles.forEach((profile) => {
          profiles.set(profile.id, {
            id: profile.id,
            name: profile.name,
            href: `/connectors/${profile.id}`,
          });
        });
        result.mentionedProfiles.forEach((profile) => {
          profiles.set(profile.id, {
            id: profile.id,
            name: profile.name,
            href: `/connectors/${profile.id}`,
          });
        });
        return Array.from(profiles.values());
      })()
    : [];
  const favoriteIds = new Set(favoriteConnectorIds);
  const communityFeedback = result?.citations
    .filter((citation) => citation.kind === "forum" || citation.kind === "recommendation")
    .slice(0, 3) ?? [];
  const nextConversationHistory = result
    ? [
        ...conversationHistory,
        { role: "user" as const, text: query },
        {
          role: "assistant" as const,
          text: result.answer,
          connectorIds: result.connectors.slice(0, 8).map(({ connector }) => connector.id),
        },
      ].slice(-6)
    : conversationHistory;
  const conversationBeforeLatestAnswer = result
    ? [
        ...conversationHistory,
        { role: "user" as const, text: query },
      ].slice(-5)
    : conversationHistory;

  if (result) {
    await recordSearchCompleted({
      intent: result.intent,
      latencyMs: searchOutcome.latencyMs,
      query,
      resultCount: result.connectors.length,
      unableToVerify: result.unableToVerify,
      usedAi: result.usedAi,
      userId: user?.id ?? null,
    });
  }

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
        <AiSearchConversationForm
          history={writeConversationHistory(nextConversationHistory)}
          initialQuery={query}
          personalizationEnabled={personalizationEnabled}
          variant="header"
        />
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
              {conversationBeforeLatestAnswer.length > 0 ? (
                <div className="ai-conversation-history" aria-label="Earlier messages">
                  {conversationBeforeLatestAnswer.map((turn, index) => (
                    <div className={`ai-conversation-turn ${turn.role}`} key={`${turn.role}-${index}-${turn.text}`}>
                      <span>{turn.role === "user" ? "You" : "Detroit Connect"}</span>
                      <p>
                        {turn.role === "assistant" ? (
                          <AiSearchInlineText
                            profiles={answerProfiles}
                            value={cleanAiDisplayText(turn.text)}
                          />
                        ) : (
                          cleanAiDisplayText(turn.text)
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <AiSearchAnswer answer={result.answer} profiles={answerProfiles} />
              {result.personalization ? (
                <AiSearchPersonalizationToggle
                  enabled={result.personalization.applied}
                  history={writeConversationHistory(conversationHistory)}
                  key={`personalization-${query}-${result.personalization.applied}`}
                  query={query}
                  signals={result.personalization.signals}
                />
              ) : null}
              {result.unableToVerify ? (
                <p className="ai-answer-note">
                  Detroit Connect does not currently contain enough information to answer this confidently.
                </p>
              ) : null}
              <SearchFeedback query={query} />
              {result.intent.topics.length ||
              result.intent.languages.length ||
              result.intent.neighborhoods.length ? (
                <div className="ai-intent-row" aria-label="Search understood as">
                  {[...result.intent.topics, ...result.intent.neighborhoods, ...result.intent.languages]
                    .slice(0, 6)
                    .map((value) => <span key={value}>{value}</span>)}
                </div>
              ) : null}
              <AiSearchConversationForm
                history={writeConversationHistory(nextConversationHistory)}
                personalizationEnabled={personalizationEnabled}
                variant="follow-up"
              />
            </article>

            {communityFeedback.length > 0 ? (
              <section className="ai-community-feedback" aria-labelledby="community-feedback-title">
                <div className="ai-community-feedback-head">
                  <div>
                    <h2 id="community-feedback-title">Related community feedback</h2>
                    <p>Shared experiences from Detroit Connect members.</p>
                  </div>
                </div>
                <div className="ai-community-feedback-list">
                  {communityFeedback.map((feedback) => (
                    <article className="ai-community-feedback-card" key={feedback.id}>
                      <span className={`ai-feedback-kind ${feedback.kind}`}>
                        {feedback.kind === "forum" ? "Community discussion" : "Recommendation"}
                      </span>
                      <h3>
                        {feedback.href ? <Link href={feedback.href}>{feedback.title}</Link> : feedback.title}
                      </h3>
                      <p>{cleanAiDisplayText(feedback.excerpt)}</p>
                      {feedback.href ? (
                        <Link className="ai-community-feedback-link" href={feedback.href}>
                          {feedback.kind === "forum" ? "Open discussion" : "View profile"}
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="ai-result-heading">
              <div>
                <h2>Recommended connectors</h2>
                <p>
                  {conversationHistory.length > 0 ? "Updated for your latest question · " : ""}
                  {result.connectors.length} relevant {result.connectors.length === 1 ? "match" : "matches"}
                </p>
              </div>
              <Link href={`/connectors?q=${encodeURIComponent(query)}`}>Browse directory</Link>
            </div>
            <div className="ai-connector-list">
              {result.connectors.map(({ connector, reason }) => (
                <ProfileSnapshot
                  connector={connector}
                  isSaved={favoriteIds.has(connector.id)}
                  key={connector.id}
                  note={cleanAiDisplayText(reason)}
                  saveRedirectPath={`/search?q=${encodeURIComponent(query)}`}
                  searchQuery={query}
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
        </div>
      ) : (
        <section className="ai-search-empty">
          <Sparkles aria-hidden="true" size={22} />
          <h2>Search connectors, community conversations, and recommendations.</h2>
        </section>
      )}
    </main>
  );
}
