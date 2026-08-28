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
  return (
    <button
      aria-current={selectedId === person.id ? "true" : undefined}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      onClick={() => onSelect(person.id)}
      type="button"
    >
      <span className="min-w-0 truncate text-sm font-medium text-slate-900">{person.name}</span>
      <span className="shrink-0 text-xs text-slate-500">{secondary}</span>
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
    <section aria-labelledby={headingId} className="space-y-1">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500" id={headingId}>{heading}</h2>
      {children.length > 0 ? children : <p className="px-2 text-sm text-slate-500">{emptyMessage}</p>}
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
    <aside aria-label="Relationship views" className="w-full rounded-lg border border-slate-200 bg-white p-3 md:w-64">
      <div className="space-y-4">
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
        <Separator />
        <SidebarSection emptyMessage="You're caught up." heading="Reconnect">
          {reconnectCandidates.map((candidate) => reconnectRow(candidate, selectedId, onSelect))}
        </SidebarSection>
        <Separator />
        <SidebarSection emptyMessage="No recent conversations." heading="Recent conversations">
          {recentContacts.map((person) => (
            <PersonRow
              key={person.id}
              onSelect={onSelect}
              person={person}
              secondary={person.effectiveLastContact ?? ""}
              selectedId={selectedId}
            />
          ))}
        </SidebarSection>
        <Separator />
        <SidebarSection emptyMessage="No targets yet." heading="Targets">
          {targets.map((person) => (
            <PersonRow
              key={person.id}
              onSelect={onSelect}
              person={person}
              secondary={person.strategicRelevance ?? ""}
              selectedId={selectedId}
            />
          ))}
        </SidebarSection>
      </div>
    </aside>
  );
}
