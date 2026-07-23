"use client";

import { useState } from "react";

export function ShareButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ title: "Detroit Connect community post", url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={share}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 16V3" />
        <path d="M7 8l5-5 5 5" />
      </svg>
      <span>{copied ? "Copied" : "Share"}</span>
    </button>
  );
}
