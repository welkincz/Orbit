"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { normalizeSearchText, searchPeople } from "@/lib/search";
import type { Person } from "@/types/person";

interface SearchCommandProps {
  people: Person[];
  onSelect: (id: string) => void;
}

function subtitleFor(person: Person): string {
  const parts = [person.role, person.team, person.company].filter(
    (part, index, all): part is string => Boolean(part)
      && all.findIndex((candidate) => normalizeSearchText(candidate ?? "") === normalizeSearchText(part ?? "")) === index,
  );

  return parts.join(" · ");
}

interface SourceOffset {
  start: number;
  end: number;
}

function normalizedTextWithOffsets(value: string): { text: string; offsets: SourceOffset[] } {
  let text = "";
  const offsets: SourceOffset[] = [];
  let whitespaceOffset: SourceOffset | null = null;

  for (let sourceStart = 0; sourceStart < value.length;) {
    const codePoint = value.codePointAt(sourceStart);
    if (codePoint === undefined) break;

    const sourceEnd = sourceStart + String.fromCodePoint(codePoint).length;
    const normalizedChunk = value
      .slice(sourceStart, sourceEnd)
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();

    for (const character of normalizedChunk) {
      if (/\s/u.test(character)) {
        whitespaceOffset = whitespaceOffset
          ? { start: whitespaceOffset.start, end: sourceEnd }
          : { start: sourceStart, end: sourceEnd };
        continue;
      }

      if (whitespaceOffset && text.length > 0) {
        text += " ";
        offsets.push(whitespaceOffset);
        whitespaceOffset = null;
      }

      text += character;
      for (let index = 0; index < character.length; index += 1) {
        offsets.push({ start: sourceStart, end: sourceEnd });
      }
    }

    sourceStart = sourceEnd;
  }

  return { text, offsets };
}

function getNormalizedMatchRange(value: string, query: string): SourceOffset | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const { text, offsets } = normalizedTextWithOffsets(value);
  const normalizedMatchStart = text.indexOf(normalizedQuery);
  if (normalizedMatchStart < 0) return null;

  const normalizedMatchEnd = normalizedMatchStart + normalizedQuery.length - 1;
  return {
    start: offsets[normalizedMatchStart].start,
    end: offsets[normalizedMatchEnd].end,
  };
}

function HighlightedText({ value, query }: { value: string; query: string }) {
  const match = getNormalizedMatchRange(value, query);

  if (!match) return value;
  return (
    <>
      {value.slice(0, match.start)}
      <mark className="command-match">{value.slice(match.start, match.end)}</mark>
      {value.slice(match.end)}
    </>
  );
}

export function SearchCommand({ people, onSelect }: SearchCommandProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchPeople(people, query), [people, query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    handleOpenChange(false);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <button
          className="orbit-control"
          type="button"
        >
          <Search aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          <span>Search</span>
          <kbd className="orbit-kbd">⌘K</kbd>
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Search people</DialogTitle>
        <Command className="command-shell" label="Search people" shouldFilter={false}>
          <div className="command-input-wrap">
            <Search aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            <Command.Input
              aria-label="Search people"
              className="command-input"
              onValueChange={setQuery}
              placeholder="Search people by name, role, team, or company"
              ref={inputRef}
              value={query}
            />
          </div>
          <Command.List className="command-list" label="People">
            <Command.Empty className="command-empty">No people found.</Command.Empty>
            {results.map((person) => {
              const subtitle = subtitleFor(person);
              return (
                <Command.Item
                  className="command-result"
                  key={person.id}
                  onSelect={() => handleSelect(person.id)}
                  value={person.id}
                >
                  <span className="command-result__name"><HighlightedText query={query} value={person.name} /></span>
                  {subtitle && <span className="command-result__context"><HighlightedText query={query} value={subtitle} /></span>}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
