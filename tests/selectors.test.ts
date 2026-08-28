import { describe, expect, it } from "vitest";
import {
  getInnerCircle,
  getRecentContacts,
  getReconnectCandidates,
  getTargets,
} from "@/lib/selectors";
import { makePerson } from "./fixtures/people";

const ids = (people: { id: string }[]) => people.map((person) => person.id);

describe("relationship selectors", () => {
  it("keeps derived views overlapping", () => {
    const jane = makePerson({
      id: "jane",
      innerCircle: true,
      target: true,
      relationshipStrength: 4,
      strategicRelevance: "high",
      effectiveLastContact: "2026-08-18",
      desiredCadenceDays: 5,
    });

    expect(getInnerCircle([jane])).toContain(jane);
    expect(getRecentContacts([jane], "2026-08-27")).toContain(jane);
    expect(getReconnectCandidates([jane], "2026-08-27")[0]).toMatchObject({ person: jane, overdueDays: 4 });
    expect(getTargets([jane])).toContain(jane);
  });

  it("uses an inclusive 30-day recent boundary", () => {
    expect(ids(getRecentContacts([
      makePerson({ id: "day-30", effectiveLastContact: "2026-07-28" }),
      makePerson({ id: "day-31", effectiveLastContact: "2026-07-27" }),
    ], "2026-08-27"))).toEqual(["day-30"]);
  });

  it("excludes a never-met target from reconnect", () => {
    const target = makePerson({
      id: "target",
      target: true,
      effectiveLastContact: undefined,
      desiredCadenceDays: 30,
    });

    expect(getReconnectCandidates([target], "2026-08-27")).toEqual([]);
  });

  it("sorts inner-circle contacts by strength, then last contact, then name", () => {
    const people = [
      makePerson({ id: "bruno", name: "Bruno", innerCircle: true, relationshipStrength: 4, effectiveLastContact: "2026-08-26" }),
      makePerson({ id: "amy", name: "Amy", innerCircle: true, relationshipStrength: 5, effectiveLastContact: "2026-08-01" }),
      makePerson({ id: "cora", name: "Cora", innerCircle: true, relationshipStrength: 4, effectiveLastContact: "2026-08-20" }),
      makePerson({ id: "self", name: "Self", type: "self", innerCircle: true, relationshipStrength: undefined, strategicRelevance: undefined }),
    ];

    expect(ids(getInnerCircle(people))).toEqual(["amy", "bruno", "cora"]);
  });

  it("sorts recent contacts by newest contact date", () => {
    const people = [
      makePerson({ id: "old", name: "Old", effectiveLastContact: "2026-08-01" }),
      makePerson({ id: "new", name: "New", effectiveLastContact: "2026-08-26" }),
      makePerson({ id: "middle", name: "Middle", effectiveLastContact: "2026-08-20" }),
      makePerson({ id: "self", name: "Self", type: "self", effectiveLastContact: "2026-08-27", relationshipStrength: undefined, strategicRelevance: undefined }),
    ];

    expect(ids(getRecentContacts(people, "2026-08-27"))).toEqual(["new", "middle", "old"]);
  });

  it("sorts reconnect candidates by overdue days", () => {
    const people = [
      makePerson({ id: "less-overdue", effectiveLastContact: "2026-08-10", desiredCadenceDays: 10 }),
      makePerson({ id: "most-overdue", effectiveLastContact: "2026-08-01", desiredCadenceDays: 5 }),
      makePerson({ id: "not-overdue", effectiveLastContact: "2026-08-25", desiredCadenceDays: 2 }),
    ];

    expect(ids(getReconnectCandidates(people, "2026-08-27").map(({ person }) => person))).toEqual([
      "most-overdue",
      "less-overdue",
    ]);
  });

  it("sorts targets by relevance before relationship strength", () => {
    const people = [
      makePerson({ id: "medium-strong", target: true, strategicRelevance: "medium", relationshipStrength: 5 }),
      makePerson({ id: "high-less-strong", target: true, strategicRelevance: "high", relationshipStrength: 2 }),
      makePerson({ id: "high-strong", target: true, strategicRelevance: "high", relationshipStrength: 4 }),
      makePerson({ id: "low", target: true, strategicRelevance: "low", relationshipStrength: 5 }),
      makePerson({ id: "self", type: "self", target: true, relationshipStrength: undefined, strategicRelevance: undefined }),
    ];

    expect(ids(getTargets(people))).toEqual(["high-strong", "high-less-strong", "medium-strong", "low"]);
  });
});
