import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPeopleFromDirectory } from "@/lib/markdown";
import { getRelationships } from "@/lib/relationships";
import {
  getInnerCircle,
  getRecentContacts,
  getReconnectCandidates,
  getTargets,
} from "@/lib/selectors";
import type { PeopleDataset } from "@/types/person";

const AS_OF = "2026-08-27" as const;
const expectedContacts = [
  { id: "maya-patel", name: "Maya Patel", company: "Northstar Analytics", team: "Platform Engineering", role: "Director", relationshipStrength: 5, strategicRelevance: "high", lastContact: "2026-08-18", desiredCadenceDays: 60, innerCircle: true, target: false, introducedBy: undefined },
  { id: "owen-mercer", name: "Owen Mercer", company: "Cedarline Systems", team: "Data Infrastructure", role: "Staff Engineer", relationshipStrength: 4, strategicRelevance: "medium", lastContact: "2026-08-08", desiredCadenceDays: 45, innerCircle: true, target: false, introducedBy: undefined },
  { id: "lena-ortiz", name: "Lena Ortiz", company: "Harbourlight Labs", team: "Product Strategy", role: "Product Lead", relationshipStrength: 4, strategicRelevance: "low", lastContact: "2026-07-30", desiredCadenceDays: 90, innerCircle: true, target: false, introducedBy: undefined },
  { id: "theo-brooks", name: "Theo Brooks", company: "Meridian Works", team: "Engineering Enablement", role: "Manager", relationshipStrength: 3, strategicRelevance: "high", lastContact: "2026-03-01", desiredCadenceDays: 60, innerCircle: false, target: false, introducedBy: "maya-patel" },
  { id: "nia-okafor", name: "Nia Okafor", company: "Granary Cloud", team: "Architecture", role: "Senior Architect", relationshipStrength: 3, strategicRelevance: "high", lastContact: "2026-01-15", desiredCadenceDays: 90, innerCircle: false, target: false, introducedBy: "owen-mercer" },
  { id: "jasper-kim", name: "Jasper Kim", company: "Atlas Orchard", team: "Data Governance", role: "Governance Lead", relationshipStrength: 2, strategicRelevance: "medium", lastContact: "2026-06-01", desiredCadenceDays: 60, innerCircle: false, target: false, introducedBy: "maya-patel" },
  { id: "priya-desai", name: "Priya Desai", company: "Horizon Foundry", team: "Data Platforms", role: "Vice President", relationshipStrength: 1, strategicRelevance: "high", lastContact: undefined, desiredCadenceDays: 30, innerCircle: false, target: true, introducedBy: undefined },
  { id: "marcus-vale", name: "Marcus Vale", company: "Bluepeak Cooperative", team: "AI Infrastructure", role: "Director", relationshipStrength: 2, strategicRelevance: "high", lastContact: "2026-08-21", desiredCadenceDays: 30, innerCircle: false, target: true, introducedBy: "theo-brooks" },
  { id: "elise-warren", name: "Elise Warren", company: "Lantern Ridge", team: "Research Engineering", role: "Lead", relationshipStrength: 3, strategicRelevance: "medium", lastContact: "2026-08-14", desiredCadenceDays: 60, innerCircle: false, target: false, introducedBy: "lena-ortiz" },
  { id: "samir-rahman", name: "Samir Rahman", company: "Riverglass Capital", team: "Quant Engineering", role: "Manager", relationshipStrength: 2, strategicRelevance: "high", lastContact: "2026-05-10", desiredCadenceDays: 90, innerCircle: false, target: false, introducedBy: "nia-okafor" },
  { id: "imani-cole", name: "Imani Cole", company: "Alder & Finch", team: "Decision Science", role: "Principal Analyst", relationshipStrength: 2, strategicRelevance: "low", lastContact: "2026-07-04", desiredCadenceDays: 120, innerCircle: false, target: false, introducedBy: "owen-mercer" },
] as const;

let dataset: PeopleDataset;

beforeAll(async () => {
  dataset = await loadPeopleFromDirectory(resolve(process.cwd(), "data/people"), AS_OF);
});

describe("professional relationship seed data", () => {
  it("loads the intended local-first relationship graph", () => {
    const contacts = dataset.people.filter((person) => person.type === "person");
    const relationships = getRelationships(dataset);

    expect(dataset.people).toHaveLength(12);
    expect(contacts).toHaveLength(11);
    expect(getInnerCircle(dataset.people)).toHaveLength(3);
    expect(getReconnectCandidates(dataset.people, AS_OF).length).toBeGreaterThanOrEqual(2);
    expect(getTargets(dataset.people)).toHaveLength(2);
    expect(getRecentContacts(dataset.people, AS_OF).length).toBeGreaterThanOrEqual(3);
    expect(new Set(contacts.map((person) => person.relationshipStrength))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(relationships.filter((edge) => edge.kind === "direct")).toHaveLength(11);
    expect(relationships.filter((edge) => edge.kind === "introduced_by")).toHaveLength(7);
  });

  it.each(expectedContacts)("matches the exact seed matrix for $id", (expected) => {
    const person = dataset.people.find((candidate) => candidate.id === expected.id);

    expect(person).toMatchObject({ type: "person", ...expected });
    expect(person?.sourceRelativePath).toBe(`data/people/${expected.id}.md`);
    expect(person?.tags.length).toBeGreaterThanOrEqual(2);
    expect(person?.tags.length).toBeLessThanOrEqual(4);
  });

  it.each(expectedContacts.filter(({ id }) => id !== "priya-desai"))(
    "keeps $id interactions at or before its canonical last-contact date and the acceptance date",
    (expected) => {
      const person = dataset.people.find((candidate) => candidate.id === expected.id)!;

      expect(person.interactions.length).toBeGreaterThanOrEqual(1);
      expect(person.interactions.length).toBeLessThanOrEqual(3);
      for (const interaction of person.interactions) {
        expect(interaction.date <= expected.lastContact!).toBe(true);
        expect(interaction.date <= AS_OF).toBe(true);
      }
    },
  );

  it("keeps Priya never-met with zero interactions and a dedicated follow-up", () => {
    const priya = dataset.people.find((person) => person.id === "priya-desai")!;

    expect(priya.interactions).toEqual([]);
    expect(priya.effectiveLastContact).toBeUndefined();
    expect(priya.sections.context).toBe("Priya is an intentional future connection; we have not met, so there are no interactions recorded yet.");
    expect(priya.sections.followUp).toBe("- Find an appropriate warm introduction");
    expect(priya.sections.context).not.toContain("Find an appropriate warm introduction");
  });

  it("preserves Maya's exact narrative and canonical latest interaction body", () => {
    const maya = dataset.people.find((person) => person.id === "maya-patel")!;

    expect(maya.sections.whyTheyMatter).toBe("Maya gives candid platform leadership advice.");
    expect(maya.interactions[0]).toEqual({
      date: "2026-08-18",
      kind: "Coffee chat",
      markdown: "Discussed:\n\n- Platform ownership\n- Hiring signals",
    });
  });
});
