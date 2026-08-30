"use client";

import { Command } from "cmdk";
import {
  Crosshair,
  FilePenLine,
  Moon,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { useTheme } from "@/components/theme/ThemeProvider";
import { RELATIONSHIP_FILTERS, type RelationshipFilter } from "@/lib/graph-filters";
import { toVscodeFileHref } from "@/lib/local-files";
import { normalizeSearchText, searchPeople } from "@/lib/search";
import type { Person } from "@/types/person";

interface SearchCommandProps {
  people: Person[];
  activeFilter: RelationshipFilter;
  selectedPerson?: Person;
  selfId: string;
  onSelect: (id: string) => void;
  onSelectFilter: (filter: RelationshipFilter) => void;
}

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

function subtitleFor(person: Person): string {
  const parts = [person.role, person.team, person.company].filter(
    (part, index, all): part is string => Boolean(part)
      && all.findIndex((candidate) => normalizeSearchText(candidate ?? "") === normalizeSearchText(part ?? "")) === index,
  );

  return parts.join(" · ");
}

/**
 * A hit on a hidden field looked like a bug: the row appeared with nothing
 * highlighted to explain it. Naming the matched field makes the ranking legible.
 */
function matchedFieldNote(person: Person, query: string): string {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return "";
  if (normalizeSearchText(person.name).includes(normalizedQuery)) return "";
  if (normalizeSearchText(subtitleFor(person)).includes(normalizedQuery)) return "";

  const tag = person.tags.find((value) => normalizeSearchText(value).includes(normalizedQuery));
  return tag ? `matches tag “${tag}”` : "";
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

function matchesAction(action: PaletteAction, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(`${action.label} ${action.hint ?? ""}`).includes(normalizedQuery);
}

export function SearchCommand({
  people,
  activeFilter,
  selectedPerson,
  selfId,
  onSelect,
  onSelectFilter,
}: SearchCommandProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // The self record is the map's anchor, never a search destination.
  const searchable = useMemo(() => people.filter((person) => person.id !== selfId), [people, selfId]);
  const results = useMemo(() => searchPeople(searchable, query), [searchable, query]);

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

  const run = (action: () => void) => {
    action();
    handleOpenChange(false);
  };

  const actions = useMemo((): PaletteAction[] => {
    const viewActions = RELATIONSHIP_FILTERS
      .filter(({ key }) => key !== activeFilter)
      .map(({ key, label }): PaletteAction => ({
        id: `view:${key}`,
        label: key === "all" ? "Show the whole network" : `Focus the map on ${label}`,
        hint: "View",
        icon: key === "all"
          ? <Users aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
          : <Crosshair aria-hidden="true" className="icon-sm" strokeWidth={1.75} />,
        run: () => onSelectFilter(key),
      }));

    const personActions: PaletteAction[] = [];
    if (selectedPerson) {
      const href = toVscodeFileHref(selectedPerson.sourcePath);
      if (href) {
        personActions.push({
          id: "person:open-markdown",
          label: `Open ${selectedPerson.name}’s Markdown`,
          hint: "Editor",
          icon: <FilePenLine aria-hidden="true" className="icon-sm" strokeWidth={1.75} />,
          run: () => { window.location.href = href; },
        });
      }
    }

    return [
      ...viewActions,
      ...personActions,
      {
        id: "app:refresh",
        label: "Reload people from disk",
        hint: "Data",
        icon: <RefreshCw aria-hidden="true" className="icon-sm" strokeWidth={1.75} />,
        run: () => router.refresh(),
      },
      {
        id: "app:theme",
        label: "Toggle light and dark",
        hint: "Appearance",
        icon: <Moon aria-hidden="true" className="icon-sm" strokeWidth={1.75} />,
        run: toggleTheme,
      },
    ];
  }, [activeFilter, onSelectFilter, router, selectedPerson, toggleTheme]);

  const visibleActions = actions.filter((action) => matchesAction(action, query));

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <button
          className="orbit-control"
          type="button"
        >
          <Search aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
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
        <DialogTitle className="sr-only">Search people and actions</DialogTitle>
        <Command className="command-shell" label="Search people and actions" shouldFilter={false}>
          <div className="command-input-wrap">
            <Search aria-hidden="true" className="icon-sm" strokeWidth={1.75} />
            <Command.Input
              aria-label="Search people and actions"
              className="command-input"
              onValueChange={setQuery}
              placeholder="Search people, or type an action"
              ref={inputRef}
              value={query}
            />
          </div>
          <Command.List className="command-list" label="Results">
            <Command.Empty className="command-empty">No people or actions found.</Command.Empty>
            {results.length > 0 && (
              <Command.Group className="command-group" heading="People">
                {results.map((person) => {
                  const subtitle = subtitleFor(person);
                  const note = matchedFieldNote(person, query);
                  return (
                    <Command.Item
                      className="command-result"
                      key={person.id}
                      onSelect={() => run(() => onSelect(person.id))}
                      value={person.id}
                    >
                      <span className="command-result__name">
                        <HighlightedText query={query} value={person.name} />
                      </span>
                      {subtitle && (
                        <span className="command-result__context">
                          <HighlightedText query={query} value={subtitle} />
                          {note && <span className="command-result__note">{note}</span>}
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
            {visibleActions.length > 0 && (
              <Command.Group className="command-group" heading="Actions">
                {visibleActions.map((action) => (
                  <Command.Item
                    className="command-result command-result--action"
                    key={action.id}
                    onSelect={() => run(action.run)}
                    value={action.id}
                  >
                    <span className="command-result__icon">{action.icon}</span>
                    <span className="command-result__name">{action.label}</span>
                    {action.hint && <span className="command-result__hint">{action.hint}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
