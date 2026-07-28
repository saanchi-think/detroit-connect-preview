"use client";

import {
  LoaderCircle,
  Mail,
  MessageCircle,
  MessageSquareText,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { addFriendAction } from "@/lib/friends/actions";
import type { FriendSearchCandidate } from "@/lib/friends/repository";

type SearchResponse = {
  candidates: FriendSearchCandidate[];
};

type FriendFinderProps = {
  disabled?: boolean;
};

function relationshipLabel(relationship: FriendSearchCandidate["relationship"]) {
  if (relationship === "connected") return "Connected";
  if (relationship === "incoming") return "Requested you";
  if (relationship === "outgoing") return "Request sent";
  return null;
}

export function FriendFinder({ disabled = false }: FriendFinderProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<FriendSearchCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteContact, setInviteContact] = useState("");
  const finderRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim();
  const showResults = normalizedQuery.length >= 2 && (isLoading || hasSearched);

  useEffect(() => {
    function closeSearch(event: PointerEvent) {
      if (finderRef.current && !finderRef.current.contains(event.target as Node)) {
        setHasSearched(false);
        setInviteOpen(false);
      }
    }

    function closeSearchWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHasSearched(false);
        setInviteOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeSearch);
    document.addEventListener("keydown", closeSearchWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeSearch);
      document.removeEventListener("keydown", closeSearchWithKeyboard);
    };
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 2 || disabled) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(false);

      try {
        const response = await fetch(`/api/friends/search?q=${encodeURIComponent(normalizedQuery)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json() as SearchResponse;
        setCandidates(response.ok ? payload.candidates : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCandidates([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setHasSearched(true);
        }
      }
    }, 240);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, normalizedQuery]);

  const invitationLinks = useMemo(() => {
    const contact = inviteContact.trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? contact : "";
    const phone = contact.replace(/\D/g, "");
    const siteUrl = typeof window === "undefined" ? "" : window.location.origin;
    const subject = "Join me on Detroit Connect";
    const message = `Join me on Detroit Connect, a community network for finding trusted local help in Detroit.${siteUrl ? ` ${siteUrl}` : ""}`;

    return {
      email: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
      sms: `sms:${phone}?&body=${encodeURIComponent(message)}`,
      whatsapp: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    };
  }, [inviteContact]);

  return (
    <div className="friend-finder" ref={finderRef}>
      <label className="friend-search-field">
        <span className="sr-only">Find someone you know</span>
        <Search aria-hidden="true" size={16} />
        <input
          aria-autocomplete="list"
          aria-controls="friend-search-results"
          aria-expanded={showResults}
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setCandidates([]);
            setHasSearched(false);
            setIsLoading(false);
            setInviteOpen(false);
            if (!inviteContact || inviteContact === query) {
              setInviteContact(nextQuery);
            }
          }}
          onFocus={() => {
            if (normalizedQuery.length >= 2) {
              setHasSearched(true);
            }
          }}
          placeholder="Find people by name"
          role="combobox"
          type="search"
          value={query}
        />
        {isLoading ? <LoaderCircle aria-label="Searching" className="friend-search-spinner" size={16} /> : null}
      </label>

      {showResults ? (
        <section className="friend-search-popover" id="friend-search-results" aria-label="People search results">
          <button
            aria-label="Close people search"
            className="friend-search-close"
            onClick={() => {
              setHasSearched(false);
              setInviteOpen(false);
            }}
            title="Close"
            type="button"
          >
            <X aria-hidden="true" size={15} />
          </button>
          {isLoading ? (
            <p className="friend-search-state">Searching Detroit Connect...</p>
          ) : candidates.length > 0 ? (
            <>
              <h3>People on Detroit Connect</h3>
              <div className="friend-search-results" role="list">
                {candidates.map((candidate) => {
                  const status = relationshipLabel(candidate.relationship);

                  return (
                    <article className="friend-search-result" key={candidate.id} role="listitem">
                      <Link
                        aria-label={`View ${candidate.name}'s profile`}
                        className="friend-search-avatar"
                        href={candidate.profileHref}
                      >
                        {candidate.initials}
                      </Link>
                      <div className="friend-search-copy">
                        <Link href={candidate.profileHref}>{candidate.name}</Link>
                        <span>{candidate.role}</span>
                        <small>{candidate.neighborhood}</small>
                      </div>
                      {status ? (
                        <span className={`friend-search-status is-${candidate.relationship}`}>{status}</span>
                      ) : candidate.canRequest ? (
                        <form action={addFriendAction}>
                          <input name="connectorProfileId" type="hidden" value={candidate.id} />
                          <button aria-label={`Add ${candidate.name} to your network`} type="submit">
                            <UserPlus aria-hidden="true" size={15} />
                            Add
                          </button>
                        </form>
                      ) : (
                        <span className="friend-search-status">Profile only</span>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="friend-invite-empty">
              <strong>No Detroit Connect profile found</strong>
              <span>You can invite them to join.</span>
              {!inviteOpen ? (
                <button onClick={() => setInviteOpen(true)} type="button">
                  <UserPlus aria-hidden="true" size={15} />
                  Send invitation
                </button>
              ) : (
                <div className="friend-invite-options">
                  <label>
                    <span>Email or mobile number</span>
                    <input
                      onChange={(event) => setInviteContact(event.target.value)}
                      placeholder="Enter their email or phone"
                      type="text"
                      value={inviteContact}
                    />
                  </label>
                  <div>
                    <a href={invitationLinks.email}>
                      <Mail aria-hidden="true" size={16} />
                      Email
                    </a>
                    <a href={invitationLinks.sms}>
                      <MessageSquareText aria-hidden="true" size={16} />
                      SMS
                    </a>
                    <a href={invitationLinks.whatsapp} rel="noreferrer" target="_blank">
                      <MessageCircle aria-hidden="true" size={16} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
