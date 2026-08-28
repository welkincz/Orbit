import { describe, expect, it } from "vitest";
import { normalizeFrontmatter, validatePeopleCollection } from "@/lib/people";
import type { Person } from "@/types/person";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: "me",
    name: "Me",
    type: "self",
    innerCircle: false,
    target: false,
    tags: [],
    interactions: [],
    sections: { whyTheyMatter: "", context: "", followUp: "" },
    diagnostics: [],
    sourcePath: "/data/people/me.md",
    sourceRelativePath: "me.md",
    ...overrides,
  };
}

function collectionForScenario(scenario: string) {
  switch (scenario) {
    case "no self":
      return validatePeopleCollection([
        person({ id: "alex", type: "person", relationshipStrength: 3, strategicRelevance: "high" }),
      ], "2026-08-27");
    case "two self records":
      return validatePeopleCollection([
        person({ id: "me", type: "self" }),
        person({ id: "also-me", type: "self" }),
      ], "2026-08-27");
    case "duplicate ids":
      return validatePeopleCollection([
        person({ id: "me", type: "self" }),
        person({ id: "me", type: "person", relationshipStrength: 3, strategicRelevance: "high" }),
      ], "2026-08-27");
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

describe("people data", () => {
  it("accepts a minimal self record", () => {
    expect(normalizeFrontmatter({ id: "me", name: "Me", type: "self" }, "me.md"))
      .toMatchObject({ id: "me", type: "self", innerCircle: false, target: false, tags: [] });
  });

  it("rejects a contact without strength and relevance", () => {
    expect(() => normalizeFrontmatter({ id: "alex", name: "Alex" }, "alex.md"))
      .toThrow(/relationship_strength.*strategic_relevance/i);
  });

  it("finds exactly one self without relying on its id", () => {
    const dataset = validatePeopleCollection([
      person({ id: "root-person", type: "self" }),
      person({ id: "alex", type: "person", relationshipStrength: 3, strategicRelevance: "high" }),
    ], "2026-08-27");
    expect(dataset.selfId).toBe("root-person");
  });

  it.each(["no self", "two self records", "duplicate ids"])("rejects %s", (scenario) => {
    expect(() => collectionForScenario(scenario)).toThrow();
  });
});
