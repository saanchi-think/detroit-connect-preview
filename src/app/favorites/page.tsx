import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ConnectorCard } from "@/components/connector-card";
import { getCurrentUser } from "@/lib/auth/user";
import { getConnectorCardsByIds } from "@/lib/connectors/repository";
import { getFavoriteConnectorIds } from "@/lib/favorites/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const favoriteIds = needsSignIn ? [] : await getFavoriteConnectorIds(user);
  const connectors = await getConnectorCardsByIds(favoriteIds);

  return (
    <main className="page-shell">
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
      ) : connectors.length > 0 ? (
        <section className="connector-grid" aria-label="Saved connector profiles">
          {connectors.map((connector) => (
            <ConnectorCard
              connector={connector}
              isSaved
              key={connector.id}
              saveRedirectPath="/favorites"
            />
          ))}
        </section>
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
