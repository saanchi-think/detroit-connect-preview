"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

export function SearchFeedback({ query }: { query: string }) {
  const [selection, setSelection] = useState<-1 | 1 | null>(null);

  function submitFeedback(value: -1 | 1) {
    setSelection(value);
    void fetch("/api/search/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "feedback", feedbackValue: value, query }),
      keepalive: true,
    });
  }

  return (
    <div className="ai-search-feedback" aria-label="Rate this search answer">
      <span>{selection ? "Thanks for the feedback" : "Was this helpful?"}</span>
      <button
        aria-label="This answer was helpful"
        aria-pressed={selection === 1}
        onClick={() => submitFeedback(1)}
        title="Helpful"
        type="button"
      >
        <ThumbsUp aria-hidden="true" size={14} />
      </button>
      <button
        aria-label="This answer was not helpful"
        aria-pressed={selection === -1}
        onClick={() => submitFeedback(-1)}
        title="Not helpful"
        type="button"
      >
        <ThumbsDown aria-hidden="true" size={14} />
      </button>
    </div>
  );
}
