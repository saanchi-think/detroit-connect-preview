"use client";

import { Check, Forward, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { forwardDirectMessageAction } from "@/lib/messages/actions";
import type { MessageForwardRecipient } from "@/lib/messages/repository";
import { fuzzySearchScore } from "@/lib/search/fuzzy";

type ConnectorSuggestion = {
  id: string;
  name: string;
  role: string;
  neighborhood: string;
  href: string;
};

type SuggestionResponse = {
  suggestions: ConnectorSuggestion[];
};

type MessageForwardButtonProps = {
  currentRecipientId: string;
  initialRecipients: MessageForwardRecipient[];
  messageId: string;
  messagePreview: string;
};

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DC";
}

function ForwardSubmitButton({ count }: { count: number }) {
  const { pending } = useFormStatus();

  return (
    <button className="message-forward-submit" disabled={count === 0 || pending} type="submit">
      {pending ? <LoaderCircle aria-hidden="true" className="is-spinning" size={16} /> : null}
      {pending ? "Sending..." : count === 0 ? "Choose profiles" : `Send to ${count}`}
    </button>
  );
}

export function MessageForwardButton({
  currentRecipientId,
  initialRecipients,
  messageId,
  messagePreview,
}: MessageForwardButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteRecipients, setRemoteRecipients] = useState<MessageForwardRecipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (!open) return;

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDialog();
    }

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [open]);

  useEffect(() => {
    if (!open || normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
        });
        const response = await fetch(`/api/connectors/suggestions?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json() as SuggestionResponse;
        setRemoteRecipients(
          response.ok
            ? payload.suggestions
                .filter((suggestion) => suggestion.id !== currentRecipientId)
                .map((suggestion) => ({
                  id: suggestion.id,
                  initials: initialsFor(suggestion.name),
                  name: suggestion.name,
                  role: suggestion.role || suggestion.neighborhood,
                  profileHref: suggestion.href,
                }))
            : [],
        );
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setRemoteRecipients([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentRecipientId, normalizedQuery, open]);

  const recipients = useMemo(() => {
    const byName = new Map<string, MessageForwardRecipient>();

    [...initialRecipients, ...remoteRecipients].forEach((recipient) => {
      if (recipient.id === currentRecipientId) return;
      byName.set(recipient.name.trim().toLowerCase(), recipient);
    });

    return Array.from(byName.values())
      .filter((recipient) =>
        normalizedQuery
          ? Number.isFinite(
              fuzzySearchScore(normalizedQuery, [
                recipient.name,
                recipient.role,
              ]),
            )
          : true,
      )
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 20);
  }, [currentRecipientId, initialRecipients, normalizedQuery, remoteRecipients]);

  function closeDialog() {
    setOpen(false);
    setQuery("");
    setRemoteRecipients([]);
    setSelectedIds([]);
  }

  function toggleRecipient(recipientId: string) {
    setSelectedIds((current) => {
      if (current.includes(recipientId)) {
        return current.filter((id) => id !== recipientId);
      }
      return current.length >= 10 ? current : [...current, recipientId];
    });
  }

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setRemoteRecipients([]);
      setIsSearching(false);
    }
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Forward message"
        className="message-forward-launch"
        onClick={() => setOpen(true)}
        title="Forward message"
        type="button"
      >
        <Forward aria-hidden="true" size={15} />
      </button>
      {open ? (
        <div
          className="message-forward-overlay"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDialog();
          }}
          role="presentation"
        >
          <section
            aria-labelledby={`forward-message-${messageId}`}
            aria-modal="true"
            className="message-forward-dialog"
            role="dialog"
          >
            <header>
              <div>
                <strong id={`forward-message-${messageId}`}>Send message to</strong>
                <span>Choose up to 10 profiles</span>
              </div>
              <button
                aria-label="Close forward message"
                onClick={closeDialog}
                title="Close"
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <p className="message-forward-preview">
              <span>Forwarded message</span>
              {messagePreview}
            </p>
            <label className="message-forward-search">
              <Search aria-hidden="true" size={16} />
              <span className="sr-only">Search profiles</span>
              <input
                autoFocus
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Search profiles"
                type="search"
                value={query}
              />
              {isSearching ? (
                <LoaderCircle aria-label="Searching" className="is-spinning" size={16} />
              ) : null}
            </label>
            <form action={forwardDirectMessageAction}>
              <input name="sourceMessageId" type="hidden" value={messageId} />
              <input name="currentRecipientId" type="hidden" value={currentRecipientId} />
              {selectedIds.map((recipientId) => (
                <input
                  key={recipientId}
                  name="recipientProfileIds"
                  type="hidden"
                  value={recipientId}
                />
              ))}
              <div className="message-forward-recipients">
                {recipients.length > 0 ? recipients.map((recipient) => {
                  const selected = selectedIds.includes(recipient.id);
                  const atLimit = selectedIds.length >= 10 && !selected;

                  return (
                    <button
                      aria-pressed={selected}
                      className={selected ? "is-selected" : ""}
                      disabled={atLimit}
                      key={recipient.id}
                      onClick={() => toggleRecipient(recipient.id)}
                      type="button"
                    >
                      <span className="message-forward-avatar" aria-hidden="true">
                        {recipient.initials}
                      </span>
                      <span>
                        <strong>{recipient.name}</strong>
                        <small>{recipient.role}</small>
                      </span>
                      <i aria-hidden="true">{selected ? <Check size={14} /> : null}</i>
                    </button>
                  );
                }) : (
                  <p>{isSearching ? "Searching..." : "No profiles found."}</p>
                )}
              </div>
              <footer>
                <span>{selectedIds.length} selected</span>
                <ForwardSubmitButton count={selectedIds.length} />
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
