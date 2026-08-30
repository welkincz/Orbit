import { afterEach, describe, expect, it } from "vitest";
import {
  clearGraphLayout,
  GRAPH_LAYOUT_STORAGE_KEY,
  readGraphLayout,
  selectGraphLayout,
  writeGraphLayout,
} from "@/lib/graph-layout";

describe("graph layout storage", () => {
  afterEach(() => localStorage.clear());

  it("keeps every well-formed position, including people not currently loaded", () => {
    localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, JSON.stringify({
      maya: { x: 12.5, y: -4 },
      "not-loaded": { x: 1, y: 2 },
      broken: { x: "no", y: 3 },
    }));

    expect(readGraphLayout(localStorage)).toEqual({
      maya: { x: 12.5, y: -4 },
      "not-loaded": { x: 1, y: 2 },
    });
  });

  it("applies only the positions for people in the current dataset", () => {
    const layout = {
      maya: { x: 12.5, y: -4 },
      "not-loaded": { x: 1, y: 2 },
    };

    expect(selectGraphLayout(layout, new Set(["maya"]))).toEqual({
      maya: { x: 12.5, y: -4 },
    });
  });

  it("does not lose an absent person's position when the layout is rewritten", () => {
    localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, JSON.stringify({
      maya: { x: 1, y: 1 },
      "not-loaded": { x: 9, y: 9 },
    }));

    const restored = readGraphLayout(localStorage);
    writeGraphLayout(localStorage, { ...restored, maya: { x: 2, y: 2 } });

    expect(JSON.parse(localStorage.getItem(GRAPH_LAYOUT_STORAGE_KEY)!)).toEqual({
      maya: { x: 2, y: 2 },
      "not-loaded": { x: 9, y: 9 },
    });
  });

  it("returns an empty layout for corrupt JSON or unavailable storage", () => {
    localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, "{");
    expect(readGraphLayout(localStorage)).toEqual({});
    expect(readGraphLayout(null)).toEqual({});
  });

  it("writes and clears the versioned layout key", () => {
    expect(writeGraphLayout(localStorage, { maya: { x: 10, y: 20 } })).toBe(true);
    expect(JSON.parse(localStorage.getItem(GRAPH_LAYOUT_STORAGE_KEY)!)).toEqual({
      maya: { x: 10, y: 20 },
    });
    expect(clearGraphLayout(localStorage)).toBe(true);
    expect(localStorage.getItem(GRAPH_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("contains storage access failures instead of breaking the graph", () => {
    const unavailable = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); },
    } as unknown as Storage;

    expect(readGraphLayout(unavailable)).toEqual({});
    expect(writeGraphLayout(unavailable, { maya: { x: 1, y: 2 } })).toBe(false);
    expect(clearGraphLayout(unavailable)).toBe(false);
  });
});
