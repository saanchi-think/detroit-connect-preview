import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ProfileSnapshot } from "@/components/profile-snapshot";
import { getCurrentUser } from "@/lib/auth/user";
import { getConnectorCardsByIds } from "@/lib/connectors/repository";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";
import { getRecommendationsYouMade } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const [favoriteIds, recommendations] = needsSignIn
    ? [[], []]
    : await Promise.all([getFavoriteConnectorIds(user), getRecommendationsYouMade(user)]);
  const connectors = await getConnectorCardsByIds(favoriteIds);

  return (
    <main className="page-shell favorites-page">
      <AppHeader />
      <section className="page-hero compact">
        <h1>Favorites</h1>
      </section>
      {needsSignIn ? (
        <section className="empty-panel">
          <span>Sign in required</span>
          <p>Favorites are saved to your account.</p>
          <Link href="/login?next=/favorites">Sign in</Link>
        </section>
      ) : connectors.length > 0 || recommendations.length > 0 ? (
        <div className="favorites-content">
          {connectors.length > 0 ? (
            <section aria-labelledby="saved-profiles-title">
              <div className="favorites-section-heading"><h2 id="saved-profiles-title">Saved profiles</h2><span>{connectors.length}</span></div>
              <div className="profile-snapshot-list" aria-label="Saved connector profiles">
                {connectors.map((connector) => (
                  <ProfileSnapshot connector={connector} isSaved key={connector.id} />
                ))}
              </div>
            </section>
          ) : null}
          {recommendations.length > 0 ? (
            <section aria-labelledby="your-recommendations-title">
              <div className="favorites-section-heading"><h2 id="your-recommendations-title">Recommended by you</h2><span>{recommendations.length}</span></div>
              <div className="profile-snapshot-list">
                {recommendations.map((recommendation) => (
                  <ProfileSnapshot
                    connector={recommendation.connector}
                    key={recommendation.id}
                    note={recommendation.note}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <section className="empty-panel">
          <span>Nothing saved yet</span>
          <p>Saved profiles will appear here.</p>
          <Link href="/connectors">Browse connectors</Link>
        </section>
      )}
    </main>
  );
}
