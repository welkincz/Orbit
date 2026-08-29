import type { Person } from "@/types/person";

export function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "alex",
    name: "Alex",
    type: "person",
    relationshipStrength: 3,
    strategicRelevance: "medium",
    innerCircle: false,
    target: false,
    tags: [],
    interactions: [],
    sections: { whyTheyMatter: "", context: "", followUp: "" },
    conversationPrep: {
      theirWorld: "",
      whatTheyCareAbout: "",
      remember: "",
      nextConversation: "",
    },
    diagnostics: [],
    sourcePath: "/data/people/alex.md",
    sourceRelativePath: "alex.md",
    ...overrides,
  };
}
