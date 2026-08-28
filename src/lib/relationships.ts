import type { PeopleDataset } from "@/types/person";

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  kind: "direct" | "introduced_by";
  directed: boolean;
  strength?: number;
}

export function getRelationships(dataset: PeopleDataset): RelationshipEdge[] {
  const contacts = dataset.people
    .filter((person) => person.type === "person")
    .toSorted((a, b) => a.id.localeCompare(b.id));

  const direct = contacts.map((person): RelationshipEdge => ({
    id: `direct:${dataset.selfId}:${person.id}`,
    source: dataset.selfId,
    target: person.id,
    kind: "direct",
    directed: false,
    strength: person.relationshipStrength,
  }));

  const introduced = contacts
    .filter((person) => person.introducedBy)
    .map((person): RelationshipEdge => ({
      id: `introduced_by:${person.introducedBy!}:${person.id}`,
      source: person.introducedBy!,
      target: person.id,
      kind: "introduced_by",
      directed: true,
    }))
    .toSorted((a, b) => a.id.localeCompare(b.id));

  return [...direct, ...introduced];
}
