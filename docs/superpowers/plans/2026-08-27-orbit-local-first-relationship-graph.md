# Orbit Local-First Relationship Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, polished local Next.js application that turns one validated Markdown file per professional contact into overlapping relationship views, an interactive network graph, person details, and keyboard search.

**Architecture:** A dynamically rendered Next.js server page reads and validates repository-local `data/people/*.md` files on every request, then serializes a framework-independent `PeopleDataset` to a client workspace. Pure TypeScript modules own Markdown parsing, calendar arithmetic, selectors, and relationship extraction; React owns only presentation and interaction state. The browser remains read-only and refreshes server data after VS Code edits.

**Tech Stack:** TypeScript, React, Next.js App Router, Tailwind CSS, Zod, gray-matter, unified/remark-parse, react-force-graph-2d, Radix Dialog, cmdk, react-markdown, Motion, Vitest, Testing Library, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-27-orbit-local-first-relationship-graph-design.md`

## Global Constraints

- Markdown files directly under `data/people/` are the only V1 database; one person equals one file.
- Exactly one record has `type: self`; application logic must not hardcode `charlie`.
- `relationship_strength` is an integer from 1 through 5; `strategic_relevance` is `low`, `medium`, or `high`; never combine them into one score.
- Recent means 0 through 30 calendar days before the injected current date, inclusive.
- Reconnect requires an effective last-contact date and `desired_cadence_days`; never-met people are excluded.
- Inner Circle, Recent, Reconnect, and Targets are overlapping derived views.
- V1 renders implicit self-to-contact edges and `introduced_by` edges only.
- The browser is read-only: no authentication, database, CRUD forms, cloud integration, scraping, mail/calendar integration, AI, reminders, or recommendation engine.
- Desktop widths from roughly 1280–1800 pixels receive priority; smaller widths must degrade reasonably.
- Motion classes are approximately 120 ms, 220 ms, and 380 ms, and `prefers-reduced-motion` must remove unnecessary spatial motion.
- Seed data contains one self record and approximately 11 fictional contacts, exactly three Inner Circle contacts, at least two reconnect candidates, and at least two targets.
- Do not add gradients, glassmorphism, decorative blobs, dashboard KPI cards, nested card grids, excessive radii, or perpetual graph physics.
- Completion requires two documented browser visual-QA passes plus passing test, lint, typecheck, build, and production-runtime checks.

## Locked file map

| Path | Responsibility |
| --- | --- |
| `package.json` | Commands and dependency manifest. |
| `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts` | Build, style, lint, and test configuration. |
| `src/types/person.ts` | Serializable domain interfaces shared across server and client. |
| `src/lib/dates.ts` | ISO calendar-date parsing and deterministic day arithmetic. |
| `src/lib/people.ts` | Zod schemas, collection validation, diagnostics, and self detection. |
| `src/lib/markdown.ts` | Known-section AST extraction, Markdown-file parsing, and fixed-directory loading. |
| `src/lib/selectors.ts` | Pure derived views and their ordering. |
| `src/lib/relationships.ts` | Normalized graph edge extraction and reference validation. |
| `src/lib/search.ts` | Normalized multi-field person search. |
| `src/lib/graph-model.ts` | Framework-free graph nodes, links, and selected-neighborhood helpers. |
| `src/lib/local-files.ts` | Safe VS Code file-URI construction for validated absolute paths. |
| `src/app/page.tsx` | Dynamic server data boundary and data-error routing. |
| `src/components/network/NetworkWorkspace.tsx` | Selected-person state and cross-surface orchestration. |
| `src/components/network/NetworkGraph.tsx`, `ForceGraphCanvas.tsx` | SSR-safe boundary plus client-only force graph, canvas drawing, pointer tooltip, and viewport behavior. |
| `src/components/people/RelationshipSidebar.tsx` | Four overlapping derived lists. |
| `src/components/people/PersonDetail.tsx` | Progressive narrative, interactions, follow-ups, and local-file actions. |
| `src/components/search/SearchCommand.tsx` | Cmd/Ctrl+K dialog, filtering, and keyboard selection. |
| `src/components/errors/DataErrorView.tsx` | Compact actionable Markdown validation failures. |
| `src/components/ui/*` | Small locally owned primitives only where repetition or accessibility justifies them. |
| `data/people/*.md` | Self record and fictional contact corpus. |
| `tests/*` | Unit and focused component tests. |
| `docs/qa/reference-review.md` | Current UI-reference patterns adopted and rejected. |
| `docs/qa/visual-qa.md`, `docs/qa/screenshots/*` | Two-pass browser evidence, findings, fixes, and representative screenshots. |
| `README.md` | Product, schema, workflow, design, limitations, and V2 documentation. |

---

### Task 1: Project foundation and validated domain contract

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/types/person.ts`
- Create: `src/lib/people.ts`
- Test: `tests/people.test.ts`

**Interfaces:**
- Consumes: approved design spec only.
- Produces: `ISODate`, `RelationshipStrength`, `StrategicRelevance`, `Interaction`, `PersonSections`, `Person`, `NormalizedFrontmatter`, `PeopleDiagnostic`, `PeopleDataset`, `PeopleDataError`, `toPeopleDataError(error)`, `normalizeFrontmatter(input, sourceRelativePath)`, and `validatePeopleCollection(people, currentDate)`.

- [ ] **Step 1: Install and configure the local toolchain**

Run:

```bash
npm init -y
npm install --save-exact next@latest react@latest react-dom@latest gray-matter zod unified remark-parse mdast-util-to-string react-force-graph-2d cmdk @radix-ui/react-dialog react-markdown motion lucide-react clsx tailwind-merge
npm install --save-dev --save-exact typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss eslint eslint-config-next vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Set these scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Set `"private": true` in `package.json`. Use these configurations:

```ts
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

```js
// postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } };
```

```ts
// vitest.config.ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: true,
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
```

`tsconfig.json` uses `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`, the Next plugin, and `paths: { "@/*": ["./src/*"] }`; include `next-env.d.ts`, all TypeScript/TSX files, and `.next/types/**/*.ts`. `.gitignore` excludes `node_modules`, `.next`, `out`, coverage, logs, `.env*`, and `.DS_Store` while allowing `.env.example`. `globals.css` initially contains only `@import "tailwindcss";`. `layout.tsx` imports that CSS and exports metadata `{ title: "Orbit", description: "A local-first professional relationship graph" }`; the initial server page renders a semantic `<main><h1>Orbit</h1></main>` so `npm run build` validates the foundation.

- [ ] **Step 2: Define the serializable domain types**

Create `src/types/person.ts` with these public shapes:

```ts
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
```

- [ ] **Step 3: Write failing schema and collection tests**

In `tests/people.test.ts`, cover the exact boundary:

```ts
it("accepts a minimal self record", () => {
  expect(normalizeFrontmatter({ id: "me", name: "Me", type: "self" }, "me.md"))
    .toMatchObject({ id: "me", type: "self", innerCircle: false, target: false, tags: [] });
});

it("rejects a contact without strength and relevance", () => {
  expect(() => normalizeFrontmatter({ id: "alex", name: "Alex" }, "alex.md"))
    .toThrow(/relationship_strength.*strategic_relevance/i);
});

it("finds exactly one self without relying on its id", () => {
  const dataset = validatePeopleCollection([
    person({ id: "root-person", type: "self" }),
    person({ id: "alex", type: "person", relationshipStrength: 3, strategicRelevance: "high" }),
  ], "2026-08-27");
  expect(dataset.selfId).toBe("root-person");
});

it.each(["no self", "two self records", "duplicate ids"])("rejects %s", (scenario) => {
  expect(() => collectionForScenario(scenario)).toThrow();
});
```

Add local `person()` and `collectionForScenario()` test helpers with fully specified defaults rather than weakening production types.

- [ ] **Step 4: Run the focused test and confirm the red state**

Run: `npm test -- tests/people.test.ts`

Expected: FAIL because `normalizeFrontmatter` and `validatePeopleCollection` do not exist.

- [ ] **Step 5: Implement minimal Zod and cross-record validation**

In `src/lib/people.ts`, implement the complete boundary rather than leaving schema behavior to callers:

```ts
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
  if (value.type === "person" && value.relationship_strength === undefined) {
    context.addIssue({ code: "custom", path: ["relationship_strength"], message: "is required for a person" });
  }
  if (value.type === "person" && value.strategic_relevance === undefined) {
    context.addIssue({ code: "custom", path: ["strategic_relevance"], message: "is required for a person" });
  }
});

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
```

Define the error boundary exactly:

```ts
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
```

UI consumers never receive raw Zod stacks.

- [ ] **Step 6: Verify the domain contract and foundation**

Run:

```bash
npm test -- tests/people.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0 and the build contains `/`.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json next-env.d.ts next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts vitest.setup.ts src/app src/types src/lib/people.ts tests/people.test.ts
git commit -m "feat: establish Orbit domain foundation"
```

---

### Task 2: Calendar arithmetic and overlapping relationship selectors

**Files:**
- Create: `src/lib/dates.ts`
- Create: `src/lib/selectors.ts`
- Create: `tests/fixtures/people.ts`
- Test: `tests/dates.test.ts`
- Test: `tests/selectors.test.ts`

**Interfaces:**
- Consumes: `ISODate` and `Person` from Task 1.
- Produces: `isISODate(value)`, `todayISO(date)`, `calendarDaysBetween(from, to)`, `getInnerCircle(people)`, `getRecentContacts(people, currentDate)`, `getReconnectCandidates(people, currentDate)`, `getTargets(people)`, and `ReconnectCandidate`.

- [ ] **Step 1: Write failing calendar tests**

```ts
expect(calendarDaysBetween("2026-03-07", "2026-03-09")).toBe(2);
expect(calendarDaysBetween("2024-02-28", "2024-03-01")).toBe(2);
expect(todayISO(new Date(2026, 7, 27, 23, 59))).toBe("2026-08-27");
expect(() => calendarDaysBetween("2026-02-30", "2026-03-01")).toThrow(/calendar date/i);
```

- [ ] **Step 2: Run calendar tests to verify they fail**

Run: `npm test -- tests/dates.test.ts`

Expected: FAIL because `src/lib/dates.ts` does not exist.

- [ ] **Step 3: Implement UTC calendar-day arithmetic**

Use this boundary in `src/lib/dates.ts`:

```ts
const DAY_MS = 86_400_000;

function utcDay(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`${value} is not a valid calendar date`);
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) throw new Error(`${value} is not a valid calendar date`);
  return timestamp;
}

export function isISODate(value: string): value is ISODate {
  try { utcDay(value); return true; } catch { return false; }
}

export function calendarDaysBetween(from: ISODate, to: ISODate): number {
  return Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
}

export function todayISO(date = new Date()): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as ISODate;
}
```

- [ ] **Step 4: Write failing selector tests**

Use `makePerson()` from `tests/fixtures/people.ts` and assert:

```ts
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
  const target = makePerson({ id: "target", target: true, effectiveLastContact: undefined, desiredCadenceDays: 30 });
  expect(getReconnectCandidates([target], "2026-08-27")).toEqual([]);
});
```

Add ordering assertions: Inner Circle by strength, Recent by newest date, Reconnect by overdue days, and Targets by high/medium/low relevance then strength.

- [ ] **Step 5: Run selector tests to verify they fail**

Run: `npm test -- tests/selectors.test.ts`

Expected: FAIL because selector functions do not exist.

- [ ] **Step 6: Implement the four pure selectors**

Exclude `type: self` in every selector. Return new sorted arrays without mutating input. Define:

```ts
export interface ReconnectCandidate {
  person: Person;
  overdueDays: number;
}

const relevanceRank: Record<StrategicRelevance, number> = { high: 3, medium: 2, low: 1 };

export function getRecentContacts(people: Person[], currentDate: ISODate): Person[] {
  return people
    .filter((person) => person.type === "person" && person.effectiveLastContact)
    .filter((person) => {
      const days = calendarDaysBetween(person.effectiveLastContact!, currentDate);
      return days >= 0 && days <= 30;
    })
    .toSorted((a, b) => b.effectiveLastContact!.localeCompare(a.effectiveLastContact!) || a.name.localeCompare(b.name));
}

export function getReconnectCandidates(people: Person[], currentDate: ISODate): ReconnectCandidate[] {
  return people
    .filter((person) => person.type === "person" && person.effectiveLastContact && person.desiredCadenceDays)
    .map((person) => ({
      person,
      overdueDays: calendarDaysBetween(person.effectiveLastContact!, currentDate) - person.desiredCadenceDays!,
    }))
    .filter((candidate) => candidate.overdueDays > 0)
    .toSorted((a, b) => b.overdueDays - a.overdueDays || (b.person.relationshipStrength ?? 0) - (a.person.relationshipStrength ?? 0) || a.person.name.localeCompare(b.person.name));
}
```

Implement `getInnerCircle()` as contact + `innerCircle` filtering sorted by strength descending, effective last-contact descending, then name. Implement `getTargets()` as contact + `target` filtering sorted by `relevanceRank`, strength descending, then name. Use the same explicit comparators rather than calling one selector from another.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- tests/dates.test.ts tests/selectors.test.ts`

Expected: PASS.

```bash
git add src/lib/dates.ts src/lib/selectors.ts tests/dates.test.ts tests/selectors.test.ts tests/fixtures/people.ts
git commit -m "feat: derive relationship maintenance views"
```

---

### Task 3: Markdown AST parsing and fixed-directory loading

**Files:**
- Create: `src/lib/markdown.ts`
- Create: `tests/fixtures/markdown/maya-patel.md`
- Create: `tests/fixtures/markdown/invalid-contact.md`
- Test: `tests/markdown.test.ts`
- Modify: `src/lib/people.ts`

**Interfaces:**
- Consumes: `normalizeFrontmatter`, `validatePeopleCollection`, `todayISO`, `Person`, `Interaction`, and `ISODate`.
- Produces: `extractMarkdownSections(markdown)`, `parsePersonMarkdown(source, options)`, and `loadPeopleFromDirectory(directory, currentDate)`.

- [ ] **Step 1: Create exact parser fixtures**

The valid fixture must contain:

```markdown
---
id: maya-patel
name: Maya Patel
company: Northstar Analytics
team: Platform Engineering
role: Director
relationship_strength: 5
strategic_relevance: high
last_contact: 2026-08-18
desired_cadence_days: 60
inner_circle: true
target: false
tags:
  - data-platform
---

# Maya Patel

## Why they matter

Maya gives candid platform leadership advice.

## Context

Met through a cross-team architecture forum.

## Interactions

### 2026-08-18 — Coffee chat

Discussed:

- Platform ownership
- Hiring signals

### 2026-04-03 — Walk

Discussed operating models.

### Follow up

- Send the platform RFC article
```

The invalid fixture omits `relationship_strength` and uses `strategic_relevance: urgent`.

- [ ] **Step 2: Write failing AST-boundary and loader tests**

```ts
it("extracts interactions and keeps Follow up out of the latest interaction", () => {
  const person = parsePersonMarkdown(validSource, {
    absolutePath: "/repo/tests/fixtures/markdown/maya-patel.md",
    relativePath: "tests/fixtures/markdown/maya-patel.md",
    currentDate: "2026-08-27",
  });
  expect(person.interactions).toHaveLength(2);
  expect(person.interactions[0]).toMatchObject({ date: "2026-08-18", kind: "Coffee chat" });
  expect(person.interactions[0].markdown).not.toContain("Send the platform RFC article");
  expect(person.sections.followUp).toContain("Send the platform RFC article");
  expect(person.sections.whyTheyMatter).toContain("candid platform leadership advice");
});

it("uses frontmatter last_contact and warns when an interaction is newer", () => {
  const person = parsePersonMarkdown(sourceWithNewerInteraction, options);
  expect(person.effectiveLastContact).toBe("2026-08-18");
  expect(person.diagnostics).toContainEqual(expect.objectContaining({ code: "last-contact-mismatch" }));
});

it("derives effective last contact when frontmatter omits it", () => {
  expect(parsePersonMarkdown(sourceWithoutLastContact, options).effectiveLastContact).toBe("2026-08-18");
});
```

Also test that `loadPeopleFromDirectory()` sorts direct `.md` children, ignores nested/non-Markdown files, wraps the invalid fixture in `PeopleDataError`, and validates the collection after parsing.

- [ ] **Step 3: Run parser tests to verify they fail**

Run: `npm test -- tests/markdown.test.ts`

Expected: FAIL because parser exports do not exist.

- [ ] **Step 4: Implement AST extraction without regex-parsing whole Markdown**

Use `gray-matter` to separate frontmatter and `unified().use(remarkParse).parse(content)` to obtain the root. Use level-two headings to bound `Why they matter`, `Context`, and `Interactions`; use date-shaped level-three headings inside Interactions; treat case-insensitive `Follow up` and `Follow-up` as a reserved terminator. Slice source using node offsets so stored content remains original Markdown.

Use these exact primitives rather than a whole-document regular expression:

```ts
const INTERACTION_HEADING = /^(\d{4}-\d{2}-\d{2})\s+[—-]\s+(.+)$/;
const FOLLOW_UP_HEADING = /^follow[ -]?up$/i;

function isHeading(node: RootContent, depth: 2 | 3): node is Heading {
  return node.type === "heading" && node.depth === depth;
}

function originalMarkdown(source: string, nodes: RootContent[]): string {
  if (nodes.length === 0) return "";
  const start = nodes[0].position?.start.offset;
  const end = nodes.at(-1)?.position?.end.offset;
  if (start === undefined || end === undefined) {
    throw new PeopleDataError("Unable to read Markdown section", {
      issues: ["Markdown parser did not return source offsets."],
    });
  }
  return source.slice(start, end).trim();
}
```

For each level-two heading, its block is the following sibling nodes up to the next level-two heading. Within Interactions, a date-shaped level-three heading owns following siblings up to the next level-three/level-two heading. A reserved follow-up heading closes the current interaction and owns its following siblings up to the next heading of depth three or less. Validate every matched date with `isISODate`; non-date level-three headings end but do not create interactions. Sort extracted interactions by date descending, then retain source order for equal dates.

Return interactions newest-first. Derive `effectiveLastContact` as `frontmatter last_contact ?? newest interaction date`. Attach mismatch diagnostics to the person for collection aggregation.

- [ ] **Step 5: Implement safe directory loading**

```ts
export async function loadPeopleFromDirectory(
  directory: string,
  currentDate: ISODate,
): Promise<PeopleDataset> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const people = await Promise.all(entries.map(async (entry) => {
    const absolutePath = resolve(directory, entry.name);
    return parsePersonMarkdown(await readFile(absolutePath, "utf8"), {
      absolutePath,
      relativePath: relative(process.cwd(), absolutePath),
      currentDate,
    });
  }));
  return validatePeopleCollection(people, currentDate);
}
```

Reject an empty directory with one concise issue. Do not recurse and do not construct paths from frontmatter IDs.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- tests/markdown.test.ts tests/people.test.ts`

Expected: PASS.

```bash
git add src/lib/markdown.ts src/lib/people.ts tests/markdown.test.ts tests/fixtures/markdown
git commit -m "feat: parse professional contacts from Markdown"
```

---

### Task 4: Relationship extraction and realistic seed corpus

**Files:**
- Create: `src/lib/relationships.ts`
- Test: `tests/relationships.test.ts`
- Test: `tests/seed-data.test.ts`
- Create: `data/people/charlie.md`
- Create: `data/people/maya-patel.md`
- Create: `data/people/owen-mercer.md`
- Create: `data/people/lena-ortiz.md`
- Create: `data/people/theo-brooks.md`
- Create: `data/people/nia-okafor.md`
- Create: `data/people/jasper-kim.md`
- Create: `data/people/priya-desai.md`
- Create: `data/people/marcus-vale.md`
- Create: `data/people/elise-warren.md`
- Create: `data/people/samir-rahman.md`
- Create: `data/people/imani-cole.md`

**Interfaces:**
- Consumes: validated `PeopleDataset` and `Person`.
- Produces: `RelationshipEdge` and `getRelationships(dataset)`.

- [ ] **Step 1: Write failing relationship tests**

```ts
it("creates one direct self edge per contact without hardcoding self id", () => {
  const edges = getRelationships(dataset({ selfId: "root", people: [self("root"), contact("a"), contact("b")] }));
  expect(edges.filter((edge) => edge.kind === "direct")).toEqual([
    expect.objectContaining({ source: "root", target: "a", directed: false }),
    expect.objectContaining({ source: "root", target: "b", directed: false }),
  ]);
});

it("creates a directed introducer edge", () => {
  const edges = getRelationships(dataset({ people: [self("root"), contact("maya"), contact("theo", { introducedBy: "maya" })] }));
  expect(edges).toContainEqual(expect.objectContaining({ source: "maya", target: "theo", kind: "introduced_by", directed: true }));
});
```

Assert stable IDs (`direct:root:a`, `introduced_by:maya:theo`) and strength only on direct edges.

- [ ] **Step 2: Run relationship tests to verify they fail**

Run: `npm test -- tests/relationships.test.ts`

Expected: FAIL because `getRelationships` does not exist.

- [ ] **Step 3: Implement normalized edge extraction**

```ts
export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  kind: "direct" | "introduced_by";
  directed: boolean;
  strength?: number;
}

export function getRelationships(dataset: PeopleDataset): RelationshipEdge[] {
  const contacts = dataset.people
    .filter((person) => person.type === "person")
    .toSorted((a, b) => a.id.localeCompare(b.id));
  const direct = contacts.map((person): RelationshipEdge => ({
    id: `direct:${dataset.selfId}:${person.id}`,
    source: dataset.selfId,
    target: person.id,
    kind: "direct",
    directed: false,
    strength: person.relationshipStrength,
  }));
  const introduced = contacts
    .filter((person) => person.introducedBy)
    .map((person): RelationshipEdge => ({
      id: `introduced_by:${person.introducedBy!}:${person.id}`,
      source: person.introducedBy!,
      target: person.id,
      kind: "introduced_by",
      directed: true,
    }))
    .toSorted((a, b) => a.id.localeCompare(b.id));
  return [...direct, ...introduced];
}
```

Rely on collection validation for reference safety; do not add graph ontology.

- [ ] **Step 4: Create the exact seed-state matrix**

Every contact file includes `# Name`, `## Why they matter`, `## Context`, at least one realistic `## Interactions` entry when met, and a person-level `### Follow up` when action exists. Use this frontmatter matrix:

| File | Company · team · role | Strength | Relevance | Last contact | Cadence | Inner | Target | Introduced by |
| --- | --- | ---: | --- | --- | ---: | --- | --- | --- |
| `maya-patel.md` | Northstar Analytics · Platform Engineering · Director | 5 | high | 2026-08-18 | 60 | true | false | — |
| `owen-mercer.md` | Cedarline Systems · Data Infrastructure · Staff Engineer | 4 | medium | 2026-08-08 | 45 | true | false | — |
| `lena-ortiz.md` | Harbourlight Labs · Product Strategy · Product Lead | 4 | low | 2026-07-30 | 90 | true | false | — |
| `theo-brooks.md` | Meridian Works · Engineering Enablement · Manager | 3 | high | 2026-03-01 | 60 | false | false | maya-patel |
| `nia-okafor.md` | Granary Cloud · Architecture · Senior Architect | 3 | high | 2026-01-15 | 90 | false | false | owen-mercer |
| `jasper-kim.md` | Atlas Orchard · Data Governance · Governance Lead | 2 | medium | 2026-06-01 | 60 | false | false | maya-patel |
| `priya-desai.md` | Horizon Foundry · Data Platforms · Vice President | 1 | high | — | 30 | false | true | — |
| `marcus-vale.md` | Bluepeak Cooperative · AI Infrastructure · Director | 2 | high | 2026-08-21 | 30 | false | true | theo-brooks |
| `elise-warren.md` | Lantern Ridge · Research Engineering · Lead | 3 | medium | 2026-08-14 | 60 | false | false | lena-ortiz |
| `samir-rahman.md` | Riverglass Capital · Quant Engineering · Manager | 2 | high | 2026-05-10 | 90 | false | false | nia-okafor |
| `imani-cole.md` | Alder & Finch · Decision Science · Principal Analyst | 2 | low | 2026-07-04 | 120 | false | false | owen-mercer |

Use two to four relevant fictional tags per person. Reuse the exact Maya narrative and 2026-08-18 interaction from the Task 3 fixture so the production refresh proof has a stable sentence. Priya has no interaction section and uses Context to say she is an intentional future connection. Use these exact narrative anchors; expand each interaction into natural Markdown without adding confidential or real-company claims:

| Person | Why they matter | Interaction topics | Follow up |
| --- | --- | --- | --- |
| Maya | Maya gives candid platform leadership advice. | Platform ownership; hiring signals | Send the platform RFC article |
| Owen | Owen understands durable data-infrastructure operating practices. | Reliability budgets; team topology | Share the data-contracts note |
| Lena | Lena offers grounded product-strategy perspective. | Roadmap trade-offs; stakeholder alignment | Ask how the planning reset landed |
| Theo | Theo connects engineering craft with management systems. | Enablement metrics; manager transition | Reconnect about the enablement program |
| Nia | Nia has a systems view of cloud architecture decisions. | Architecture standards; platform boundaries | Ask for her current architecture reading list |
| Jasper | Jasper understands practical data-governance adoption. | Stewardship; ownership definitions | Send the lightweight governance template |
| Priya | Priya leads the kind of platform organization Charlie wants to understand. | No interactions; never met | Find an appropriate warm introduction |
| Marcus | Marcus is building AI infrastructure at a useful adjacent scale. | Model-serving ownership; team growth | Send the inference-cost article |
| Elise | Elise bridges research prototypes and production engineering. | Experiment handoff; evaluation practice | Ask how the new review process is working |
| Samir | Samir brings a financial-technology engineering perspective. | Quant platform constraints; hiring profiles | Reconnect about platform-control patterns |
| Imani | Imani is a thoughtful peer on decision-quality and measurement. | Metric reviews; decision logs | Share the decision-record example |

All met contacts contain one to three dated interactions consistent with `last_contact`; none includes a future date.

- [ ] **Step 5: Write and run seed acceptance tests**

```ts
const dataset = await loadPeopleFromDirectory(resolve(process.cwd(), "data/people"), "2026-08-27");
expect(dataset.people).toHaveLength(12);
expect(getInnerCircle(dataset.people)).toHaveLength(3);
expect(getReconnectCandidates(dataset.people, "2026-08-27").length).toBeGreaterThanOrEqual(2);
expect(getTargets(dataset.people)).toHaveLength(2);
expect(getRecentContacts(dataset.people, "2026-08-27").length).toBeGreaterThanOrEqual(3);
expect(new Set(dataset.people.filter((person) => person.type === "person").map((person) => person.relationshipStrength)))
  .toEqual(new Set([1, 2, 3, 4, 5]));
expect(getRelationships(dataset).some((edge) => edge.kind === "introduced_by")).toBe(true);
```

Run: `npm test -- tests/relationships.test.ts tests/seed-data.test.ts`

Expected: PASS with no validation failures.

- [ ] **Step 6: Commit**

```bash
git add src/lib/relationships.ts tests/relationships.test.ts tests/seed-data.test.ts data/people
git commit -m "feat: seed the professional relationship graph"
```

---

### Task 5: Dynamic server data boundary and actionable failure view

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/errors/DataErrorView.tsx`
- Create: `src/components/network/NetworkWorkspace.tsx`
- Create: `src/components/network/RefreshPeopleButton.tsx`
- Test: `tests/data-error-view.test.tsx`

**Interfaces:**
- Consumes: `loadPeopleFromDirectory(directory, currentDate)`, `todayISO()`, `PeopleDataError`, and `PeopleDataset`.
- Produces: `<NetworkWorkspace initialDataset currentDate />`, `<DataErrorView error />`, and `<RefreshPeopleButton />`.

- [ ] **Step 1: Write the failing data-error view test**

```tsx
render(<DataErrorView error={new PeopleDataError("Invalid people data", {
  sourceRelativePath: "data/people/alex.md",
  issues: ["relationship_strength must be between 1 and 5"],
})} />);
expect(screen.getByRole("heading", { name: /couldn.t load your network/i })).toBeVisible();
expect(screen.getByText("data/people/alex.md")).toBeVisible();
expect(screen.getByText(/relationship_strength/)).toBeVisible();
expect(screen.queryByText(/at DataErrorView/)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm test -- tests/data-error-view.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the dynamic page boundary**

`src/app/page.tsx` must follow this structure:

```tsx
export const dynamic = "force-dynamic";

export default async function Home() {
  const currentDate = todayISO();
  try {
    const dataset = await loadPeopleFromDirectory(
      resolve(process.cwd(), "data/people"),
      currentDate,
    );
    return <NetworkWorkspace initialDataset={dataset} currentDate={currentDate} />;
  } catch (error) {
    return <DataErrorView error={toPeopleDataError(error)} />;
  }
}
```

`DataErrorView` uses a semantic heading, exact file path, an issue list, and one Retry button implemented with `router.refresh()`. It never prints a stack trace. `NetworkWorkspace` initially renders the application title, loaded-person count, refresh button, and a labeled temporary graph region that Task 7 replaces.

- [ ] **Step 4: Implement refresh state without fake loading**

`RefreshPeopleButton` calls `startTransition(() => router.refresh())`, disables only while the router update is pending, rotates its refresh icon at the 120 ms motion token, and retains visible text `Refresh`. Do not delay completion or add skeletons.

- [ ] **Step 5: Verify the server boundary**

Run:

```bash
npm test -- tests/data-error-view.test.tsx tests/seed-data.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0 and the build marks `/` as dynamically rendered.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/errors src/components/network tests/data-error-view.test.tsx
git commit -m "feat: load Markdown through the local server"
```

---

### Task 6: Functional sidebar and progressive person detail

**Files:**
- Modify: `src/components/network/NetworkWorkspace.tsx`
- Create: `src/components/people/RelationshipSidebar.tsx`
- Create: `src/components/people/PersonDetail.tsx`
- Create: `src/components/people/RelationshipStrength.tsx`
- Create: `src/components/people/MarkdownSection.tsx`
- Create: `src/components/ui/Separator.tsx`
- Create: `src/lib/local-files.ts`
- Test: `tests/relationship-sidebar.test.tsx`
- Test: `tests/person-detail.test.tsx`
- Test: `tests/local-files.test.ts`

**Interfaces:**
- Consumes: all four selectors, `ReconnectCandidate`, `PeopleDataset`, `Person`, and shared `selectedId` state.
- Produces: `<RelationshipSidebar dataset currentDate selectedId onSelect />`, `<PersonDetail person people onSelectPerson onClose />`, `toVscodeFileHref(absolutePath)`, and accessible local-file actions.

- [ ] **Step 1: Write failing overlapping-sidebar tests**

```tsx
render(<RelationshipSidebar
  dataset={datasetWithOverlappingJane}
  currentDate="2026-08-27"
  selectedId={null}
  onSelect={onSelect}
/>);
expect(screen.getAllByRole("button", { name: /jane doe/i })).toHaveLength(4);
await user.click(screen.getAllByRole("button", { name: /jane doe/i })[1]);
expect(onSelect).toHaveBeenCalledWith("jane");
expect(screen.getByText("4d")).toHaveAttribute("title", "4 days overdue");
```

Also assert exact compact empty strings: `You're caught up.`, `No recent conversations.`, and `No targets yet.`.

- [ ] **Step 2: Write failing detail tests**

Render Maya and assert name, `Director · Platform Engineering`, company, `5 of 5`, `High`, formatted last-contact date, interaction count, introducer link when present, Why they matter, latest interaction, follow-up content exactly once, `Open Markdown`, and `Copy path`. Assert that closing calls `onClose` and selecting the introducer calls `onSelectPerson(introducerId)`.

In `tests/local-files.test.ts`, assert exact escaping:

```ts
expect(toVscodeFileHref("/Users/Charlie/My Notes/a#b.md"))
  .toBe("vscode://file/Users/Charlie/My%20Notes/a%23b.md");
expect(() => toVscodeFileHref("data/people/alex.md")).toThrow(/absolute path/i);
```

- [ ] **Step 3: Run focused tests to verify they fail**

Run: `npm test -- tests/relationship-sidebar.test.tsx tests/person-detail.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Implement the semantic sidebar**

Compute each derived list once with `useMemo`. Render four `<section aria-labelledby>` groups; each row is a full-width `<button>` with name first and only relevant secondary metadata. Use `aria-current={selectedId === person.id ? "true" : undefined}`. Do not deduplicate people across groups.

- [ ] **Step 5: Implement progressive details and safe file actions**

Use `react-markdown` for extracted Markdown with a constrained component map (`p`, `ul`, `ol`, `li`, `strong`, `em`, `code`, `a`) and no raw HTML. Build the VS Code link only from the validated `person.sourcePath` through `src/lib/local-files.ts`:

```ts
export function toVscodeFileHref(absolutePath: string): string {
  if (!absolutePath.startsWith("/")) throw new Error("Open Markdown requires an absolute path");
  const encodedPath = absolutePath.split("/").map(encodeURIComponent).join("/");
  return `vscode://file${encodedPath}`;
}
```

`Copy path` calls `navigator.clipboard.writeText(person.sourcePath)` and announces `Path copied.` or `Couldn’t copy path.` through an `aria-live="polite"` status. The strength meter is five small visual marks with one text alternative (`4 of 5`), not five noisy labels.

- [ ] **Step 6: Synchronize the workspace**

`NetworkWorkspace` owns one `selectedId: string | null`. Sidebar selection, introducer links, and future graph/search callbacks all call the same `selectPerson(id)` function. When selected, derive the person from `initialDataset.people`; closing sets `null`. Keep the labeled temporary graph region only until Task 7.

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/relationship-sidebar.test.tsx tests/person-detail.test.tsx tests/local-files.test.ts
npm run lint
npm run typecheck
```

Expected: all commands exit 0.

```bash
git add src/components/network/NetworkWorkspace.tsx src/components/people src/components/ui/Separator.tsx src/lib/local-files.ts tests/relationship-sidebar.test.tsx tests/person-detail.test.tsx tests/local-files.test.ts
git commit -m "feat: add relationship views and person details"
```

---

### Task 7: Stable interactive graph and synchronized selection

**Files:**
- Create: `src/lib/graph-model.ts`
- Create: `src/components/network/NetworkGraph.tsx`
- Create: `src/components/network/ForceGraphCanvas.tsx`
- Modify: `src/components/network/NetworkWorkspace.tsx`
- Test: `tests/graph-model.test.ts`

**Interfaces:**
- Consumes: `PeopleDataset`, `RelationshipEdge`, `getRelationships(dataset)`, shared `selectedId`, and `selectPerson(id)`.
- Produces: `GraphNode`, `GraphLink`, `buildGraphModel(dataset)`, `getConnectedIds(links, selectedId)`, and `<NetworkGraph dataset selectedId onSelect />`.

- [ ] **Step 1: Write failing graph-model tests**

```ts
it("keeps graph nodes detached from mutable domain records", () => {
  const model = buildGraphModel(datasetWithIntroductions);
  expect(model.nodes[0]).toEqual(expect.objectContaining({ id: expect.any(String), personId: expect.any(String) }));
  expect(model.nodes[0]).not.toBe(datasetWithIntroductions.people[0]);
});

it("finds both ends of every selected direct connection", () => {
  const links = [
    link({ source: "self", target: "maya" }),
    link({ source: "maya", target: "theo", kind: "introduced_by" }),
    link({ source: "self", target: "owen" }),
  ];
  expect(getConnectedIds(links, "maya")).toEqual(new Set(["self", "maya", "theo"]));
});
```

Also assert that self is marked distinctly, contact strengths become a narrow numeric prominence value, relevance remains a separate field, and link endpoints work before and after force-graph mutates string endpoints into node objects.

- [ ] **Step 2: Run graph-model tests to verify they fail**

Run: `npm test -- tests/graph-model.test.ts`

Expected: FAIL because `src/lib/graph-model.ts` does not exist.

- [ ] **Step 3: Implement the immutable graph adapter**

```ts
export interface GraphNode {
  id: string;
  personId: string;
  name: string;
  role?: string;
  team?: string;
  isSelf: boolean;
  strength: number;
  strategicRelevance?: StrategicRelevance;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  kind: "direct" | "introduced_by";
  directed: boolean;
  strength?: number;
}
```

`buildGraphModel()` maps validated people and `getRelationships()` output into fresh mutable graph objects. Sort nodes with self first and contacts by ID for deterministic force initialization. `getConnectedIds()` always includes the selected ID and resolves either string or object endpoints.

- [ ] **Step 4: Build the SSR-safe graph boundary**

`NetworkGraph.tsx` dynamically imports `ForceGraphCanvas.tsx` with `{ ssr: false }`. It renders a semantic region labeled `Professional relationship graph`, a concise canvas description for assistive technology, and no fake loading skeleton.

`ForceGraphCanvas.tsx` must:

- measure its container with `ResizeObserver`;
- configure charge and link distance once through the graph ref;
- use `cooldownTicks={120}`, restrained velocity/alpha decay, and one `zoomToFit(380, 52)` after the initial engine stop;
- avoid re-fitting after selection or panel changes;
- draw the self node with distinct geometry;
- keep strength radius within a narrow 5–9 pixel band;
- draw strategic relevance as a separate outer rim;
- render full names at normal zoom;
- draw direct links solid and introduced-by links dashed/directional;
- call `onSelect(personId)` immediately on click;
- clear selection only when the background is clicked.

- [ ] **Step 5: Add neighbor emphasis and a DOM pointer tooltip**

Store only `hoveredId` and tooltip coordinates in React state. Derive the active neighborhood from `selectedId ?? hoveredId`. Paint unrelated nodes/links at reduced opacity without removing them. Render one absolutely positioned, `pointer-events: none` tooltip containing name, role/team, `Relationship 4/5`, and `Strategic relevance High`; clamp its transform inside the measured graph rectangle and hide it on pointer leave.

- [ ] **Step 6: Replace the temporary graph region and verify synchronization**

Pass the same `selectedId` and `selectPerson` callback to sidebar, graph, and details. Assert manually during development that sidebar click highlights the graph and graph click opens the same detail record; do not create a second graph-only selection store.

Run:

```bash
npm test -- tests/graph-model.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0; the Next build does not attempt to access `window` during server rendering.

- [ ] **Step 7: Commit**

```bash
git add src/lib/graph-model.ts src/components/network/NetworkGraph.tsx src/components/network/ForceGraphCanvas.tsx src/components/network/NetworkWorkspace.tsx tests/graph-model.test.ts
git commit -m "feat: render the interactive relationship graph"
```

---

### Task 8: Fast command-palette search and keyboard navigation

**Files:**
- Create: `src/lib/search.ts`
- Create: `src/components/search/SearchCommand.tsx`
- Create: `src/components/ui/Dialog.tsx`
- Modify: `src/components/network/NetworkWorkspace.tsx`
- Modify: `vitest.setup.ts`
- Test: `tests/search.test.ts`
- Test: `tests/search-command.test.tsx`

**Interfaces:**
- Consumes: `Person[]` and the shared `selectPerson(id)` callback.
- Produces: `normalizeSearchText(value)`, `searchPeople(people, query)`, and `<SearchCommand people onSelect />`.

- [ ] **Step 1: Write failing pure-search tests**

```ts
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
```

Rank name-prefix matches first, then other name matches, then company/team/role/tags; preserve name order within equal ranks.

- [ ] **Step 2: Run pure-search tests to verify they fail**

Run: `npm test -- tests/search.test.ts`

Expected: FAIL because `src/lib/search.ts` does not exist.

- [ ] **Step 3: Implement normalized multi-field search**

Use this pure implementation shape and never mutate the people list:

```ts
export function normalizeSearchText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function searchPeople(people: Person[], query: string): Person[] {
  const normalizedQuery = normalizeSearchText(query);
  return people
    .map((person) => {
      const name = normalizeSearchText(person.name);
      const fields = [person.company, person.team, person.role, ...person.tags]
        .filter((value): value is string => Boolean(value))
        .map(normalizeSearchText);
      const rank = normalizedQuery === "" ? (person.type === "self" ? 0 : 1)
        : name.startsWith(normalizedQuery) ? 0
        : name.includes(normalizedQuery) ? 1
        : fields.some((field) => field.includes(normalizedQuery)) ? 2
        : Number.POSITIVE_INFINITY;
      return { person, rank };
    })
    .filter((entry) => Number.isFinite(entry.rank))
    .toSorted((a, b) => a.rank - b.rank || a.person.name.localeCompare(b.person.name))
    .map((entry) => entry.person);
}
```

- [ ] **Step 4: Write failing command-palette interaction tests**

```tsx
it("opens with Meta+K, filters, and selects with the keyboard", async () => {
  render(<SearchCommand people={people} onSelect={onSelect} />);
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const input = await screen.findByRole("combobox", { name: /search people/i });
  await user.type(input, "Maya");
  expect(screen.getByText("Director · Platform Engineering")).toBeVisible();
  await user.keyboard("{ArrowDown}{Enter}");
  expect(onSelect).toHaveBeenCalledWith("maya-patel");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("opens with Control+K and closes with Escape", async () => {
  render(<SearchCommand people={people} onSelect={onSelect} />);
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  expect(await screen.findByRole("dialog")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

Add `ResizeObserver`, `scrollIntoView`, and pointer-capture shims to `vitest.setup.ts` only when jsdom lacks them.

- [ ] **Step 5: Run command tests to verify they fail**

Run: `npm test -- tests/search-command.test.tsx`

Expected: FAIL because the command component does not exist.

- [ ] **Step 6: Implement the accessible palette**

Use Radix Dialog for focus trapping/return and cmdk for list navigation. Register one window `keydown` listener that prevents the browser default only for Cmd/Ctrl+K. Each result displays name and a subtitle assembled in this order: role, team, company, omitting duplicates and missing parts. Render `No people found.` for an empty result set. On select: call `onSelect(id)`, close the dialog, and let the workspace open details.

Place a compact `Search ⌘K` semantic button in the workspace header; clicking it opens the same palette. Highlight matching substrings with one subtle `<mark>` style, not badges.

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- tests/search.test.ts tests/search-command.test.tsx
npm run lint
npm run typecheck
```

Expected: all commands exit 0.

```bash
git add src/lib/search.ts src/components/search src/components/ui/Dialog.tsx src/components/network/NetworkWorkspace.tsx vitest.setup.ts tests/search.test.ts tests/search-command.test.tsx
git commit -m "feat: add keyboard person search"
```

---

### Task 9: Current-reference review, design system, and purposeful motion

**Files:**
- Create: `docs/qa/reference-review.md`
- Modify: `src/app/globals.css`
- Modify: `src/components/network/NetworkWorkspace.tsx`
- Modify: `src/components/network/ForceGraphCanvas.tsx`
- Modify: `src/components/people/RelationshipSidebar.tsx`
- Modify: `src/components/people/PersonDetail.tsx`
- Modify: `src/components/search/SearchCommand.tsx`
- Modify: `src/components/errors/DataErrorView.tsx`
- Create or modify: `src/components/ui/*`

**Interfaces:**
- Consumes: the complete functional UI from Tasks 5–8 and the visual-system section of the spec.
- Produces: one coherent token system, wide/narrow layouts, complete interaction states, restrained transitions, and documented reference decisions.

- [ ] **Step 1: Invoke the required design and web-research workflows**

Read and follow `frontend-design:frontend-design`. Because the user explicitly supplied current GitHub references, also read and follow `agent-reach`. Inspect the current official repositories for:

- shadcn/ui command, dialog, sheet, tooltip, focus, and state composition;
- Motion Primitives disclosure/layout continuity;
- Animate UI’s React/shadcn transition patterns;
- Magic UI patterns that should be rejected as decorative in this product;
- Cult UI’s dense interaction and panel patterns.

Record repository URL, inspected component/path, useful behavior, Orbit decision, and rejected excess in `docs/qa/reference-review.md`. Do not copy source verbatim and do not install these reference packages.

- [ ] **Step 2: Establish exact global tokens before component polish**

Define semantic custom properties in `globals.css`:

```css
:root {
  --canvas: #f4f3ef;
  --sidebar: #ecebe6;
  --panel: #faf9f6;
  --ink: #1b1d1e;
  --muted: #6b6e70;
  --faint: #929594;
  --line: #d9d7d0;
  --line-strong: #c6c3ba;
  --selected: #315f58;
  --relevance-high: #b65f43;
  --relevance-medium: #748468;
  --relevance-low: #969895;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --motion-fast: 120ms;
  --motion-normal: 220ms;
  --motion-slow: 380ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Use the local system UI font stack and `font-variant-numeric: tabular-nums` for dates/counts. Add visible `:focus-visible` treatment and a reduced-motion media query that sets nonessential animation/transition durations to near-zero.

- [ ] **Step 3: Polish the three-part workspace**

At widths at or above 1280 px, use a 236 px sidebar, flexible graph, and 368 px in-flow detail panel. Keep header height compact and align its title/search/refresh controls to one baseline. At narrower widths, preserve the sidebar until 900 px and render details as a right overlay; below 900 px, collapse the sidebar into a scrollable top rail/list while keeping the graph usable.

Remove intermediate temporary containers. Use separators and surface changes rather than card outlines. Keep radii at the three token values and use one shadow only for the dialog/overlay panel.

- [ ] **Step 4: Polish typography and all interaction states**

For sidebar rows, graph labels, detail content, palette results, buttons, and error actions, inspect and implement REST → HOVER → PRESSED → SELECTED → EXIT plus visible keyboard focus. Make name the primary text; role/team/company secondary; relationship metadata tertiary. Keep overdue counts quiet and right aligned. Icons appear only for search, refresh, close, copy, and open-file actions where they disambiguate behavior.

- [ ] **Step 5: Add causal motion with reduced-motion alternatives**

Use Motion’s `AnimatePresence` for the detail panel only. Selection styling updates before the panel mounts. Wide-panel entrance is a restrained 16 px translation plus opacity over 220 ms; close uses 180 ms. Command palette uses scale `0.985 → 1` plus opacity over 180 ms. Hover/focus colors use the 120 ms token. The graph’s one initial fit may use the 380 ms token; node hover and selection do not bounce. Under reduced motion, use opacity only and skip animated graph fit.

- [ ] **Step 6: Run nonvisual verification and inspect the first styled browser state**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0. Launch `npm run dev`, open the application at 1440×900, and inspect the default, selected-person, and command-palette states before committing. Correct any obvious token misuse or layout overflow found in those three states.

- [ ] **Step 7: Commit**

```bash
git add docs/qa/reference-review.md src/app/globals.css src/components
git commit -m "feat: establish Orbit interaction design"
```

---

### Task 10: Browser visual-QA pass one and targeted fixes

**Files:**
- Create: `docs/qa/visual-qa.md`
- Create: `docs/qa/screenshots/pass-1-default-1440.png`
- Create: `docs/qa/screenshots/pass-1-selected-1440.png`
- Create: `docs/qa/screenshots/pass-1-search-1280.png`
- Modify: only source/test files implicated by recorded findings.

**Interfaces:**
- Consumes: the complete development application.
- Produces: a reproducible pass-one checklist, three screenshots, and resolved findings with recheck evidence.

- [ ] **Step 1: Invoke and read the browser-control workflow**

Use `browser:control-in-app-browser` to launch and inspect the actual local application. Start `npm run dev` in a persistent terminal session and wait for a verified HTTP response before opening the page.

- [ ] **Step 2: Execute the exact 1440×900 pass**

Inspect and record:

1. default graph stability and readable labels after cooldown;
2. each of Inner Circle, Reconnect, Recent, and Targets;
3. graph node hover metadata and connected-edge emphasis;
4. graph selection, sidebar synchronization, and panel entrance;
5. repeated Maya → Theo → Priya switching without stale details;
6. introducer selection and panel close;
7. Cmd+K open, query, arrow navigation, Enter selection, and Escape close;
8. keyboard-only sidebar traversal and visible focus;
9. `No people found.` search state;
10. graph pan and zoom without perpetual drift.

Save the default and selected-person screenshots under the exact paths above.

- [ ] **Step 3: Execute the exact 1280×800 and reduced-motion pass**

Resize to 1280×800, verify there is no horizontal page overflow, open search, and save the search screenshot. Emulate `prefers-reduced-motion: reduce`; verify panel and palette use opacity without spatial movement and the graph skips animated entrance. Restore normal motion after the check.

- [ ] **Step 4: Record findings before editing**

Create `docs/qa/visual-qa.md` with columns `Check`, `Evidence`, `Finding`, `Severity`, `Change`, and `Recheck`. Each failed check receives a concrete row naming the responsible file/token; successful checks receive a concise `Pass` row. Include viewport, browser, date, and commit at the top.

- [ ] **Step 5: Fix and recheck every pass-one failure**

For a rule-driven failure, first add or tighten the smallest relevant test and confirm it fails. For a visual-only failure, patch the smallest responsible component or token. Re-run the focused test plus lint/typecheck, then use the browser to revisit the exact state and mark the row `Rechecked` only after direct inspection. Do not broaden the feature set while polishing.

- [ ] **Step 6: Verify and commit pass one**

Run:

```bash
npm test
npm run lint
npm run typecheck
```

Expected: all commands exit 0 and every pass-one finding has a completed Recheck cell.

```bash
git add docs/qa src tests
git commit -m "fix: complete first Orbit visual QA pass"
```

---

### Task 11: Production visual-QA pass two and Markdown recovery proof

**Files:**
- Modify: `docs/qa/visual-qa.md`
- Create: `docs/qa/screenshots/pass-2-default-1440.png`
- Create: `docs/qa/screenshots/pass-2-selected-1440.png`
- Create: `docs/qa/screenshots/pass-2-search-1280.png`
- Temporarily modify then restore: `data/people/maya-patel.md`
- Modify: only source/test files implicated by recorded pass-two findings.

**Interfaces:**
- Consumes: a successful production build and pass-one application.
- Produces: independent second-pass evidence, proof of live Markdown edit/error/recovery behavior, and final screenshots.

- [ ] **Step 1: Build and launch the production server**

Stop the development server, then run:

```bash
npm run build
npm run start
```

Wait for a successful HTTP response and open the production page in the browser at 1440×900. Record the exact commit and build result in the pass-two section of `docs/qa/visual-qa.md`.

- [ ] **Step 2: Review the product with a fresh visual checklist**

Reinspect default, Maya selected, Priya selected, reconnect scanning, introduced-by edges, command search, keyboard focus, graph zoom/pan, panel close/reopen, 1280×800 layout, and reduced motion. Explicitly answer in the log: what still looks generated, what is unnecessary, what feels cheap, what is too prominent/hidden, whether the graph is useful, whether sidebar scanning is fast, and whether any animation lacks purpose.

- [ ] **Step 3: Prove valid Markdown refresh without a restart**

In `data/people/maya-patel.md`, change the exact sentence under Why they matter from `Maya gives candid platform leadership advice.` to `Maya offers candid platform leadership advice.` using `apply_patch`. Refresh the production browser, verify the new sentence appears in Maya’s detail panel, and record the result. Restore `gives`, refresh again, and verify restoration.

- [ ] **Step 4: Prove invalid edit and recovery without a restart**

Change Maya’s `relationship_strength: 5` to `relationship_strength: 6` using `apply_patch`. Refresh and verify the error view names `data/people/maya-patel.md` and the 1–5 constraint. Restore `relationship_strength: 5`, refresh, verify the full graph returns, and run `git diff -- data/people/maya-patel.md` to prove the seed file is exactly restored.

- [ ] **Step 5: Fix and recheck every pass-two failure**

Use the same evidence-first loop as pass one: add a failing test for behavioral regressions, patch the smallest owner for visual failures, run focused verification, and revisit the exact browser state. Record each change and recheck. Save the three final screenshots under the exact pass-two paths.

- [ ] **Step 6: Verify and commit pass two**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0; Maya’s file has no diff; every pass-two finding is rechecked.

```bash
git add docs/qa src tests
git commit -m "fix: complete production visual QA pass"
```

---

### Task 12: README, code-quality audit, and final verification

**Files:**
- Create: `README.md`
- Modify: source/tests only when the audit reveals a concrete issue.

**Interfaces:**
- Consumes: the finished application, spec, reference review, QA log, and command results.
- Produces: accurate operating documentation and final verified repository state.

- [ ] **Step 1: Write the README from verified behavior**

Use these exact top-level sections:

```markdown
# Orbit
## Product
## Architecture
## Markdown schema
## Adding a person
## Interaction history
## Derived views
## Relationships
## Development
## Design system
## Limitations
## Future ideas
```

Document every supported frontmatter property, the reserved `### Follow up` rule, frontmatter-vs-interaction last-contact precedence, UTC day arithmetic, repo-local refresh behavior, the VS Code URI/copy-path fallback, all four selector rules, `introduced_by`, every npm command, and the complete V2 deferral list. State clearly that the app is read-only, desktop-first, local-only, and has no watcher; Markdown changes appear after refresh.

- [ ] **Step 2: Audit duplication and arbitrary styling**

Run:

```bash
rg -n "relationshipStrength|strategicRelevance|desiredCadenceDays" src/components
rg -n "#[0-9a-fA-F]{3,8}|rounded-\[|shadow-\[|duration-\[" src --glob "*.tsx"
rg -n "from ['\"](redux|zustand|firebase|@supabase)" src package.json
```

Expected: components display domain fields but contain no selector/date business rules; arbitrary color/radius/shadow/duration searches return no unexplained values; forbidden/unnecessary state or cloud dependencies return no matches. Remove unused imports/components and consolidate only genuine repetition.

- [ ] **Step 3: Run clean-install and full command verification**

Run:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
find . -name "._*" -print
```

Expected: the first five validation commands exit 0, `git diff --check` is empty, and the AppleDouble search prints nothing. Record exact test counts and build routes for handoff.

- [ ] **Step 4: Perform the final production smoke check**

Launch `npm run start`, verify a successful HTTP response, and use the browser to select a sidebar person, select a graph person, open/close Cmd+K, and open details. Confirm the production UI matches the pass-two screenshots and no console/runtime errors appear.

- [ ] **Step 5: Review completion against the spec**

Read every completion criterion in the design spec and point it to a test, browser-QA row, README section, or command result. If any criterion lacks evidence, complete that exact check before committing. Confirm V2 capabilities are documented but absent from source and dependencies.

- [ ] **Step 6: Commit the documentation and any verified audit fixes**

```bash
git add README.md src tests
git commit -m "docs: complete Orbit operating guide"
```

- [ ] **Step 7: Capture final repository evidence**

Run:

```bash
git status --short --branch
git log --oneline --decorate -15
find . -maxdepth 4 -type f -not -path "./node_modules/*" -not -path "./.next/*" | sort
```

Expected: clean `main` branch, a task-aligned commit history, and a file tree containing the application, 12 Markdown records, tests, reference review, two-pass QA log, screenshots, design spec, plan, and README.
