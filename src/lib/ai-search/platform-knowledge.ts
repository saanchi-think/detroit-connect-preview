import type { User } from "@supabase/supabase-js";
import type {
  AiSearchIntent,
  PlatformKnowledgeMatch,
  PlatformSearchDocumentMatch,
} from "@/lib/ai-search/types";
import type { AiConnectorPersonalization } from "@/lib/connectors/repository";
import { getForumPosts, type ForumPostModel } from "@/lib/forum/repository";
import {
  getFriendsDashboard,
  getRecommendationsYouMade,
  type FriendRecommendationModel,
} from "@/lib/friends/repository";
import { matchesFuzzySearch, normalizeSearchText } from "@/lib/search/fuzzy";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MAX_PLATFORM_SOURCES = 8;
const MAX_EXCERPT_LENGTH = 420;

type PlatformSearchRpcRow = {
  document_id: string;
  source_type: PlatformSearchDocumentMatch["sourceType"];
  source_id: string;
  parent_id: string | null;
  author_id: string | null;
  connector_profile_id: string | null;
  title: string;
  content: string;
  href: string;
  topics: string[];
  neighborhood: string | null;
  languages: string[];
  profile_kind: string | null;
  metadata: Record<string, unknown> | null;
  score: number;
  lexical_score: number;
  semantic_score: number;
};

function normalize(value: string) {
  return normalizeSearchText(value);
}

function includesTerm(text: string, term: string) {
  return matchesFuzzySearch(term, [text]);
}

function truncate(value: string, maxLength = MAX_EXCERPT_LENGTH) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function optionalFilters(values: string[]) {
  return values.length > 0 ? values : null;
}

function searchTerms(intent: AiSearchIntent) {
  return Array.from(
    new Set([
      ...intent.topics,
      ...intent.neighborhoods,
      ...intent.languages,
      ...intent.keywords,
    ]),
  );
}

function scoreText(text: string, terms: string[], weight: number) {
  const normalizedText = normalize(text);
  return terms.reduce(
    (score, term) => score + (includesTerm(normalizedText, term) ? weight : 0),
    0,
  );
}

function relevantComments(post: ForumPostModel, terms: string[]) {
  return post.comments
    .map((comment) => ({
      comment,
      score: scoreText(comment.body, terms, 2),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2);
}

function forumMatch(
  post: ForumPostModel,
  terms: string[],
  intent: AiSearchIntent,
  personalization?: AiConnectorPersonalization,
): PlatformKnowledgeMatch | null {
  const commentMatches = relevantComments(post, terms);
  const topicScore = intent.topics.some(
    (topic) => normalize(topic) === normalize(post.topic),
  )
    ? 10
    : 0;
  const score =
    topicScore +
    scoreText(post.title, terms, 4) +
    scoreText(post.body, terms, 2) +
    commentMatches.reduce((total, match) => total + match.score, 0) +
    (personalization?.neighborhood &&
    includesTerm(`${post.title} ${post.body}`, personalization.neighborhood)
      ? 1
      : 0) +
    (personalization?.languages
      .filter((language) => language.toLowerCase() !== "english")
      .some((language) => includesTerm(`${post.title} ${post.body}`, language))
      ? 1
      : 0);

  if (score === 0) return null;

  const comments = commentMatches.map(
    ({ comment }) => `Reply from ${comment.name}: ${comment.body}`,
  );
  const content = [
    `Community post by ${post.name}: ${post.body}`,
    ...comments,
  ].join(" ");

  return {
    id: `forum:${post.id}`,
    kind: "forum",
    title: post.title,
    href: `/forum#post-${post.id}`,
    content: truncate(content),
    score,
  };
}

function recommendationMatch(
  recommendation: FriendRecommendationModel,
  terms: string[],
  intent: AiSearchIntent,
  personalization?: AiConnectorPersonalization,
): PlatformKnowledgeMatch | null {
  const connector = recommendation.connector;
  const topicScore = intent.topics.reduce(
    (score, topic) =>
      score +
      (connector.topics.some(
        (connectorTopic) => normalize(connectorTopic) === normalize(topic),
      )
        ? 8
        : 0),
    0,
  );
  const neighborhoodScore = intent.neighborhoods.some(
    (neighborhood) => normalize(neighborhood) === normalize(connector.neighborhood),
  )
    ? 7
    : 0;
  const languageScore = intent.languages.reduce(
    (score, language) =>
      score +
      (connector.languages.some(
        (connectorLanguage) => normalize(connectorLanguage) === normalize(language),
      )
        ? 7
        : 0),
    0,
  );
  const score =
    topicScore +
    neighborhoodScore +
    languageScore +
    scoreText(recommendation.note, terms, 3) +
    scoreText(
      [
        connector.name,
        connector.role,
        connector.neighborhood,
        connector.topics.join(" "),
        connector.languages.join(" "),
      ].join(" "),
      terms,
      2,
    ) +
    (personalization?.neighborhood &&
    normalize(personalization.neighborhood) === normalize(connector.neighborhood)
      ? 2
      : 0) +
    (personalization?.languages
      .filter((language) => language.toLowerCase() !== "english")
      .some((language) =>
        connector.languages.some(
          (connectorLanguage) => normalize(connectorLanguage) === normalize(language),
        ),
      )
      ? 2
      : 0);

  if (score === 0) return null;

  return {
    id: `recommendation:${recommendation.id}`,
    kind: "recommendation",
    title: `${recommendation.recommenderName} recommended ${connector.name}`,
    href: `/connectors/${connector.id}`,
    content: truncate(
      `${recommendation.recommenderName} shared this recommendation: ${recommendation.note}`,
    ),
    score,
  };
}

export async function retrievePlatformSearchDocuments(
  query: string,
  intent: AiSearchIntent,
  queryEmbedding: number[] | null,
  limit = 24,
): Promise<PlatformSearchDocumentMatch[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_platform_documents", {
      query_text: query,
      query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
      source_types: null,
      topic_filters: optionalFilters(intent.topics),
      neighborhood_filters: optionalFilters(intent.neighborhoods),
      language_filters: optionalFilters(intent.languages),
      profile_type_filter: intent.profileType ?? null,
      match_count: Math.min(Math.max(limit, 1), 40),
    });

    if (error) return null;

    return ((data ?? []) as PlatformSearchRpcRow[]).map((row) => ({
      id: row.document_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      parentId: row.parent_id,
      authorId: row.author_id,
      connectorProfileId: row.connector_profile_id,
      title: row.title,
      content: row.content,
      href: row.href,
      topics: row.topics ?? [],
      neighborhood: row.neighborhood,
      languages: row.languages ?? [],
      profileKind:
        row.profile_kind === "person" || row.profile_kind === "organization"
          ? row.profile_kind
          : null,
      metadata: row.metadata ?? {},
      score: Number(row.score),
      lexicalScore: Number(row.lexical_score),
      semanticScore: Number(row.semantic_score),
    }));
  } catch {
    return null;
  }
}

export function platformDocumentsToKnowledge(
  documents: PlatformSearchDocumentMatch[],
  limit = MAX_PLATFORM_SOURCES,
) {
  const deduplicated = new Map<string, PlatformKnowledgeMatch>();

  documents.forEach((document) => {
    if (document.sourceType === "connector_profile") return;
    const kind = document.sourceType === "recommendation" ? "recommendation" : "forum";
    const groupId =
      document.sourceType === "forum_comment"
        ? `forum:${document.parentId ?? document.sourceId}`
        : `${kind}:${document.sourceId}`;
    const candidate: PlatformKnowledgeMatch = {
      id: groupId,
      kind,
      title: document.title,
      href: document.href,
      content: truncate(document.content),
      score: document.score,
    };
    const existing = deduplicated.get(groupId);
    if (!existing || candidate.score > existing.score) {
      deduplicated.set(groupId, candidate);
    }
  });

  return Array.from(deduplicated.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(Math.max(limit, 1), MAX_PLATFORM_SOURCES));
}

async function retrieveFallbackPlatformKnowledge(
  intent: AiSearchIntent,
  user?: User | null,
  limit = MAX_PLATFORM_SOURCES,
  personalization?: AiConnectorPersonalization,
) {
  const terms = searchTerms(intent);
  const [posts, dashboard, recommendationsYouMade] = await Promise.all([
    getForumPosts(undefined, user),
    getFriendsDashboard(user),
    getRecommendationsYouMade(user),
  ]);
  const recommendations = new Map<string, FriendRecommendationModel>();

  [...dashboard.recommendations, ...recommendationsYouMade].forEach(
    (recommendation) => recommendations.set(recommendation.id, recommendation),
  );

  return [
    ...posts.flatMap((post) => {
      const match = forumMatch(post, terms, intent, personalization);
      return match ? [match] : [];
    }),
    ...Array.from(recommendations.values()).flatMap((recommendation) => {
      const match = recommendationMatch(
        recommendation,
        terms,
        intent,
        personalization,
      );
      return match ? [match] : [];
    }),
  ]
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(Math.max(limit, 1), MAX_PLATFORM_SOURCES));
}

export async function retrievePlatformKnowledge(
  query: string,
  intent: AiSearchIntent,
  user?: User | null,
  limit = MAX_PLATFORM_SOURCES,
  personalization?: AiConnectorPersonalization,
  queryEmbedding: number[] | null = null,
  preloadedDocuments?: PlatformSearchDocumentMatch[] | null,
): Promise<PlatformKnowledgeMatch[]> {
  const indexedDocuments =
    preloadedDocuments === undefined
      ? await retrievePlatformSearchDocuments(
          query,
          intent,
          queryEmbedding,
          Math.max(limit * 3, 16),
        )
      : preloadedDocuments;
  const indexedKnowledge = indexedDocuments
    ? platformDocumentsToKnowledge(indexedDocuments, limit)
    : [];
  if (indexedKnowledge.length >= limit) return indexedKnowledge;

  const fallbackKnowledge = await retrieveFallbackPlatformKnowledge(
    intent,
    user,
    limit,
    personalization,
  );
  const combined = new Map<string, PlatformKnowledgeMatch>();
  [...indexedKnowledge, ...fallbackKnowledge].forEach((match) => {
    const existing = combined.get(match.id);
    if (!existing || match.score > existing.score) combined.set(match.id, match);
  });

  return Array.from(combined.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(Math.max(limit, 1), MAX_PLATFORM_SOURCES));
}
