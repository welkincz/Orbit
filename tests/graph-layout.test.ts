import { afterEach, describe, expect, it } from "vitest";
import {
  clearGraphLayout,
  GRAPH_LAYOUT_STORAGE_KEY,
  readGraphLayout,
  writeGraphLayout,
} from "@/lib/graph-layout";

describe("graph layout storage", () => {
  afterEach(() => localStorage.clear());

  it("restores only finite positions for IDs still in the dataset", () => {
    localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, JSON.stringify({
      maya: { x: 12.5, y: -4 },
      deleted: { x: 1, y: 2 },
      broken: { x: "no", y: 3 },
    }));

    expect(readGraphLayout(localStorage, new Set(["maya", "broken"]))).toEqual({
      maya: { x: 12.5, y: -4 },
    });
  });

  it("returns an empty layout for corrupt JSON or unavailable storage", () => {
    localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, "{");
    expect(readGraphLayout(localStorage, new Set(["maya"]))).toEqual({});
    expect(readGraphLayout(null, new Set(["maya"]))).toEqual({});
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

    expect(readGraphLayout(unavailable, new Set(["maya"]))).toEqual({});
    expect(writeGraphLayout(unavailable, { maya: { x: 1, y: 2 } })).toBe(false);
    expect(clearGraphLayout(unavailable)).toBe(false);
  });
});
