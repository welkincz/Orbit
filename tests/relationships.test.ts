import { describe, expect, it } from "vitest";
import { getRelationships } from "@/lib/relationships";
import { validatePeopleCollection } from "@/lib/people";
import { makePerson } from "./fixtures/people";

function dataset({
  selfId = "root",
  people = [self(selfId)],
}: {
  selfId?: string;
  people?: ReturnType<typeof makePerson>[];
}) {
  return validatePeopleCollection(people, "2026-08-27");
}

function self(id: string) {
  return makePerson({
    id,
    name: "Self",
    type: "self",
    relationshipStrength: undefined,
    strategicRelevance: undefined,
  });
}

function contact(id: string, overrides: Parameters<typeof makePerson>[0] = {}) {
  return makePerson({ id, name: id, ...overrides });
}

describe("relationship extraction", () => {
  it("creates one direct self edge per contact without hardcoding self id", () => {
    const edges = getRelationships(dataset({
      selfId: "root",
      people: [self("root"), contact("a"), contact("b")],
    }));

    expect(edges.filter((edge) => edge.kind === "direct")).toEqual([
      expect.objectContaining({ id: "direct:root:a", source: "root", target: "a", directed: false, strength: 3 }),
      expect.objectContaining({ id: "direct:root:b", source: "root", target: "b", directed: false, strength: 3 }),
    ]);
  });

  it("creates a directed introducer edge without a strength", () => {
    const edges = getRelationships(dataset({
      people: [self("root"), contact("maya"), contact("theo", { introducedBy: "maya" })],
    }));

    expect(edges).toContainEqual(expect.objectContaining({
      id: "introduced_by:maya:theo",
      source: "maya",
      target: "theo",
      kind: "introduced_by",
      directed: true,
    }));
    expect(edges.find((edge) => edge.id === "introduced_by:maya:theo")).not.toHaveProperty("strength");
  });
});
