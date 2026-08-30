import { describe, expect, it } from "vitest";
import {
  buildGraphModel,
  getConnectedIds,
  getGraphLinkMetrics,
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
    visualRole: id === "self" ? "self-anchor" : "planet",
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
    motion: "none",
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
    for (const graphNode of model.nodes) {
      expect(graphNode).not.toBe(datasetWithIntroductions.people.find(({ id }) => id === graphNode.personId));
    }
    expect(model.nodes.map(({ id }) => id)).toEqual(["self", "maya", "theo"]);

    const mayaRecord = datasetWithIntroductions.people.find(({ id }) => id === "maya");
    const mayaNode = model.nodes.find(({ id }) => id === "maya");
    if (!mayaRecord || !mayaNode) throw new Error("fixture is missing Maya");
    mayaNode.name = "Changed only in graph";
    expect(mayaRecord.name).toBe("Maya Patel");

    const secondModel = buildGraphModel(datasetWithIntroductions);
    expect(secondModel.links[0]).not.toBe(model.links[0]);
  });

  it("marks self distinctly and maps contact strength without conflating relevance", () => {
    const model = buildGraphModel(datasetWithIntroductions);
    const selfNode = model.nodes.find(({ id }) => id === "self");
    const maya = model.nodes.find(({ id }) => id === "maya");
    const theo = model.nodes.find(({ id }) => id === "theo");

    expect(selfNode).toEqual(expect.objectContaining({
      isSelf: true,
      visualRole: "self-anchor",
    }));
    expect(maya).toEqual(expect.objectContaining({
      isSelf: false,
      strength: 8,
      strategicRelevance: "high",
      visualRole: "planet",
    }));
    expect(theo).toEqual(expect.objectContaining({
      isSelf: false,
      strength: 5,
      strategicRelevance: "low",
    }));
    expect(maya?.strength).toBeGreaterThanOrEqual(5);
    expect(maya?.strength).toBeLessThanOrEqual(9);
  });

  it("keeps the data relationship strength separate from the rendered node size", () => {
    const model = buildGraphModel(datasetWithIntroductions);
    const selfNode = model.nodes.find(({ id }) => id === "self");
    const maya = model.nodes.find(({ id }) => id === "maya");
    const theo = model.nodes.find(({ id }) => id === "theo");

    // strength is a radius input; relationshipStrength is the 1-5 record value.
    expect(maya?.relationshipStrength).toBe(4);
    expect(theo?.relationshipStrength).toBe(1);
    expect(selfNode?.relationshipStrength).toBeUndefined();
  });

  it("keeps relationship semantics on fresh graph links", () => {
    const model = buildGraphModel(datasetWithIntroductions);

    expect(model.links).toContainEqual(expect.objectContaining({
      id: "direct:self:maya",
      kind: "direct",
      directed: false,
      motion: "none",
      strength: 4,
    }));
    expect(model.links).toContainEqual(expect.objectContaining({
      id: "introduced_by:maya:theo",
      kind: "introduced_by",
      directed: true,
      motion: "selection-direction",
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

  it("derives every link metric from strength with a neutral missing-strength fallback", () => {
    const introduced = link({ source: "maya", target: "theo", kind: "introduced_by", directed: true });
    const neutralDirect = link({ source: "self", target: "maya", strength: 3 });

    expect(getGraphLinkMetrics(introduced)).toEqual(getGraphLinkMetrics(neutralDirect));
    expect(getGraphLinkMetrics(neutralDirect)).toEqual({
      distance: 96,
      forceStrength: 0.46,
      width: 1.37,
    });
  });

  it("does not let link kind change distance, force weight, or rendered width", () => {
    const direct = link({ source: "self", target: "maya", strength: 5 });
    const introduced = link({
      source: "self",
      target: "maya",
      kind: "introduced_by",
      directed: true,
      strength: 5,
    });

    expect(getGraphLinkMetrics(introduced)).toEqual(getGraphLinkMetrics(direct));
    expect(getGraphLinkMetrics(direct)).toEqual({
      distance: 72,
      forceStrength: 0.62,
      width: 1.85,
    });
  });
});
