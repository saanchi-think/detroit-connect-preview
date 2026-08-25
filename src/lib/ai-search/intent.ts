import type { ConnectorFilterOptions } from "@/lib/connectors/repository";
import type { AiSearchIntent } from "@/lib/ai-search/types";
import { matchesFuzzySearch, normalizeSearchText } from "@/lib/search/fuzzy";

const TOPIC_ALIASES: Record<string, string[]> = {
  Housing: [
    "apartment",
    "buy a home",
    "buying",
    "home",
    "housing",
    "landlord",
    "lease",
    "leases",
    "leasing",
    "mortgage",
    "rent",
    "renter",
    "rental",
    "rentals",
    "sublet",
    "sublease",
    "tenant",
    "tenants",
  ],
  Schools: ["childcare", "daycare", "education", "school", "schools"],
  Business: ["business", "company", "entrepreneur", "startup"],
  Permits: ["inspection", "license", "licensing", "permit", "permits"],
  Finances: ["banking", "budget", "finance", "finances", "money", "tax", "taxes"],
  Medical: ["clinic", "doctor", "health", "healthcare", "medical"],
  Legal: ["attorney", "law", "lawyer", "legal"],
  Moving: ["move", "moving", "newcomer", "relocation", "relocating"],
  Transportation: ["bus", "commute", "transit", "transportation"],
  "City Services": ["city service", "city services", "municipal"],
  Utilities: ["electric", "gas", "internet", "utilities", "utility", "water"],
  Neighborhoods: ["area", "neighborhood", "neighborhoods", "where to live"],
  Jobs: ["career", "employment", "job", "jobs", "work"],
  Community: ["community", "neighbors", "network"],
};

const STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "at",
  "be",
  "can",
  "detroit",
  "does",
  "find",
  "for",
  "from",
  "help",
  "how",
  "i",
  "in",
  "is",
  "it",
  "looking",
  "me",
  "my",
  "need",
  "of",
  "someone",
  "that",
  "the",
  "this",
  "to",
  "want",
  "we",
  "what",
  "where",
  "who",
  "with",
  "you",
  "your",
]);

function normalized(value: string) {
  return normalizeSearchText(value);
}

function includesPhrase(query: string, phrase: string) {
  return matchesFuzzySearch(phrase, [query]);
}

export function inferSearchIntent(
  query: string,
  options: ConnectorFilterOptions,
): AiSearchIntent {
  const normalizedQuery = normalized(query);
  const topics = new Set<string>();

  for (const topic of options.topics) {
    if (includesPhrase(normalizedQuery, topic)) topics.add(topic);
  }

  for (const [canonicalTopic, aliases] of Object.entries(TOPIC_ALIASES)) {
    if (
      options.topics.some((topic) => topic.toLowerCase() === canonicalTopic.toLowerCase()) &&
      aliases.some((alias) => includesPhrase(normalizedQuery, alias))
    ) {
      topics.add(
        options.topics.find((topic) => topic.toLowerCase() === canonicalTopic.toLowerCase())!,
      );
    }
  }

  const languages = options.languages.filter((language) =>
    includesPhrase(normalizedQuery, language),
  );
  const neighborhoods = options.neighborhoods.filter((neighborhood) =>
    includesPhrase(normalizedQuery, neighborhood),
  );
  const profileType = /\b(organization|nonprofit|agency|company|service provider)\b/.test(
    normalizedQuery,
  )
    ? "organization"
    : /\b(person|resident|neighbor|individual|mentor)\b/.test(normalizedQuery)
      ? "person"
      : undefined;
  const keywords = Array.from(
    new Set(
      normalizedQuery
        .split(/\s+/)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
    ),
  ).slice(0, 10);

  return {
    topics: Array.from(topics),
    languages,
    neighborhoods,
    profileType,
    keywords,
  };
}
