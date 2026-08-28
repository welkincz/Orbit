import type { Person } from "@/types/person";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function searchPeople(people: Person[], query: string): Person[] {
  const normalizedQuery = normalizeSearchText(query);

  return people
    .map((person) => {
      const name = normalizeSearchText(person.name);
      const fields = [person.company, person.team, person.role, ...person.tags]
        .filter((value): value is string => Boolean(value))
        .map(normalizeSearchText);
      const rank = normalizedQuery === ""
        ? person.type === "self" ? 0 : 1
        : name.startsWith(normalizedQuery) ? 0
        : name.includes(normalizedQuery) ? 1
        : fields.some((field) => field.includes(normalizedQuery)) ? 2
        : Number.POSITIVE_INFINITY;

      return { person, rank };
    })
    .filter((entry) => Number.isFinite(entry.rank))
    .toSorted((a, b) => a.rank - b.rank || a.person.name.localeCompare(b.person.name))
    .map((entry) => entry.person);
}
