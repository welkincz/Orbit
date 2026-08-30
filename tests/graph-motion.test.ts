import { describe, expect, it } from "vitest";
import { getContinuousParticleCount } from "@/lib/graph-motion";
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
});
