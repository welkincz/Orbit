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

/**
 * Only the self anchor's beacon earns a continuous repaint. Ambient particles
 * crawling along filtered introductions used to hold the loop open permanently
 * while implying flow along an edge where nothing flows.
 */
export function shouldContinuouslyRedrawGraph(options: {
  beaconActive: boolean;
  pageVisible: boolean;
  reduceMotion: boolean;
}): boolean {
  if (options.reduceMotion || !options.pageVisible) return false;
  return options.beaconActive;
}
