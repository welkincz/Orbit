# Orbit Map Visual V2 — Design

Date: 2026-08-29
Status: Approved for implementation

## Goal

Make the relationship field visibly feel like Orbit without turning it into a game or an always-moving dashboard. The self node must remain the stable visual anchor, motion must communicate relationship direction, and a group filter must create a clear focused composition while preserving surrounding context.

## Approved behavior

- The self node is a larger Solar Anchor with a dark core, gold corona, short rays, and a subtle 5–6 second corona breath. It never dims under a relationship filter.
- Person nodes remain circular planets. A matching group uses one soft colored halo; strategic relevance remains one thin semantic rim; selection uses a solid teal core. Avoid stacked decorative rings.
- Direct relationships remain static. Introduced-by links that belong to the active filtered group carry one slow directional particle. Selecting a person emits one brighter, faster particle on each connected introduced-by link.
- When a non-All filter is selected, the camera fits the self node plus matching people, while dimmed context remains rendered outside the focus area. Returning to All fits the complete graph.
- Reduced-motion mode removes breathing and particles and performs camera changes without animation.

## Constraints

- Keep `react-force-graph-2d` and the current local-first read-only architecture.
- Do not add dependencies or change the Markdown/domain schema.
- Preserve drag-and-drop and persisted node positions.
- Keep the existing direct versus introduced-by relationship semantics.

## Verification

- Pure tests cover self visual priority, filter focus membership, and continuous-particle eligibility.
- Existing graph, filter, layout, pointer, type, lint, and build checks remain green.
- Browser QA confirms the Solar Anchor stays visible, slow directional motion is observable under a group filter, node rings are simplified, and filter transitions frame the intended people.
