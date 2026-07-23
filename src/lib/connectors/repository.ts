import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileKind } from "@/lib/database.types";
import { sampleConnectors } from "@/lib/data/sample-connectors";
import type {
  AvatarKey,
  ConnectorCardModel,
  ConnectorProfileModel,
  CreateConnectorProfileInput,
} from "@/lib/connectors/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type ConnectorRow = Database["public"]["Tables"]["connector_profiles"]["Row"];
type ConnectorInsert = Database["public"]["Tables"]["connector_profiles"]["Insert"];

type LocalConnectorRecord = Omit<ConnectorRow, "search_document"> & {
  friend_signal?: string | null;
};

type SearchConnectorOptions = {
  query?: string;
  type?: string;
};

const LOCAL_STORE_PATH = path.join(process.cwd(), "data", "local-dev-store.json");
const SAMPLE_ID_PREFIX = "11111111-1111-4111-8111-";

function getSupabaseReadClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  await writeFile(LOCAL_STORE_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function normalizeQuery(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesType(kind: ProfileKind, type?: string) {
  return !type || type === "all" || kind === type;
}

function filterConnectorRows(rows: LocalConnectorRecord[], options: SearchConnectorOptions) {
  const query = normalizeQuery(options.query);

  return rows.filter((row) => {
    if (row.status !== "published" || !matchesType(row.kind, options.type)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
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
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function sortConnectorRows(rows: LocalConnectorRecord[]) {
  return [...rows].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function dedupeConnectorRows(rows: LocalConnectorRecord[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function rowToCard(row: LocalConnectorRecord): ConnectorCardModel {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    role:
      row.headline ??
      row.organization_name ??
      (row.kind === "vendor"
        ? "Detroit service provider"
        : row.kind === "organization"
          ? "Community organization"
          : "Detroit connector"),
    neighborhood: row.neighborhood ?? "Detroit",
    topics: row.topics.slice(0, 4),
    languages: row.languages.length > 0 ? row.languages : ["English"],
    friendSignal:
      row.friend_signal ??
      (row.kind === "vendor"
        ? "Available for local referrals"
        : row.kind === "organization"
          ? "Community-backed resource"
          : "Open to helping newcomers"),
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
    ownerId: row.owner_id,
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
  };
}

async function getConnectorRows() {
  const supabaseRows = await fetchSupabaseRows();

  if (supabaseRows) {
    return dedupeConnectorRows(supabaseRows);
  }

  return dedupeConnectorRows(await readLocalStore(true));
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
  };
}

async function fetchSupabaseRows() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("connector_profiles").select("*").eq("status", "published");

  if (error) {
    throw new Error(`Could not load connector profiles: ${error.message}`);
  }

  return data as LocalConnectorRecord[];
}

export async function searchConnectorCards(options: SearchConnectorOptions = {}) {
  const mergedRows = await getConnectorRows();
  const filteredRows = sortConnectorRows(filterConnectorRows(mergedRows, options));

  return filteredRows.map(rowToCard);
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
    owner_id: payload.owner_id ?? null,
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
    friend_signal: "Just joined Detroit Connect",
  };

  await writeLocalStore([localRecord, ...localRows]);

  return { id: localRecord.id, mode: "local" as const };
}
