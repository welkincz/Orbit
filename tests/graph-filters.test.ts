import { describe, expect, it } from "vitest";
import {
  getFilterFocusIds,
  getGraphVisualState,
  getRelationshipFilterIds,
} from "@/lib/graph-filters";
import { makePerson } from "./fixtures/people";

describe("graph relationship filters", () => {
  const shared = makePerson({
    id: "shared",
    innerCircle: true,
    target: true,
    effectiveLastContact: "2026-08-18",
    desiredCadenceDays: 5,
  });
  const other = makePerson({ id: "other" });
  const self = makePerson({
    id: "self",
    type: "self",
    relationshipStrength: undefined,
    strategicRelevance: undefined,
  });

  it("reuses overlapping action-view membership", () => {
    const people = [self, shared, other];
    expect(getRelationshipFilterIds(people, "2026-08-27", "inner-circle")).toEqual(new Set(["shared"]));
    expect(getRelationshipFilterIds(people, "2026-08-27", "recent")).toEqual(new Set(["shared"]));
    expect(getRelationshipFilterIds(people, "2026-08-27", "reconnect")).toEqual(new Set(["shared"]));
    expect(getRelationshipFilterIds(people, "2026-08-27", "targets")).toEqual(new Set(["shared"]));
  });

  it("returns every ID for All so filtering never removes context", () => {
    expect(getRelationshipFilterIds([self, shared, other], "2026-08-27", "all"))
      .toEqual(new Set(["self", "shared", "other"]));
  });

  it("lets hover and selection override filter dimming", () => {
    const matchingIds = new Set(["maya"]);
    expect(getGraphVisualState("maya", "self", "targets", matchingIds, null)).toBe("matching");
    expect(getGraphVisualState("theo", "self", "targets", matchingIds, null)).toBe("dimmed");
    expect(getGraphVisualState("theo", "self", "targets", matchingIds, "theo")).toBe("active");
    expect(getGraphVisualState("theo", "self", "all", matchingIds, null)).toBe("neutral");
  });

  it("keeps self as the visual anchor under every filter and interaction", () => {
    const matchingIds = new Set(["maya"]);

    expect(getGraphVisualState("self", "self", "inner-circle", matchingIds, null)).toBe("anchor");
    expect(getGraphVisualState("self", "self", "inner-circle", matchingIds, "self")).toBe("anchor");
  });

  it("focuses a filtered camera on self plus matching people", () => {
    const matchingIds = new Set(["maya", "owen"]);

    expect(getFilterFocusIds("self", "inner-circle", matchingIds))
      .toEqual(new Set(["self", "maya", "owen"]));
    expect(getFilterFocusIds("self", "all", matchingIds)).toBeNull();
  });
});
