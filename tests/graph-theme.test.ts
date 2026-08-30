import { describe, expect, it } from "vitest";
import { getGraphPalette } from "@/lib/graph-theme";

describe("graph theme palette", () => {
  it("preserves every current Light canvas color behind one complete palette", () => {
    expect(getGraphPalette("light")).toEqual({
      canvas: "rgba(0, 0, 0, 0)",
      label: { primary: "#1b1d1e", dimmed: "#929594" },
      planet: {
        dimmedAlpha: 0.24,
        fill: "#faf9f6",
        stroke: "#6b6e70",
        selectedFill: "#315f58",
        selectedStroke: "#315f58",
        hoverStroke: "#6b6e70",
      },
      relevance: { high: "#b65f43", medium: "#748468", low: "#969895" },
      filterHalo: {
        "inner-circle": "#b08a47",
        reconnect: "#b65f43",
        recent: "#748468",
        targets: "#6c648f",
      },
      directLink: {
        idle: "rgba(107, 110, 112, 0.52)",
        active: "rgba(49, 95, 88, 0.62)",
        filtered: "rgba(49, 95, 88, 0.5)",
        activeDimmed: "rgba(107, 110, 112, 0.06)",
        filteredDimmed: "rgba(107, 110, 112, 0.07)",
      },
      introducedLink: {
        active: "rgba(116, 132, 104, 0.72)",
        dimmed: "rgba(116, 132, 104, 0.07)",
        arrowActive: "rgba(116, 132, 104, 0.82)",
        arrowDimmed: "rgba(116, 132, 104, 0.07)",
      },
      particle: {
        selected: "rgba(190, 143, 59, 0.98)",
        ambient: "rgba(91, 116, 98, 0.96)",
      },
      solarAnchor: {
        core: "#1b1d1e",
        corona: "#bd9144",
        innerRing: "rgba(243, 224, 177, 0.74)",
        ray: "#bd9144",
      },
      homeWorld: {
        ocean: "#315b68",
        land: "#647b6f",
        limb: "#9abcc5",
        innerRing: "rgba(184, 211, 218, 0.56)",
        beacon: "#bd9144",
      },
    });
  });

  it("provides the complete approved Dark canvas palette", () => {
    expect(getGraphPalette("dark")).toEqual({
      canvas: "rgba(0, 0, 0, 0)",
      label: { primary: "#e3e8eb", dimmed: "#7e8e97" },
      planet: {
        dimmedAlpha: 0.38,
        fill: "#151d24",
        stroke: "#8b99a1",
        selectedFill: "#6f99a6",
        selectedStroke: "#b4cbd2",
        hoverStroke: "#8fb2bc",
      },
      relevance: { high: "#d48469", medium: "#94a683", low: "#89969b" },
      filterHalo: {
        "inner-circle": "rgba(189, 145, 68, 0.24)",
        reconnect: "rgba(212, 132, 105, 0.22)",
        recent: "rgba(148, 166, 131, 0.22)",
        targets: "rgba(130, 121, 168, 0.24)",
      },
      directLink: {
        idle: "rgba(111, 153, 166, 0.46)",
        active: "rgba(111, 153, 166, 0.78)",
        filtered: "rgba(111, 153, 166, 0.64)",
        activeDimmed: "rgba(139, 153, 161, 0.12)",
        filteredDimmed: "rgba(139, 153, 161, 0.14)",
      },
      introducedLink: {
        active: "rgba(148, 166, 131, 0.78)",
        dimmed: "rgba(148, 166, 131, 0.13)",
        arrowActive: "rgba(148, 166, 131, 0.9)",
        arrowDimmed: "rgba(148, 166, 131, 0.15)",
      },
      particle: {
        selected: "rgba(189, 145, 68, 0.98)",
        ambient: "rgba(143, 178, 188, 0.95)",
      },
      solarAnchor: {
        core: "#1b1d1e",
        corona: "#bd9144",
        innerRing: "rgba(243, 224, 177, 0.74)",
        ray: "#bd9144",
      },
      homeWorld: {
        ocean: "#315b68",
        land: "#647b6f",
        limb: "#9abcc5",
        innerRing: "rgba(184, 211, 218, 0.56)",
        beacon: "#bd9144",
      },
    });
  });

  it("falls back to the complete Light palette for an unknown theme", () => {
    expect(getGraphPalette("sepia")).toBe(getGraphPalette("light"));
    expect(getGraphPalette(undefined)).toBe(getGraphPalette("light"));
  });
});
