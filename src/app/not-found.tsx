import { SearchX } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";

export default function NotFound() {
  return (
    <main className="app-state-page">
      <AppHeader />
      <section className="app-state-card">
        <span className="app-state-icon">
          <SearchX aria-hidden="true" size={24} />
        </span>
        <h1>Page not found</h1>
        <p>The page may have moved, or the link may no longer be available.</p>
        <div className="app-state-actions">
          <Link className="primary" href="/">Go home</Link>
          <Link href="/connectors">Browse profiles</Link>
        </div>
      </section>
    </main>
  );
}
