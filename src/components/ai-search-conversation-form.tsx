"use client";

import { LoaderCircle, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { ConnectorSearchInput } from "@/components/connector-search-input";

type AiSearchConversationFormProps = {
  history: string;
  initialQuery?: string;
  personalizationEnabled: boolean;
  variant: "header" | "follow-up";
};

export function AiSearchConversationForm({
  history,
  initialQuery = "",
  personalizationEnabled,
  variant,
}: AiSearchConversationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [followUp, setFollowUp] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    if (!query) return;

    const params = new URLSearchParams({ q: query });
    if (history) params.set("history", history);
    if (!personalizationEnabled) params.set("personalized", "0");

    startTransition(() => {
      router.replace(`/search?${params.toString()}`, { scroll: false });
    });
  }

  if (variant === "header") {
    return (
      <form
        action="/search"
        aria-busy={isPending}
        className="ai-results-search"
        onSubmit={submitSearch}
        role="search"
      >
        <ConnectorSearchInput
          ariaLabel="Ask Detroit Connect"
          defaultValue={initialQuery}
          placeholder="Ask about housing, schools, moving, business..."
          suggestionsEnabled={false}
        />
        <button aria-label="Search" disabled={isPending} type="submit">
          {isPending ? <LoaderCircle aria-hidden="true" className="ai-search-spinner" size={18} /> : <Search aria-hidden="true" size={20} />}
        </button>
      </form>
    );
  }

  return (
    <form
      action="/search"
      aria-busy={isPending}
      className="ai-conversation-composer"
      onSubmit={submitSearch}
    >
      <label className="sr-only" htmlFor="ai-search-follow-up">Continue the conversation</label>
      <input
        disabled={isPending}
        id="ai-search-follow-up"
        maxLength={240}
        name="q"
        onChange={(event) => setFollowUp(event.target.value)}
        placeholder="Ask a follow-up, such as “only in Midtown”"
        required
        type="text"
        value={followUp}
      />
      <button aria-label="Ask follow-up question" disabled={isPending} title="Ask follow-up question" type="submit">
        {isPending ? <LoaderCircle aria-hidden="true" className="ai-search-spinner" size={15} /> : <Sparkles aria-hidden="true" size={15} />}
        <span>{isPending ? "Thinking" : "Ask"}</span>
      </button>
    </form>
  );
}
