"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
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

function HighlightedText({ value, query }: { value: string; query: string }) {
  const normalizedQuery = normalizeSearchText(query);
  const matchStart = value.toLocaleLowerCase().indexOf(normalizedQuery);

  if (!normalizedQuery || matchStart < 0) return value;

  const matchEnd = matchStart + query.trim().length;
  return (
    <>
      {value.slice(0, matchStart)}
      <mark className="rounded-sm bg-amber-100 px-0.5 text-inherit">{value.slice(matchStart, matchEnd)}</mark>
      {value.slice(matchEnd)}
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
      <button
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Search aria-hidden="true" className="size-4" />
        <span>Search</span>
        <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 sm:inline">⌘K</kbd>
      </button>
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
