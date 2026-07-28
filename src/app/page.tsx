import { ChevronRight, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ConnectorSearchInput } from "@/components/connector-search-input";

export default function Home() {
  return (
    <main className="site-shell view-home">
      <AppHeader />
      <section className="home-view" aria-labelledby="home-title">
        <div className="home-navy" aria-hidden="true" />
        <div className="home-copy">
          <span className="eyebrow">Trusted local help in Detroit</span>
          <h1 id="home-title">
            <span>Detroit</span>
            <span>Connect</span>
          </h1>
          <p>Find trusted people and local services for moving to and living in Detroit.</p>
          <form className="ai-search" action="/search" aria-label="AI search Detroit Connect">
            <ConnectorSearchInput
              ariaLabel="Search Detroit Connect"
              placeholder="What do you need help with?"
            />
            <button aria-label="Search" title="Search with AI" type="submit">
              <Search aria-hidden="true" className="ai-search-icon" size={22} />
              <Sparkles aria-hidden="true" className="ai-search-sparkle" size={13} />
            </button>
          </form>
          <Link className="browse-link" href="/connectors">
            Browse all profiles
            <ChevronRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <figure className="home-photo">
          <Image
            src="/images/detroit-downtown-dusk.png"
            alt="Detroit skyline at dusk"
            width={740}
            height={940}
            priority
          />
        </figure>
        <div className="home-index" aria-hidden="true">
          <span>42.3314 N</span>
          <span>83.0458 W</span>
        </div>
      </section>
    </main>
  );
}
