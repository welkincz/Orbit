"use client";

import { useMemo } from "react";
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
  onSelect: (id: string) => void;
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

function SidebarSection({
  heading,
  emptyMessage,
  children,
}: {
  heading: string;
  emptyMessage: string;
  children: React.ReactNode[];
}) {
  const headingId = `${heading.toLowerCase().replaceAll(" ", "-")}-heading`;
  return (
    <section aria-labelledby={headingId} className="relationship-section">
      <h2 className="relationship-section__heading" id={headingId}>{heading}</h2>
      {children.length > 0 ? children : <p className="relationship-section__empty">{emptyMessage}</p>}
    </section>
  );
}

function reconnectRow(candidate: ReconnectCandidate, selectedId: string | null, onSelect: (id: string) => void) {
  return (
    <PersonRow
      key={candidate.person.id}
      onSelect={onSelect}
      person={candidate.person}
      secondary={<span title={`${candidate.overdueDays} days overdue`}>{candidate.overdueDays}d</span>}
      selectedId={selectedId}
    />
  );
}

export function RelationshipSidebar({ dataset, currentDate, selectedId, onSelect }: RelationshipSidebarProps) {
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

  return (
    <aside aria-label="Relationship views" className="relationship-sidebar">
      <div className="relationship-sidebar__content">
        <SidebarSection emptyMessage="No inner-circle contacts." heading="Inner circle">
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
        <SidebarSection emptyMessage="You're caught up." heading="Reconnect">
          {reconnectCandidates.map((candidate) => reconnectRow(candidate, selectedId, onSelect))}
        </SidebarSection>
        <Separator className="relationship-divider" />
        <SidebarSection emptyMessage="No recent conversations." heading="Recent conversations">
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
        <SidebarSection emptyMessage="No targets yet." heading="Targets">
          {targets.map((person) => (
            <PersonRow
              key={person.id}
              onSelect={onSelect}
              person={person}
              secondary={person.strategicRelevance
                ? `${person.strategicRelevance[0].toUpperCase()}${person.strategicRelevance.slice(1)}`
                : ""}
              selectedId={selectedId}
            />
          ))}
        </SidebarSection>
      </div>
    </aside>
  );
}
