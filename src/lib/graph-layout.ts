export const GRAPH_LAYOUT_STORAGE_KEY = "orbit.graph-layout.v1";

export interface GraphPosition {
  x: number;
  y: number;
}

export type GraphLayout = Record<string, GraphPosition>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readGraphLayout(storage: Storage | null, validIds: ReadonlySet<string>): GraphLayout {
  if (!storage) return {};

  try {
    const stored = storage.getItem(GRAPH_LAYOUT_STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(Object.entries(parsed).flatMap(([id, position]) => {
      if (!validIds.has(id) || !isRecord(position)) return [];
      const { x, y } = position;
      if (typeof x !== "number" || !Number.isFinite(x)) return [];
      if (typeof y !== "number" || !Number.isFinite(y)) return [];
      return [[id, { x, y }]];
    }));
  } catch {
    return {};
  }
}

export function writeGraphLayout(storage: Storage | null, layout: GraphLayout): boolean {
  if (!storage) return false;
  try {
    storage.setItem(GRAPH_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    return true;
  } catch {
    return false;
  }
}

export function clearGraphLayout(storage: Storage | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(GRAPH_LAYOUT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
