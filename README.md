# Orbit

## Product

Orbit is a private, local-first relationship map for maintaining a professional network. It is desktop-first, read-only, and local-only: each person is a human-readable Markdown record and the application is a visualization, navigation, and decision-support layer over those records. It is not a CRM, does not provide editing forms, and does not send data to a hosted service.

The four overlapping views answer distinct questions: who is in the Inner Circle, who is overdue for reconnection, who has been contacted recently, and who is a deliberate Target. Selecting a person in the sidebar, graph, or search opens the same detail panel.

## Architecture

This is a TypeScript, React, and Next.js App Router application with Tailwind CSS. The root page is dynamically rendered and reads `data/people/*.md` on every request. The server separates frontmatter, parses the known Markdown sections, validates the full collection, and passes a serializable `PeopleDataset` to the client workspace. The client derives the sidebar selectors and relationship edges/graph model from that dataset.

The graph is a client-only canvas; the sidebar, Cmd/Ctrl+K command palette, and detail panel are accessible DOM alternatives. There is no file watcher or polling loop. After changing Markdown in VS Code, use the in-app Refresh control or reload the browser; either causes the local server to reread the repository files without a server restart. A malformed record produces a file-specific error screen instead of showing stale data.

Production remains local: `npm run build` followed by `npm run start` serves the app through the local Node server on IPv4 loopback (`127.0.0.1`) and continues to reread the current repository files on refresh.

## Markdown schema

Put exactly one Markdown file per person directly in `data/people/`. Only that fixed directory is scanned, and the record ID is never used as a filesystem path.

Supported frontmatter properties are:

| Property | Requirement / meaning |
| --- | --- |
| `id` | Required, unique lowercase slug such as `maya-patel`. |
| `name` | Required, non-empty display name. |
| `type` | `self` for the single root record; omit it or use `person` for a contact. Exactly one record must be `self`. |
| `company` | Optional organization name. |
| `team` | Optional team or function. |
| `role` | Optional role or title. |
| `relationship_strength` | Required integer from 1 through 5 for contacts; independent of relevance. |
| `relationship_type` | Optional concise label such as `mentor` or `former_colleague`. |
| `strategic_relevance` | Required `low`, `medium`, or `high` for contacts. |
| `last_contact` | Optional real calendar date in `YYYY-MM-DD` format. |
| `desired_cadence_days` | Optional positive integer. When present, it defines a deliberate maintenance cadence. |
| `inner_circle` | Optional boolean, default `false`. |
| `target` | Optional boolean, default `false`. |
| `introduced_by` | Optional ID of another known person. It cannot be missing or self-referential. |
| `tags` | Optional array of non-empty strings, default `[]`; included in search. |

The `self` record does not need relationship strength, relevance, cadence, or contact metadata. Contact records do require strength and relevance. Validation also blocks duplicate IDs, malformed frontmatter, invalid dates, invalid enum/range values, invalid introductions, future contact dates, unreadable files, and any self-record count other than one. More than ten Inner Circle records and a frontmatter date older than the newest interaction are non-blocking diagnostics.

## Adding a person

Create a new `data/people/<id>.md` file, using a lowercase-slug ID and the required contact fields. For example:

```markdown
---
id: alex-rivera
name: Alex Rivera
company: Example Studio
team: Product
role: Principal
relationship_strength: 3
strategic_relevance: medium
last_contact: 2026-08-20
desired_cadence_days: 45
inner_circle: false
target: true
introduced_by: maya-patel
tags:
  - product
  - platform
---

# Alex Rivera

## Why they matter

Short source-backed note.

## Context

How you know this person.

## Interactions

### 2026-08-20 — Coffee chat

Discussed a possible collaboration.

### Follow up

- Send the relevant article.
```

Save the file, then refresh the app. The record is not editable in Orbit itself; edit Markdown in your editor. The detail panel’s **Open Markdown** link is generated only for the already validated, allowlisted record path using a `vscode://file/...` URI. If VS Code does not handle that URI, use **Copy path** and open the copied local path in your editor.

## Interaction history

Under `## Interactions`, each date-shaped level-three heading starts an interaction:

```markdown
### 2026-08-18 — Coffee chat

Discussion notes in Markdown.
```

The parser captures the date, title, and Markdown body until the next level-three heading or the end of `## Interactions`; newest valid interactions are shown first. `### Follow up` and `### Follow-up` are reserved person-level blocks. Either ends the preceding interaction, is excluded from that interaction’s body, and contributes its Markdown to the separate Follow-up area in the detail panel. It is not part of only the latest interaction.

`last_contact` in frontmatter is canonical when present. Otherwise the newest valid interaction date becomes the effective last-contact date. When frontmatter is older than a parsed interaction, Orbit keeps the frontmatter value and emits a non-blocking diagnostic. All dates are calendar dates, not timestamps: elapsed days use UTC calendar-day arithmetic to avoid daylight-saving and local-midnight shifts.

`## Why they matter` and `## Context` are also extracted for the detail panel. They are optional; unknown Markdown remains valid and missing narrative sections render as compact omissions rather than validation errors.

## Derived views

The sidebar views deliberately overlap; a person can appear in several of them.

1. **Inner Circle:** contacts with `inner_circle: true`, ordered by relationship strength descending, effective last-contact date descending, then name.
2. **Recent conversations:** contacts with an effective last-contact date from 0 through 30 calendar days before the current date, inclusive; ordered most recent first, then name.
3. **Reconnect:** contacts only when an effective last-contact date and `desired_cadence_days` both exist and elapsed calendar days are greater than that cadence. The displayed overdue value is `elapsed days - desired cadence days`; never-met people are excluded. Results sort by most overdue, then strength descending, then name.
4. **Targets:** contacts with `target: true`, including never-met people and weak ties; ordered relevance high-to-low, then strength descending, then name.

## Relationships

Orbit builds a small normalized graph edge model from validated people:

- Every contact gets one implicit, undirected `direct` edge from the self record. Its weight reflects relationship strength.
- A person with `introduced_by` gets one directed, dashed `introduced_by` edge from the introducer to that person.

This keeps targets connected while preserving meaningful topology. The canvas graph supports pan, zoom, hover metadata, and selection; names, a relationship-strength radius, and an independent strategic-relevance rim communicate different signals. Select the same people through the semantic sidebar or keyboard command palette when canvas interaction is not appropriate.

## Development

Use Node 22 or newer and the lockfile-managed dependencies. Both `npm run dev` and `npm run start` explicitly bind to `127.0.0.1`, so Orbit is reachable only from this computer by default.

```bash
npm ci                 # clean, reproducible install
npm run dev            # local development server
npm test               # Vitest suite
npm run test:watch     # Vitest in watch mode
npm run lint           # ESLint
npm run typecheck      # TypeScript without emitting files
npm run build          # production build
npm run start          # production server (run after build)
```

Do not override the hostname with `0.0.0.0`, a LAN address, or another non-loopback interface unless you intentionally want to expose this private relationship data to other devices and have reviewed the network and firewall implications.

For the final repository audit, also run `git diff --check` and `find . -name "._*" -print`; the latter should produce no AppleDouble sidecar files. Browser smoke checks should exercise sidebar selection, graph selection, Cmd/Ctrl+K open/close and keyboard selection, the detail panel, and a refreshed Markdown edit/error/recovery cycle against `npm run start`.

## Design system

Orbit uses a warm, light, system-UI productivity-tool palette: an off-white canvas, near-black text, quiet gray rails and dividers, terracotta/high, sage/medium, and neutral/low relevance markers, plus a deep ink/teal selection state. CSS tokens define the color, radius (4/6/8 px), shadow, and motion scales (120/220/380 ms).

The layout prioritizes desktop widths around 1280–1800 px: a compact relationship sidebar, flexible graph field, and in-flow detail panel. On narrower screens the detail panel becomes an overlay. The graph is intentionally not a dashboard: there are no gradients, glass effects, decorative blobs, nested card grids, or attention-seeking animations. Motion is limited to short structural feedback; `prefers-reduced-motion` removes graph entrance movement and reduces spatial panel transitions to restrained opacity changes. Visible focus rings remain high contrast.

## Limitations

Orbit is intentionally read-only, desktop-first, local-only, and repository-scoped. It has no accounts, authentication, hosted database, cloud sync, CRUD forms, file watcher, or polling. Markdown changes are visible after Refresh or a normal browser reload, not automatically. The application reads only direct Markdown files in `data/people/`; it does not ingest email, calendars, LinkedIn, or external relationship data.

The VS Code URI is a convenience, not a privileged file-opening API; Copy path is the dependable fallback. Canvas nodes are not individually keyboard controls, so use the sidebar and Cmd/Ctrl+K palette for fully keyboard-accessible person selection.

## Future ideas

These V2 capabilities are deliberately deferred and are absent from the source and dependencies: shortest warm-introduction paths; richer typed edges; relationship timelines; strength-by-relevance matrices; organization clustering; graph filtering; automated stale-relationship recommendations; interaction analytics; calendar or email ingestion; local-LLM features; semantic search; natural-language queries; suggested follow-ups; organization mapping; and opportunity mapping.
