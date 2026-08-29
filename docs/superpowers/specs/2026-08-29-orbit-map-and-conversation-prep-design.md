# Orbit Map Interaction and Conversation Prep Enhancement — Design

Date: 2026-08-29
Status: Approved for implementation

## 1. Product intent

This enhancement makes Orbit's center map easier to explore and makes each person record more useful immediately before a conversation. It preserves the existing local-first, Markdown-as-source-of-truth, read-only application model.

The map should answer both "where does this person sit in my network?" and "who needs my attention now?" The person detail should answer "what will help me have a better next conversation?"

## 2. Chosen approach

Keep the existing `react-force-graph-2d` implementation. Its current interaction model already supports the required dragging, fixed coordinates, dynamic highlighting, and animated rendering. Replacing it with G6, Sigma.js, or Cytoscape.js would add migration cost without improving the present user-scale problem.

The main scaling risk is comprehension rather than raw rendering performance. Orbit will add progressive visual disclosure and filtering before considering a graph-engine change.

## 3. Relationship/action filters

The center map receives a compact filter control with five mutually exclusive views:

- All
- Inner Circle
- Reconnect
- Recent
- Targets

These views use the existing selector definitions and remain overlapping properties of people, not a new mutually exclusive `group` field.

Selecting a view keeps the full graph visible so relationship context is not lost:

- matching nodes retain full opacity and receive a colored halo plus a gentle breathing pulse;
- nonmatching nodes and their links are dimmed;
- the selected or hovered person remains visually dominant regardless of the active filter;
- selecting All removes the group emphasis.

The effect must be restrained, must not cause labels to jitter, and must stop when the operating system requests reduced motion. Group emphasis uses an outer halo so the existing strategic-relevance rim colors keep their current meaning.

## 4. Dragging and persisted layout

People can be dragged to reorganize the map. After a meaningful drag ends, the node receives fixed `fx` and `fy` coordinates. The coordinates persist in browser `localStorage`, keyed by person ID and a versioned Orbit layout key, so the arrangement survives refreshes without changing Markdown.

Persistence rules:

- only finite coordinates for IDs in the current dataset are restored;
- missing, renamed, or deleted people are ignored safely;
- newly added people enter through the normal force layout;
- storage failures never block the graph;
- a Reset layout control clears the saved coordinates, releases fixed nodes, reheats the simulation, and restores the automatic layout;
- a short click without an actual drag must not pin or move a node.

## 5. Visual density and growth

The concern that the graph will become messy is valid. Permanent labels, dense edges, and a central self-to-contact topology can become a visual hairball before the renderer reaches its technical limit.

This enhancement handles the immediate growth path by:

- using filters to focus attention without destroying context;
- giving matching, hovered, and selected nodes label priority;
- reducing label prominence for dimmed nodes;
- keeping motion subtle and purposeful;
- retaining pan and zoom.

Organization clustering, one-person ego views, collapsed clusters, and alternate "Color by" modes remain later enhancements. They should be added only when the actual network size demonstrates the need.

## 6. Conversation Prep data model

Person Markdown may contain one optional `## Conversation Prep` section with four recognized level-three subsections:

```markdown
## Conversation Prep

### Their world
Their team dynamics, responsibilities, current pressures, and priorities.

### What they care about
Goals, motivations, interests, preferences, and things they respond well to.

### Remember
Important context, commitments, personal details, and sensitivities.

### Next conversation
Questions to ask, useful topics, and matters to follow up on.
```

This does not replace the existing `team` frontmatter property. `team` remains the short formal organization or function name; `Their world` holds richer freeform context.

The parsed person model gains a `conversationPrep` object with optional Markdown strings for `theirWorld`, `whatTheyCareAbout`, `remember`, and `nextConversation`. Unknown headings remain valid Markdown but are not rendered as recognized prep fields.

## 7. Person-detail presentation

The Conversation Prep panel appears in the detail view after core relationship context and before historical interactions/follow-up material.

- `Next conversation` appears first with the strongest visual emphasis because it is immediately actionable.
- `Their world`, `What they care about`, and `Remember` follow as compact expandable subsections.
- empty subsections are omitted;
- when the whole section is absent, the detail shows a small Copy template action instead of four empty boxes;
- copying the template does not edit the source file and preserves Orbit's read-only boundary.

The copy should encourage recording known facts and Charlie's clearly framed observations, not sensitive speculation or unsupported assumptions.

## 8. Accessibility and interaction safeguards

- Filter buttons expose pressed/selected state to assistive technology.
- Filter effects are not communicated by color alone; opacity, halo weight, and labels reinforce the state.
- Keyboard selection and command-search behavior remain unchanged.
- Reduced-motion users receive static halos with no breathing animation.
- Reset layout and Copy template provide clear success feedback.
- Canvas hit testing must continue to distinguish click, drag, hover, and background pan reliably.

## 9. Verification expectations

Automated coverage should verify:

- Conversation Prep parsing with all, partial, empty, and absent subsections;
- filter membership reuses the canonical selectors;
- active-filter visual state derivation, including selected and hovered overrides;
- persisted coordinate validation, restoration, and reset behavior;
- reduced-motion behavior where practical at the component boundary;
- Copy template content.

Browser QA should verify dragging, refresh persistence, Reset layout, each filter, breathing/dimming balance, reduced-motion fallback, detail-panel ordering, template copying, and graph behavior at representative desktop widths.

## 10. Out of scope

- editing Markdown from Orbit;
- organization/team clustering;
- arbitrary user-defined group management;
- alternate graph engines;
- automatic inference of a person's motivations or preferences;
- cloud storage or sync of node positions;
- mobile-first graph rework.
