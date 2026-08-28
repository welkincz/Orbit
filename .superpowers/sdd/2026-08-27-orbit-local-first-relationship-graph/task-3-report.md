# Task 3 report: Markdown AST parsing and fixed-directory loading

## Status

Implemented and verified on branch `feature/orbit-mvp` in the linked worktree `/Users/charlieg/Coding_project/Orbit/.worktrees/orbit-mvp`.

## Implementation summary

- Added `extractMarkdownSections()` using `unified`, `remark-parse`, heading nodes, and source offsets to preserve original Markdown content.
- Added `parsePersonMarkdown()` using `gray-matter` for frontmatter separation and the existing domain normalizer for canonical fields.
- Added interaction extraction for date-shaped level-three headings, with real-calendar validation through `isISODate`, newest-first stable sorting, and source-order retention for equal dates.
- Implemented case-insensitive reserved `Follow up` / `Follow-up` semantics. The block terminates the preceding interaction, remains person-level content, and stops at the next heading of depth three or less.
- Kept canonical `last_contact` precedence, derived it from the newest interaction only when omitted, and attached `last-contact-mismatch` diagnostics when a newer interaction exists.
- Added real-calendar validation to `normalizeFrontmatter()` and a raw frontmatter preflight because gray-matter coerces an unquoted impossible YAML date such as `2026-02-30` into a rolled-over JavaScript `Date` before normalization.
- Added `loadPeopleFromDirectory()` with sorted direct-child `.md` loading, no recursion, paths derived only from directory entries, empty-directory rejection, and collection validation after parsing.

## TDD evidence

### Baseline

Command:

```text
npm test
```

Result: PASS — 3 files, 19 tests.

### RED 1: missing parser module

Command:

```text
npm test -- tests/markdown.test.ts
```

Result: expected FAIL — Vitest could not resolve `@/lib/markdown`; no parser exports existed.

### GREEN 1: parser and loader behavior

First implementation run:

```text
npm test -- tests/markdown.test.ts
```

Result: 9/11 passed. The run exposed gray-matter's impossible-date coercion and one over-constrained invalid-fixture assertion. The implementation added raw `last_contact` validation with `isISODate`; the fixture assertion was narrowed to the required file-specific invalid-enum behavior.

Second run result: PASS — 1 file, 11 tests.

### RED/GREEN 2: reserved Follow-up boundary

Command:

```text
npm test -- tests/markdown.test.ts
```

RED result: 10/11 passed; the Follow-up Markdown incorrectly included content after a following level-one heading.

After adding the explicit depth-three-or-less terminator, GREEN result: PASS — 1 file, 11 tests.

### RED/GREEN 3: direct frontmatter calendar validation

Command:

```text
npm test -- tests/people.test.ts
```

RED result: 6/7 passed; `normalizeFrontmatter()` accepted `2026-02-30`.

After integrating Task 2's `isISODate`, GREEN result: PASS — 1 file, 7 tests.

## Verification commands and results

Task-specific verification:

```text
npm test -- tests/markdown.test.ts tests/people.test.ts
```

Result: PASS — 2 files, 17 tests at that checkpoint. The later full suite includes the added direct frontmatter-date test.

Fresh final verification:

```text
npm test
npm run typecheck
npm run lint
```

Results:

- `npm test`: PASS — 4 files, 31 tests, 0 failures.
- `npm run typecheck`: PASS — exit 0.
- `npm run lint`: PASS — exit 0.

## Files changed

- `src/lib/markdown.ts` — new AST parser, person parser, and fixed-directory loader.
- `src/lib/people.ts` — real ISO calendar-date validation for normalized frontmatter.
- `tests/markdown.test.ts` — parser, boundary, date, loader, and collection tests.
- `tests/people.test.ts` — direct impossible-date normalization regression test.
- `tests/fixtures/markdown/maya-patel.md` — exact valid parser fixture.
- `tests/fixtures/markdown/invalid-contact.md` — required invalid parser fixture.
- `.superpowers/sdd/2026-08-27-orbit-local-first-relationship-graph/task-3-report.md` — this report.

## Self-review

- Confirmed framework independence: the domain/parser module imports no Next.js or React APIs.
- Confirmed Markdown is parsed by AST headings; only the specified interaction-heading and reserved-heading patterns are recognized.
- Confirmed extracted narrative, interaction, and follow-up bodies use parser-provided source offsets rather than Markdown reserialization.
- Confirmed unknown level-three headings terminate an interaction without creating one.
- Confirmed reserved Follow-up content is excluded from interactions and captured once at person level.
- Confirmed interaction dates are real calendar dates and stable-sorted newest-first.
- Confirmed frontmatter `last_contact` remains canonical and impossible unquoted YAML dates are rejected before gray-matter's timestamp coercion can hide them.
- Confirmed the loader considers only sorted direct `.md` files, ignores nested/non-Markdown entries, and passes the parsed result through `validatePeopleCollection()`.
- Confirmed file-specific parse failures retain `sourceRelativePath`.
- Ran `git diff --check` before finalization; no whitespace errors were reported.

## Concerns

No blocking concerns. The raw frontmatter guard is deliberately narrow to the top-level `last_contact` scalar; it is not a second general-purpose YAML parser. This is necessary because gray-matter's YAML timestamp coercion otherwise normalizes an impossible unquoted date before the existing domain validator sees it.

## Fix Round 1

### Findings addressed

1. Moved raw `last_contact` validation into a gray-matter YAML-engine callback so validation runs on the original frontmatter scalar before js-yaml timestamp coercion.
2. Hardened the narrow scalar syntax boundary to accept valid YAML spacing before/after the delimiter, trailing horizontal whitespace, and an optional unquoted trailing comment while still validating the scalar through `isISODate`.
3. Added an immediate `### Follow up` boundary regression: the preceding interaction has an empty body, contains no follow-up text, and the person-level follow-up contains the action exactly once.
4. Added exact assertions for all three extracted person areas: Why they matter, Context, and interaction Markdown, preventing H2 leakage from being hidden by substring assertions.

### RED evidence

Command:

```text
npm test -- tests/markdown.test.ts
```

Result: expected FAIL — 13 passed, 3 failed. All three failures were the new impossible-date raw syntax cases:

- exact trailing-space case: `last_contact: 2026-02-30   `;
- spacing around the delimiter: `last_contact   :   2026-02-30`;
- delimiter spacing plus an unquoted trailing comment: `last_contact : 2026-02-30   # impossible date`.

In each case, the old guard did not match, gray-matter coerced the value to `2026-03-02`, and parsing incorrectly completed.

The new immediate Follow-up and exact H2 assertions passed against the existing AST implementation, confirming those findings were coverage gaps rather than current production failures.

### GREEN evidence

After moving validation to the YAML-engine callback and delegating parsing to gray-matter's original YAML engine:

```text
npm test -- tests/markdown.test.ts
```

Result: PASS — 1 file, 16 tests, 0 failures.

Covering regression command:

```text
npm test -- tests/markdown.test.ts tests/people.test.ts
```

Result: PASS — 2 files, 23 tests, 0 failures.

### Final verification

Commands and outputs:

```text
npm test
npm run typecheck
npm run lint
git diff --check
```

- `npm test`: PASS — 4 files, 36 tests, 0 failures.
- `npm run typecheck`: PASS — exit 0.
- `npm run lint`: PASS — exit 0.
- `git diff --check`: PASS — no whitespace errors.

### Fix-round files changed

- `src/lib/markdown.ts` — pre-coercion YAML-engine validation and robust scalar syntax boundary.
- `tests/markdown.test.ts` — three impossible-date syntax regressions, immediate Follow-up boundary, and exact H2 section assertions.
- `.superpowers/sdd/2026-08-27-orbit-local-first-relationship-graph/task-3-report.md` — Fix Round 1 evidence.

### Fix-round self-review and concerns

- Confirmed gray-matter still owns frontmatter separation and its built-in YAML engine still parses every field after the date preflight.
- Confirmed a preflight `PeopleDataError` retains the file-specific relative path instead of being replaced by the generic YAML parse error.
- Confirmed valid existing unquoted dates and the exact valid fixture still parse.
- Confirmed the guard remains narrowly scoped to `last_contact`; it does not implement a second YAML grammar.
- No blocking concerns remain from Fix Round 1.
