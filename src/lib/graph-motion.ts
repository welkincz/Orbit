import type { RelationshipFilter } from "@/lib/graph-filters";
import type { GraphLink } from "@/lib/graph-model";

export const HOME_BEACON_CYCLE_MS = 7400;
export const HOME_BEACON_ACTIVE_MS = 820;

export interface BeaconFrame {
  active: boolean;
  progress: number;
  intensity: number;
}

const INACTIVE_BEACON_FRAME: BeaconFrame = Object.freeze({
  active: false,
  progress: 0,
  intensity: 0,
});

export function getContinuousParticleCount(
  link: Pick<GraphLink, "kind">,
  activeFilter: RelationshipFilter,
  emphasized: boolean,
  reduceMotion: boolean,
): number {
  if (reduceMotion || activeFilter === "all" || !emphasized) return 0;
  return link.kind === "introduced_by" ? 1 : 0;
}

export function getHomeBeaconFrame(
  elapsedMs: number,
  reduceMotion: boolean,
  pageVisible: boolean,
): BeaconFrame {
  if (reduceMotion || !pageVisible || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return INACTIVE_BEACON_FRAME;
  }

  const phase = elapsedMs % HOME_BEACON_CYCLE_MS;
  if (phase >= HOME_BEACON_ACTIVE_MS) return INACTIVE_BEACON_FRAME;
  const progress = phase / HOME_BEACON_ACTIVE_MS;
  return {
    active: true,
    progress,
    intensity: Math.sin(progress * Math.PI),
  };
}

export function shouldContinuouslyRedrawGraph(options: {
  hasActiveSignal: boolean;
  beaconActive: boolean;
  /** A relationship view is focused, so matching nodes carry an animated halo. */
  filterActive: boolean;
  pageVisible: boolean;
  reduceMotion: boolean;
}): boolean {
  if (options.reduceMotion || !options.pageVisible) return false;
  return options.hasActiveSignal || options.beaconActive || options.filterActive;
}
