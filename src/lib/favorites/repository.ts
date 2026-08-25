import { readFile } from "node:fs/promises";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getLocalDataPath, writeLocalJson } from "@/lib/local-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type LocalFavoriteRecord = {
  user_id: string;
  connector_profile_id: string;
  created_at: string;
};

type LocalFavoritePlaceRecord = {
  user_id: string;
  place_id: string;
  created_at: string;
};

const LOCAL_FAVORITES_PATH = getLocalDataPath("local-dev-favorites.json");
const LOCAL_FAVORITE_PLACES_PATH = getLocalDataPath("local-dev-favorite-places.json");
const LOCAL_DEV_USER_ID = "local-dev-user";

function favoriteUserId(user?: User | null) {
  return user?.id ?? LOCAL_DEV_USER_ID;
}

async function readLocalFavorites() {
  try {
    const raw = await readFile(LOCAL_FAVORITES_PATH, "utf8");
    return JSON.parse(raw) as LocalFavoriteRecord[];
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    await writeLocalFavorites([]);
    return [];
  }
}

async function writeLocalFavorites(records: LocalFavoriteRecord[]) {
  await writeLocalJson(LOCAL_FAVORITES_PATH, records);
}

async function readLocalFavoritePlaces() {
  try {
    const raw = await readFile(LOCAL_FAVORITE_PLACES_PATH, "utf8");
    return JSON.parse(raw) as LocalFavoritePlaceRecord[];
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    await writeLocalJson(LOCAL_FAVORITE_PLACES_PATH, []);
    return [];
  }
}

async function getSupabaseFavorites(user?: User | null) {
  if (!isSupabaseConfigured() || !user) {
    return null;
  }

  const supabase = (await createClient()) as SupabaseClient;
  const { data, error } = await supabase
    .from("favorite_profiles")
    .select("connector_profile_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load favorites: ${error.message}`);
  }

  const favorites = data as Array<{ connector_profile_id: string }>;
  return favorites.map((favorite) => favorite.connector_profile_id);
}

export async function getFavoriteConnectorIds(user?: User | null) {
  if (isSupabaseConfigured() && !user) {
    return [];
  }

  const supabaseFavorites = await getSupabaseFavorites(user);

  if (supabaseFavorites !== null) {
    return supabaseFavorites;
  }

  const userId = favoriteUserId(user);
  return (await readLocalFavorites())
    .filter((favorite) => favorite.user_id === userId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((favorite) => favorite.connector_profile_id);
}

export async function toggleFavoriteConnector(connectorProfileId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before saving a connector.");
    }

    const supabase = (await createClient()) as SupabaseClient;
    const { data: existing, error: selectError } = await supabase
      .from("favorite_profiles")
      .select("connector_profile_id")
      .eq("user_id", user.id)
      .eq("connector_profile_id", connectorProfileId)
      .maybeSingle();

    if (selectError) {
      throw new Error(`Could not check this favorite: ${selectError.message}`);
    }

    if (existing) {
      const { error } = await supabase
        .from("favorite_profiles")
        .delete()
        .eq("user_id", user.id)
        .eq("connector_profile_id", connectorProfileId);

      if (error) {
        throw new Error(`Could not remove this favorite: ${error.message}`);
      }

      return { saved: false, mode: "supabase" as const };
    }

    const { error } = await supabase.from("favorite_profiles").insert({
      user_id: user.id,
      connector_profile_id: connectorProfileId,
    });

    if (error) {
      throw new Error(`Could not save this favorite: ${error.message}`);
    }

    return { saved: true, mode: "supabase" as const };
  }

  const userId = favoriteUserId(user);
  const favorites = await readLocalFavorites();
  const existingIndex = favorites.findIndex(
    (favorite) => favorite.user_id === userId && favorite.connector_profile_id === connectorProfileId,
  );

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    await writeLocalFavorites(favorites);
    return { saved: false, mode: "local" as const };
  }

  await writeLocalFavorites([
    {
      user_id: userId,
      connector_profile_id: connectorProfileId,
      created_at: new Date().toISOString(),
    },
    ...favorites,
  ]);

  return { saved: true, mode: "local" as const };
}

export async function getFavoritePlaceIds(user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) return [];

    const supabase = (await createClient()) as SupabaseClient;
    const { data, error } = await supabase
      .from("favorite_places")
      .select("place_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Could not load saved places: ${error.message}`);
    }

    return (data as Array<{ place_id: string }>).map((favorite) => favorite.place_id);
  }

  const userId = favoriteUserId(user);
  return (await readLocalFavoritePlaces())
    .filter((favorite) => favorite.user_id === userId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .map((favorite) => favorite.place_id);
}

export async function toggleFavoritePlace(placeId: string, user?: User | null) {
  if (isSupabaseConfigured()) {
    if (!user) {
      throw new Error("Sign in before saving a place.");
    }

    const supabase = (await createClient()) as SupabaseClient;
    const { data: existing, error: selectError } = await supabase
      .from("favorite_places")
      .select("place_id")
      .eq("user_id", user.id)
      .eq("place_id", placeId)
      .maybeSingle();

    if (selectError) {
      throw new Error(`Could not check this saved place: ${selectError.message}`);
    }

    if (existing) {
      const { error } = await supabase
        .from("favorite_places")
        .delete()
        .eq("user_id", user.id)
        .eq("place_id", placeId);

      if (error) {
        throw new Error(`Could not remove this saved place: ${error.message}`);
      }

      return { saved: false, mode: "supabase" as const };
    }

    const { error } = await supabase.from("favorite_places").insert({
      user_id: user.id,
      place_id: placeId,
    });

    if (error) {
      throw new Error(`Could not save this place: ${error.message}`);
    }

    return { saved: true, mode: "supabase" as const };
  }

  const userId = favoriteUserId(user);
  const favorites = await readLocalFavoritePlaces();
  const existingIndex = favorites.findIndex(
    (favorite) => favorite.user_id === userId && favorite.place_id === placeId,
  );

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    await writeLocalJson(LOCAL_FAVORITE_PLACES_PATH, favorites);
    return { saved: false, mode: "local" as const };
  }

  await writeLocalJson(LOCAL_FAVORITE_PLACES_PATH, [
    {
      user_id: userId,
      place_id: placeId,
      created_at: new Date().toISOString(),
    },
    ...favorites,
  ]);

  return { saved: true, mode: "local" as const };
}
