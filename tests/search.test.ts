import { describe, expect, it } from "vitest";
import { normalizeSearchText, searchPeople } from "@/lib/search";
import { makePerson } from "./fixtures/people";

const people = [
  makePerson({
    id: "maya-patel",
    name: "Maya Patel",
    company: "Northstar Analytics",
    team: "Platform Engineering",
    role: "Director",
    tags: ["data-platform"],
  }),
  makePerson({ id: "maya-rivera", name: "Maya Rivera", role: "Engineer" }),
  makePerson({ id: "amaya-chen", name: "Amaya Chen", company: "Northstar Analytics" }),
  makePerson({ id: "self", name: "Charlie Guo", type: "self" }),
];

describe("searchPeople", () => {
  it.each([
    ["maya", "maya-patel"],
    ["northstar", "maya-patel"],
    ["platform engineering", "maya-patel"],
    ["director", "maya-patel"],
    ["data-platform", "maya-patel"],
  ])("matches %s across the required fields", (query, expectedId) => {
    expect(searchPeople(people, query).map((person) => person.id)).toContain(expectedId);
  });

  it("normalizes case, whitespace, and accents", () => {
    expect(normalizeSearchText("  Élise   Warren ")).toBe("elise warren");
  });

  it("ranks name prefixes, other name matches, and field matches without mutating input", () => {
    const originalIds = people.map((person) => person.id);

    expect(searchPeople(people, "maya").map((person) => person.id)).toEqual([
      "maya-patel",
      "maya-rivera",
      "amaya-chen",
    ]);
    expect(people.map((person) => person.id)).toEqual(originalIds);
  });

  it("shows the self record first for an empty query", () => {
    expect(searchPeople(people, "").map((person) => person.id)).toEqual([
      "self",
      "amaya-chen",
      "maya-patel",
      "maya-rivera",
    ]);
  });
});
