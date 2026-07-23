import { AppHeader } from "@/components/app-header";
import { ExploreMap } from "./explore-map";

export default function ExplorePage() {
  return (
    <main className="explore-shell">
      <AppHeader />
      <ExploreMap />
    </main>
  );
}
