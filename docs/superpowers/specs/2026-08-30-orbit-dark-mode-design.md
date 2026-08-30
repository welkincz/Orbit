# Orbit Dark Mode — Design

Date: 2026-08-30
Status: Approved

## 1. Product intent

Add a complete Light/Dark theme system while preserving Orbit as a calm professional relationship tool. Light mode stays visually unchanged. Dark mode gives the central relationship map a restrained "deep-space signal field" identity inspired by the romantic side of the Dark Forest concept: Charlie is the Home World sending meaningful signals to distant people.

The Dark Forest metaphor remains behind the design. Orbit must not frame relationships as hostile civilizations, concealment, or threats. No Dark Forest wording appears in product copy.

## 2. Approved direction

- The entire application switches theme, but cosmic atmosphere is limited to the central map.
- Dark mode uses the **Home World** self-node, **Signal Field** atmosphere, **Eclipse Switch**, and **Quiet Luxe** motion language.
- First use follows the operating-system theme. A manual Light/Dark choice persists locally.
- The application remains local-first and read-only. Theme preference is the only new stored value.
- No dependency, Markdown schema, or graph-engine change is required.

## 3. Design principles

1. **Professional shell, expressive field.** Header, sidebars, details, search, dialogs, and controls use disciplined dark surfaces without stars, nebulae, or glow.
2. **One memorable signature.** The Home World is the main expressive object. Other planets remain quiet and consistent.
3. **Effects need rhythm and rest.** A rare transition can be elegant; persistent motion on functional data is not.
4. **Semantics survive the theme.** Direct versus introduced relationships, strategic relevance, selection, group matching, and dimming keep their current meanings.
5. **Light mode is not redesigned.** It gains only the theme control and theme-neutral internal naming.

## 4. Theme preference behavior

The resolved theme is `light` or `dark`.

- Storage key: `orbit.theme.v1`.
- When the key is absent or invalid, Orbit resolves `window.matchMedia("(prefers-color-scheme: dark)")` and follows later system changes.
- Activating the Eclipse Switch writes the explicit resolved choice (`light` or `dark`) and stops automatic system following.
- A `storage` listener synchronizes theme changes across Orbit tabs.
- Storage read/write failures fall back to an in-memory preference and never block the application.
- A small pre-paint script sets `<html data-theme="light|dark">` before React hydrates so the first frame does not flash the wrong theme.
- The document advertises the resolved theme through `color-scheme` so native controls and scrollbars match.

The first version does not add a settings menu or a third visible System option. A later settings surface may add "Use system" if real usage demonstrates the need.

## 5. Visual system

Light variables remain the default `:root` values. Dark mode overrides the same semantic variables under `html[data-theme="dark"]`.

### Core dark palette

| Token | Value | Use |
| --- | --- | --- |
| Void | `#080D12` | Central relationship field |
| Shell | `#0E141A` | Header and sidebar |
| Surface | `#151D24` | Detail panel, search, dialogs, controls |
| Ink | `#E3E8EB` | Primary text; never pure white |
| Muted | `#8B99A1` | Secondary text and dim context |
| Signal | `#6F99A6` | Selection, communication paths, cool Home World light |

The existing gold `#BD9144` remains a signature accent for the Home World beacon and rare high-value emphasis. Borders derive from low-contrast blue-gray values rather than bright outlines. Strategic relevance colors receive dark-background variants with equivalent semantic priority and sufficient contrast.

### Shell treatment

- Header and left sidebar use Shell.
- Person details, search, dialogs, tooltips, and toolbar surfaces use Surface.
- Layout, spacing, typography, radii, and information density stay the same as Light mode.
- Dark mode does not introduce glassmorphism, translucent sidebars, neon borders, purple gradients, or science-fiction labels.

## 6. Relationship field

### Background

- The graph canvas becomes transparent and sits above the themed field background.
- Dark mode adds a deterministic sparse-star CSS layer behind the canvas.
- Stars are fixed, low-opacity, and noninteractive. They do not twinkle, drift, or respond to the pointer.
- One soft, low-opacity depth field may sit behind the Home World; no nebula texture appears.

### Self identity

The graph model renames the presentation-specific `solar-anchor` role to `self-anchor`.

- Light renderer: the existing Solar Anchor.
- Dark renderer: a simplified Home World—a desaturated blue disk, one abstract land mass, cool limb light, and one warm gold beacon.
- The Home World remains larger than person planets and never dims under a group filter.
- It is an emblem, not a realistic Earth illustration; no detailed continents, globe texture, or flag imagery.

### Other people and relationships

- Other people remain circular planets. Group-derived action views overlap, so no person receives one permanent planet icon based on group.
- Strategic-relevance rims retain their meaning with dark-adjusted colors.
- Matching uses one soft halo; selected uses a solid/high-contrast state; dimmed contacts remain locatable.
- Direct relationships remain stable solid channels.
- `introduced_by` relationships remain directional dashed signal paths.
- Dark mode may increase signal contrast, but it does not add more simultaneously moving relationships.

## 7. Eclipse Switch and theme transition

The theme control appears in the header beside Search and Refresh.

- The compact pill contains a sun in Light mode.
- During the switch, the orb crosses the track and resolves into a blue Home World; sparse stars fade into the vacated side.
- Accessible names are explicit: `Switch to dark mode` and `Switch to light mode`.
- The control exposes the current state with native button/switch semantics and works by keyboard.

Timing:

- Eclipse orb transition: `220ms`, interruptible custom `ease-in-out`.
- Shell color/border transition: `240ms`.
- Dark-field nightfall reveal: `520ms` strong `ease-out`, only when entering Dark mode.
- Rapid repeated toggles retarget instead of queuing animations.

The canvas briefly softens opacity during palette replacement so it does not flash between hard-coded render states.

## 8. Quiet Luxe motion language

Dark mode permits restrained effects with deliberate silent intervals.

1. **Nightfall — rare:** the field deepens, stars appear, and the Home World beacon ignites once when entering Dark mode.
2. **Home Beacon — intermittent:** a `7.4s` cycle contains less than one second of subtle corona expansion; the rest of the cycle is still.
3. **Signals — semantic:** introduced-by and selected paths use the already-approved directional particles. Direct lines do not animate.
4. **Hover/selection — responsive:** planet contrast and one thin orbital response transition in `120–180ms`; nodes do not float or spin.

No scan line, star twinkle, global parallax, planet rotation, comet field, continuously moving background, or all-edge pulse is included.

## 9. Component and module boundaries

### Theme domain

Create a small pure theme module responsible for:

- validating stored preference;
- resolving saved versus system theme;
- reading and writing the versioned preference;
- producing a stable snapshot for React;
- subscribing to `storage` and media-query changes.

### Theme UI

- `ThemeProvider` exposes resolved theme and `toggleTheme()`.
- `ThemeInitScript` performs the pre-paint root attribute assignment.
- `ThemeToggle` owns Eclipse Switch markup, labeling, and control animation.
- Root layout installs the init script/provider; `NetworkWorkspace` only renders the header control and does not own persistence logic.

### DOM theme styling

`globals.css` remains the source for DOM surface tokens. Components continue consuming semantic CSS variables so existing Light styles do not split into parallel selectors.

### Canvas theme styling

Canvas cannot resolve CSS variables in drawing commands. A pure `getGraphPalette(theme)` module owns graph-only colors for Light and Dark. `NetworkGraph` passes the resolved theme to `ForceGraphCanvas`, which redraws only when the resolved theme changes or an approved animation is active.

The palette module covers canvas background transparency, nodes, labels, direct links, introduced links, arrows, particles, strategic rims, group halos, Solar Anchor, and Home World.

### Ambient rendering and performance

- Static stars use CSS, not canvas particles or WebGL.
- The graph keeps `autoPauseRedraw` whenever no filter particle, transition, or short beacon pulse needs a frame.
- The beacon activates redraw only for its short visible window, then returns the graph to rest.
- Timers and ambient redraw pause while `document.visibilityState !== "visible"`.
- Existing Motion and force-graph dependencies are sufficient; no shader, background, or theme package is added.

## 10. Reduced motion and accessibility

With `prefers-reduced-motion: reduce`:

- Eclipse state and shell colors may crossfade briefly, but the orb does not travel.
- Nightfall removes blur/spatial movement and becomes a short opacity/color change.
- Home Beacon, directional particles, and camera movement stop.
- Static stars and all semantic states remain visible.

Quality requirements:

- Text, controls, borders, focus rings, selected states, graph labels, and important relationship paths meet appropriate WCAG contrast targets.
- Matching, selected, relevance, and dimmed states are never communicated by hue alone.
- Keyboard focus remains visible in both themes.
- The theme control target is at least as usable as existing header controls.

## 11. Failure handling

- Invalid storage values are ignored.
- Storage exceptions preserve an in-memory theme for the current session.
- A missing `matchMedia` implementation resolves to Light mode.
- If canvas palette resolution fails, the graph uses the complete Light palette rather than partial colors.
- Theme transitions never block selection, search, refresh, dragging, or details.

## 12. Verification

Automated tests cover:

- valid, absent, and invalid stored preferences;
- system resolution and live system change before manual override;
- manual persistence and storage failure fallback;
- cross-tab storage synchronization;
- first-render theme attribute behavior without hydration mismatch;
- Eclipse Switch label, state, click, and keyboard activation;
- theme-neutral `self-anchor` graph modeling;
- complete Light and Dark graph palettes;
- reduced-motion animation policy;
- existing graph filters, dragging, layout persistence, selection, detail resizing, and search behavior.

Browser QA covers:

- first load in system Light and Dark;
- manual switch, refresh persistence, and cross-tab synchronization;
- no wrong-theme flash;
- full shell, search, tooltips, filter toolbar, canvas, and expanded person detail in both themes;
- Nightfall, Home Beacon, directional signals, rapid theme reversal, and hidden-tab pause;
- reduced-motion mode;
- representative desktop widths and contrast inspection.

## 13. Out of scope

- redesigning Light mode;
- per-person custom planet art;
- assigning one permanent visual group to overlapping action views;
- animated stars, nebulae, parallax, 3D planets, shaders, or audio;
- automatic time-of-day switching independent of system preference;
- a settings page or visible System theme option;
- storing theme in Markdown or syncing it to a cloud account;
- mobile-first layout redesign.

## 14. References

- [Emil Kowalski — Skills for Designers and Engineers](https://github.com/emilkowalski/skills): restraint, purposeful motion, interruptible transitions, and reduced-motion discipline.
- [Figma — Toggle Button Light and Dark Mode](https://www.figma.com/community/file/1293910475100399964/toggle-button-light-and-dark-mode): the day-to-night narrative used as inspiration for the Eclipse Switch, not copied one-to-one.
