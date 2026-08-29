# Orbit Map and Conversation Prep Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add action-group map filters, restrained node emphasis, persistent drag layouts, and structured conversation-prep content to Orbit.

**Architecture:** Keep `react-force-graph-2d` and place reusable domain rules in pure TypeScript modules. `NetworkWorkspace` owns the active action filter, `NetworkGraph` renders the filter toolbar, and `ForceGraphCanvas` owns canvas interaction and animation. Conversation Prep is parsed from one optional H2 section into a typed domain object and rendered read-only in the existing detail panel.

**Tech Stack:** TypeScript 6, React 19, Next.js 16 App Router, `react-force-graph-2d`, Motion reduced-motion hook, unified/remark AST parsing, Vitest, Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-08-29-orbit-map-and-conversation-prep-design.md`

## Global Constraints

- Markdown files remain the source of truth; Orbit remains read-only.
- Keep the existing `react-force-graph-2d` implementation and existing strategic-relevance color semantics.
- Relationship/action views are overlapping derived properties, not a new mutually exclusive person field.
- Selecting a view dims nonmatching nodes; it does not remove them.
- Motion must stop when `prefers-reduced-motion: reduce` is active.
- Persist graph coordinates only in versioned browser `localStorage`; never write them to Markdown.
- Storage failures must not block graph rendering.
- Unknown Conversation Prep headings remain valid Markdown but are not recognized fields.
- Do not add a graph library or animation dependency.

---

## File structure

- Modify `src/types/person.ts`: add the typed Conversation Prep domain object.
- Modify `src/lib/markdown.ts`: extract recognized Conversation Prep H3 blocks with AST boundaries.
- Modify `tests/fixtures/markdown/maya-patel.md`: representative parser fixture.
- Modify `tests/fixtures/people.ts`: complete default `Person` test factory.
- Modify `tests/markdown.test.ts`: parser boundary and empty-state coverage.
- Create `src/components/people/ConversationPrep.tsx`: read-only prep presentation and copy-template empty state.
- Modify `src/components/people/PersonDetail.tsx`: place prep between relationship context and interaction history.
- Modify `tests/person-detail.test.tsx`: prep ordering, collapse behavior, and clipboard coverage.
- Create `src/lib/graph-filters.ts`: canonical filter keys, metadata, and selector-backed membership.
- Create `tests/graph-filters.test.ts`: overlapping membership and visual-priority coverage.
- Create `src/components/network/RelationshipFilterBar.tsx`: accessible pressed-state filter controls and Reset layout action.
- Create `tests/relationship-filter-bar.test.tsx`: keyboard/click behavior and accessible state.
- Modify `src/components/network/NetworkWorkspace.tsx`: own the active filter.
- Modify `src/components/network/NetworkGraph.tsx`: render toolbar and pass filter/date/reset into the canvas.
- Create `src/lib/graph-layout.ts`: validate, restore, save, and clear fixed coordinates.
- Create `tests/graph-layout.test.ts`: corrupt-storage and dataset-change coverage.
- Modify `src/components/network/ForceGraphCanvas.tsx`: native node dragging, position persistence, filter emphasis, pulse rendering, and progressive labels.
- Modify `src/app/globals.css`: toolbar, prep panel, empty state, and responsive styles.
- Modify `data/people/maya-patel.md`: representative Conversation Prep seed content.
- Modify `README.md`: document new Markdown schema, filters, drag persistence, reset, and privacy boundary.
- Modify `docs/qa/visual-qa.md`: record enhancement QA evidence.

---

### Task 1: Parse structured Conversation Prep Markdown

**Files:**
- Modify: `src/types/person.ts`
- Modify: `src/lib/markdown.ts`
- Modify: `tests/fixtures/markdown/maya-patel.md`
- Modify: `tests/fixtures/people.ts`
- Modify: `tests/markdown.test.ts`

**Interfaces:**
- Consumes: existing `originalMarkdown()`, `sectionEnd()`, and H2/H3 AST traversal in `src/lib/markdown.ts`.
- Produces: `ConversationPrep`, `EMPTY_CONVERSATION_PREP`, and `Person.conversationPrep`; `extractMarkdownSections()` returns `conversationPrep` alongside `interactions` and `sections`.

- [ ] **Step 1: Write failing parser tests**

Add fixture content before `## Interactions`:

```markdown
## Conversation Prep

### Their world

Maya's team is clarifying platform ownership.

### What they care about

- Clear decision rights
- Practical operating models

### Remember

Charlie promised to send the platform RFC article.

### Next conversation

- Ask how the ownership discussion landed
```

Add these assertions to `tests/markdown.test.ts`:

```ts
it("extracts recognized Conversation Prep blocks and preserves Markdown", () => {
  const person = parsePersonMarkdown(validSource, options);

  expect(person.conversationPrep).toEqual({
    theirWorld: "Maya's team is clarifying platform ownership.",
    whatTheyCareAbout: "- Clear decision rights\n- Practical operating models",
    remember: "Charlie promised to send the platform RFC article.",
    nextConversation: "- Ask how the ownership discussion landed",
  });
});

it("keeps Conversation Prep within its H2 and recognized H3 boundaries", () => {
  const markdown = `## Conversation Prep

### Their world
Known context.

### Notes
Unrecognized note.

### Next conversation
Ask a direct question.

## Context
Outside prep.
`;

  expect(extractMarkdownSections(markdown).conversationPrep).toEqual({
    theirWorld: "Known context.",
    whatTheyCareAbout: "",
    remember: "",
    nextConversation: "Ask a direct question.",
  });
});

it("returns empty Conversation Prep fields when the section is absent or empty", () => {
  expect(extractMarkdownSections("## Context\n\nKnown.").conversationPrep).toEqual({
    theirWorld: "",
    whatTheyCareAbout: "",
    remember: "",
    nextConversation: "",
  });
  expect(extractMarkdownSections("## Conversation Prep\n\n### Remember\n").conversationPrep.remember).toBe("");
});
```

- [ ] **Step 2: Run the targeted parser tests and confirm failure**

Run:

```bash
npm test -- tests/markdown.test.ts
```

Expected: FAIL because `conversationPrep` does not exist on the extraction result or `Person`.

- [ ] **Step 3: Add the domain type and AST extraction**

In `src/types/person.ts`, add:

```ts
export interface ConversationPrep {
  theirWorld: string;
  whatTheyCareAbout: string;
  remember: string;
  nextConversation: string;
}

export interface Person {
  // existing properties
  conversationPrep: ConversationPrep;
}
```

In `src/lib/markdown.ts`, export and use this constant:

```ts
export const EMPTY_CONVERSATION_PREP = {
  theirWorld: "",
  whatTheyCareAbout: "",
  remember: "",
  nextConversation: "",
} satisfies ConversationPrep;
```

Add a helper that recognizes headings case-insensitively and copies each body only until the next H3:

```ts
function conversationPrep(source: string, nodes: RootContent[]): ConversationPrep {
  const result = { ...EMPTY_CONVERSATION_PREP };
  const keys: Record<string, keyof ConversationPrep> = {
    "their world": "theirWorld",
    "what they care about": "whatTheyCareAbout",
    remember: "remember",
    "next conversation": "nextConversation",
  };

  nodes.forEach((node, index) => {
    if (!isHeading(node, 3)) return;
    const key = keys[toString(node).trim().toLowerCase()];
    if (!key) return;
    result[key] = originalMarkdown(source, nodes.slice(index + 1, blockEnd(nodes, index)));
  });
  return result;
}
```

Extend `ExtractedMarkdownSections`, initialize a fresh empty object on every call, assign it for `heading === "conversation prep"`, return it, and set `conversationPrep: extracted.conversationPrep` in `parsePersonMarkdown()`. Update `makePerson()` with a complete empty prep object.

- [ ] **Step 4: Run parser and full type checks**

Run:

```bash
npm test -- tests/markdown.test.ts
npm run typecheck
```

Expected: both commands PASS.

- [ ] **Step 5: Commit the parser slice**

```bash
git add src/types/person.ts src/lib/markdown.ts tests/fixtures/markdown/maya-patel.md tests/fixtures/people.ts tests/markdown.test.ts
git commit -m "feat: parse conversation prep sections"
```

---

### Task 2: Render Conversation Prep in the person detail

**Files:**
- Create: `src/components/people/ConversationPrep.tsx`
- Modify: `src/components/people/PersonDetail.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/person-detail.test.tsx`

**Interfaces:**
- Consumes: `ConversationPrep` from Task 1 and existing `MarkdownSection` safe rendering.
- Produces: `CONVERSATION_PREP_TEMPLATE` and `ConversationPrepPanel({ prep })`.

- [ ] **Step 1: Write failing detail-panel tests**

Extend the `maya` fixture in `tests/person-detail.test.tsx` with all four prep fields. Add:

```ts
it("puts actionable Conversation Prep before interaction history", () => {
  render(<PersonDetail person={maya} people={[maya, introducer]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);

  const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
  expect(headings.indexOf("Next conversation")).toBeLessThan(headings.indexOf("Latest interaction"));
  expect(screen.getByText("Ask how the ownership discussion landed")).toBeVisible();
  expect(screen.getByText("Maya's team is clarifying platform ownership.")).toBeVisible();
});

it("omits empty prep blocks and copies the template when all prep is empty", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const empty = makePerson({ id: "empty", name: "Empty Prep" });

  render(<PersonDetail person={empty} people={[empty]} onSelectPerson={vi.fn()} onClose={vi.fn()} />);
  expect(screen.queryByRole("heading", { name: "Their world" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Copy Conversation Prep template" }));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("## Conversation Prep"));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("### Next conversation"));
  expect(screen.getByText("Template copied.")).toBeVisible();
});
```

- [ ] **Step 2: Run the detail tests and confirm failure**

Run:

```bash
npm test -- tests/person-detail.test.tsx
```

Expected: FAIL because the prep panel and template action do not exist.

- [ ] **Step 3: Create the prep component and integrate it**

Export this exact template from `ConversationPrep.tsx`:

```ts
export const CONVERSATION_PREP_TEMPLATE = `## Conversation Prep

### Their world

### What they care about

### Remember

### Next conversation
`;
```

Implement `ConversationPrepPanel` with these rules:

```ts
interface ConversationPrepPanelProps {
  prep: ConversationPrep;
}

const hasPrep = (prep: ConversationPrep) => Object.values(prep).some(Boolean);
```

When `hasPrep` is true, render one `section` headed `Conversation Prep`, put `Next conversation` first, and render only non-empty fields. Use `MarkdownSection` for safe Markdown. Make the three durable-context blocks native `<details>` elements with `<summary>` labels so they work without client state; default `Their world` open and leave the other two closed. When false, render the panel heading, concise empty copy, the template button, and one `aria-live="polite"` status.

Insert the panel after `Context` and before `Latest interaction` in `PersonDetail.tsx`. Keep clipboard status inside the prep component so path-copy feedback remains independent.

Add focused CSS classes `.conversation-prep`, `.conversation-prep__next`, `.conversation-prep__disclosure`, `.conversation-prep__summary`, and `.conversation-prep__empty`. Use existing color variables, borders, radii, and typography; do not add decorative gradients.

- [ ] **Step 4: Run component and accessibility-adjacent tests**

Run:

```bash
npm test -- tests/person-detail.test.tsx
npm run typecheck
npm run lint
```

Expected: all commands PASS.

- [ ] **Step 5: Commit the detail slice**

```bash
git add src/components/people/ConversationPrep.tsx src/components/people/PersonDetail.tsx src/app/globals.css tests/person-detail.test.tsx
git commit -m "feat: show conversation prep in person details"
```

---

### Task 3: Add selector-backed relationship filters and accessible controls

**Files:**
- Create: `src/lib/graph-filters.ts`
- Create: `tests/graph-filters.test.ts`
- Create: `src/components/network/RelationshipFilterBar.tsx`
- Create: `tests/relationship-filter-bar.test.tsx`
- Modify: `src/components/network/NetworkWorkspace.tsx`
- Modify: `src/components/network/NetworkGraph.tsx`
- Modify: `src/components/network/ForceGraphCanvas.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `getInnerCircle`, `getRecentContacts`, `getReconnectCandidates`, and `getTargets`; `currentDate` already supplied to `NetworkWorkspace`.
- Produces: `RelationshipFilter`, `RELATIONSHIP_FILTERS`, `getRelationshipFilterIds(people, currentDate, filter)`, and `RelationshipFilterBar`.

- [ ] **Step 1: Write failing pure filter tests**

Create `tests/graph-filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getRelationshipFilterIds } from "@/lib/graph-filters";
import { makePerson } from "./fixtures/people";

describe("graph relationship filters", () => {
  const shared = makePerson({
    id: "shared",
    innerCircle: true,
    target: true,
    effectiveLastContact: "2026-08-18",
    desiredCadenceDays: 5,
  });
  const other = makePerson({ id: "other" });
  const self = makePerson({ id: "self", type: "self", relationshipStrength: undefined, strategicRelevance: undefined });

  it("reuses overlapping action-view membership", () => {
    const people = [self, shared, other];
    expect(getRelationshipFilterIds(people, "2026-08-27", "inner-circle")).toEqual(new Set(["shared"]));
    expect(getRelationshipFilterIds(people, "2026-08-27", "recent")).toEqual(new Set(["shared"]));
    expect(getRelationshipFilterIds(people, "2026-08-27", "reconnect")).toEqual(new Set(["shared"]));
    expect(getRelationshipFilterIds(people, "2026-08-27", "targets")).toEqual(new Set(["shared"]));
  });

  it("returns every ID for All so filtering never removes context", () => {
    expect(getRelationshipFilterIds([self, shared, other], "2026-08-27", "all"))
      .toEqual(new Set(["self", "shared", "other"]));
  });
});
```

- [ ] **Step 2: Run the pure test and confirm failure**

Run:

```bash
npm test -- tests/graph-filters.test.ts
```

Expected: FAIL because `@/lib/graph-filters` does not exist.

- [ ] **Step 3: Implement canonical filter metadata and membership**

Create `src/lib/graph-filters.ts`:

```ts
import { getInnerCircle, getRecentContacts, getReconnectCandidates, getTargets } from "@/lib/selectors";
import type { ISODate, Person } from "@/types/person";

export type RelationshipFilter = "all" | "inner-circle" | "reconnect" | "recent" | "targets";

export const RELATIONSHIP_FILTERS: ReadonlyArray<{ key: RelationshipFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "inner-circle", label: "Inner Circle" },
  { key: "reconnect", label: "Reconnect" },
  { key: "recent", label: "Recent" },
  { key: "targets", label: "Targets" },
];

export function getRelationshipFilterIds(
  people: Person[],
  currentDate: ISODate,
  filter: RelationshipFilter,
): Set<string> {
  if (filter === "all") return new Set(people.map(({ id }) => id));
  const matches = filter === "inner-circle" ? getInnerCircle(people)
    : filter === "recent" ? getRecentContacts(people, currentDate)
    : filter === "targets" ? getTargets(people)
    : getReconnectCandidates(people, currentDate).map(({ person }) => person);
  return new Set(matches.map(({ id }) => id));
}
```

- [ ] **Step 4: Write the failing filter-bar test**

Create `tests/relationship-filter-bar.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelationshipFilterBar } from "@/components/network/RelationshipFilterBar";

describe("RelationshipFilterBar", () => {
  afterEach(cleanup);

  it("exposes one pressed filter and sends filter and reset actions", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const onResetLayout = vi.fn();
    render(<RelationshipFilterBar activeFilter="all" onFilterChange={onFilterChange} onResetLayout={onResetLayout} />);

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Targets" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onFilterChange).toHaveBeenCalledWith("reconnect");
    await user.click(screen.getByRole("button", { name: "Reset layout" }));
    expect(onResetLayout).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 5: Implement the toolbar and state plumbing**

Implement `RelationshipFilterBar` as a `role="group"` labelled `Relationship view`, map `RELATIONSHIP_FILTERS` to real buttons with `aria-pressed`, and render a separate Reset layout button with the `RotateCcw` icon. After Reset layout is activated, announce `Layout reset.` through a visually compact `aria-live="polite"` status so the action has nonvisual confirmation.

In `NetworkWorkspace`, add:

```ts
const [activeFilter, setActiveFilter] = useState<RelationshipFilter>("all");
```

Pass `activeFilter`, `currentDate`, and `onFilterChange={setActiveFilter}` to `NetworkGraph`.

In `NetworkGraph`, own a monotonically increasing reset token:

```ts
const [layoutResetToken, setLayoutResetToken] = useState(0);
```

Render `RelationshipFilterBar` over the graph and pass `activeFilter`, `currentDate`, and `layoutResetToken` to `ForceGraphCanvas`. Increment the token from Reset layout. In `ForceGraphCanvas`, compute `matchingIds` with `getRelationshipFilterIds()` and temporarily use it only to dim nonmatching nodes and links; animation arrives in Task 5. A link remains moderately emphasized when it touches a matching node, ensuring the direct self-to-match edge stays legible; links with no matching endpoint are dimmed.

Add toolbar CSS that remains one compact row at desktop sizes and wraps without covering the detail panel at narrow widths. Replace the fixed `RELATIONSHIP FIELD` pseudo-label position with a dedicated toolbar label or leave enough top inset that the two do not overlap.

- [ ] **Step 6: Run filter tests and project checks**

Run:

```bash
npm test -- tests/graph-filters.test.ts tests/relationship-filter-bar.test.tsx
npm run typecheck
npm run lint
```

Expected: all commands PASS.

- [ ] **Step 7: Commit the filter slice**

```bash
git add src/lib/graph-filters.ts tests/graph-filters.test.ts src/components/network/RelationshipFilterBar.tsx tests/relationship-filter-bar.test.tsx src/components/network/NetworkWorkspace.tsx src/components/network/NetworkGraph.tsx src/components/network/ForceGraphCanvas.tsx src/app/globals.css
git commit -m "feat: add relationship map filters"
```

---

### Task 4: Persist intentional node dragging and reset the layout

**Files:**
- Create: `src/lib/graph-layout.ts`
- Create: `tests/graph-layout.test.ts`
- Modify: `src/components/network/ForceGraphCanvas.tsx`
- Modify: `src/components/network/NetworkGraph.tsx`

**Interfaces:**
- Consumes: `GraphNode` mutable `x`, `y`, `fx`, and `fy` coordinates; `layoutResetToken` from Task 3.
- Produces: `GRAPH_LAYOUT_STORAGE_KEY`, `GraphLayout`, `readGraphLayout(storage, validIds)`, `writeGraphLayout(storage, layout)`, and `clearGraphLayout(storage)`.

- [ ] **Step 1: Write failing storage-boundary tests**

Create `tests/graph-layout.test.ts` with an in-memory `Storage` stub or `window.localStorage` under jsdom:

```ts
it("restores only finite positions for IDs still in the dataset", () => {
  localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, JSON.stringify({
    maya: { x: 12.5, y: -4 },
    deleted: { x: 1, y: 2 },
    broken: { x: "no", y: 3 },
  }));

  expect(readGraphLayout(localStorage, new Set(["maya", "broken"]))).toEqual({
    maya: { x: 12.5, y: -4 },
  });
});

it("returns an empty layout for corrupt JSON or unavailable storage", () => {
  localStorage.setItem(GRAPH_LAYOUT_STORAGE_KEY, "{");
  expect(readGraphLayout(localStorage, new Set(["maya"]))).toEqual({});
  expect(readGraphLayout(null, new Set(["maya"]))).toEqual({});
});

it("writes and clears the versioned layout key", () => {
  writeGraphLayout(localStorage, { maya: { x: 10, y: 20 } });
  expect(JSON.parse(localStorage.getItem(GRAPH_LAYOUT_STORAGE_KEY)!)).toEqual({ maya: { x: 10, y: 20 } });
  clearGraphLayout(localStorage);
  expect(localStorage.getItem(GRAPH_LAYOUT_STORAGE_KEY)).toBeNull();
});
```

- [ ] **Step 2: Run the layout tests and confirm failure**

Run:

```bash
npm test -- tests/graph-layout.test.ts
```

Expected: FAIL because the layout module does not exist.

- [ ] **Step 3: Implement defensive local layout storage**

Create:

```ts
export const GRAPH_LAYOUT_STORAGE_KEY = "orbit.graph-layout.v1";
export interface GraphPosition { x: number; y: number }
export type GraphLayout = Record<string, GraphPosition>;
```

`readGraphLayout` must catch `getItem` and JSON errors, reject arrays/non-objects/non-finite coordinates, and filter to `validIds`. `writeGraphLayout` and `clearGraphLayout` must catch storage exceptions and return `boolean` success flags instead of throwing.

- [ ] **Step 4: Restore, drag, persist, and reset in the canvas**

In `ForceGraphCanvas`:

1. Keep the current layout in `useRef<GraphLayout>({})`.
2. After `graphData` changes, read storage using current person IDs and assign `x`, `y`, `fx`, and `fy` to restored nodes before the first fit.
3. Set `enableNodeDrag` and `enablePointerInteraction` to true while preserving the existing capture-level click-versus-drag guard and tooltip hit-testing.
4. Handle native `onNodeDragEnd` only when finite `node.x` and `node.y` exist:

```ts
node.fx = node.x;
node.fy = node.y;
layoutRef.current = {
  ...layoutRef.current,
  [node.personId]: { x: node.x, y: node.y },
};
writeGraphLayout(window.localStorage, layoutRef.current);
```

5. On a changed `layoutResetToken`, skip the initial token, clear storage, replace the ref with `{}`, set every node's `fx` and `fy` to `undefined`, set `hasFittedRef.current = false`, reheat the simulation, and fit after it settles.

Preserve background pan/zoom. Confirm a click that stays below `didPointerDrag` still selects and does not create saved coordinates.

- [ ] **Step 5: Run layout, geometry, and graph-model regressions**

Run:

```bash
npm test -- tests/graph-layout.test.ts tests/graph-geometry.test.ts tests/graph-model.test.ts
npm run typecheck
npm run lint
```

Expected: all commands PASS.

- [ ] **Step 6: Commit the persistence slice**

```bash
git add src/lib/graph-layout.ts tests/graph-layout.test.ts src/components/network/ForceGraphCanvas.tsx src/components/network/NetworkGraph.tsx
git commit -m "feat: persist dragged graph layouts"
```

---

### Task 5: Add restrained filter halos, breathing, and scale-aware labels

**Files:**
- Modify: `src/lib/graph-filters.ts`
- Modify: `tests/graph-filters.test.ts`
- Modify: `src/components/network/ForceGraphCanvas.tsx`

**Interfaces:**
- Consumes: `RelationshipFilter`, `matchingIds`, current hover/selection connection emphasis, and `useReducedMotion()`.
- Produces: `getGraphVisualState()` and canvas rendering that distinguishes `matching`, `dimmed`, `active`, and neutral nodes.

- [ ] **Step 1: Write failing visual-priority tests**

Add a pure state helper contract to `tests/graph-filters.test.ts`:

```ts
it("lets hover and selection override filter dimming", () => {
  const matchingIds = new Set(["maya"]);
  expect(getGraphVisualState("maya", "targets", matchingIds, null)).toBe("matching");
  expect(getGraphVisualState("theo", "targets", matchingIds, null)).toBe("dimmed");
  expect(getGraphVisualState("theo", "targets", matchingIds, "theo")).toBe("active");
  expect(getGraphVisualState("theo", "all", matchingIds, null)).toBe("neutral");
});
```

Use this signature:

```ts
export type GraphVisualState = "neutral" | "matching" | "dimmed" | "active";
export function getGraphVisualState(
  personId: string,
  filter: RelationshipFilter,
  matchingIds: ReadonlySet<string>,
  activeId: string | null,
): GraphVisualState;
```

- [ ] **Step 2: Run the test and confirm failure**

Run:

```bash
npm test -- tests/graph-filters.test.ts
```

Expected: FAIL because `getGraphVisualState` does not exist.

- [ ] **Step 3: Implement visual priority and filter colors**

Implement the helper in `src/lib/graph-filters.ts` with priority: active, All/neutral, matching, dimmed. Add stable halo colors:

```ts
export const FILTER_HALO_COLOR: Record<Exclude<RelationshipFilter, "all">, string> = {
  "inner-circle": "#b08a47",
  reconnect: "#b65f43",
  recent: "#748468",
  targets: "#6c648f",
};
```

These colors identify the selected action view only; they do not replace relevance rims.

- [ ] **Step 4: Render the restrained pulse and progressive labels**

Use `useReducedMotion()` in `ForceGraphCanvas`. For matching nodes, draw a halo outside all existing relevance/selection rings. Compute a scale-stable pulse:

```ts
const phase = (performance.now() % 3200) / 3200;
const pulse = reduceMotion ? 0.5 : (Math.sin(phase * Math.PI * 2) + 1) / 2;
const haloOffset = (7 + pulse * 2) / scale;
const haloAlpha = 0.42 + pulse * 0.18;
```

Run a `requestAnimationFrame` effect only while a non-All filter is active and reduced motion is false. Each frame calls `graphRef.current?.refresh()` and cancels cleanly on dependency change/unmount. Do not reheat the physics simulation for the visual pulse.

Apply these presentation rules:

- dimmed node alpha: `0.14`;
- dimmed link alpha: at most `0.08`;
- matching node alpha: `1` plus halo;
- active hovered/selected node: existing active ring plus full opacity, whether or not it matches;
- when a non-All filter is active, always label matching, selected, hovered, and self nodes; suppress other labels below a chosen zoom threshold such as `globalScale < 0.9`;
- when All is active, preserve current labels at normal zoom and suppress ordinary labels only at low zoom.

The self node stays legible but receives a group halo only if it is part of the selected filter, which canonical selectors currently exclude.

- [ ] **Step 5: Run pure tests and the complete automated suite**

Run:

```bash
npm test -- tests/graph-filters.test.ts
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands PASS and the production build completes.

- [ ] **Step 6: Commit the canvas visual slice**

```bash
git add src/lib/graph-filters.ts tests/graph-filters.test.ts src/components/network/ForceGraphCanvas.tsx
git commit -m "feat: emphasize active relationship groups"
```

---

### Task 6: Add representative data, documentation, and browser QA

**Files:**
- Modify: `data/people/maya-patel.md`
- Modify: `README.md`
- Modify: `docs/qa/visual-qa.md`
- Create: `docs/qa/screenshots/enhancement-default-1440.png`
- Create: `docs/qa/screenshots/enhancement-filter-1440.png`
- Create: `docs/qa/screenshots/enhancement-prep-1440.png`

**Interfaces:**
- Consumes: complete Conversation Prep, filters, drag persistence, Reset layout, and reduced-motion behavior from Tasks 1–5.
- Produces: a discoverable example record, user instructions, and verified browser evidence.

- [ ] **Step 1: Add useful fictional Conversation Prep seed content**

Add this section to `data/people/maya-patel.md` before Interactions:

```markdown
## Conversation Prep

### Their world

Maya's platform group is clarifying ownership boundaries across product teams.

### What they care about

- Clear decision rights
- Platform work tied to measurable product outcomes

### Remember

Charlie offered to share a concise platform operating-model example.

### Next conversation

- Ask how the ownership discussion landed
- Share the operating-model example if it is still useful
```

- [ ] **Step 2: Document the feature and local storage boundary**

In `README.md`, add:

- the exact `## Conversation Prep` / H3 schema;
- that all four blocks are optional;
- that the app only displays the content and Copy template never edits files;
- the five filter meanings;
- dim-versus-hide behavior;
- drag persistence in browser-local storage and Reset layout behavior;
- the observation-versus-assumption privacy guidance;
- the existing workflow: edit Markdown, save, then Refresh people.

- [ ] **Step 3: Run final deterministic verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: tests, typecheck, lint, and production build PASS; `git diff --check` prints nothing.

- [ ] **Step 4: Run production browser QA**

Start or restart the production server with:

```bash
npm run start -- --hostname 127.0.0.1 --port 3141
```

At `http://127.0.0.1:3141/`, verify and record in `docs/qa/visual-qa.md`:

1. All five filter buttons are visible and only one is pressed.
2. Inner Circle, Reconnect, Recent, and Targets each emphasize the canonical people, dim the rest, and preserve the whole topology.
3. The halo breathes slowly without changing label position.
4. With reduced motion enabled, the halo remains static.
5. Hover and selected states remain dominant over filtering.
6. Drag Maya to a clearly different position, refresh, and confirm the position persists.
7. Reset layout, refresh, and confirm the fixed position is gone.
8. Select Maya and confirm Next conversation precedes Latest interaction.
9. Select a person without prep, copy the template, and confirm status feedback.
10. Check default, selected-detail, and filtered views at 1440px; confirm the toolbar does not overlap the graph label, tooltip, or detail panel.

Capture the three named screenshots after the corresponding states are verified.

- [ ] **Step 5: Commit the documentation and QA slice**

```bash
git add data/people/maya-patel.md README.md docs/qa/visual-qa.md docs/qa/screenshots/enhancement-default-1440.png docs/qa/screenshots/enhancement-filter-1440.png docs/qa/screenshots/enhancement-prep-1440.png
git commit -m "docs: verify map and conversation prep enhancements"
```

---

## Final review gate

- [ ] Read the implementation diff against `docs/superpowers/specs/2026-08-29-orbit-map-and-conversation-prep-design.md`.
- [ ] Confirm every spec requirement maps to Tasks 1–6 and no out-of-scope cluster or graph-engine work entered the branch.
- [ ] Run `rg -n "TB[D]|TO[D]O|implement[ ]later|similar[ ]to Task" docs/superpowers/plans/2026-08-29-orbit-map-and-conversation-prep.md` and confirm no prohibited plan placeholders remain.
- [ ] Run `npm test && npm run typecheck && npm run lint && npm run build` from a clean working tree and retain the command evidence.
- [ ] Review the three enhancement screenshots for clipped controls, label collisions, unreadable dimming, and motion-dependent meaning.
