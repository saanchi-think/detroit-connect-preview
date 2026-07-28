"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type ConnectorSuggestion = {
  id: string;
  kind: "person" | "organization" | "vendor";
  name: string;
  role: string;
  neighborhood: string;
  href: string;
};

type SearchResponse = {
  suggestions: ConnectorSuggestion[];
};

type ConnectorSearchInputProps = {
  ariaLabel: string;
  defaultValue?: string;
  label?: string;
  name?: string;
  placeholder: string;
  profileType?: string;
  suggestionsEnabled?: boolean;
};

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ConnectorSearchInput({
  ariaLabel,
  defaultValue = "",
  label,
  name = "q",
  placeholder,
  profileType = "all",
  suggestionsEnabled = true,
}: ConnectorSearchInputProps) {
  const router = useRouter();
  const listboxId = useId();
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<ConnectorSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedProfileType, setSelectedProfileType] = useState(profileType);
  const normalizedQuery = query.trim();

  useEffect(() => {
    function closeSuggestions(event: PointerEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", closeSuggestions);
    return () => document.removeEventListener("pointerdown", closeSuggestions);
  }, []);

  useEffect(() => {
    const form = searchRef.current?.closest("form");
    const typeSelect = form?.querySelector<HTMLSelectElement>('select[name="type"]');

    if (!typeSelect) return;

    function updateProfileType() {
      setSelectedProfileType(typeSelect!.value);
    }

    typeSelect.addEventListener("change", updateProfileType);
    return () => typeSelect.removeEventListener("change", updateProfileType);
  }, []);

  useEffect(() => {
    if (!suggestionsEnabled || normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({ q: normalizedQuery, type: selectedProfileType });
        const response = await fetch(`/api/connectors/suggestions?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as SearchResponse;
        setSuggestions(response.ok ? payload.suggestions : []);
        setIsOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
          setIsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, selectedProfileType, suggestionsEnabled]);

  function openSuggestion(suggestion: ConnectorSuggestion) {
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(suggestion.href);
  }

  const showPopover = suggestionsEnabled && isOpen && normalizedQuery.length >= 2;

  return (
    <div className="connector-search-autocomplete" ref={searchRef}>
      <label>
        {label ? <span>{label}</span> : null}
        <input
          aria-activedescendant={
            activeIndex >= 0 && suggestions[activeIndex]
              ? `${listboxId}-${suggestions[activeIndex].id}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showPopover}
          aria-label={ariaLabel}
          autoComplete="off"
          name={name}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setActiveIndex(-1);
            setIsOpen(nextQuery.trim().length >= 2);
            if (nextQuery.trim().length < 2) {
              setSuggestions([]);
              setIsLoading(false);
            }
          }}
          onFocus={() => {
            if (normalizedQuery.length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              setActiveIndex(-1);
              return;
            }

            if (event.key === "ArrowDown" && suggestions.length > 0) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current + 1) % suggestions.length);
              return;
            }

            if (event.key === "ArrowUp" && suggestions.length > 0) {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
              return;
            }

            if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
              event.preventDefault();
              openSuggestion(suggestions[activeIndex]);
            }
          }}
          placeholder={placeholder}
          role="combobox"
          type="search"
          value={query}
        />
      </label>

      {isLoading ? (
        <LoaderCircle aria-label="Loading suggestions" className="connector-search-loading" size={17} />
      ) : query ? (
        <button
          aria-label="Clear search"
          className="connector-search-clear"
          onClick={() => {
            setQuery("");
            setSuggestions([]);
            setIsOpen(false);
            setActiveIndex(-1);
          }}
          title="Clear search"
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      ) : null}

      {showPopover ? (
        <div className="connector-search-popover" id={listboxId} role="listbox">
          {isLoading ? (
            <p>Finding profiles...</p>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((suggestion, index) => (
                <button
                  aria-selected={activeIndex === index}
                  className={activeIndex === index ? "is-active" : ""}
                  id={`${listboxId}-${suggestion.id}`}
                  key={suggestion.id}
                  onClick={() => openSuggestion(suggestion)}
                  onPointerMove={() => setActiveIndex(index)}
                  role="option"
                  type="button"
                >
                  <span className="connector-search-avatar" aria-hidden="true">
                    {initialsFor(suggestion.name)}
                  </span>
                  <span className="connector-search-suggestion-copy">
                    <strong>{suggestion.name}</strong>
                    <small>
                      {suggestion.role} · {suggestion.neighborhood}
                    </small>
                  </span>
                  <span className="connector-search-kind">
                    {suggestion.kind === "organization" || suggestion.kind === "vendor" ? "Organization" : "User"}
                  </span>
                </button>
              ))}
              <button
                className="connector-search-all"
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/connectors?q=${encodeURIComponent(normalizedQuery)}${selectedProfileType !== "all" ? `&type=${encodeURIComponent(selectedProfileType)}` : ""}`);
                }}
                type="button"
              >
                <Search aria-hidden="true" size={16} />
                Search all profiles for “{normalizedQuery}”
              </button>
            </>
          ) : (
            <button
              className="connector-search-all"
              onClick={() => {
                setIsOpen(false);
                router.push(`/connectors?q=${encodeURIComponent(normalizedQuery)}${selectedProfileType !== "all" ? `&type=${encodeURIComponent(selectedProfileType)}` : ""}`);
              }}
              type="button"
            >
              <Search aria-hidden="true" size={16} />
              Search all profiles for “{normalizedQuery}”
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
