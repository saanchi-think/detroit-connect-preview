import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Heart,
  MapPinned,
  MessageSquareText,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ProfileSnapshot } from "@/components/profile-snapshot";
import { getCurrentUser } from "@/lib/auth/user";
import { getConnectorCardsByIds } from "@/lib/connectors/repository";
import { toggleFavoritePlaceFormAction } from "@/lib/favorites/actions";
import { getDetroitPlacesByIds } from "@/lib/explore/places";
import { getFavoriteConnectorIds, getFavoritePlaceIds } from "@/lib/favorites/repository";
import { toggleForumPostSaveAction } from "@/lib/forum/actions";
import { getSavedForumPosts } from "@/lib/forum/repository";
import { getRecommendationsYouMade } from "@/lib/friends/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type FavoritesView = "profiles" | "places" | "posts";
type ProfileCollectionView = "saved" | "recommended";

type FavoritesPageProps = {
  searchParams: Promise<{
    view?: string;
    profileView?: string;
    q?: string;
    topic?: string;
    neighborhood?: string;
    language?: string;
  }>;
};

const favoriteViews = [
  { id: "profiles", label: "Profiles", icon: UserRound },
  { id: "places", label: "Saved places", icon: MapPinned },
  { id: "posts", label: "Saved community posts", icon: MessageSquareText },
] as const;

function activeFavoritesView(value: string | undefined): FavoritesView {
  return favoriteViews.some((view) => view.id === value)
    ? (value as FavoritesView)
    : "profiles";
}

function activeProfileCollection(value: string | undefined): ProfileCollectionView {
  return value === "recommended" ? "recommended" : "saved";
}

function profileFavoritesHref(
  profileView: ProfileCollectionView,
  filters: { q?: string; topic?: string; neighborhood?: string; language?: string },
) {
  const query = new URLSearchParams({ view: "profiles", profileView });
  Object.entries(filters).forEach(([key, value]) => {
    if (value?.trim()) query.set(key, value.trim());
  });
  return `/favorites?${query.toString()}`;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function FavoritesEmpty({
  actionHref,
  actionLabel,
  icon,
  message,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  icon: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <div className="favorites-category-empty">
      <span aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{message}</p>
      <Link href={actionHref}>{actionLabel}</Link>
    </div>
  );
}

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
  const params = await searchParams;
  const activeView = activeFavoritesView(params.view);
  const activeProfileView = activeProfileCollection(params.profileView);
  const user = await getCurrentUser();
  const needsSignIn = isSupabaseConfigured() && !user;
  const [favoriteIds, recommendations, savedPosts, savedPlaceIds] = needsSignIn
    ? [[], [], [], []]
    : await Promise.all([
        getFavoriteConnectorIds(user),
        getRecommendationsYouMade(user),
        getSavedForumPosts(user),
        getFavoritePlaceIds(user),
      ]);
  const connectors = await getConnectorCardsByIds(favoriteIds);
  const savedPlaces = getDetroitPlacesByIds(savedPlaceIds);
  const savedProfileItems = connectors.map((connector) => ({
    key: connector.id,
    connector,
    note: null as string | null,
  }));
  const recommendedProfileItems = recommendations.map((recommendation) => ({
    key: recommendation.id,
    connector: recommendation.connector,
    note: recommendation.note,
  }));
  const activeProfileItems = activeProfileView === "recommended"
    ? recommendedProfileItems
    : savedProfileItems;
  const profileFilters = {
    q: params.q?.trim() ?? "",
    topic: params.topic?.trim() ?? "",
    neighborhood: params.neighborhood?.trim() ?? "",
    language: params.language?.trim() ?? "",
  };
  const profileTopics = uniqueSorted(activeProfileItems.flatMap((item) => item.connector.topics));
  const profileNeighborhoods = uniqueSorted(activeProfileItems.map((item) => item.connector.neighborhood));
  const profileLanguages = uniqueSorted(activeProfileItems.flatMap((item) => item.connector.languages));
  const hasProfileFilters = Object.values(profileFilters).some(Boolean);
  const visibleProfileItems = activeProfileItems.filter(({ connector, note }) => {
    const searchTarget = [
      connector.name,
      connector.role,
      connector.neighborhood,
      connector.topics.join(" "),
      connector.languages.join(" "),
      note ?? "",
    ].join(" ").toLowerCase();
    return (
      (!profileFilters.q || searchTarget.includes(profileFilters.q.toLowerCase())) &&
      (!profileFilters.topic || connector.topics.includes(profileFilters.topic)) &&
      (!profileFilters.neighborhood || connector.neighborhood === profileFilters.neighborhood) &&
      (!profileFilters.language || connector.languages.includes(profileFilters.language))
    );
  });

  return (
    <main className="page-shell favorites-page">
      <AppHeader />
      <section className="page-hero compact">
        <h1>Favorites</h1>
      </section>
      {needsSignIn ? (
        <section className="empty-panel favorites-empty-state">
          <span className="favorites-empty-icon" aria-hidden="true">
            <Bookmark size={22} strokeWidth={1.8} />
          </span>
          <span>Sign in required</span>
          <p>Favorites are saved to your account.</p>
          <Link href="/login?next=/favorites">Sign in</Link>
        </section>
      ) : (
        <div className="favorites-content">
          <nav aria-label="Favorite categories" className="favorites-tabs" role="tablist">
            {favoriteViews.map((view) => {
              const Icon = view.icon;
              const count =
                view.id === "profiles"
                  ? connectors.length + recommendations.length
                  : view.id === "places"
                    ? savedPlaces.length
                    : savedPosts.length;

              return (
                <Link
                  aria-controls={`favorites-panel-${view.id}`}
                  aria-selected={activeView === view.id}
                  className={activeView === view.id ? "is-active" : undefined}
                  href={`/favorites?view=${view.id}`}
                  id={`favorites-tab-${view.id}`}
                  key={view.id}
                  role="tab"
                >
                  <Icon aria-hidden="true" size={18} />
                  <span>{view.label}</span>
                  <strong>{count}</strong>
                </Link>
              );
            })}
          </nav>

          <div
            aria-labelledby={`favorites-tab-${activeView}`}
            className={`favorites-panel is-${activeView}`}
            id={`favorites-panel-${activeView}`}
            role="tabpanel"
          >
            {activeView === "profiles" ? (
              <section aria-labelledby="profile-collections-title" className="favorites-profiles-panel">
                <div className="favorites-section-heading">
                  <h2 id="profile-collections-title">Profiles</h2>
                  <span>{activeProfileItems.length}</span>
                </div>
                <nav aria-label="Profile collections" className="favorites-profile-toggle">
                  <Link
                    aria-current={activeProfileView === "saved" ? "page" : undefined}
                    className={activeProfileView === "saved" ? "is-active" : undefined}
                    href={profileFavoritesHref("saved", profileFilters)}
                  >
                    Saved profiles <span>{connectors.length}</span>
                  </Link>
                  <Link
                    aria-current={activeProfileView === "recommended" ? "page" : undefined}
                    className={activeProfileView === "recommended" ? "is-active" : undefined}
                    href={profileFavoritesHref("recommended", profileFilters)}
                  >
                    Recommended by you <span>{recommendations.length}</span>
                  </Link>
                </nav>

                <form action="/favorites" className="favorites-profile-filters" method="get">
                  <input name="view" type="hidden" value="profiles" />
                  <input name="profileView" type="hidden" value={activeProfileView} />
                  <label className="favorites-search-field">
                    <span className="sr-only">Search profiles</span>
                    <Search aria-hidden="true" size={17} />
                    <input
                      defaultValue={profileFilters.q}
                      name="q"
                      placeholder={activeProfileView === "saved" ? "Search saved profiles" : "Search recommended profiles"}
                      type="search"
                    />
                  </label>
                  <label>
                    <span>Topic</span>
                    <select defaultValue={profileFilters.topic} name="topic">
                      <option value="">All topics</option>
                      {profileTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Neighborhood</span>
                    <select defaultValue={profileFilters.neighborhood} name="neighborhood">
                      <option value="">All neighborhoods</option>
                      {profileNeighborhoods.map((neighborhood) => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Language</span>
                    <select defaultValue={profileFilters.language} name="language">
                      <option value="">All languages</option>
                      {profileLanguages.map((language) => <option key={language} value={language}>{language}</option>)}
                    </select>
                  </label>
                  <button type="submit">
                    <SlidersHorizontal aria-hidden="true" size={15} />
                    Apply
                  </button>
                  {hasProfileFilters ? (
                    <Link aria-label="Clear profile filters" className="favorites-clear-filters" href={profileFavoritesHref(activeProfileView, {})} title="Clear filters">
                      <X aria-hidden="true" size={15} />
                      Clear
                    </Link>
                  ) : null}
                </form>

                {activeProfileItems.length > 0 && visibleProfileItems.length > 0 ? (
                  <div className="profile-snapshot-list" aria-label={activeProfileView === "saved" ? "Saved connector profiles" : "Profiles recommended by you"}>
                    {visibleProfileItems.map((item) => (
                      <ProfileSnapshot
                        connector={item.connector}
                        isSaved={activeProfileView === "saved"}
                        key={item.key}
                        note={item.note ?? undefined}
                        saveRedirectPath={`/favorites?view=profiles&profileView=${activeProfileView}`}
                      />
                    ))}
                  </div>
                ) : activeProfileItems.length > 0 ? (
                  <FavoritesEmpty
                    actionHref={profileFavoritesHref(activeProfileView, {})}
                    actionLabel="Clear filters"
                    icon={<Search size={21} />}
                    message="Try a different search or filter."
                    title="No matching profiles"
                  />
                ) : activeProfileView === "saved" ? (
                  <FavoritesEmpty
                    actionHref="/connectors"
                    actionLabel="Browse profiles"
                    icon={<UserRound size={21} />}
                    message="Save useful profiles for quick access."
                    title="No saved profiles yet"
                  />
                ) : (
                  <FavoritesEmpty
                    actionHref="/connectors"
                    actionLabel="Browse profiles"
                    icon={<UserRound size={21} />}
                    message="Recommend people you trust to your network."
                    title="No recommendations yet"
                  />
                )}
              </section>
            ) : null}

            {activeView === "places" ? (
              <section aria-labelledby="saved-places-title">
                <div className="favorites-section-heading">
                  <h2 id="saved-places-title">Saved places</h2>
                  <span>{savedPlaces.length}</span>
                </div>
                {savedPlaces.length > 0 ? (
                  <div className="saved-place-list">
                    {savedPlaces.map((place) => (
                      <article className="saved-place-card" key={place.id}>
                        <Link className="saved-place-main" href={`/explore?place=${encodeURIComponent(place.id)}`}>
                          <span className={`thumb saved-place-thumb ${place.thumb}`} aria-hidden="true" />
                          <span className="saved-place-copy">
                            <small>{place.section}</small>
                            <strong>{place.name}</strong>
                            <span>{place.note}</span>
                          </span>
                        </Link>
                        <form action={toggleFavoritePlaceFormAction}>
                          <input name="placeId" type="hidden" value={place.id} />
                          <input name="returnTo" type="hidden" value="/favorites?view=places" />
                          <button
                            aria-label={`Remove ${place.name} from favorites`}
                            title="Remove saved place"
                            type="submit"
                          >
                            <Heart aria-hidden="true" fill="currentColor" size={16} />
                          </button>
                        </form>
                      </article>
                    ))}
                  </div>
                ) : (
                  <FavoritesEmpty
                    actionHref="/explore"
                    actionLabel="Explore Detroit"
                    icon={<MapPinned size={21} />}
                    message="Save neighborhoods, landmarks, and local places."
                    title="No saved places yet"
                  />
                )}
              </section>
            ) : null}

            {activeView === "posts" ? (
              <section aria-labelledby="saved-community-posts-title">
                <div className="favorites-section-heading">
                  <h2 id="saved-community-posts-title">Saved community posts</h2>
                  <span>{savedPosts.length}</span>
                </div>
                {savedPosts.length > 0 ? (
                  <div className="saved-discussion-list">
                    {savedPosts.map((post) => (
                      <article className="saved-discussion" key={post.id}>
                        <span className="saved-discussion-icon" aria-hidden="true">
                          <MessageSquareText size={18} />
                        </span>
                        <div>
                          <span className="topic-badge">{post.topic}</span>
                          <Link href={`/forum#post-${post.id}`}>{post.title}</Link>
                          <p>{post.body}</p>
                          <small>{post.name} · {post.meta}</small>
                        </div>
                        <form action={toggleForumPostSaveAction}>
                          <input name="postId" type="hidden" value={post.id} />
                          <input name="returnTo" type="hidden" value="/favorites?view=posts" />
                          <button aria-label={`Remove ${post.title} from saved posts`} title="Remove saved post" type="submit">
                            <BookmarkCheck aria-hidden="true" size={18} />
                          </button>
                        </form>
                      </article>
                    ))}
                  </div>
                ) : (
                  <FavoritesEmpty
                    actionHref="/forum"
                    actionLabel="Browse community posts"
                    icon={<MessageSquareText size={21} />}
                    message="Save useful conversations to revisit later."
                    title="No saved community posts yet"
                  />
                )}
              </section>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
