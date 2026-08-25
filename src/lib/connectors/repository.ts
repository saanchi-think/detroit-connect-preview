import { readFile } from "node:fs/promises";
import type { Database, ProfileKind } from "@/lib/database.types";
import { sampleConnectors } from "@/lib/data/sample-connectors";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { getLocalMemberIdsForProfile } from "@/lib/members/local-member-profiles";
import type {
  AvatarKey,
  ConnectorCardModel,
  ConnectorProfileModel,
  CreateConnectorProfileInput,
  UpdateConnectorProfileInput,
} from "@/lib/connectors/types";
import {
  fuzzySearchScore,
  fuzzyTokenScore,
  matchesFuzzySearch,
  normalizeSearchText,
  tokenizeFuzzySearch,
} from "@/lib/search/fuzzy";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type ConnectorRow = Database["public"]["Tables"]["connector_profiles"]["Row"];
type ConnectorInsert = Database["public"]["Tables"]["connector_profiles"]["Insert"];

type LocalConnectorRecord = Omit<ConnectorRow, "search_document" | "avatar_url"> & {
  avatar_url?: string | null;
  friend_signal?: string | null;
};

type SearchConnectorOptions = {
  query?: string;
  type?: string;
  sort?: string;
  language?: string;
  neighborhood?: string;
  topic?: string;
  page?: number;
  pageSize?: number;
};

export type ConnectorFilterOptions = {
  languages: string[];
  neighborhoods: string[];
  topics: string[];
};

export type ConnectorSearchPage = {
  connectors: ConnectorCardModel[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type MentionTarget = {
  profileId: string;
  name: string;
  ownerId: string | null;
  profileHref: string;
};

export type AiConnectorSearchOptions = {
  query: string;
  topics: string[];
  languages: string[];
  neighborhoods: string[];
  type?: "person" | "organization";
  personalization?: AiConnectorPersonalization;
  limit?: number;
};

export type AiConnectorPersonalization = {
  profileId: string;
  neighborhood: string | null;
  languages: string[];
};

export type AiConnectorMatch = {
  connector: ConnectorCardModel;
  matchedTopics: string[];
  matchedLanguages: string[];
  matchedNeighborhood: string | null;
  matchedKeywords: string[];
  personalizedSignals: string[];
  questionScore: number;
  personalizationScore: number;
  score: number;
};

const LOCAL_STORE_PATH = getLocalDataPath("local-dev-store.json");
const SAMPLE_ID_PREFIX = "11111111-1111-4111-8111-";
export const LOCAL_DEMO_USER_ID = "local-dev-user";

function seedRecordFromSample(connector: ConnectorCardModel, index: number): LocalConnectorRecord {
  const createdAt = new Date(Date.UTC(2026, 6, index + 1, 12, 0, 0)).toISOString();

  return {
    id: `${SAMPLE_ID_PREFIX}${String(index + 1).padStart(12, "0")}`,
    owner_id: null,
    kind: connector.kind,
    status: "published",
    name: connector.name,
    headline: connector.role,
    bio: null,
    organization_name: null,
    email: null,
    phone: null,
    website_url: null,
    preferred_contact_method: "Email",
    neighborhood: connector.neighborhood,
    zip_code: null,
    years_connected: null,
    languages: connector.languages,
    topics: connector.topics,
    skills: [],
    availability: ["Messages"],
    trust_badges: [],
    created_at: createdAt,
    updated_at: createdAt,
    avatar_key: null,
    avatar_url: null,
    friend_signal: connector.friendSignal,
  };
}

async function readLocalStore(seedWithSamples: boolean) {
  try {
    const raw = await readFile(LOCAL_STORE_PATH, "utf8");
    return JSON.parse(raw) as LocalConnectorRecord[];
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    const seeded = seedWithSamples ? sampleConnectors.map(seedRecordFromSample) : [];
    await writeLocalStore(seeded);
    return seeded;
  }
}

async function writeLocalStore(records: LocalConnectorRecord[]) {
  await writeLocalJson(LOCAL_STORE_PATH, records);
}

function normalizeQuery(value?: string) {
  return value ? normalizeSearchText(value) : "";
}

function matchesType(kind: ProfileKind, type?: string) {
  const normalizedKind = kind === "vendor" ? "organization" : kind;
  return !type || type === "all" || normalizedKind === type;
}

function filterConnectorRows(rows: LocalConnectorRecord[], options: SearchConnectorOptions) {
  const query = normalizeQuery(options.query);
  const language = normalizeQuery(options.language);
  const neighborhood = normalizeQuery(options.neighborhood);
  const topic = normalizeQuery(options.topic);

  return rows.filter((row) => {
    if (row.status !== "published" || !matchesType(row.kind, options.type)) {
      return false;
    }
    if (language && !row.languages.some((value) => value.toLowerCase() === language)) {
      return false;
    }
    if (neighborhood && (row.neighborhood ?? "").toLowerCase() !== neighborhood) {
      return false;
    }
    if (topic && !row.topics.some((value) => value.toLowerCase() === topic)) {
      return false;
    }

    if (!query) {
      return true;
    }

    return matchesFuzzySearch(query, [
      row.name,
      row.headline,
      row.bio,
      row.organization_name,
      row.neighborhood,
      row.zip_code,
      row.preferred_contact_method,
      row.years_connected,
      ...row.languages,
      ...row.topics,
      ...row.skills,
      ...row.availability,
    ]);
  });
}

function relevanceScore(row: LocalConnectorRecord, query: string) {
  const normalizedName = normalizeSearchText(row.name);
  const topics = row.topics.map(normalizeSearchText);

  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 1;
  if (topics.some((topic) => topic === query)) return 2;
  if (normalizedName.includes(query)) return 3;
  if (topics.some((topic) => topic.includes(query))) return 4;
  return 5 + fuzzySearchScore(query, [
    row.name,
    ...row.topics,
    row.headline,
    row.neighborhood,
    ...row.languages,
    ...row.skills,
  ]);
}

function tokenizeSearchText(value: string) {
  return Array.from(new Set(tokenizeFuzzySearch(value)));
}

function includesCaseInsensitive(values: string[], expected: string) {
  return values.some((value) => value.toLowerCase() === expected.toLowerCase());
}

function sortConnectorRows(rows: LocalConnectorRecord[], options: SearchConnectorOptions) {
  const query = normalizeQuery(options.query);
  const sort = options.sort || (query ? "relevance" : "newest");

  return [...rows].sort((left, right) => {
    if (sort === "name") {
      return left.name.localeCompare(right.name);
    }

    if (sort === "neighborhood") {
      return (
        (left.neighborhood ?? "Detroit").localeCompare(right.neighborhood ?? "Detroit") ||
        left.name.localeCompare(right.name)
      );
    }

    if (sort === "relevance" && query) {
      return (
        relevanceScore(left, query) - relevanceScore(right, query) ||
        right.created_at.localeCompare(left.created_at) ||
        left.name.localeCompare(right.name)
      );
    }

    return right.created_at.localeCompare(left.created_at) || left.name.localeCompare(right.name);
  });
}

function dedupeConnectorRows(rows: LocalConnectorRecord[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function rowToCard(row: LocalConnectorRecord): ConnectorCardModel {
  const normalizedKind = row.kind === "vendor" ? "organization" : row.kind;
  return {
    id: row.id,
    kind: normalizedKind,
    name: row.name,
    role:
      row.headline ??
      row.organization_name ??
      (normalizedKind === "organization"
          ? "Community organization"
          : "Detroit connector"),
    neighborhood: row.neighborhood ?? "Detroit",
    topics: row.topics.slice(0, 4),
    languages: row.languages.length > 0 ? row.languages : ["English"],
    friendSignal:
      row.friend_signal ??
      (normalizedKind === "organization"
          ? "Community-backed resource"
          : "Open to helping newcomers"),
    avatarKey: normalizeAvatarKey(row.avatar_key),
    avatarUrl: row.avatar_url ?? null,
  };
}

function normalizeAvatarKey(value?: string | null): AvatarKey | null {
  return value === "tire" || value === "boat" || value === "car" || value === "pizza" ? value : null;
}

function rowToProfile(row: LocalConnectorRecord): ConnectorProfileModel {
  const card = rowToCard(row);

  return {
    ...card,
    topics: row.topics,
    ownerId: row.owner_id ?? getLocalMemberIdsForProfile(row.id)[0] ?? null,
    bio: row.bio,
    organizationName: row.organization_name,
    email: row.email,
    phone: row.phone,
    websiteUrl: row.website_url,
    preferredContactMethod: row.preferred_contact_method,
    zipCode: row.zip_code,
    yearsConnected: row.years_connected,
    skills: row.skills,
    availability: row.availability,
    trustBadges: row.trust_badges,
    avatarKey: normalizeAvatarKey(row.avatar_key),
    avatarUrl: row.avatar_url ?? null,
  };
}

async function getConnectorRows() {
  const supabaseRows = await fetchSupabaseRows();

  if (supabaseRows) {
    return dedupeConnectorRows(supabaseRows);
  }

  return dedupeConnectorRows(await readLocalStore(true));
}

export async function getConnectorFilterOptions(): Promise<ConnectorFilterOptions> {
  const rows = (await getConnectorRows()).filter((row) => row.status === "published");
  const unique = (values: string[]) =>
    Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right),
    );

  return {
    languages: unique(rows.flatMap((row) => row.languages)),
    neighborhoods: unique(rows.flatMap((row) => (row.neighborhood ? [row.neighborhood] : []))),
    topics: unique(rows.flatMap((row) => row.topics)),
  };
}

export async function getMentionTargets(): Promise<MentionTarget[]> {
  return (await getConnectorRows())
    .filter(
      (row) =>
        row.status === "published" &&
        row.kind === "person" &&
        row.name.trim().length > 0,
    )
    .map((row) => ({
      profileId: row.id,
      name: row.name.trim(),
      ownerId: row.owner_id,
      profileHref: `/connectors/${row.id}`,
    }))
    .sort((left, right) => right.name.length - left.name.length);
}

function buildConnectorInsert(input: CreateConnectorProfileInput): ConnectorInsert {
  return {
    owner_id: input.ownerId ?? null,
    kind: input.kind,
    status: "published",
    name: input.name,
    headline: input.headline ?? null,
    bio: input.bio ?? null,
    organization_name: input.organizationName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    website_url: null,
    preferred_contact_method: input.preferredContactMethod ?? null,
    neighborhood: input.neighborhood ?? null,
    zip_code: input.zipCode ?? null,
    years_connected: input.yearsConnected ?? null,
    languages: input.languages,
    topics: input.topics,
    skills: input.skills,
    availability: input.availability,
    trust_badges: [],
    avatar_key: input.avatarKey ?? null,
    avatar_url: input.avatarUrl ?? null,
  };
}

async function fetchSupabaseRows() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();

  const batchSize = 1000;
  const rows: LocalConnectorRecord[] = [];

  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from("connector_profiles")
      .select("*")
      .eq("status", "published")
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Could not load connector profiles: ${error.message}`);
    }

    const batch = (data ?? []) as LocalConnectorRecord[];
    rows.push(...batch);

    if (batch.length < batchSize) {
      break;
    }
  }

  return rows;
}

export async function searchConnectorCards(options: SearchConnectorOptions = {}) {
  return (await searchConnectorCardPage(options)).connectors;
}

export async function searchConnectorProfiles(options: SearchConnectorOptions = {}) {
  const rows = sortConnectorRows(filterConnectorRows(await getConnectorRows(), options), options);
  const pageSize = Math.min(Math.max(Math.trunc(options.pageSize ?? 8), 1), 24);
  return rows.slice(0, pageSize).map(rowToProfile);
}

export async function searchConnectorCardPage(
  options: SearchConnectorOptions = {},
): Promise<ConnectorSearchPage> {
  const mergedRows = await getConnectorRows();
  const filteredRows = sortConnectorRows(filterConnectorRows(mergedRows, options), options);
  const pageSize = Math.min(Math.max(Math.trunc(options.pageSize ?? 24), 1), 60);
  const total = filteredRows.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(Math.trunc(options.page ?? 1), 1), totalPages);
  const start = (page - 1) * pageSize;

  return {
    connectors: filteredRows.slice(start, start + pageSize).map(rowToCard),
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function rankConnectorsForAiSearch(
  options: AiConnectorSearchOptions,
): Promise<AiConnectorMatch[]> {
  const tokens = tokenizeSearchText(options.query);
  const rows = (await getConnectorRows()).filter((row) => {
    if (row.status !== "published") return false;
    if (row.id === options.personalization?.profileId) return false;
    if (!options.type) return true;
    return (row.kind === "vendor" ? "organization" : row.kind) === options.type;
  });

  const ranked = rows.map((row) => {
    const card = rowToCard(row);
    const matchedTopics = options.topics.filter((topic) => includesCaseInsensitive(row.topics, topic));
    const matchedLanguages = options.languages.filter((language) =>
      includesCaseInsensitive(row.languages, language),
    );
    const matchedNeighborhood =
      options.neighborhoods.find(
        (neighborhood) => neighborhood.toLowerCase() === (row.neighborhood ?? "").toLowerCase(),
      ) ?? null;
    const searchable = [
      row.name,
      row.headline,
      row.bio,
      row.organization_name,
      row.neighborhood,
      ...row.languages,
      ...row.topics,
      ...row.skills,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchableTokens = tokenizeSearchText(searchable);
    const nameTokens = new Set(tokenizeSearchText(row.name));
    const matchedKeywords = tokens
      .filter((token) =>
        searchableTokens.some((searchableToken) =>
          Number.isFinite(fuzzyTokenScore(token, searchableToken)),
        ),
      )
      .slice(0, 5);
    const questionScore =
      matchedTopics.length * 8 +
      matchedLanguages.length * 7 +
      (matchedNeighborhood ? 9 : 0) +
      matchedKeywords.length * 2 +
      (tokens.some((token) => nameTokens.has(token)) ? 3 : 0);
    const personalizedSignals: string[] = [];
    let personalizationScore = 0;

    if (
      options.personalization?.neighborhood &&
      options.personalization.neighborhood.toLowerCase() ===
        (row.neighborhood ?? "").toLowerCase()
    ) {
      personalizedSignals.push(options.personalization.neighborhood);
      personalizationScore += 2;
    }

    const sharedLanguages = options.personalization?.languages
      .filter((language) => language.toLowerCase() !== "english")
      .filter((language) => includesCaseInsensitive(row.languages, language))
      .slice(0, 1) ?? [];

    if (sharedLanguages.length > 0) {
      personalizedSignals.push(...sharedLanguages);
      personalizationScore += 2;
    }

    return {
      connector: card,
      matchedTopics,
      matchedLanguages,
      matchedNeighborhood,
      matchedKeywords,
      personalizedSignals,
      questionScore,
      personalizationScore,
      score: questionScore + personalizationScore,
    };
  });

  const hasIntent =
    options.topics.length > 0 ||
    options.languages.length > 0 ||
    options.neighborhoods.length > 0 ||
    tokens.length > 0;
  const hasQuestionMatches = ranked.some((result) => result.questionScore > 0);
  const questionMatches = ranked.filter((result) => result.questionScore > 0);
  const exactMatches = questionMatches.filter(
    (result) =>
      (options.languages.length === 0 || result.matchedLanguages.length > 0) &&
      (options.neighborhoods.length === 0 || Boolean(result.matchedNeighborhood)) &&
      (options.topics.length === 0 || result.matchedTopics.length > 0),
  );

  // A query can be perfectly understood even when no one profile covers every
  // requested constraint. Keep the primary need first, rather than returning
  // an empty result solely because the directory has a coverage gap.
  const closestQuestionMatches = options.topics.length > 0
    ? questionMatches.filter((result) => result.matchedTopics.length > 0)
    : options.languages.length > 0
      ? questionMatches.filter((result) => result.matchedLanguages.length > 0)
      : options.neighborhoods.length > 0
        ? questionMatches.filter((result) => Boolean(result.matchedNeighborhood))
        : questionMatches;
  const matching = hasIntent
    ? exactMatches.length > 0
      ? exactMatches
      : closestQuestionMatches.length > 0
        ? closestQuestionMatches
        : hasQuestionMatches
          ? questionMatches
          : ranked.filter((result) => result.personalizationScore > 0)
    : ranked;
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 12);

  return matching
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.connector.name.localeCompare(right.connector.name),
    )
    .slice(0, limit);
}

export async function getConnectorCardsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const idSet = new Set(ids);
  const order = new Map(ids.map((id, index) => [id, index]));
  const rows = (await getConnectorRows()).filter((row) => idSet.has(row.id));

  return rows
    .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
    .map(rowToCard);
}

export async function getConnectorCardsMentionedInText(text: string) {
  const normalizedText = normalizeSearchText(text);
  if (!normalizedText) return [];

  return (await getConnectorRows())
    .filter((row) => {
      const name = normalizeSearchText(row.name);
      return row.status === "published" && name.length >= 3 && normalizedText.includes(name);
    })
    .sort((left, right) => {
      const leftIndex = normalizedText.indexOf(normalizeSearchText(left.name));
      const rightIndex = normalizedText.indexOf(normalizeSearchText(right.name));
      return leftIndex - rightIndex || left.name.localeCompare(right.name);
    })
    .map(rowToCard);
}

export async function getConnectorProfileById(id: string) {
  const row = (await getConnectorRows()).find(
    (connector) => connector.id === id && connector.status === "published",
  );

  return row ? rowToProfile(row) : null;
}

export async function getOwnedConnectorProfileId(ownerId: string) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("connector_profiles")
      .select("id")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load your connector profile: ${error.message}`);
    }

    return data?.id ?? null;
  }

  const localProfile = (await readLocalStore(true))
    .filter((profile) => profile.owner_id === ownerId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];

  return localProfile?.id ?? null;
}

export async function createConnectorProfile(input: CreateConnectorProfileInput) {
  const payload = buildConnectorInsert(input);

  if (isSupabaseConfigured()) {
    if (!input.ownerId) {
      throw new Error("Sign in before creating a connector profile.");
    }

    const supabase = await createClient();
    const { error: accountProfileError } = await supabase
      .from("user_profiles")
      .update({
        display_name: input.name,
        email: input.email ?? null,
        ...(input.avatarUrl ? { avatar_url: input.avatarUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.ownerId);

    if (accountProfileError) {
      throw new Error(`Could not update the account profile: ${accountProfileError.message}`);
    }

    const { data, error } = await supabase
      .from("connector_profiles")
      .insert([payload])
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Could not create the connector profile: ${error?.message ?? "Unknown error"}`);
    }

    return { id: data.id, mode: "supabase" as const };
  }

  const localRows = await readLocalStore(true);
  const timestamp = new Date().toISOString();
  const localRecord: LocalConnectorRecord = {
    id: crypto.randomUUID(),
    owner_id: payload.owner_id ?? LOCAL_DEMO_USER_ID,
    kind: payload.kind ?? "person",
    status: "published",
    name: payload.name,
    headline: payload.headline ?? null,
    bio: payload.bio ?? null,
    organization_name: payload.organization_name ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    website_url: null,
    preferred_contact_method: payload.preferred_contact_method ?? null,
    neighborhood: payload.neighborhood ?? null,
    zip_code: payload.zip_code ?? null,
    years_connected: payload.years_connected ?? null,
    languages: payload.languages ?? [],
    topics: payload.topics ?? [],
    skills: payload.skills ?? [],
    availability: payload.availability ?? [],
    trust_badges: [],
    created_at: timestamp,
    updated_at: timestamp,
    avatar_key: input.avatarKey ?? null,
    avatar_url: input.avatarUrl ?? null,
    friend_signal: "Just joined Detroit Connect",
  };

  await writeLocalStore([localRecord, ...localRows]);

  return { id: localRecord.id, mode: "local" as const };
}

export async function updateConnectorProfile(input: UpdateConnectorProfileInput) {
  const payload = buildConnectorInsert(input);
  const updates: Partial<ConnectorInsert> & { updated_at: string } = {
    kind: payload.kind,
    name: payload.name,
    headline: payload.headline,
    bio: payload.bio,
    organization_name: payload.organization_name,
    email: payload.email,
    phone: payload.phone,
    preferred_contact_method: payload.preferred_contact_method,
    neighborhood: payload.neighborhood,
    zip_code: payload.zip_code,
    years_connected: payload.years_connected,
    languages: payload.languages,
    topics: payload.topics,
    skills: payload.skills,
    availability: payload.availability,
    avatar_key: payload.avatar_key,
    ...(input.avatarUrl ? { avatar_url: input.avatarUrl } : {}),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    if (!input.ownerId) {
      throw new Error("Sign in before editing this profile.");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("connector_profiles")
      .update(updates)
      .eq("id", input.id)
      .eq("owner_id", input.ownerId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`Could not update the connector profile: ${error.message}`);
    }
    if (!data) {
      throw new Error("You can only edit your own profile.");
    }

    await supabase
      .from("user_profiles")
      .update({
        display_name: input.name,
        email: input.email ?? null,
        ...(input.avatarUrl ? { avatar_url: input.avatarUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.ownerId);

    return { id: input.id, mode: "supabase" as const };
  }

  const rows = await readLocalStore(true);
  const profileIndex = rows.findIndex((profile) => profile.id === input.id);

  if (profileIndex < 0) {
    throw new Error("That profile could not be found.");
  }
  if (rows[profileIndex].owner_id !== (input.ownerId ?? LOCAL_DEMO_USER_ID)) {
    throw new Error("You can only edit your own profile.");
  }

  rows[profileIndex] = {
    ...rows[profileIndex],
    ...updates,
    avatar_url: input.avatarUrl ?? rows[profileIndex].avatar_url ?? null,
  };
  await writeLocalStore(rows);

  return { id: input.id, mode: "local" as const };
}
