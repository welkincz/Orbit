import { z } from "zod";
import { isISODate } from "@/lib/dates";
import type {
  ISODate,
  NormalizedFrontmatter,
  PeopleDataset,
  Person,
  RelationshipStrength,
} from "@/types/person";

const isoDateSchema = z.preprocess(
  (value) => value instanceof Date ? value.toISOString().slice(0, 10) : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must use YYYY-MM-DD").optional(),
);

const frontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase slug"),
  name: z.string().trim().min(1),
  type: z.enum(["self", "person"]).default("person"),
  company: z.string().trim().min(1).optional(),
  team: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).optional(),
  relationship_strength: z.number().int().min(1).max(5).optional(),
  relationship_type: z.string().trim().min(1).optional(),
  strategic_relevance: z.enum(["low", "medium", "high"]).optional(),
  last_contact: isoDateSchema,
  desired_cadence_days: z.number().int().positive().optional(),
  inner_circle: z.boolean().default(false),
  target: z.boolean().default(false),
  introduced_by: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
}).superRefine((value, context) => {
  if (value.last_contact !== undefined && !isISODate(value.last_contact)) {
    context.addIssue({ code: "custom", path: ["last_contact"], message: "must be a real calendar date" });
  }
  if (value.type === "person" && value.relationship_strength === undefined) {
    context.addIssue({ code: "custom", path: ["relationship_strength"], message: "is required for a person" });
  }
  if (value.type === "person" && value.strategic_relevance === undefined) {
    context.addIssue({ code: "custom", path: ["strategic_relevance"], message: "is required for a person" });
  }
});

export class PeopleDataError extends Error {
  readonly sourceRelativePath?: string;
  readonly issues: string[];

  constructor(
    message: string,
    options: { sourceRelativePath?: string; issues: string[] },
  ) {
    super(`${message}: ${options.issues.join("; ")}`);
    this.name = "PeopleDataError";
    this.sourceRelativePath = options.sourceRelativePath;
    this.issues = options.issues;
  }
}

export function toPeopleDataError(error: unknown): PeopleDataError {
  if (error instanceof PeopleDataError) return error;
  return new PeopleDataError("Unable to read people data", {
    issues: ["Check that data/people exists and contains readable Markdown files."],
  });
}

export function normalizeFrontmatter(input: unknown, sourceRelativePath: string): NormalizedFrontmatter {
  try {
    const value = frontmatterSchema.parse(input);
    return {
      id: value.id,
      name: value.name,
      type: value.type,
      company: value.company,
      team: value.team,
      role: value.role,
      relationshipStrength: value.relationship_strength as RelationshipStrength | undefined,
      relationshipType: value.relationship_type,
      strategicRelevance: value.strategic_relevance,
      lastContact: value.last_contact as ISODate | undefined,
      desiredCadenceDays: value.desired_cadence_days,
      innerCircle: value.inner_circle,
      target: value.target,
      introducedBy: value.introduced_by,
      tags: [...value.tags],
    };
  } catch (error) {
    const issues = error instanceof z.ZodError
      ? error.issues.map((issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`)
      : ["frontmatter could not be parsed"];
    throw new PeopleDataError("Invalid person frontmatter", { sourceRelativePath, issues });
  }
}

export function validatePeopleCollection(people: Person[], currentDate: ISODate): PeopleDataset {
  const issues: string[] = [];
  const counts = new Map<string, number>();
  for (const person of people) counts.set(person.id, (counts.get(person.id) ?? 0) + 1);
  for (const [id, count] of counts) if (count > 1) issues.push(`duplicate id: ${id}`);

  const selfRecords = people.filter((person) => person.type === "self");
  if (selfRecords.length !== 1) issues.push(`expected exactly one type: self record; found ${selfRecords.length}`);

  const ids = new Set(people.map((person) => person.id));
  for (const person of people) {
    if (person.introducedBy && !ids.has(person.introducedBy)) {
      issues.push(`${person.id}: introduced_by references missing person ${person.introducedBy}`);
    }
    if (person.introducedBy === person.id) issues.push(`${person.id}: introduced_by cannot reference itself`);
    if (person.effectiveLastContact && person.effectiveLastContact > currentDate) {
      issues.push(`${person.id}: last contact cannot be in the future`);
    }
  }

  if (issues.length > 0) throw new PeopleDataError("Invalid people data", { issues });
  const diagnostics = people.flatMap((person) => person.diagnostics);
  if (people.filter((person) => person.innerCircle).length > 10) {
    diagnostics.push({ level: "warning", code: "inner-circle-size", message: "Inner Circle contains more than 10 people" });
  }
  return { people, selfId: selfRecords[0].id, diagnostics, loadedAt: new Date().toISOString() };
}
