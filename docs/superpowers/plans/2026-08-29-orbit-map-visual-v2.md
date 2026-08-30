# Orbit Map Visual V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Orbit's approved Solar Anchor, directional relationship motion, simplified planet styling, and filter-focused camera clearly visible in the existing relationship field.

**Architecture:** Keep the canvas component and extract only the visual decisions that need deterministic tests into `graph-filters.ts` and a small `graph-motion.ts` module. The canvas consumes those decisions for painting, particles, and `zoomToFit` filtering without changing graph data or persistence.

**Tech Stack:** TypeScript 6, React 19, Next.js 16, `react-force-graph-2d`, Motion reduced-motion hook, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-29-orbit-map-visual-v2-design.md`

## Global Constraints

- Keep `react-force-graph-2d`; add no dependency.
- Keep Markdown and the domain schema unchanged.
- The self node never dims.
- Continuous particles appear only on emphasized introduced-by links during a non-All filter.
- Reduced-motion disables breathing, particles, and camera transition duration.
- Preserve node dragging and saved layout positions.

---

### Task 1: Visual priority and filter focus

**Files:**
- Modify: `tests/graph-filters.test.ts`
- Modify: `src/lib/graph-filters.ts`
- Modify: `src/components/network/ForceGraphCanvas.tsx`

**Interfaces:**
- Produces: `getGraphVisualState(personId, selfId, filter, matchingIds, activeId)` and `getFilterFocusIds(selfId, filter, matchingIds)`.

- [ ] **Step 1: Write failing tests** asserting the self ID returns `anchor` under a filter and filter focus contains exactly self plus matches.
- [ ] **Step 2: Run `npm test -- tests/graph-filters.test.ts` and confirm the expected failure.**
- [ ] **Step 3: Add the `anchor` state and focus helper, then pass `dataset.selfId` at both canvas call sites.**
- [ ] **Step 4: Run `npm test -- tests/graph-filters.test.ts` and confirm it passes.**

### Task 2: Purposeful link motion

**Files:**
- Create: `tests/graph-motion.test.ts`
- Create: `src/lib/graph-motion.ts`
- Modify: `src/components/network/ForceGraphCanvas.tsx`

**Interfaces:**
- Produces: `getContinuousParticleCount(link, activeFilter, emphasized, reduceMotion)` returning `1` only for eligible introduced-by links, otherwise `0`.

- [ ] **Step 1: Write failing table tests** for introduced/direct, All/filter, emphasized/dimmed, and reduced-motion cases.
- [ ] **Step 2: Run `npm test -- tests/graph-motion.test.ts` and confirm failure because the module is missing.**
- [ ] **Step 3: Add the pure helper and connect it to `linkDirectionalParticles`, with a slow `0.0035` continuous speed and the existing faster selection burst.**
- [ ] **Step 4: Run both graph motion and graph model tests and confirm they pass.**

### Task 3: Solar and planet rendering plus filter camera

**Files:**
- Modify: `src/components/network/ForceGraphCanvas.tsx`
- Modify: `tests/graph-geometry.test.ts`
- Modify: `src/lib/graph-geometry.ts` only if a new deterministic geometry helper is required.

**Interfaces:**
- Consumes: Task 1 focus IDs and Task 2 particle policy.

- [ ] **Step 1: Add a failing geometry test only if new geometry math is extracted; otherwise reuse the existing ray test and proceed with canvas integration.**
- [ ] **Step 2: Enlarge the Solar Anchor, add a slow corona breath, simplify matching/selected planet rings, and keep dimmed context legible.**
- [ ] **Step 3: On filter changes call `zoomToFit(duration, 84, nodeFilter)` for self plus matches; fit all nodes when returning to All.**
- [ ] **Step 4: Run targeted graph tests, then `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.**
- [ ] **Step 5: Refresh the local production preview and capture browser QA screenshots for All and Inner Circle.**
