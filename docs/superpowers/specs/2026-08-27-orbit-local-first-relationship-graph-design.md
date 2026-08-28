# Orbit Local-First Professional Relationship Graph — Design

Date: 2026-08-27
Status: Approved for implementation

## 1. Product intent

Orbit is a local-first desktop-oriented application for understanding and deliberately maintaining a personal professional network. It is not a sales CRM. One person maps to one human-readable Markdown file, and those files remain the source of truth. The application is a read-only visualization, navigation, and decision-support layer over that corpus.

V1 must help answer four practical questions:

1. Who forms the strongest part of the network?
2. Which worthwhile relationships are overdue for contact?
3. Who has been contacted recently?
4. Which people are deliberate relationship targets?

The graph provides network context; the sidebar and command palette provide fast, accessible routes to the same people; the detail panel provides enough interaction history to decide what to do next.

## 2. Scope

### Included in V1

- A local Next.js application that reads repository-local Markdown files.
- One `data/people/*.md` file per person, including exactly one `type: self` record.
- Validated frontmatter and structured extraction from known Markdown sections.
- Approximately 11 fictional contacts plus the self record.
- Independent relationship-strength and strategic-relevance dimensions.
- Overlapping Inner Circle, Reconnect, Recent, and Target derived views.
- A stable, interactive two-dimensional relationship graph.
- A progressive person-detail panel.
- Cmd/Ctrl+K person search with complete keyboard operation.
- A safe “Open Markdown” action and a copy-path fallback.
- Unit tests for parsing, validation, selectors, self detection, dates, and edges.
- Two browser-based visual-QA and polish passes.
- A complete README, final command verification, screenshots, and a QA log.

### Explicitly excluded

Authentication, accounts, hosted databases, cloud sync, CRUD forms, LinkedIn scraping, mail/calendar ingestion, AI summaries, automated reminders, recommendation engines, shortest-path analysis, organization clustering, analytics dashboards, and other V2 ideas are not part of this build.

## 3. Chosen architecture

### 3.1 Runtime

Use TypeScript, React, the Next.js App Router, Tailwind CSS, and a small set of locally owned shadcn-style components backed by Radix primitives where accessibility behavior matters. The application runs under the local Node server rather than as a static export because runtime filesystem reads are a core requirement.

The root page is dynamically rendered. On each request it reads `data/people/`, validates and parses every Markdown file, derives graph data, and passes a serializable dataset into the client workspace. A compact refresh control calls `router.refresh()`, so changes made in VS Code are visible without restarting the server. A normal browser refresh has the same effect. V1 does not add a file watcher or polling loop.

Production is still local: `npm run build` followed by `npm run start` serves the application and continues to read the current Markdown files at request time.

### 3.2 Why this approach

This is preferred over a Vite application plus a custom Express server because Next.js already supplies the server/client boundary and build pipeline. It is preferred over Electron or Tauri because V1 does not need packaging, native menus, or privileged filesystem access. The browser remains a read-only view; Markdown editing stays in VS Code.

### 3.3 Dependency boundary

Expected focused dependencies are:

- `gray-matter` for frontmatter separation;
- `zod` for runtime schema validation;
- a Markdown AST parser (`unified` and `remark-parse`) for known headings and interaction blocks;
- `react-force-graph-2d` for the canvas graph;
- `cmdk` and Radix Dialog for the command palette;
- `react-markdown` to render extracted narrative and interaction Markdown in the detail panel;
- Motion for the detail panel and small spatial transitions where CSS alone is insufficient;
- Vitest and Testing Library for lightweight automated tests.

The implementation will not install every referenced UI library. shadcn/ui, Motion Primitives, Animate UI, Magic UI, and Cult UI are design-engineering references, not a dependency list.

## 4. Repository organization

The intended initial structure is:

```text
data/
  people/
    charlie.md
    ...fictional contacts...
docs/
  qa/
  superpowers/specs/
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    network/
      NetworkGraph.tsx
      NetworkWorkspace.tsx
    people/
      PersonDetail.tsx
      RelationshipSidebar.tsx
    search/
      SearchCommand.tsx
    ui/
      ...small local primitives...
  lib/
    dates.ts
    markdown.ts
    people.ts
    relationships.ts
    selectors.ts
  types/
    person.ts
tests/
  fixtures/
  markdown.test.ts
  people.test.ts
  relationships.test.ts
  selectors.test.ts
```

Parsing and business rules remain framework-independent. React components consume already validated domain objects and never reimplement selector rules.

## 5. Domain model

### 5.1 Person

A contact record supports these frontmatter properties:

| Property | Rule |
| --- | --- |
| `id` | Required unique lowercase slug. |
| `name` | Required non-empty display name. |
| `type` | `self` for the single root record; omitted or `person` for contacts. |
| `company` | Optional organization name. |
| `team` | Optional team or function. |
| `role` | Optional role/title. |
| `relationship_strength` | Integer 1–5 for contacts. Independent of strategic relevance. |
| `relationship_type` | Optional concise label such as `colleague`, `mentor`, or `former_colleague`. |
| `strategic_relevance` | `low`, `medium`, or `high` for contacts. |
| `last_contact` | Optional ISO calendar date (`YYYY-MM-DD`). |
| `desired_cadence_days` | Optional positive integer. Its presence means the relationship has a deliberate maintenance cadence. |
| `inner_circle` | Optional boolean; defaults to `false`. |
| `target` | Optional boolean; defaults to `false`. |
| `introduced_by` | Optional ID of another known person. |
| `tags` | Optional string array; defaults to empty. |

Self does not require relationship strength, relevance, cadence, or contact metadata. Contact records require strength and strategic relevance. IDs must be unique, and exactly one record must have `type: self`.

The parsed domain object also contains its repository-relative source path, extracted narrative sections, parsed interactions, and an effective last-contact date.

### 5.2 Interaction history

The parser recognizes the following convention beneath `## Interactions`:

```markdown
### 2026-08-18 — Coffee chat

Discussed:

- Platform migration
- Team structure
```

Each date-shaped level-three heading starts an interaction and captures its title and Markdown content until the next level-three heading or the end of the Interactions section. A level-three heading named `Follow up` or `Follow-up` is a reserved person-level block: it terminates the preceding interaction, is excluded from that interaction’s body, and contributes its list/content to the separate follow-up area in the detail panel. It does not belong only to the latest interaction. Tests use a fixture containing an interaction followed by `### Follow up` and assert that the content appears exactly once. Unknown body content remains valid Markdown; the parser only extracts the convention it understands.

`last_contact` in frontmatter wins when present. Otherwise, the newest valid interaction date becomes the effective last-contact date. A discrepancy between frontmatter and a newer parsed interaction produces a non-blocking diagnostic rather than silently changing the canonical value.

The parser also extracts the content under `## Why they matter`, `## Context`, and `### Follow up` for the detail panel. Missing narrative sections result in compact omitted or empty states, not validation failures.

### 5.3 Calendar semantics

All stored dates are calendar dates, not timestamps. Date arithmetic converts `YYYY-MM-DD` values into UTC calendar days to avoid daylight-saving and local-midnight errors. Selector functions accept `currentDate` as an argument, making tests deterministic. Future `last_contact` values are invalid.

## 6. Derived views

Derived views overlap by design; they are never represented by one mutually exclusive category field.

### Inner Circle

Include contacts where `inner_circle === true`. Sort by relationship strength descending, then effective last-contact date descending, then name. Seed data will contain exactly three, and validation will warn—not fail—if more than ten are marked.

### Recent

Include contacts whose effective last-contact date is from 0 through 30 calendar days before `currentDate`, inclusive. Sort most recent first, then name.

### Reconnect

Include a contact only when all are true:

- an effective last-contact date exists;
- `desired_cadence_days` exists;
- elapsed calendar days are greater than the desired cadence.

The overdue value is `elapsedDays - desiredCadenceDays`. Never-met contacts have no effective last contact and are excluded. Sort by days overdue descending, then relationship strength descending, then name.

### Targets

Include contacts where `target === true`, including people never met and existing weak ties. Sort strategic relevance high-to-low, then relationship strength descending, then name.

## 7. Relationship graph model

The graph uses a small normalized edge type:

```ts
type RelationshipEdge = {
  id: string;
  source: string;
  target: string;
  kind: "direct" | "introduced_by";
  directed: boolean;
  strength?: number;
};
```

V1 creates:

1. one implicit, undirected `direct` edge from the self record to every contact, representing the user’s professional relationship with that person;
2. one directed `introduced_by` edge from the introducer to the introduced person when `introduced_by` is present.

This avoids isolated targets while preserving the meaningful person-to-person topology. Missing references and self-references are blocking validation errors. Edge extraction is a pure function. The normalized edge boundary can later accept explicit frontmatter relationships without changing graph components, but V1 does not implement a larger relationship ontology.

## 8. Data flow and refresh behavior

```text
data/people/*.md
        ↓
frontmatter + Markdown AST parsing
        ↓
schema and cross-record validation
        ↓
Person[] + diagnostics
        ↓
selectors + relationship extraction
        ↓
server-rendered page props
        ↓
client workspace: sidebar · graph · search · detail
```

The browser cannot mutate records. The refresh action asks the server to repeat this pipeline. A bad edit produces an actionable error view naming the file and field; previously loaded client data is not presented as if it were current.

## 9. Application surfaces

### 9.1 Network workspace

The desktop layout has a compact approximately 240-pixel sidebar, a flexible graph canvas, and an approximately 360-pixel detail panel when a person is selected. The panel participates in layout on wide screens so it does not hide important graph content. On narrower screens it becomes an overlay sheet. Desktop widths from roughly 1280–1800 pixels receive priority.

The sidebar shows Inner Circle, Reconnect, Recent, and Targets simultaneously as derived lists. A person may appear in several sections. Rows are compact semantic buttons with rest, hover, focus, pressed, and selected states. Reconnect rows show a muted tabular overdue count. Clicking a row selects the same graph node and opens the detail panel.

### 9.2 Graph

Use a responsive `react-force-graph-2d` canvas loaded only on the client. A deterministic node order, restrained forces, a finite cooldown, and one initial fit keep the layout stable. The graph stops meaningful simulation after settling and does not re-fit on ordinary selection.

Visual channels remain independent:

- relationship strength changes node radius within a narrow range and the weight of the direct self edge;
- strategic relevance changes a small outer rim/marker using restrained terracotta, sage, and neutral tones;
- the self node uses a distinct geometry/fill and a clear label;
- `introduced_by` edges use a lighter directional/dashed treatment distinct from direct edges.

All names remain legible at normal zoom with only 12 total nodes. Hover emphasizes the node and direct neighbors and opens a compact DOM tooltip containing name, role/team, relationship strength, and strategic relevance. The tooltip is viewport-clamped, non-interactive, and dismissed when the pointer leaves; the same information remains available through keyboard-accessible sidebar/search selection. Selection appears immediately, emphasizes connected nodes and edges, softly reduces unrelated elements, then opens the detail panel. The viewport only recenters when the selected node is materially out of view. Pan and zoom remain available.

Because canvas nodes are not naturally keyboard accessible, every person is fully reachable through semantic sidebar buttons and the command palette. The canvas receives an accessible description rather than pretending each painted node is a DOM control.

### 9.3 Person detail

The detail panel progressively presents:

- name, role, team, and company;
- five-step relationship-strength indicator;
- strategic relevance as text plus a restrained marker;
- effective last contact and interaction count;
- introducer with a selectable person link;
- Why they matter and Context excerpts;
- latest interaction date, type, and discussion summary;
- follow-up items;
- Open Markdown and Copy path actions.

Selection styling happens synchronously. The panel enters over approximately 220 ms; closing is slightly faster. Text lines do not animate individually.

The server resolves each validated record to an exact file beneath `data/people/`. “Open Markdown” uses a `vscode://file/...` link generated from that allowlisted path. Copy path is the reliable fallback. No endpoint accepts arbitrary paths, and the application never invokes a shell command from browser input.

### 9.4 Command palette

Cmd+K and Ctrl+K open a Radix-backed `cmdk` dialog. Search covers normalized name, company, team, role, and tags. Results display name first and a concise role/team/company subtitle. Arrow keys change the active result, Enter selects it and opens details, and Escape closes the palette. Matching text receives subtle emphasis. Search and section empty states are compact text, without illustrations or skeletons.

## 10. Visual system

The interface uses a warm, light productivity-tool palette rather than a generic blue/purple SaaS theme:

- warm off-white application background;
- near-black primary text;
- quiet gray secondary text and separators;
- slightly differentiated sidebar and detail surfaces;
- terracotta for high strategic relevance;
- muted sage for medium relevance;
- neutral gray for low relevance;
- a deep ink/teal selected state used sparingly.

Typography uses the local system UI stack for instant offline rendering. Names lead the hierarchy; role/team/company follow; metadata is smaller and quieter. Dates and overdue counts use tabular numerals.

Spacing and styling are defined through CSS tokens. The radius scale is restrained (approximately 4, 6, and 8 pixels). Shadows are reserved for the command palette and narrow-screen overlay panel. There are no gradients, glass effects, decorative blobs, dashboard KPI cards, or nested card grids.

Motion tokens are approximately 120 ms fast, 220 ms normal, and 380 ms slow. `prefers-reduced-motion` removes graph entrance motion and converts spatial panel transitions to restrained opacity changes. Focus rings remain visible and high contrast.

## 11. Errors, validation, and diagnostics

Blocking errors include malformed frontmatter, duplicate or invalid IDs, missing required contact fields, invalid enum/range/date values, more or fewer than one self record, invalid references, and unreadable data files. The local error screen names the source file and gives a concise correction message without exposing a stack trace.

Non-blocking diagnostics include an unusually large Inner Circle and a frontmatter last-contact date older than the newest parsed interaction. Diagnostics can appear in development output and are documented in the README; they do not add dashboard noise.

The parser only scans Markdown files directly inside the fixed people directory. IDs never become filesystem paths. The Open Markdown action uses the already resolved source path from a validated record, preventing traversal.

## 12. Seed-data design

Create one self file and approximately 11 fictional people across invented organizations and generic professional functions. The corpus must exercise:

- exactly three Inner Circle contacts;
- at least three recent contacts;
- at least two overdue reconnect contacts with different overdue durations;
- at least two targets, including one never-met target;
- relationship strengths from 1 through 5;
- all three strategic-relevance levels;
- several introductions that produce visible non-self topology;
- varied teams, roles, tags, and realistic interaction histories;
- at least one person who appears in multiple derived views.

Names and organizations must be visibly fictional and contain no confidential employment details.

## 13. Testing and verification

### Automated tests

Vitest tests cover:

- valid and invalid frontmatter parsing;
- known-section and interaction extraction;
- duplicate IDs and person validation;
- exactly-one-self detection without hardcoded IDs;
- effective last-contact precedence;
- UTC calendar-day arithmetic;
- Inner Circle, Recent, Reconnect, and Target selectors and ordering;
- exclusion of never-met targets from Reconnect;
- implicit direct and introduced-by edge extraction;
- missing relationship references.

A focused Testing Library component test covers command-palette filtering and keyboard selection. Canvas rendering does not receive extensive unit tests in V1.

### Browser QA pass 1

Run the development application in a real browser at 1440×900 and 1280×800. Inspect the default graph, every sidebar section, hover, selection, repeated switching, detail open/close, command search, arrow/Enter/Escape behavior, no-results search, focus states, resize behavior, and reduced motion. Record findings and fixes in `docs/qa/visual-qa.md`; save representative screenshots.

### Browser QA pass 2

After fixes, repeat the inspection with fresh page loads and production-server output. Review graph usefulness, density, hierarchy, cheap-looking interactions, unnecessary decoration, animation noise, panel content, and spatial continuity. Add the second set of findings and fixes to the same QA log and save final screenshots.

### Final commands

The implementation is not complete until all of these pass on the finished tree:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Then launch `npm run start` and verify the production application in the browser. The Markdown source-of-truth check must exercise three states without restarting the server: a valid content edit appears after refresh; an invalid frontmatter edit produces the file-specific actionable error view; correcting that file and refreshing restores the application.

## 14. Implementation phases

1. Initialize the TypeScript/Next.js project and test tooling.
2. Implement domain types, Markdown schema, parser, dates, validation, selectors, edges, seed data, and unit tests.
3. Implement the server data boundary and functional workspace, graph, detail panel, search, and refresh/open-file behaviors.
4. Inspect current shadcn/ui, Motion Primitives, Animate UI, Magic UI, and Cult UI implementations; record useful patterns and consciously rejected decorative patterns in `docs/qa/reference-review.md`. Then establish design tokens and complete the dedicated visual-design pass.
5. Add purposeful motion, focus behavior, and reduced-motion handling.
6. Run browser QA pass 1, document findings, and fix them.
7. Run browser QA pass 2 against the polished/production application, document findings, and fix them.
8. Run a code-quality pass, finish the README, execute final validation, and capture the final structure/results.

## 15. Completion criteria

Orbit is complete only when:

- Markdown remains the working source of truth, including valid-edit, invalid-edit, and recovery-after-correction behavior without a server restart;
- realistic fictional seed records parse and render;
- all four overlapping derived views behave according to this specification;
- the graph is stable, readable, and useful;
- selection is synchronized across graph, sidebar, search, and detail panel;
- keyboard search and accessible alternative navigation work;
- Open Markdown is safely scoped to validated files;
- purposeful motion and reduced-motion behavior are present;
- both browser QA passes and their fixes are documented;
- tests, lint, typecheck, build, and production-runtime checks pass;
- README instructions and limitations are accurate.

## 16. Deliberately deferred to V2

The README will list but the implementation will not include shortest warm-introduction paths, richer typed edges, relationship timelines, strength-by-relevance matrices, organization clustering, graph filtering, automated stale-relationship recommendations, interaction analytics, calendar or email ingestion, local-LLM features, semantic search, natural-language queries, suggested follow-ups, organization mapping, or opportunity mapping.
