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
  kind: "profile" | "website" | "file";
  title: string;
  href: string | null;
  excerpt: string;
};

export type AiSearchConnector = {
  connector: ConnectorCardModel;
  reason: string;
  citationIndex: number;
};

export type AiSearchResult = {
  query: string;
  answer: string;
  connectors: AiSearchConnector[];
  citations: AiSearchCitation[];
  intent: AiSearchIntent;
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
