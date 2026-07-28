import { z } from "zod";
import { inferSearchIntent } from "@/lib/ai-search/intent";
import { retrieveApprovedKnowledge } from "@/lib/ai-search/knowledge";
import type {
  AiSearchCitation,
  AiSearchConnector,
  AiSearchResult,
} from "@/lib/ai-search/types";
import {
  getConnectorFilterOptions,
  rankConnectorsForAiSearch,
  type AiConnectorMatch,
} from "@/lib/connectors/repository";

const MAX_QUERY_LENGTH = 240;

const modelResultSchema = z.object({
  answer: z.string().min(1).max(900),
  connectorOrder: z.array(z.string()).max(8),
  matchReasons: z
    .array(
      z.object({
        connectorId: z.string(),
        reason: z.string().min(1).max(180),
      }),
    )
    .max(8),
  sourceIndexes: z.array(z.number().int().positive()).max(12),
  unableToVerify: z.boolean(),
});

type ModelResult = z.infer<typeof modelResultSchema>;

type ResponsesPayload = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function publicProfileExcerpt(match: AiConnectorMatch) {
  const connector = match.connector;
  return [
    `${connector.name} is listed as ${connector.role}.`,
    `Neighborhood: ${connector.neighborhood}.`,
    `Topics: ${connector.topics.join(", ")}.`,
    `Languages: ${connector.languages.join(", ")}.`,
  ].join(" ");
}

function deterministicReason(match: AiConnectorMatch) {
  const reasons = [
    match.matchedTopics.length > 0 ? match.matchedTopics.slice(0, 2).join(" and ") : null,
    match.matchedNeighborhood,
    match.matchedLanguages.length > 0
      ? `${match.matchedLanguages.slice(0, 2).join(" and ")} language support`
      : null,
  ].filter(Boolean);

  if (reasons.length > 0) return `Matches ${reasons.join(", ")}.`;
  if (match.matchedKeywords.length > 0) {
    return `Matches your search for ${match.matchedKeywords.slice(0, 3).join(", ")}.`;
  }
  return "A relevant Detroit Connect profile.";
}

function extractOutputText(payload: ResponsesPayload) {
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return null;
}

async function generateModelResult(
  query: string,
  matches: AiConnectorMatch[],
  citations: AiSearchCitation[],
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const sourceText = citations
    .map((citation) => `[${citation.index}] ${citation.title}\n${citation.excerpt}`)
    .join("\n\n");
  const connectorIds = matches.map((match) => match.connector.id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SEARCH_MODEL ?? "gpt-5.6-luna",
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text: [
                  "You are the search layer for Detroit Connect.",
                  "Use only the supplied public connector summaries and approved source excerpts.",
                  "Do not invent Detroit facts, services, credentials, or availability.",
                  "Connector recommendations and factual guidance are different: explain matches from profile fields, and only give factual guidance when an approved website or file supports it.",
                  "Use bracketed source numbers such as [1] in the answer.",
                  "If the sources do not support a factual answer, set unableToVerify to true and say that plainly while still offering relevant connectors.",
                  "Keep the answer warm, direct, and under 120 words.",
                  `Valid connector IDs: ${connectorIds.join(", ") || "none"}.`,
                ].join("\n"),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Question: ${query}\n\nRetrieved sources:\n${sourceText || "No approved sources found."}`,
              },
            ],
          },
        ],
        reasoning: { effort: "low" },
        max_output_tokens: 900,
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "detroit_connect_search",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: { type: "string" },
                connectorOrder: {
                  type: "array",
                  items: { type: "string", enum: connectorIds.length > 0 ? connectorIds : ["none"] },
                },
                matchReasons: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      connectorId: {
                        type: "string",
                        enum: connectorIds.length > 0 ? connectorIds : ["none"],
                      },
                      reason: { type: "string" },
                    },
                    required: ["connectorId", "reason"],
                  },
                },
                sourceIndexes: {
                  type: "array",
                  items: { type: "integer", minimum: 1, maximum: Math.max(citations.length, 1) },
                },
                unableToVerify: { type: "boolean" },
              },
              required: [
                "answer",
                "connectorOrder",
                "matchReasons",
                "sourceIndexes",
                "unableToVerify",
              ],
            },
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const outputText = extractOutputText((await response.json()) as ResponsesPayload);
    if (!outputText) return null;
    return modelResultSchema.parse(JSON.parse(outputText));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildFallbackAnswer(query: string, matches: AiConnectorMatch[]) {
  if (matches.length === 0) {
    return "I could not find a clear profile match yet. Try a topic, neighborhood, or language, or browse all connectors.";
  }

  const lead = matches[0].connector;
  const second = matches[1]?.connector;
  const names = second ? `${lead.name} and ${second.name}` : lead.name;
  const subject = matches.length === 1 ? "this public profile matches" : "their public profiles match";
  return `I found ${matches.length} relevant ${matches.length === 1 ? "profile" : "profiles"}. Start with ${names}; ${subject} the help you described. [1]`;
}

function orderMatches(matches: AiConnectorMatch[], modelResult: ModelResult | null) {
  if (!modelResult) return matches;
  const order = new Map(modelResult.connectorOrder.map((id, index) => [id, index]));
  return [...matches].sort(
    (left, right) =>
      (order.get(left.connector.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.connector.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function runAiSearch(rawQuery: string): Promise<AiSearchResult> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  const filterOptions = await getConnectorFilterOptions();
  const intent = inferSearchIntent(query, filterOptions);
  const matches = await rankConnectorsForAiSearch({
    query,
    topics: intent.topics,
    languages: intent.languages,
    neighborhoods: intent.neighborhoods,
    type: intent.profileType,
    limit: 8,
  });
  const knowledge = await retrieveApprovedKnowledge(query);
  const profileCitations: AiSearchCitation[] = matches.map((match, index) => ({
    id: `profile:${match.connector.id}`,
    index: index + 1,
    kind: "profile",
    title: match.connector.name,
    href: `/connectors/${match.connector.id}`,
    excerpt: publicProfileExcerpt(match),
  }));
  const knowledgeCitations: AiSearchCitation[] = knowledge.map((match, index) => ({
    id: `knowledge:${match.id}`,
    index: profileCitations.length + index + 1,
    kind: match.kind,
    title: match.heading ? `${match.title} — ${match.heading}` : match.title,
    href: match.href,
    excerpt: match.content,
  }));
  const citations = [...profileCitations, ...knowledgeCitations];
  const modelResult = await generateModelResult(query, matches, citations);
  const orderedMatches = orderMatches(matches, modelResult);
  const reasons = new Map(
    modelResult?.matchReasons.map((item) => [item.connectorId, item.reason]) ?? [],
  );
  const connectors: AiSearchConnector[] = orderedMatches.map((match) => ({
    connector: match.connector,
    reason: reasons.get(match.connector.id) ?? deterministicReason(match),
    citationIndex:
      citations.find((citation) => citation.id === `profile:${match.connector.id}`)?.index ?? 1,
  }));
  const selectedCitationIndexes = new Set(
    modelResult?.sourceIndexes.filter((index) => index <= citations.length) ??
      citations.slice(0, Math.min(5, citations.length)).map((citation) => citation.index),
  );

  return {
    query,
    answer: modelResult?.answer ?? buildFallbackAnswer(query, matches),
    connectors,
    citations: citations.filter((citation) => selectedCitationIndexes.has(citation.index)),
    intent,
    usedAi: Boolean(modelResult),
    unableToVerify: modelResult?.unableToVerify ?? false,
  };
}
