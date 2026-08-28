import { describe, expect, it } from "vitest";
import {
  buildGraphModel,
  getConnectedIds,
  type GraphLink,
  type GraphNode,
} from "@/lib/graph-model";
import { validatePeopleCollection } from "@/lib/people";
import { makePerson } from "./fixtures/people";

function self(id = "self") {
  return makePerson({
    id,
    name: "Charlie",
    type: "self",
    relationshipStrength: undefined,
    strategicRelevance: undefined,
  });
}

const datasetWithIntroductions = validatePeopleCollection([
  makePerson({
    id: "theo",
    name: "Theo Morgan",
    relationshipStrength: 1,
    strategicRelevance: "low",
    introducedBy: "maya",
  }),
  self(),
  makePerson({
    id: "maya",
    name: "Maya Patel",
    relationshipStrength: 4,
    strategicRelevance: "high",
    role: "Director",
    team: "Platform",
  }),
], "2026-08-27");

function node(id: string): GraphNode {
  return {
    id,
    personId: id,
    name: id,
    isSelf: id === "self",
    strength: 5,
  };
}

function link(overrides: Partial<GraphLink> & Pick<GraphLink, "source" | "target">): GraphLink {
  const source = typeof overrides.source === "string" ? overrides.source : overrides.source.id;
  const target = typeof overrides.target === "string" ? overrides.target : overrides.target.id;
  return {
    id: `${source}:${target}`,
    kind: "direct",
    directed: false,
    ...overrides,
  };
}

describe("graph model", () => {
  it("keeps graph nodes detached from mutable domain records", () => {
    const model = buildGraphModel(datasetWithIntroductions);

    expect(model.nodes[0]).toEqual(expect.objectContaining({
      id: expect.any(String),
      personId: expect.any(String),
    }));
    expect(model.nodes[0]).not.toBe(datasetWithIntroductions.people[0]);
    expect(model.nodes.map(({ id }) => id)).toEqual(["self", "maya", "theo"]);
  });

  it("marks self distinctly and maps contact strength without conflating relevance", () => {
    const model = buildGraphModel(datasetWithIntroductions);
    const selfNode = model.nodes.find(({ id }) => id === "self");
    const maya = model.nodes.find(({ id }) => id === "maya");
    const theo = model.nodes.find(({ id }) => id === "theo");

    expect(selfNode).toEqual(expect.objectContaining({ isSelf: true }));
    expect(maya).toEqual(expect.objectContaining({
      isSelf: false,
      strength: 8,
      strategicRelevance: "high",
    }));
    expect(theo).toEqual(expect.objectContaining({
      isSelf: false,
      strength: 5,
      strategicRelevance: "low",
    }));
    expect(maya?.strength).toBeGreaterThanOrEqual(5);
    expect(maya?.strength).toBeLessThanOrEqual(9);
  });

  it("keeps relationship semantics on fresh graph links", () => {
    const model = buildGraphModel(datasetWithIntroductions);

    expect(model.links).toContainEqual(expect.objectContaining({
      id: "direct:self:maya",
      kind: "direct",
      directed: false,
      strength: 4,
    }));
    expect(model.links).toContainEqual(expect.objectContaining({
      id: "introduced_by:maya:theo",
      kind: "introduced_by",
      directed: true,
    }));
  });

  it("finds both ends of every selected direct connection", () => {
    const links = [
      link({ source: "self", target: "maya" }),
      link({ source: "maya", target: "theo", kind: "introduced_by", directed: true }),
      link({ source: "self", target: "owen" }),
    ];

    expect(getConnectedIds(links, "maya")).toEqual(new Set(["self", "maya", "theo"]));
  });

  it("resolves force-graph links after their endpoints become node objects", () => {
    const links = [
      link({ source: node("self"), target: node("maya") }),
      link({ source: node("maya"), target: node("theo"), kind: "introduced_by", directed: true }),
    ];

    expect(getConnectedIds(links, "maya")).toEqual(new Set(["self", "maya", "theo"]));
    expect(getConnectedIds(links, "absent")).toEqual(new Set(["absent"]));
  });
});
