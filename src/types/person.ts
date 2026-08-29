export type ISODate = `${number}-${number}-${number}`;
export type RelationshipStrength = 1 | 2 | 3 | 4 | 5;
export type StrategicRelevance = "low" | "medium" | "high";
export type PersonType = "self" | "person";

export interface Interaction {
  date: ISODate;
  kind: string;
  markdown: string;
}

export interface PersonSections {
  whyTheyMatter: string;
  context: string;
  followUp: string;
}

export interface ConversationPrep {
  theirWorld: string;
  whatTheyCareAbout: string;
  remember: string;
  nextConversation: string;
}

export interface PeopleDiagnostic {
  level: "warning";
  code: "inner-circle-size" | "last-contact-mismatch";
  message: string;
  sourceRelativePath?: string;
}

export interface Person {
  id: string;
  name: string;
  type: PersonType;
  company?: string;
  team?: string;
  role?: string;
  relationshipStrength?: RelationshipStrength;
  relationshipType?: string;
  strategicRelevance?: StrategicRelevance;
  lastContact?: ISODate;
  effectiveLastContact?: ISODate;
  desiredCadenceDays?: number;
  innerCircle: boolean;
  target: boolean;
  introducedBy?: string;
  tags: string[];
  interactions: Interaction[];
  sections: PersonSections;
  conversationPrep: ConversationPrep;
  diagnostics: PeopleDiagnostic[];
  sourcePath: string;
  sourceRelativePath: string;
}

export interface NormalizedFrontmatter {
  id: string;
  name: string;
  type: PersonType;
  company?: string;
  team?: string;
  role?: string;
  relationshipStrength?: RelationshipStrength;
  relationshipType?: string;
  strategicRelevance?: StrategicRelevance;
  lastContact?: ISODate;
  desiredCadenceDays?: number;
  innerCircle: boolean;
  target: boolean;
  introducedBy?: string;
  tags: string[];
}

export interface PeopleDataset {
  people: Person[];
  selfId: string;
  diagnostics: PeopleDiagnostic[];
  loadedAt: string;
}
