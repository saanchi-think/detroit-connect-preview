import { LoaderCircle } from "lucide-react";
import { AppHeader } from "@/components/app-header";

export default function Loading() {
  return (
    <main className="app-state-page" aria-busy="true" aria-live="polite">
      <AppHeader />
      <section className="app-state-card">
        <span className="app-state-icon">
          <LoaderCircle aria-hidden="true" className="app-state-spinner" size={24} />
        </span>
        <h1>Loading Detroit Connect</h1>
        <p>Getting the latest community information ready.</p>
      </section>
    </main>
  );
}
