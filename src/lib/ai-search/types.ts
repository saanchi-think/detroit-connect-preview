import type { ConnectorCardModel } from "@/lib/connectors/types";

export type AiSearchIntent = {
  topics: string[];
  languages: string[];
  neighborhoods: string[];
  profileType?: "person" | "organization";
  keywords: string[];
};

export type AiSearchCitation = {
  id: string;
  index: number;
  kind: "profile" | "forum" | "recommendation";
  title: string;
  href: string | null;
  excerpt: string;
};

export type AiSearchConnector = {
  connector: ConnectorCardModel;
  reason: string;
  citationIndex: number;
};

export type AiSearchPersonalization = {
  applied: boolean;
  profileName: string;
  signals: string[];
};

export type AiSearchResult = {
  query: string;
  answer: string;
  connectors: AiSearchConnector[];
  mentionedProfiles: ConnectorCardModel[];
  citations: AiSearchCitation[];
  intent: AiSearchIntent;
  personalization: AiSearchPersonalization | null;
  usedAi: boolean;
  unableToVerify: boolean;
};

export type KnowledgeMatch = {
  id: string;
  sourceId: string;
  kind: "website" | "file";
  title: string;
  href: string | null;
  heading: string | null;
  content: string;
  similarity: number;
};

export type PlatformKnowledgeMatch = {
  id: string;
  kind: "forum" | "recommendation";
  title: string;
  href: string;
  content: string;
  score: number;
};

export type PlatformSearchDocumentMatch = {
  id: string;
  sourceType: "connector_profile" | "forum_post" | "forum_comment" | "recommendation";
  sourceId: string;
  parentId: string | null;
  authorId: string | null;
  connectorProfileId: string | null;
  title: string;
  content: string;
  href: string;
  topics: string[];
  neighborhood: string | null;
  languages: string[];
  profileKind: "person" | "organization" | null;
  metadata: Record<string, unknown>;
  score: number;
  lexicalScore: number;
  semanticScore: number;
};
