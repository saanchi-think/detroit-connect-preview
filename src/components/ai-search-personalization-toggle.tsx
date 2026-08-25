"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AiSearchPersonalizationToggleProps = {
  enabled: boolean;
  history: string;
  query: string;
  signals: string[];
};

export function AiSearchPersonalizationToggle({
  enabled,
  history,
  query,
  signals,
}: AiSearchPersonalizationToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(enabled);

  function updatePersonalization(nextEnabled: boolean) {
    setIsEnabled(nextEnabled);
    const params = new URLSearchParams({ q: query });
    if (history) params.set("history", history);
    if (!nextEnabled) params.set("personalized", "0");

    startTransition(() => {
      router.replace(`/search?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="ai-personalization-control">
      <div className="ai-personalization-copy">
        <span>Personalize matches using my profile</span>
        <small>
          {isEnabled
            ? `Using ${signals.join(" · ")}`
            : "Off - ranking only by your question"}
        </small>
      </div>
      <label className="ai-personalization-switch">
        <span className="sr-only">Personalize matches using my profile</span>
        <input
          checked={isEnabled}
          disabled={isPending}
          onChange={(event) => updatePersonalization(event.target.checked)}
          role="switch"
          type="checkbox"
        />
        <span aria-hidden="true" className="ai-personalization-switch-track" />
      </label>
    </div>
  );
}
