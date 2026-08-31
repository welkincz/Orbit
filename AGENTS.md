<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Relationship data updates

Apply this section only when the user explicitly asks to add a person, update a
person, record an interaction, or maintain relationship data. Orbit is a
read-only viewer; agents maintain its Markdown source of truth.

### Storage and privacy

- Store every person as one flat file at `data/people/<id>.md`. Do not create
  company, team, business-line, or group subdirectories.
- The existing fictional starter files are the only person records tracked by
  Git. New `data/people/*.md` files are intentionally ignored and local-only.
- Never replace a fictional starter record with a real person. Create a new
  file with a unique ID instead.
- Never force-add, stage, commit, push, or otherwise upload an ignored person
  file. Do not change the privacy rules unless the user explicitly requests it.
- Treat `company`, `team`, `role`, and `tags` as metadata. Use them for
  business-line or group membership instead of filesystem folders.

### Update workflow

1. Read the relevant records before editing. Match an existing person by stable
   `id` and then by name; if the match is missing or ambiguous, ask the user.
2. Preserve all information the user did not ask to change. Append interaction
   history; never replace prior interactions with a summary.
3. Record only facts the user provided or explicitly confirmed. Do not infer
   sensitive traits, private motives, relationship strength, strategic
   relevance, or organizational details.
4. Ask for the minimum missing information needed for a valid record. If a
   relative date such as "today" is clear, use the current local calendar date;
   otherwise ask for the date.
5. After editing, validate the people directory with
   `npm test -- tests/seed-data.test.ts`. For a newly created record, also use
   `git check-ignore -v <path>` and confirm that Git ignores it.
6. Report which record changed, what was added or updated, any information that
   remains unknown, and the validation result.

### Frontmatter schema

Use YAML frontmatter. File names and IDs use the same stable lowercase slug.

```yaml
---
id: alex-rivera                 # required, lowercase slug, unique
name: Alex Rivera               # required
type: person                    # optional for contacts; defaults to person
company: Example Studio         # optional
team: Product                   # optional
role: Principal                 # optional
relationship_strength: 3       # required for a person; integer 1-5
strategic_relevance: medium     # required for a person; low, medium, or high
last_contact: 2026-08-31        # optional real YYYY-MM-DD date, not future
desired_cadence_days: 45        # optional positive integer
inner_circle: false             # optional boolean; defaults to false
target: false                   # optional boolean; defaults to false
introduced_by: maya-patel       # optional existing person ID; never self
tags:                           # optional list of non-empty strings
  - product
  - commercial-banking
---
```

Exactly one record must have `type: self`. Contacts require
`relationship_strength` and `strategic_relevance`; the self record does not.
Do not change a person's `id` after creation unless the user explicitly requests
a migration of all references.

### Markdown body schema

Keep the following headings and omit sections that have no confirmed content:

```markdown
# Alex Rivera

## Why they matter

Durable reason this relationship matters.

## Context

How the user knows this person.

## Conversation Prep

### Their world

Current team or situational context.

### What they care about

- Confirmed priorities or interests

### Remember

- Details or commitments worth remembering

### Next conversation

- Useful question or topic for next time

## Interactions

### 2026-08-31 — Coffee chat

What was discussed and learned.

### Follow up

- Specific next action
```

Interaction headings must use `### YYYY-MM-DD — Kind`. Keep newest interactions
first. When adding a newer interaction, update `last_contact` to that date. A
`### Follow up` block contains current actions, not a second copy of the
conversation notes.

Conversation Prep is for better future conversations. Keep known facts
separate from the user's observations, avoid unsupported judgments, and do not
store sensitive information that is unnecessary for that purpose.
