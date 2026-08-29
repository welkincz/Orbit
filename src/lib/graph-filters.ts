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
