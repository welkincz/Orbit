import {
  getInnerCircle,
  getRecentContacts,
  getReconnectCandidates,
  getTargets,
} from "@/lib/selectors";
import type { ISODate, Person } from "@/types/person";

export type RelationshipFilter = "all" | "inner-circle" | "reconnect" | "recent" | "targets";

export const RELATIONSHIP_FILTERS: ReadonlyArray<{ key: RelationshipFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "inner-circle", label: "Inner Circle" },
  { key: "reconnect", label: "Reconnect" },
  { key: "recent", label: "Recent" },
  { key: "targets", label: "Targets" },
];

export type GraphVisualState = "neutral" | "matching" | "dimmed" | "active";

export const FILTER_HALO_COLOR: Record<Exclude<RelationshipFilter, "all">, string> = {
  "inner-circle": "#b08a47",
  reconnect: "#b65f43",
  recent: "#748468",
  targets: "#6c648f",
};

export function getGraphVisualState(
  personId: string,
  filter: RelationshipFilter,
  matchingIds: ReadonlySet<string>,
  activeId: string | null,
): GraphVisualState {
  if (personId === activeId) return "active";
  if (filter === "all") return "neutral";
  return matchingIds.has(personId) ? "matching" : "dimmed";
}

export function getRelationshipFilterIds(
  people: Person[],
  currentDate: ISODate,
  filter: RelationshipFilter,
): Set<string> {
  if (filter === "all") return new Set(people.map(({ id }) => id));

  const matches = filter === "inner-circle"
    ? getInnerCircle(people)
    : filter === "recent"
      ? getRecentContacts(people, currentDate)
      : filter === "targets"
        ? getTargets(people)
        : getReconnectCandidates(people, currentDate).map(({ person }) => person);

  return new Set(matches.map(({ id }) => id));
}
