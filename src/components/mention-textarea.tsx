"use client";

import { useEffect, useRef, useState } from "react";

type MentionCandidate = {
  id: string;
  initials: string;
  name: string;
  neighborhood: string;
  role: string;
};

type ActiveMention = {
  query: string;
  start: number;
  end: number;
};

type MentionTextareaProps = {
  autoFocus?: boolean;
  defaultValue?: string;
  label: string;
  maxLength: number;
  minLength: number;
  name: string;
  placeholder: string;
  required?: boolean;
};

function findActiveMention(value: string, cursor: number): ActiveMention | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z][a-zA-Z .'-]{1,39})$/);
  if (!match || match.index === undefined) return null;
  const atOffset = match[0].lastIndexOf("@");
  return {
    query: match[1].trim(),
    start: match.index + atOffset,
    end: cursor,
  };
}

export function MentionTextarea({
  autoFocus = false,
  defaultValue = "",
  label,
  maxLength,
  minLength,
  name,
  placeholder,
  required = false,
}: MentionTextareaProps) {
  const [value, setValue] = useState(defaultValue);
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!activeMention || activeMention.query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/friends/search?q=${encodeURIComponent(activeMention.query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setCandidates([]);
          return;
        }
        const payload = (await response.json()) as { candidates?: MentionCandidate[] };
        setCandidates((payload.candidates ?? []).slice(0, 5));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCandidates([]);
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeMention]);

  function updateActiveMention(nextValue: string, cursor: number | null) {
    const nextMention = findActiveMention(nextValue, cursor ?? nextValue.length);
    setActiveMention(nextMention);
    if (!nextMention || nextMention.query.length < 2) setCandidates([]);
  }

  function chooseCandidate(candidate: MentionCandidate) {
    if (!activeMention) return;
    const replacement = `@${candidate.name} `;
    const nextValue =
      value.slice(0, activeMention.start) +
      replacement +
      value.slice(activeMention.end);
    const nextCursor = activeMention.start + replacement.length;
    setValue(nextValue);
    setActiveMention(null);
    setCandidates([]);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return (
    <span className="mention-input">
      <textarea
        aria-label={label}
        autoFocus={autoFocus}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        onChange={(event) => {
          setValue(event.target.value);
          updateActiveMention(event.target.value, event.target.selectionStart);
        }}
        onClick={(event) => {
          updateActiveMention(value, event.currentTarget.selectionStart);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setActiveMention(null);
            setCandidates([]);
          }
        }}
        placeholder={placeholder}
        ref={textareaRef}
        required={required}
        value={value}
      />
      {candidates.length > 0 ? (
        <span className="mention-suggestions" role="listbox" aria-label="Mention someone">
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseCandidate(candidate)}
              aria-selected="false"
              role="option"
              type="button"
            >
              <span className="mention-avatar">{candidate.initials}</span>
              <span>
                <strong>{candidate.name}</strong>
                <small>{candidate.role} · {candidate.neighborhood}</small>
              </span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
