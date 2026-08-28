import { getRelationships } from "@/lib/relationships";
import type { PeopleDataset, StrategicRelevance } from "@/types/person";

export interface GraphNode {
  id: string;
  personId: string;
  name: string;
  role?: string;
  team?: string;
  isSelf: boolean;
  strength: number;
  strategicRelevance?: StrategicRelevance;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  kind: "direct" | "introduced_by";
  directed: boolean;
  strength?: number;
}

export interface GraphModel {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function buildGraphModel(dataset: PeopleDataset): GraphModel {
  const nodes = dataset.people
    .map((person): GraphNode => ({
      id: person.id,
      personId: person.id,
      name: person.name,
      role: person.role,
      team: person.team,
      isSelf: person.id === dataset.selfId,
      strength: person.id === dataset.selfId ? 9 : 4 + (person.relationshipStrength ?? 1),
      strategicRelevance: person.strategicRelevance,
    }))
    .toSorted((left, right) => {
      if (left.isSelf !== right.isSelf) return left.isSelf ? -1 : 1;
      return left.id.localeCompare(right.id);
    });

  const links = getRelationships(dataset).map((relationship): GraphLink => ({
    id: relationship.id,
    source: relationship.source,
    target: relationship.target,
    kind: relationship.kind,
    directed: relationship.directed,
    strength: relationship.strength,
  }));

  return { nodes, links };
}

function endpointId(endpoint: GraphLink["source"]): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

export function getConnectedIds(links: GraphLink[], selectedId: string): Set<string> {
  const connected = new Set([selectedId]);

  for (const link of links) {
    const sourceId = endpointId(link.source);
    const targetId = endpointId(link.target);
    if (sourceId === selectedId) connected.add(targetId);
    if (targetId === selectedId) connected.add(sourceId);
  }

  return connected;
}
