"use client";

import { useEffect, useMemo, useState } from "react";
import type { Program } from "@/types/domain";
import { formatDate, formatTime } from "@/lib/format/date";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";

interface SessionSearchResult {
  id: string;
  title: string;
  category: Program["category"];
  startsAt: string;
  capacity: number;
  enrolled: number;
  isWaitlisted?: boolean;
}

const PROGRAM_CATEGORY_LABELS: Record<Program["category"], string> = {
  class: "Class",
  camp: "Camp",
  clinic: "Clinic",
  course: "Course"
};

function formatSessionDate(startsAt: string) {
  return `${formatDate(startsAt, "-", { month: "short", day: "numeric", year: "numeric" })} • ${formatTime(startsAt)}`;
}

export function SessionSearchCombobox({
  label,
  placeholder,
  query,
  onQueryChange,
  sessions,
  selectedSession,
  onSelect,
  onClear,
  emptyMessage = "No sessions found"
}: {
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  sessions: SessionSearchResult[];
  selectedSession?: SessionSearchResult | null;
  onSelect: (sessionId: string) => void;
  onClear: () => void;
  emptyMessage?: string;
}) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const open = query.trim().length > 0;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, sessions.length]);

  const highlighted = useMemo(() => sessions[highlightIndex], [sessions, highlightIndex]);
  return (
    <div className="w-full space-y-2">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={placeholder}
        label={label}
        className="h-12 text-base"
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightIndex((prev) => Math.min(prev + 1, Math.max(sessions.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            if (highlighted) {
              event.preventDefault();
              onSelect(highlighted.id);
            }
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onQueryChange("");
          }
        }}
      />

      {selectedSession ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/20 px-3 py-2 text-sm" aria-label="Selected registration session">
          <span>
            {selectedSession.title} • {formatSessionDate(selectedSession.startsAt)}
          </span>
          <Button variant="outline" className="h-9" onClick={onClear}>
            Clear
          </Button>
        </div>
      ) : null}

      {open ? (
        <div className="space-y-2 rounded-xl border bg-card p-3">
          {sessions.length > 0 ? (
            <div className="space-y-2" role="listbox" aria-label="Session search results">
              {sessions.map((session, index) => (
                <button
                  key={session.id}
                  role="option"
                  aria-selected={index === highlightIndex}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => onSelect(session.id)}
                  className={`flex min-h-11 w-full items-start justify-between gap-2 rounded-md border px-3 py-2 text-left ${index === highlightIndex ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <span>
                    <span className="block font-medium">{session.title}</span>
                    <span className="block text-sm text-muted-foreground">{PROGRAM_CATEGORY_LABELS[session.category]} • {formatSessionDate(session.startsAt)}</span>
                    <span className="block text-xs text-muted-foreground">{session.enrolled}/{session.capacity} registered</span>
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    {session.isWaitlisted ? "Waitlist" : "Open"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export type { SessionSearchResult };
