import type { RelationshipFilter } from "@/lib/graph-filters";
import type { StrategicRelevance } from "@/types/person";

export interface GraphPalette {
  canvas: string;
  label: { primary: string; dimmed: string };
  planet: {
    dimmedAlpha: number;
    fill: string;
    stroke: string;
    selectedFill: string;
    selectedStroke: string;
    hoverStroke: string;
  };
  relevance: Record<StrategicRelevance, string>;
  filterHalo: Record<Exclude<RelationshipFilter, "all">, string>;
  directLink: {
    idle: string;
    active: string;
    filtered: string;
    activeDimmed: string;
    filteredDimmed: string;
  };
  introducedLink: {
    active: string;
    dimmed: string;
    arrowActive: string;
    arrowDimmed: string;
  };
  particle: { selected: string; ambient: string };
  solarAnchor: {
    core: string;
    corona: string;
    innerRing: string;
    ray: string;
  };
  homeWorld: {
    ocean: string;
    land: string;
    limb: string;
    innerRing: string;
    beacon: string;
  };
}

const sharedAnchorColors = {
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
} as const;

const LIGHT_GRAPH_PALETTE: GraphPalette = {
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
  ...sharedAnchorColors,
};

const DARK_GRAPH_PALETTE: GraphPalette = {
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
  ...sharedAnchorColors,
};

export function getGraphPalette(theme: unknown): GraphPalette {
  return theme === "dark" ? DARK_GRAPH_PALETTE : LIGHT_GRAPH_PALETTE;
}
