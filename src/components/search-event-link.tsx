"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export function SearchEventLink({
  children,
  connectorId,
  href,
  query,
}: {
  children: ReactNode;
  connectorId: string;
  href: string;
  query: string;
}) {
  function recordClick() {
    void fetch("/api/search/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId, eventType: "result_click", query }),
      keepalive: true,
    });
  }

  return <Link href={href} onClick={recordClick}>{children}</Link>;
}
