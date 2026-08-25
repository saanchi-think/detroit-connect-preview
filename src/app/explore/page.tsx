import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth/user";
import { detroitPlaceById } from "@/lib/explore/places";
import { getFavoritePlaceIds } from "@/lib/favorites/repository";
import { ExploreMap } from "./explore-map";

export const dynamic = "force-dynamic";

type ExplorePageProps = {
  searchParams: Promise<{ place?: string }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const [{ place }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const savedPlaceIds = await getFavoritePlaceIds(user);
  const initialPlaceId = place && detroitPlaceById[place] ? place : "downtown";

  return (
    <main className="explore-shell">
      <AppHeader />
      <ExploreMap initialPlaceId={initialPlaceId} initialSavedPlaceIds={savedPlaceIds} />
    </main>
  );
}
