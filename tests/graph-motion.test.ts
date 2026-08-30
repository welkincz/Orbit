import { describe, expect, it } from "vitest";
import {
  HOME_BEACON_ACTIVE_MS,
  HOME_BEACON_CYCLE_MS,
  getHomeBeaconFrame,
  shouldContinuouslyRedrawGraph,
} from "@/lib/graph-motion";

describe("graph ambient motion", () => {
  it("keeps the Home Beacon active for less than one second per 7.4s cycle", () => {
    expect(HOME_BEACON_ACTIVE_MS).toBe(820);
    expect(HOME_BEACON_CYCLE_MS).toBe(7400);
    expect(getHomeBeaconFrame(0, false, true)).toEqual({
      active: true,
      progress: 0,
      intensity: 0,
    });
    expect(getHomeBeaconFrame(410, false, true)).toEqual({
      active: true,
      progress: 0.5,
      intensity: 1,
    });
    expect(getHomeBeaconFrame(820, false, true)).toEqual({
      active: false,
      progress: 0,
      intensity: 0,
    });
    expect(getHomeBeaconFrame(1000, false, true).active).toBe(false);
    expect(getHomeBeaconFrame(7400, false, true)).toEqual({
      active: true,
      progress: 0,
      intensity: 0,
    });
  });

  it("suppresses invalid, reduced-motion, and hidden-page beacon frames", () => {
    const inactive = { active: false, progress: 0, intensity: 0 };
    expect(getHomeBeaconFrame(-1, false, true)).toEqual(inactive);
    expect(getHomeBeaconFrame(Number.NaN, false, true)).toEqual(inactive);
    expect(getHomeBeaconFrame(410, true, true)).toEqual(inactive);
    expect(getHomeBeaconFrame(410, false, false)).toEqual(inactive);
  });

  it.each([
    { name: "rests when the beacon is idle", beaconActive: false, pageVisible: true, reduceMotion: false, expected: false },
    { name: "redraws the short beacon window", beaconActive: true, pageVisible: true, reduceMotion: false, expected: true },
    { name: "pauses all motion when hidden", beaconActive: true, pageVisible: false, reduceMotion: false, expected: false },
    { name: "pauses all motion for reduced motion", beaconActive: true, pageVisible: true, reduceMotion: true, expected: false },
  ])("$name", ({ expected, ...options }) => {
    expect(shouldContinuouslyRedrawGraph(options)).toBe(expected);
  });
});
