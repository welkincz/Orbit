"use client";

import { useMemo } from "react";
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

interface PersonRowProps {
  person: Person;
  selectedId: string | null;
  onSelect: (id: string) => void;
  secondary: React.ReactNode;
}

function PersonRow({ person, selectedId, onSelect, secondary }: PersonRowProps) {
  const professionalContext = [person.role, person.team, person.company].filter(Boolean).join(" · ");

  return (
    <button
      aria-current={selectedId === person.id ? "true" : undefined}
      className="relationship-row"
      onClick={() => onSelect(person.id)}
      type="button"
    >
      <span className="relationship-row__identity">
        <span className="relationship-row__name">{person.name}</span>
        {professionalContext && (
          <span className="relationship-row__context">{professionalContext}</span>
        )}
      </span>
      <span className="relationship-row__meta">{secondary}</span>
    </button>
  );
}

interface SidebarSectionProps {
  heading: string;
  emptyMessage: string;
  filter: Exclude<RelationshipFilter, "all">;
  activeFilter: RelationshipFilter;
  onFilterChange?: (filter: RelationshipFilter) => void;
  children: React.ReactNode[];
}

function SidebarSection({
  heading,
  emptyMessage,
  filter,
  activeFilter,
  onFilterChange,
  children,
}: SidebarSectionProps) {
  const sectionId = headingId(heading);
  const active = activeFilter === filter;

  return (
    <section aria-labelledby={sectionId} className="relationship-section" data-active={active || undefined}>
      <h2 className="relationship-section__heading" id={sectionId}>
        <button
          aria-pressed={active}
          className="relationship-section__toggle"
          onClick={() => onFilterChange?.(active ? "all" : filter)}
          title={active ? `Show the whole network again` : `Focus the map on ${heading}`}
          type="button"
        >
          <span className="relationship-section__label">{heading}</span>
          <span className="relationship-section__count tabular">{children.length}</span>
        </button>
      </h2>
      {children.length > 0 ? children : <p className="relationship-section__empty">{emptyMessage}</p>}
    </section>
  );
}

function reconnectRow(candidate: ReconnectCandidate, selectedId: string | null, onSelect: (id: string) => void) {
  const secondary = candidate.overdueDays === null
    ? <span className="relationship-row__never" title="Not yet contacted">Never</span>
    : <span title={`${candidate.overdueDays} days overdue`}>{candidate.overdueDays}d</span>;

  return (
    <PersonRow
      key={candidate.person.id}
      onSelect={onSelect}
      person={candidate.person}
      secondary={secondary}
      selectedId={selectedId}
    />
  );
}

export function RelationshipSidebar({
  dataset,
  currentDate,
  selectedId,
  activeFilter = "all",
  onSelect,
  onFilterChange,
}: RelationshipSidebarProps) {
  const innerCircle = useMemo(() => getInnerCircle(dataset.people), [dataset.people]);
  const reconnectCandidates = useMemo(
    () => getReconnectCandidates(dataset.people, currentDate),
    [dataset.people, currentDate],
  );
  const recentContacts = useMemo(
    () => getRecentContacts(dataset.people, currentDate),
    [dataset.people, currentDate],
  );
  const targets = useMemo(() => getTargets(dataset.people), [dataset.people]);

  const sectionProps = { activeFilter, onFilterChange };

  return (
    <aside aria-label="Relationship views" className="relationship-sidebar">
      <div className="relationship-sidebar__content">
        <SidebarSection
          {...sectionProps}
          emptyMessage="No inner-circle contacts."
          filter="inner-circle"
          heading="Inner circle"
        >
          {innerCircle.map((person) => (
            <PersonRow
              key={person.id}
              onSelect={onSelect}
              person={person}
              secondary={<RelationshipStrength value={person.relationshipStrength} />}
              selectedId={selectedId}
            />
          ))}
        </SidebarSection>
        <Separator className="relationship-divider" />
        <SidebarSection
          {...sectionProps}
          emptyMessage="You're caught up."
          filter="reconnect"
          heading="Reconnect"
        >
          {reconnectCandidates.map((candidate) => reconnectRow(candidate, selectedId, onSelect))}
        </SidebarSection>
        <Separator className="relationship-divider" />
        <SidebarSection
          {...sectionProps}
          emptyMessage="No recent conversations."
          filter="recent"
          heading="Recent conversations"
        >
          {recentContacts.map((person) => (
            <PersonRow
              key={person.id}
              onSelect={onSelect}
              person={person}
              secondary={<span className="tabular">{person.effectiveLastContact ?? ""}</span>}
              selectedId={selectedId}
            />
          ))}
        </SidebarSection>
        <Separator className="relationship-divider" />
        <SidebarSection
          {...sectionProps}
          emptyMessage="No targets yet."
          filter="targets"
          heading="Targets"
        >
          {targets.map((person) => (
            <PersonRow
              key={person.id}
              onSelect={onSelect}
              person={person}
              secondary={person.strategicRelevance ? titleCase(person.strategicRelevance) : ""}
              selectedId={selectedId}
            />
          ))}
        </SidebarSection>
      </div>
    </aside>
  );
}
