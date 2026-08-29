import { describe, expect, it } from "vitest";
import {
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
    expect(getGraphVisualState("maya", "targets", matchingIds, null)).toBe("matching");
    expect(getGraphVisualState("theo", "targets", matchingIds, null)).toBe("dimmed");
    expect(getGraphVisualState("theo", "targets", matchingIds, "theo")).toBe("active");
    expect(getGraphVisualState("theo", "all", matchingIds, null)).toBe("neutral");
  });
});
