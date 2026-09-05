"use client";

import { useMemo, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { headingId, titleCase } from "@/lib/format";
import type { RelationshipFilter } from "@/lib/graph-filters";
import {
  getInnerCircle,
  getRecentContacts,
  getReconnectCandidates,
  getTargets,
  type ReconnectCandidate,
} from "@/lib/selectors";
import type { ISODate, PeopleDataset, Person } from "@/types/person";
import { RelationshipStrength } from "./RelationshipStrength";
import { Separator } from "../ui/Separator";

interface RelationshipSidebarProps {
  dataset: PeopleDataset;
  currentDate: ISODate;
  selectedId: string | null;
  activeFilter?: RelationshipFilter;
  onSelect: (id: string) => void;
  onFilterChange?: (filter: RelationshipFilter) => void;
}

interface SidebarRow {
  person: Person;
  secondary: React.ReactNode;
}

interface SidebarSection {
  heading: string;
  emptyMessage: string;
  filter: Exclude<RelationshipFilter, "all">;
  rows: SidebarRow[];
}

function reconnectSecondary(candidate: ReconnectCandidate): React.ReactNode {
  return candidate.overdueDays === null
    ? <span className="relationship-row__never" title="Not yet contacted">Never</span>
    : <span title={`${candidate.overdueDays} days overdue`}>{candidate.overdueDays}d</span>;
}

export function RelationshipSidebar({
  dataset,
  currentDate,
  selectedId,
  activeFilter = "all",
  onSelect,
  onFilterChange,
}: RelationshipSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const sections = useMemo((): SidebarSection[] => [
    {
      heading: "Inner circle",
      emptyMessage: "No inner-circle contacts.",
      filter: "inner-circle",
      rows: getInnerCircle(dataset.people).map((person) => ({
        person,
        secondary: <RelationshipStrength value={person.relationshipStrength} variant="compact" />,
      })),
    },
    {
      heading: "Reconnect",
      emptyMessage: "You're caught up.",
      filter: "reconnect",
      rows: getReconnectCandidates(dataset.people, currentDate).map((candidate) => ({
        person: candidate.person,
        secondary: reconnectSecondary(candidate),
      })),
    },
    {
      heading: "Recent conversations",
      emptyMessage: "No recent conversations.",
      filter: "recent",
      rows: getRecentContacts(dataset.people, currentDate).map((person) => ({
        person,
        secondary: <span className="tabular">{person.effectiveLastContact ?? ""}</span>,
      })),
    },
    {
      heading: "Targets",
      emptyMessage: "No targets yet.",
      filter: "targets",
      rows: getTargets(dataset.people).map((person) => ({
        person,
        secondary: person.strategicRelevance
          ? (
            <span className="relevance-chip" data-relevance={person.strategicRelevance}>
              {titleCase(person.strategicRelevance)}
            </span>
          )
          : "",
      })),
    },
  ], [currentDate, dataset.people]);

  // A roving tabindex keeps the rail one Tab stop: arrows and j/k move inside
  // it, so a keyboard user is not walked through every person to reach the map.
  const rowCount = sections.reduce((total, section) => total + section.rows.length, 0);
  const activeIndex = rowCount === 0 ? 0 : Math.min(focusedIndex, rowCount - 1);

  function moveFocus(delta: number | "first" | "last") {
    const rows = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-relationship-row]");
    if (!rows || rows.length === 0) return;

    const next = delta === "first"
      ? 0
      : delta === "last"
        ? rows.length - 1
        : Math.min(rows.length - 1, Math.max(0, activeIndex + delta));

    // Focusing the row fires its own onFocus, which is what records the index.
    rows[next].focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      moveFocus(1);
    } else if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      moveFocus(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus("first");
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus("last");
    }
  }

  let rowIndex = -1;

  return (
    <aside aria-label="Relationship views" className="relationship-sidebar">
      <div className="relationship-sidebar__content" onKeyDown={handleKeyDown} ref={listRef}>
        {sections.map((section, sectionIndex) => {
          const sectionId = headingId(section.heading);
          const active = activeFilter === section.filter;

          return (
            <div key={section.filter}>
              {sectionIndex > 0 && <Separator className="relationship-divider" />}
              <section
                aria-labelledby={sectionId}
                className="relationship-section"
                data-active={active || undefined}
              >
                <h2 className="relationship-section__heading" id={sectionId}>
                  <button
                    aria-pressed={active}
                    className="relationship-section__toggle"
                    onClick={() => onFilterChange?.(active ? "all" : section.filter)}
                    title={active
                      ? "Show the whole network again"
                      : `Focus the map on ${section.heading}`}
                    type="button"
                  >
                    <Crosshair
                      aria-hidden="true"
                      className="relationship-section__focus icon-sm"
                      strokeWidth={2}
                    />
                    <span className="relationship-section__label">{section.heading}</span>
                    <span className="relationship-section__count tabular">{section.rows.length}</span>
                  </button>
                </h2>
                {section.rows.length > 0
                  ? section.rows.map((row) => {
                    rowIndex += 1;
                    const currentRowIndex = rowIndex;
                    const professionalContext = [row.person.role, row.person.team, row.person.company]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <button
                        aria-current={selectedId === row.person.id ? "true" : undefined}
                        className="relationship-row"
                        data-person-id={row.person.id}
                        data-relationship-row=""
                        key={`${section.filter}:${row.person.id}`}
                        onClick={() => onSelect(row.person.id)}
                        onFocus={() => setFocusedIndex(currentRowIndex)}
                        tabIndex={currentRowIndex === activeIndex ? 0 : -1}
                        type="button"
                      >
                        <span className="relationship-row__name" title={row.person.name}>{row.person.name}</span>
                        <span className="relationship-row__meta">{row.secondary}</span>
                        {professionalContext && (
                          <span className="relationship-row__context" title={professionalContext}>{professionalContext}</span>
                        )}
                      </button>
                    );
                  })
                  : <p className="relationship-section__empty">{section.emptyMessage}</p>}
              </section>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
