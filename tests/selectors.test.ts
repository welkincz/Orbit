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
      makePerson({ id: "today", effectiveLastContact: "2026-08-27" }),
      makePerson({ id: "day-30", effectiveLastContact: "2026-07-28" }),
      makePerson({ id: "day-31", effectiveLastContact: "2026-07-27" }),
      makePerson({ id: "future", effectiveLastContact: "2026-08-28" }),
    ], "2026-08-27"))).toEqual(["today", "day-30"]);
  });

  it("includes a never-contacted person with a cadence, marked as never contacted", () => {
    const target = makePerson({
      id: "target",
      target: true,
      effectiveLastContact: undefined,
      desiredCadenceDays: 30,
    });

    expect(getReconnectCandidates([target], "2026-08-27"))
      .toEqual([{ person: target, overdueDays: null }]);
  });

  it("still excludes a never-contacted person without a cadence", () => {
    const drifting = makePerson({
      id: "drifting",
      effectiveLastContact: undefined,
      desiredCadenceDays: undefined,
    });

    expect(getReconnectCandidates([drifting], "2026-08-27")).toEqual([]);
  });

  it("lists never-contacted people before overdue ones, ranked by strategic relevance", () => {
    const people = [
      makePerson({ id: "overdue", name: "Overdue", effectiveLastContact: "2026-01-01", desiredCadenceDays: 30 }),
      makePerson({ id: "never-low", name: "Never Low", strategicRelevance: "low", desiredCadenceDays: 30, effectiveLastContact: undefined }),
      makePerson({ id: "never-high", name: "Never High", strategicRelevance: "high", desiredCadenceDays: 30, effectiveLastContact: undefined }),
    ];

    expect(ids(getReconnectCandidates(people, "2026-08-27").map(({ person }) => person)))
      .toEqual(["never-high", "never-low", "overdue"]);
  });

  it("sorts inner-circle contacts by strength, then last contact, then name", () => {
    const people = [
      makePerson({ id: "bruno", name: "Bruno", innerCircle: true, relationshipStrength: 4, effectiveLastContact: "2026-08-26" }),
      makePerson({ id: "amy", name: "Amy", innerCircle: true, relationshipStrength: 5, effectiveLastContact: "2026-08-01" }),
      makePerson({ id: "dana", name: "Dana", innerCircle: true, relationshipStrength: 4, effectiveLastContact: "2026-08-20" }),
      makePerson({ id: "cora", name: "Cora", innerCircle: true, relationshipStrength: 4, effectiveLastContact: "2026-08-20" }),
      makePerson({ id: "self", name: "Self", type: "self", innerCircle: true, relationshipStrength: undefined, strategicRelevance: undefined }),
    ];

    expect(ids(getInnerCircle(people))).toEqual(["amy", "bruno", "cora", "dana"]);
  });

  it("sorts recent contacts by newest contact date, then name", () => {
    const people = [
      makePerson({ id: "old", name: "Old", effectiveLastContact: "2026-08-01" }),
      makePerson({ id: "zane", name: "Zane", effectiveLastContact: "2026-08-26" }),
      makePerson({ id: "amy", name: "Amy", effectiveLastContact: "2026-08-26" }),
      makePerson({ id: "middle", name: "Middle", effectiveLastContact: "2026-08-20" }),
      makePerson({ id: "self", name: "Self", type: "self", effectiveLastContact: "2026-08-27", relationshipStrength: undefined, strategicRelevance: undefined }),
    ];

    expect(ids(getRecentContacts(people, "2026-08-27"))).toEqual(["amy", "zane", "middle", "old"]);
  });

  it("excludes reconnect candidates at cadence equality and with invalid cadences", () => {
    const people = [
      makePerson({ id: "at-cadence", effectiveLastContact: "2026-08-17", desiredCadenceDays: 10 }),
      makePerson({ id: "zero-cadence", effectiveLastContact: "2026-08-01", desiredCadenceDays: 0 }),
      makePerson({ id: "negative-cadence", effectiveLastContact: "2026-08-01", desiredCadenceDays: -5 }),
      makePerson({ id: "positive-cadence", effectiveLastContact: "2026-08-17", desiredCadenceDays: 9 }),
    ];

    expect(ids(getReconnectCandidates(people, "2026-08-27").map(({ person }) => person))).toEqual([
      "positive-cadence",
    ]);
  });

  it("sorts reconnect candidates by overdue days, then strength, then name", () => {
    const people = [
      makePerson({ id: "less-overdue", effectiveLastContact: "2026-08-10", desiredCadenceDays: 10 }),
      makePerson({ id: "most-overdue", effectiveLastContact: "2026-08-01", desiredCadenceDays: 5 }),
      makePerson({ id: "zane", name: "Zane", effectiveLastContact: "2026-08-12", desiredCadenceDays: 5, relationshipStrength: 4 }),
      makePerson({ id: "amy", name: "Amy", effectiveLastContact: "2026-08-12", desiredCadenceDays: 5, relationshipStrength: 4 }),
      makePerson({ id: "less-strong", name: "Bea", effectiveLastContact: "2026-08-12", desiredCadenceDays: 5, relationshipStrength: 2 }),
      makePerson({ id: "not-overdue", effectiveLastContact: "2026-08-25", desiredCadenceDays: 2 }),
    ];

    expect(ids(getReconnectCandidates(people, "2026-08-27").map(({ person }) => person))).toEqual([
      "most-overdue",
      "amy",
      "zane",
      "less-strong",
      "less-overdue",
    ]);
  });

  it("sorts targets by relevance, then relationship strength, then name", () => {
    const people = [
      makePerson({ id: "medium-strong", target: true, strategicRelevance: "medium", relationshipStrength: 5 }),
      makePerson({ id: "high-less-strong", target: true, strategicRelevance: "high", relationshipStrength: 2 }),
      makePerson({ id: "high-zane", name: "Zane", target: true, strategicRelevance: "high", relationshipStrength: 4 }),
      makePerson({ id: "high-amy", name: "Amy", target: true, strategicRelevance: "high", relationshipStrength: 4 }),
      makePerson({ id: "low", target: true, strategicRelevance: "low", relationshipStrength: 5 }),
      makePerson({ id: "self", type: "self", target: true, relationshipStrength: undefined, strategicRelevance: undefined }),
    ];

    expect(ids(getTargets(people))).toEqual(["high-amy", "high-zane", "high-less-strong", "medium-strong", "low"]);
  });
});
