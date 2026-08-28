import { calendarDaysBetween } from "@/lib/dates";
import type { ISODate, Person, StrategicRelevance } from "@/types/person";

export interface ReconnectCandidate {
  person: Person;
  overdueDays: number;
}

const relevanceRank: Record<StrategicRelevance, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function getInnerCircle(people: Person[]): Person[] {
  return people
    .filter((person) => person.type === "person" && person.innerCircle)
    .toSorted((a, b) => (
      (b.relationshipStrength ?? 0) - (a.relationshipStrength ?? 0)
      || (b.effectiveLastContact ?? "").localeCompare(a.effectiveLastContact ?? "")
      || a.name.localeCompare(b.name)
    ));
}

export function getRecentContacts(people: Person[], currentDate: ISODate): Person[] {
  return people
    .filter((person) => person.type === "person" && person.effectiveLastContact)
    .filter((person) => {
      const days = calendarDaysBetween(person.effectiveLastContact!, currentDate);
      return days >= 0 && days <= 30;
    })
    .toSorted((a, b) => (
      b.effectiveLastContact!.localeCompare(a.effectiveLastContact!)
      || a.name.localeCompare(b.name)
    ));
}

export function getReconnectCandidates(
  people: Person[],
  currentDate: ISODate,
): ReconnectCandidate[] {
  return people
    .filter((person) => person.type === "person" && person.effectiveLastContact && person.desiredCadenceDays)
    .map((person) => ({
      person,
      overdueDays: calendarDaysBetween(person.effectiveLastContact!, currentDate) - person.desiredCadenceDays!,
    }))
    .filter((candidate) => candidate.overdueDays > 0)
    .toSorted((a, b) => (
      b.overdueDays - a.overdueDays
      || (b.person.relationshipStrength ?? 0) - (a.person.relationshipStrength ?? 0)
      || a.person.name.localeCompare(b.person.name)
    ));
}

export function getTargets(people: Person[]): Person[] {
  return people
    .filter((person) => person.type === "person" && person.target)
    .toSorted((a, b) => (
      relevanceRank[b.strategicRelevance ?? "low"] - relevanceRank[a.strategicRelevance ?? "low"]
      || (b.relationshipStrength ?? 0) - (a.relationshipStrength ?? 0)
      || a.name.localeCompare(b.name)
    ));
}
