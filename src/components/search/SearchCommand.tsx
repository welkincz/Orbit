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
      <mark className="rounded-sm bg-amber-100 px-0.5 text-inherit">{value.slice(match.start, match.end)}</mark>
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
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          type="button"
        >
          <Search aria-hidden="true" className="size-4" />
          <span>Search</span>
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 sm:inline">⌘K</kbd>
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
        <Command label="Search people" shouldFilter={false}>
          <Command.Input
            aria-label="Search people"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
            onValueChange={setQuery}
            placeholder="Search people"
            ref={inputRef}
            value={query}
          />
          <Command.List className="mt-2 max-h-80 overflow-y-auto" label="People">
            <Command.Empty className="px-3 py-6 text-sm text-slate-500">No people found.</Command.Empty>
            {results.map((person) => {
              const subtitle = subtitleFor(person);
              return (
                <Command.Item
                  className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm text-slate-900 aria-selected:bg-slate-100"
                  key={person.id}
                  onSelect={() => handleSelect(person.id)}
                  value={person.id}
                >
                  <span className="font-medium"><HighlightedText query={query} value={person.name} /></span>
                  {subtitle && <span className="text-xs text-slate-500"><HighlightedText query={query} value={subtitle} /></span>}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
