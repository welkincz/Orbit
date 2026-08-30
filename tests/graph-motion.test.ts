import { describe, expect, it } from "vitest";
import {
  HOME_BEACON_ACTIVE_MS,
  HOME_BEACON_CYCLE_MS,
  getContinuousParticleCount,
  getHomeBeaconFrame,
  shouldContinuouslyRedrawGraph,
} from "@/lib/graph-motion";
import type { GraphLink } from "@/lib/graph-model";

function relationship(kind: GraphLink["kind"]): Pick<GraphLink, "kind"> {
  return { kind };
}

describe("graph relationship motion", () => {
  it.each([
    {
      name: "moves one emphasized introduction during a filtered view",
      link: relationship("introduced_by"),
      filter: "inner-circle" as const,
      emphasized: true,
      reduceMotion: false,
      expected: 1,
    },
    {
      name: "keeps direct relationships static",
      link: relationship("direct"),
      filter: "inner-circle" as const,
      emphasized: true,
      reduceMotion: false,
      expected: 0,
    },
    {
      name: "keeps the All view calm",
      link: relationship("introduced_by"),
      filter: "all" as const,
      emphasized: true,
      reduceMotion: false,
      expected: 0,
    },
    {
      name: "does not animate dimmed introductions",
      link: relationship("introduced_by"),
      filter: "targets" as const,
      emphasized: false,
      reduceMotion: false,
      expected: 0,
    },
    {
      name: "honors reduced motion",
      link: relationship("introduced_by"),
      filter: "targets" as const,
      emphasized: true,
      reduceMotion: true,
      expected: 0,
    },
  ])("$name", ({ link, filter, emphasized, reduceMotion, expected }) => {
    expect(getContinuousParticleCount(link, filter, emphasized, reduceMotion)).toBe(expected);
  });

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
    { name: "rests with no active motion", hasActiveSignal: false, beaconActive: false, pageVisible: true, reduceMotion: false, expected: false },
    { name: "redraws an eligible semantic signal", hasActiveSignal: true, beaconActive: false, pageVisible: true, reduceMotion: false, expected: true },
    { name: "redraws the short beacon window", hasActiveSignal: false, beaconActive: true, pageVisible: true, reduceMotion: false, expected: true },
    { name: "pauses all motion when hidden", hasActiveSignal: true, beaconActive: true, pageVisible: false, reduceMotion: false, expected: false },
    { name: "pauses all motion for reduced motion", hasActiveSignal: true, beaconActive: true, pageVisible: true, reduceMotion: true, expected: false },
  ])("$name", ({ expected, ...options }) => {
    expect(shouldContinuouslyRedrawGraph(options)).toBe(expected);
  });
});
