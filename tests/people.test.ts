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

  it("rejects an impossible frontmatter calendar date with source diagnostics", () => {
    expect(() => normalizeFrontmatter({
      id: "alex",
      name: "Alex",
      relationship_strength: 3,
      strategic_relevance: "high",
      last_contact: "2026-02-30",
    }, "people/alex.md")).toThrow(/last_contact.*calendar date/i);
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

  it("names every source file involved in a duplicate ID", () => {
    expect(() => validatePeopleCollection([
      person({ sourceRelativePath: "data/people/charlie.md" }),
      person({
        type: "person",
        relationshipStrength: 3,
        strategicRelevance: "high",
        sourceRelativePath: "data/people/impostor.md",
      }),
    ], "2026-08-27")).toThrow(/data\/people\/charlie\.md.*data\/people\/impostor\.md/i);
  });

  it.each([
    {
      label: "missing introducer",
      introducedBy: "missing-person",
      expectedPath: "data/people/alex.md",
      expectedIssue: /references missing person/i,
    },
    {
      label: "self introducer",
      introducedBy: "alex",
      expectedPath: "data/people/alex.md",
      expectedIssue: /cannot reference itself/i,
    },
  ])("names the source file for $label", ({ introducedBy, expectedPath, expectedIssue }) => {
    expect(() => validatePeopleCollection([
      person({ sourceRelativePath: "data/people/charlie.md" }),
      person({
        id: "alex",
        type: "person",
        relationshipStrength: 3,
        strategicRelevance: "high",
        introducedBy,
        sourceRelativePath: expectedPath,
      }),
    ], "2026-08-27")).toThrow(new RegExp(`${expectedPath.replaceAll(".", "\\.")}.*${expectedIssue.source}`, "i"));
  });

  it.each([
    {
      label: "no self record",
      people: [person({
        id: "alex",
        type: "person",
        relationshipStrength: 3,
        strategicRelevance: "high",
        sourceRelativePath: "data/people/alex.md",
      })],
      paths: ["data/people/alex.md"],
    },
    {
      label: "multiple self records",
      people: [
        person({ sourceRelativePath: "data/people/charlie.md" }),
        person({ id: "also-me", sourceRelativePath: "data/people/also-me.md" }),
      ],
      paths: ["data/people/charlie.md", "data/people/also-me.md"],
    },
  ])("names the involved source files for $label", ({ people, paths }) => {
    try {
      validatePeopleCollection(people, "2026-08-27");
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      for (const path of paths) expect((error as Error).message).toContain(path);
    }
  });
});
