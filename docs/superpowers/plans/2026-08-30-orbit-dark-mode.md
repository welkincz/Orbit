# Orbit Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete, persistent Light/Dark theme system to Orbit, with an unchanged professional Light mode and a restrained Dark-mode Signal Field, Home World self-node, Eclipse Switch, and Quiet Luxe motion.

**Architecture:** Keep theme preference and browser synchronization in a small external store consumed through `ThemeProvider`. Install a pre-paint initializer in the root layout to prevent a wrong-theme first frame. Continue using semantic CSS variables for the DOM shell, and pass a complete theme-specific palette into the canvas renderer. Isolate the intermittent Home Beacon scheduler from canvas painting so redraw remains paused during the long quiet part of each cycle.

**Tech Stack:** TypeScript 6, React 19, Next.js 16, CSS custom properties, `react-force-graph-2d`, Motion reduced-motion support, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-30-orbit-dark-mode-design.md`

## Global Constraints

- Preserve the current Light appearance except for the new Eclipse Switch and theme-neutral internal naming.
- Add no dependency and do not change the Markdown schema, people data, graph engine, or local-first/read-only model.
- Store only an explicit `light` or `dark` preference at `orbit.theme.v1`; invalid values behave as absent.
- Follow the operating-system theme only while no valid manual preference exists.
- Theme storage failures must leave the current session responsive through an in-memory preference.
- Put stars and the soft depth field only behind the central graph; shell surfaces remain quiet and professional.
- Keep group, strategic relevance, selection, direct-link, introduced-link, and dimming semantics unchanged.
- Keep static stars static. Do not add twinkle, parallax, scan lines, animated backgrounds, or persistent all-edge motion.
- Under reduced motion, stop orb travel, Home Beacon, directional particles, and camera movement.
- Any new animation must be interruptible, must not block interaction, and must return the force graph to `autoPauseRedraw` after its short active window.

---

### Task 1: Pure theme preference and resolution domain

**Files:**
- Create: `src/lib/theme.ts`
- Create: `tests/theme.test.ts`

**Interfaces:**

```ts
export type ThemeName = "light" | "dark";
export type ThemeSource = "system" | "manual";

export interface ThemeSnapshot {
  theme: ThemeName;
  source: ThemeSource;
}

export const THEME_STORAGE_KEY = "orbit.theme.v1";
export const SERVER_THEME_SNAPSHOT: ThemeSnapshot;

export function parseThemePreference(value: string | null): ThemeName | null;
export function resolveTheme(preference: ThemeName | null, systemDark: boolean): ThemeSnapshot;
export function safeReadTheme(storage: Pick<Storage, "getItem"> | null): ThemeName | null;
export function safeWriteTheme(
  storage: Pick<Storage, "setItem"> | null,
  theme: ThemeName,
): boolean;
```

- [x] **Step 1: Write failing table tests** for valid `light`/`dark`, absent and invalid storage values, system Light/Dark fallback, and manual preference winning over the system.
- [x] **Step 2: Add failure-path tests** proving read exceptions return `null`, write exceptions return `false`, and a missing storage object never throws.
- [x] **Step 3: Run `npm test -- tests/theme.test.ts` and confirm failure because `src/lib/theme.ts` does not exist.**
- [x] **Step 4: Implement the minimal pure functions and immutable server snapshot.** Keep browser globals out of this module so every decision is deterministic in tests.
- [x] **Step 5: Run `npm test -- tests/theme.test.ts` and confirm all theme-domain tests pass.**

### Task 2: Observable theme store with system, storage, and failure behavior

**Files:**
- Create: `src/lib/theme-store.ts`
- Create: `tests/theme-store.test.ts`
- Modify: `vitest.setup.ts` only if a reusable `matchMedia` test stub is required.

**Interfaces:**

```ts
export type ThemeTransition = "idle" | "entering-light" | "entering-dark";

export interface ThemeStoreSnapshot extends ThemeSnapshot {
  transition: ThemeTransition;
}

export interface ThemeEnvironment {
  readStoredPreference(): ThemeName | null;
  writeStoredPreference(theme: ThemeName): boolean;
  systemPrefersDark(): boolean;
  applyRootTheme(theme: ThemeName, transition: ThemeTransition): void;
  clearRootTransition(): void;
  subscribeToStorage(listener: (preference: ThemeName | null) => void): () => void;
  subscribeToSystem(listener: (systemDark: boolean) => void): () => void;
  schedule(callback: () => void, delayMs: number): () => void;
}

export interface ThemeStore {
  getSnapshot(): ThemeStoreSnapshot;
  getServerSnapshot(): ThemeStoreSnapshot;
  subscribe(listener: () => void): () => void;
  toggleTheme(): void;
  destroy(): void;
}

export function createThemeStore(environment: ThemeEnvironment): ThemeStore;
export function createBrowserThemeEnvironment(): ThemeEnvironment;
```

- [x] **Step 1: Write failing tests with a fake `ThemeEnvironment`** for initial system resolution, a valid stored manual choice, listener notification, and stable `getSnapshot()` identity until state actually changes.
- [x] **Step 2: Add failing behavior tests** for live system changes before manual override, ignored system changes after manual override, cross-tab valid preference updates, and cross-tab key removal returning to system following.
- [x] **Step 3: Add failing resilience and timing tests** for failed persistence retaining the new in-memory manual theme, `entering-dark`/`entering-light` state, the `520ms` transition cleanup, rapid reversal cancelling the previous cleanup, and `destroy()` removing subscriptions and timers.
- [x] **Step 4: Run `npm test -- tests/theme-store.test.ts` and confirm the missing-module failure.**
- [x] **Step 5: Implement the store and browser adapter.** The adapter must set both `document.documentElement.dataset.theme` and `document.documentElement.style.colorScheme`, listen only to the `orbit.theme.v1` storage key, and use modern `MediaQueryList.addEventListener("change", ...)` with a guarded legacy fallback.
- [x] **Step 6: Keep the browser adapter server-safe.** Creating the store during Client Component server rendering must not access `window`, `document`, `localStorage`, or `matchMedia`; it must return the immutable server snapshot until the browser subscription starts.
- [x] **Step 7: Run `npm test -- tests/theme.test.ts tests/theme-store.test.ts` and confirm both suites pass.**

### Task 3: Pre-paint initialization and provider boundary

**Files:**
- Create: `src/components/theme/ThemeInitScript.tsx`
- Create: `src/components/theme/ThemeProvider.tsx`
- Create: `tests/theme-init-script.test.tsx`
- Create: `tests/theme-provider.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**

```ts
export const THEME_INIT_SCRIPT: string;
export function ThemeInitScript(): React.ReactNode;

export interface ThemeContextValue {
  theme: ThemeName;
  toggleTheme(): void;
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactNode;
export function useTheme(): ThemeContextValue;
```

- [x] **Step 1: Write failing pre-paint tests** that execute `THEME_INIT_SCRIPT` against controlled `document`, storage, and `matchMedia` objects. Cover stored Dark, system Dark with no preference, invalid preference, missing `matchMedia`, storage read failure, root `data-theme`, and root `color-scheme`.
- [x] **Step 2: Write failing provider tests** proving the server snapshot is hydration-safe, context exposes the resolved theme, `toggleTheme()` delegates to the store, and unmount destroys the browser store.
- [x] **Step 3: Run the two new suites and confirm the expected missing-module failures.**
- [x] **Step 4: Implement `ThemeInitScript` as a server-safe inline script** with separately guarded storage and media queries, so a storage exception can still fall back to the system preference.
- [x] **Step 5: Implement `ThemeProvider` with `useSyncExternalStore`.** Create one store per mounted provider, expose only `theme` and `toggleTheme`, and do not move persistence into `NetworkWorkspace`.
- [x] **Step 6: Install the initializer and provider in `RootLayout`.** Add `suppressHydrationWarning` only to `<html>`, place the script in `<head>`, and wrap body children with `ThemeProvider`.
- [x] **Step 7: Run `npm test -- tests/theme-init-script.test.tsx tests/theme-provider.test.tsx`, then `npm run typecheck`.**

### Task 4: Accessible Eclipse Switch in the header

**Files:**
- Create: `src/components/theme/ThemeToggle.tsx`
- Create: `tests/theme-toggle.test.tsx`
- Modify: `src/components/network/NetworkWorkspace.tsx`
- Modify: `src/app/globals.css`

**Markup contract:**

```tsx
<button
  aria-checked={theme === "dark"}
  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
  className="theme-toggle"
  role="switch"
  type="button"
>
  <span aria-hidden="true" className="theme-toggle__track">
    <span className="theme-toggle__stars" />
    <span className="theme-toggle__orb" />
  </span>
</button>
```

- [x] **Step 1: Write failing interaction tests** for Light and Dark accessible names, `aria-checked`, pointer click, Space activation, Enter activation, and immediate retargeting during rapid repeated toggles.
- [x] **Step 2: Run `npm test -- tests/theme-toggle.test.tsx` and confirm the missing-component failure.**
- [x] **Step 3: Implement `ThemeToggle` and add it to `.orbit-actions` beside Search and Refresh.** Use the theme context; do not read storage or `matchMedia` from the button.
- [x] **Step 4: Style the compact Eclipse Switch.** Use a `220ms` custom ease-in-out for the orb, a Sun treatment in Light, a simplified blue Home World in Dark, sparse in-track stars, and the existing visible focus-ring convention.
- [x] **Step 5: Add a reduced-motion override** that removes orb translation while preserving the immediate state change and short color crossfade.
- [x] **Step 6: Run the toggle and workspace suites, then `npm run lint` and `npm run typecheck`.**

### Task 5: Semantic dark shell and static Signal Field

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/theme-provider.test.tsx`

**Dark token contract:**

```css
html[data-theme="dark"] {
  --canvas: #080d12;
  --header: #0e141a;
  --sidebar: #0e141a;
  --panel: #151d24;
  --ink: #e3e8eb;
  --muted: #8b99a1;
  --selected: #6f99a6;
}
```

The same block must also provide dark-adjusted `--faint`, `--line`, `--line-strong`, `--relevance-high`, `--relevance-medium`, `--relevance-low`, `--overlay-shadow`, and selection/focus colors; no component may gain a theme-specific hard-coded shell color.

Use these approved supporting Dark values so implementation does not reopen palette design:

```css
--faint: #7e8e97;
--line: #26323a;
--line-strong: #35434c;
--relevance-high: #d48469;
--relevance-medium: #94a683;
--relevance-low: #89969b;
--overlay-shadow: 0 22px 70px rgba(0, 0, 0, 0.46);
--selection-background: rgba(111, 153, 166, 0.22);
--row-hover: rgba(227, 232, 235, 0.055);
--selected-soft: rgba(111, 153, 166, 0.12);
--dialog-overlay: rgba(0, 0, 0, 0.54);
--command-match: rgba(212, 132, 105, 0.16);
```

Add `--header: #faf9f6` to the Light root and make `.orbit-header` consume `var(--header)`; this preserves Light exactly while letting both the Dark header and sidebar use Shell.

- [x] **Step 1: Extend the provider integration test** to assert that toggling sets `data-theme`, `color-scheme`, and the short transition attribute without remounting the workspace.
- [x] **Step 2: Add the complete Dark semantic token override** and audit every rgba literal in `globals.css`. Convert shell-sensitive translucent colors into variables while keeping Light computed colors visually unchanged.
- [x] **Step 3: Give shell colors and borders a `240ms` transition only while the root transition attribute is present.** Do not leave global transitions enabled after the `520ms` theme window.
- [x] **Step 4: Add the Dark Signal Field behind `.orbit-graph-canvas`.** Build deterministic sparse stars from CSS radial gradients, keep the canvas and controls above the layer, and add at most one low-opacity depth gradient near the self-node region.
- [x] **Step 5: Add the one-time `520ms` entering-Dark Nightfall reveal.** Rapid reversal must use the store's current transition attribute rather than queueing CSS animations.
- [x] **Step 6: Extend reduced-motion CSS** so Nightfall becomes a brief opacity/color fade with no blur or spatial movement; static stars remain visible.
- [x] **Step 7: Run the theme/provider/workspace tests, then `npm run lint`, `npm run typecheck`, and `npm run build`.**

### Task 6: Complete canvas palettes and theme-neutral self role

**Files:**
- Create: `src/lib/graph-theme.ts`
- Create: `tests/graph-theme.test.ts`
- Modify: `src/lib/graph-model.ts`
- Modify: `tests/graph-model.test.ts`
- Modify: `src/components/network/NetworkGraph.tsx`
- Modify: `src/components/network/ForceGraphCanvas.tsx`

**Interfaces:**

```ts
export interface GraphPalette {
  canvas: string;
  label: { primary: string; dimmed: string };
  planet: {
    dimmedAlpha: number;
    fill: string;
    stroke: string;
    selectedFill: string;
    selectedStroke: string;
    hoverStroke: string;
  };
  relevance: Record<StrategicRelevance, string>;
  filterHalo: Record<Exclude<RelationshipFilter, "all">, string>;
  directLink: {
    idle: string;
    active: string;
    filtered: string;
    activeDimmed: string;
    filteredDimmed: string;
  };
  introducedLink: {
    active: string;
    dimmed: string;
    arrowActive: string;
    arrowDimmed: string;
  };
  particle: { selected: string; ambient: string };
  solarAnchor: {
    core: string;
    corona: string;
    innerRing: string;
    ray: string;
  };
  homeWorld: {
    ocean: string;
    land: string;
    limb: string;
    innerRing: string;
    beacon: string;
  };
}

export function getGraphPalette(theme: unknown): GraphPalette;
```

The Dark palette is fixed to the following values; Light maps the current hard-coded values without visual change:

| Field | Dark value |
| --- | --- |
| `canvas` | `rgba(0, 0, 0, 0)` |
| `label.primary` / `label.dimmed` | `#e3e8eb` / `#7e8e97` |
| `planet.dimmedAlpha` | `0.38` |
| `planet.fill` / `planet.stroke` | `#151d24` / `#8b99a1` |
| `planet.selectedFill` / `planet.selectedStroke` | `#6f99a6` / `#b4cbd2` |
| `planet.hoverStroke` | `#8fb2bc` |
| `relevance.high` / `.medium` / `.low` | `#d48469` / `#94a683` / `#89969b` |
| `filterHalo.inner-circle` | `rgba(189, 145, 68, 0.24)` |
| `filterHalo.reconnect` | `rgba(212, 132, 105, 0.22)` |
| `filterHalo.recent` | `rgba(148, 166, 131, 0.22)` |
| `filterHalo.targets` | `rgba(130, 121, 168, 0.24)` |
| `directLink.idle` / `.active` / `.filtered` | `rgba(111, 153, 166, 0.46)` / `rgba(111, 153, 166, 0.78)` / `rgba(111, 153, 166, 0.64)` |
| `directLink.activeDimmed` / `.filteredDimmed` | `rgba(139, 153, 161, 0.12)` / `rgba(139, 153, 161, 0.14)` |
| `introducedLink.active` / `.dimmed` | `rgba(148, 166, 131, 0.78)` / `rgba(148, 166, 131, 0.13)` |
| `introducedLink.arrowActive` / `.arrowDimmed` | `rgba(148, 166, 131, 0.9)` / `rgba(148, 166, 131, 0.15)` |
| `particle.selected` / `.ambient` | `rgba(189, 145, 68, 0.98)` / `rgba(143, 178, 188, 0.95)` |
| `solarAnchor.core` / `.corona` / `.innerRing` / `.ray` | `#1b1d1e` / `#bd9144` / `rgba(243, 224, 177, 0.74)` / `#bd9144` |
| `homeWorld.ocean` / `.land` | `#315b68` / `#647b6f` |
| `homeWorld.limb` / `.innerRing` / `.beacon` | `#9abcc5` / `rgba(184, 211, 218, 0.56)` / `#bd9144` |

- [x] **Step 1: Write failing palette tests** asserting both themes return every nested field, Light values preserve current canvas colors, Dark values use the approved Void/Signal/gold family, and an unknown theme returns the complete Light palette.
- [x] **Step 2: Update graph-model tests first** to expect `visualRole: "self-anchor"`, then run them and confirm the expected failure against `"solar-anchor"`.
- [x] **Step 3: Implement the complete palette objects and rename `GraphNode.visualRole` to `"self-anchor" | "planet"`.** This is presentation naming only; `isSelf`, IDs, forces, and persistence stay unchanged.
- [x] **Step 4: Consume `useTheme()` in `NetworkGraph` and pass `theme: ThemeName` to `ForceGraphCanvas`.** The canvas must use `getGraphPalette(theme)` for every graph-only color: transparent canvas, nodes, labels, relevance rims, filter halos, links, arrows, particles, Solar Anchor, and Home World.
- [x] **Step 5: Remove graph color ownership from `graph-filters.ts` only after all call sites use the palette.** Keep filter membership and visual-state logic unchanged.
- [x] **Step 6: Add the CSS canvas-softening state during root theme transitions** so a palette redraw does not flash; it must not disable pointer interaction.
- [x] **Step 7: Run graph theme/model/filter/geometry tests, then `npm run typecheck`.**

### Task 7: Home World painter and intermittent Home Beacon

**Files:**
- Modify: `src/components/network/ForceGraphCanvas.tsx`
- Modify: `src/lib/graph-motion.ts`
- Modify: `tests/graph-motion.test.ts`

**Interfaces:**

```ts
export const HOME_BEACON_CYCLE_MS = 7400;
export const HOME_BEACON_ACTIVE_MS = 820;

export interface BeaconFrame {
  active: boolean;
  progress: number;
  intensity: number;
}

export function getHomeBeaconFrame(
  elapsedMs: number,
  reduceMotion: boolean,
  pageVisible: boolean,
): BeaconFrame;

export function shouldContinuouslyRedrawGraph(options: {
  hasActiveSignal: boolean;
  beaconActive: boolean;
  pageVisible: boolean;
  reduceMotion: boolean;
}): boolean;
```

- [x] **Step 1: Write failing timing tests** for the opening, peak, and end of the `820ms` beacon window; the long quiet interval; cycle wrap; reduced motion; and hidden-page suppression.
- [x] **Step 2: Write failing redraw-policy tests** proving redraw is active only when `hasActiveSignal` reports an eligible filtered signal particle or during the short beacon window, and is always paused for reduced motion or a hidden page.
- [x] **Step 3: Run `npm test -- tests/graph-motion.test.ts` and confirm the new assertions fail.**
- [x] **Step 4: Implement the pure timing and redraw helpers.** Clamp negative/invalid elapsed values to a safe inactive frame and keep the active window below one second.
- [x] **Step 5: Add a Dark-only `drawHomeWorld()` path** for `self-anchor`: desaturated blue disk, one abstract land mass, cool limb light, restrained inner ring, and warm gold beacon. Keep Light on the existing Solar Anchor painter.
- [x] **Step 6: Add a visibility-aware beacon scheduler inside `ForceGraphCanvas`.** Start one pulse on entering Dark, end it after `820ms`, keep the remainder of the `7.4s` cycle silent, clear timers while hidden, and restart a fresh quiet cycle when visible again.
- [x] **Step 7: Derive `hasActiveSignal` from real links using `getContinuousParticleCount()`, then replace the current `autoPauseRedraw` expression with `!shouldContinuouslyRedrawGraph(...)`.** The graph must return to a paused redraw state when no eligible signal or beacon is active.
- [x] **Step 8: Keep directional relationship behavior semantic.** Direct links remain static; selected and filtered introduced-by links retain their approved particle behavior; reduced motion disables all particles and the existing filter camera duration.
- [x] **Step 9: Run graph motion, theme, geometry, filter, layout, and model tests, then `npm run lint` and `npm run typecheck`.**

### Task 8: Regression verification and browser visual QA

**Files:**
- Modify only files needed to fix failures found by this task.

- [x] **Step 1: Run the full automated gate:** `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. Record actual command results; do not claim completion from a running preview alone.
- [x] **Step 2: Start or refresh the production preview and test first paint** with no stored preference under simulated system Light and system Dark. Confirm the correct `data-theme` exists before hydration and there is no wrong-theme flash.
- [x] **Step 3: Verify preference lifecycle:** manual toggle, refresh persistence, invalid stored value fallback, failed storage behavior, live system change before manual override, ignored system change after manual override, and cross-tab update/removal.
- [x] **Step 4: Verify both complete themes** across header, left relationship list, filter toolbar, Search dialog, graph tooltip, selected person detail, expanded/resized detail, error surface, focus rings, and native scrollbar/control treatment.
- [x] **Step 5: Verify graph semantics and interaction** in All, Inner Circle, Reconnect, Recent, and Targets: self never dims; matching, selected, relevance, and dimmed states remain distinguishable; direct links stay solid; introduced-by links stay dashed/directional; drag, pan, zoom, saved layout, reset layout, and selection still work.
- [x] **Step 6: Verify Quiet Luxe motion at normal settings:** `220ms` Eclipse retargeting, `240ms` shell transition, one `520ms` Nightfall, less-than-one-second Home Beacon activity in a `7.4s` cycle, canvas softening without lost clicks, and hidden-tab redraw pause.
- [x] **Step 7: Repeat the interaction pass with reduced motion.** Confirm no orb travel, Home Beacon, directional particles, or camera movement; static stars and semantic visual states must remain.
- [x] **Step 8: Inspect representative desktop widths at `1024px`, `1440px`, and `1920px`.** Confirm header controls do not collide, the central field remains readable, and the expandable detail panel behaves exactly as before.
- [x] **Step 9: Capture final Light and Dark screenshots** with the same graph layout and an expanded person card for side-by-side visual judgment. Fix any contrast, busyness, or hierarchy issue before declaring the feature complete.
- [x] **Step 10: Re-run the full automated gate after all QA fixes** and report the final verified test count, build result, preview URL, and any intentionally deferred items.
