"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-state-page">
      <AppHeader />
      <section className="app-state-card">
        <span className="app-state-icon">
          <AlertCircle aria-hidden="true" size={24} />
        </span>
        <h1>Something went wrong</h1>
        <p>Detroit Connect could not load this page. Your information has not been changed.</p>
        <div className="app-state-actions">
          <button className="primary" type="button" onClick={reset}>Try again</button>
          <Link href="/">Go home</Link>
        </div>
      </section>
    </main>
  );
}
