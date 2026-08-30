import type { RelationshipFilter } from "@/lib/graph-filters";
import type { GraphLink } from "@/lib/graph-model";

export function getContinuousParticleCount(
  link: Pick<GraphLink, "kind">,
  activeFilter: RelationshipFilter,
  emphasized: boolean,
  reduceMotion: boolean,
): number {
  if (reduceMotion || activeFilter === "all" || !emphasized) return 0;
  return link.kind === "introduced_by" ? 1 : 0;
}
