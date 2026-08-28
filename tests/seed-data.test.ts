import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPeopleFromDirectory } from "@/lib/markdown";
import { getRelationships } from "@/lib/relationships";
import {
  getInnerCircle,
  getRecentContacts,
  getReconnectCandidates,
  getTargets,
} from "@/lib/selectors";

describe("professional relationship seed data", () => {
  it("loads the intended local-first relationship graph", async () => {
    const dataset = await loadPeopleFromDirectory(resolve(process.cwd(), "data/people"), "2026-08-27");
    const contacts = dataset.people.filter((person) => person.type === "person");
    const relationships = getRelationships(dataset);

    expect(dataset.people).toHaveLength(12);
    expect(getInnerCircle(dataset.people)).toHaveLength(3);
    expect(getReconnectCandidates(dataset.people, "2026-08-27").length).toBeGreaterThanOrEqual(2);
    expect(getTargets(dataset.people)).toHaveLength(2);
    expect(getRecentContacts(dataset.people, "2026-08-27").length).toBeGreaterThanOrEqual(3);
    expect(new Set(contacts.map((person) => person.relationshipStrength))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(relationships.some((edge) => edge.kind === "introduced_by")).toBe(true);
    expect(relationships.filter((edge) => edge.kind === "direct")).toHaveLength(11);
    expect(relationships.filter((edge) => edge.kind === "introduced_by")).toHaveLength(7);
    expect(contacts.every((person) => person.interactions.length <= 3)).toBe(true);
    expect(contacts.filter((person) => person.id !== "priya-desai").every((person) => person.interactions.length >= 1)).toBe(true);
    expect(dataset.people.find((person) => person.id === "maya-patel")?.sections.whyTheyMatter)
      .toContain("Maya gives candid platform leadership advice.");
  });
});
