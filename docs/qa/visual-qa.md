# Visual QA — pass 1

- Date: 2026-08-28
- Browser: Codex In-app Browser
- Commit inspected: `a006a51f48ab` (`fix: honor reduced motion timing`)
- Runtime: production server at `http://127.0.0.1:3108` (`npm start -- --port 3108`), HTTP `200` (28,258 bytes).
- Deviation: `npm run dev` was attempted twice (default port and `3108`) but repeatedly restarted after `Watchpack Error: EMFILE` and Next reported that `.next/dev` was deleted; six HTTP polls never returned a page. The shell limit was `1048575`, so this was not a 256-descriptor inheritance issue. The existing production build was used only after that direct failure.
- Screenshots: `screenshots/pass-1-default-1440.png` (1440×900), `screenshots/pass-1-selected-1440.png` (1440×900), and `screenshots/pass-1-search-1280.png` (1280×800). Captures were converted to actual PNG format because the browser screenshot API supplied JPEG bytes under `.png` names.

| Check | Evidence | Finding | Severity | Change | Recheck |
| --- | --- | --- | --- | --- | --- |
| 1440×900 default graph stability and labels | After a 1.2 s cooldown, the default capture shows 12 readable labels and settled links; `pass-1-default-1440.png`. | Pass | — | None | Direct visual check passed. |
| Inner Circle, Reconnect, Recent, and Targets | Browser selections resolved respectively to Maya Patel, Theo Brooks, Marcus Vale, and Priya Desai; every rail section exposed its expected entries. | Pass | — | None | Direct selection checks passed. |
| Hover metadata and connected-edge emphasis | Pointer hover on Maya showed the tooltip with role/team, `Relationship 5/5`, and `Strategic relevance High`; non-connected nodes and links dimmed in the selected capture. | Pass | — | None | Direct visual and DOM check passed. |
| Graph selection, sidebar synchronization, and panel entrance | A pointer down/up gesture at Maya's visible canvas node opened `Maya Patel details`; its sidebar row became `aria-current=true` and the panel entered. (The browser's simple click helper did not dispatch the app's required pointer sequence; the no-movement pointer gesture did.) | Pass | — | None | Direct pointer-interaction check passed. |
| Repeated Maya → Theo → Priya switching | Detail headings were exactly `Maya Patel`, `Theo Brooks`, then `Priya Desai`, with no stale detail content. | Pass | — | None | Direct check passed. |
| Introducer selection and close | Theo's `Introduced by Maya Patel` control selected Maya; `Close details` removed the detail region. | Pass | — | None | Direct check passed. |
| Cmd+K lifecycle | Cmd+K opened and focused the combobox; `Theo` plus ArrowDown/Enter selected Theo; Escape removed the dialog and restored focus to `Search ⌘K`. | Pass | — | None | Direct keyboard check passed. |
| Keyboard sidebar traversal and visible focus | Keyboard focus styling was directly present (`:focus-visible`, `2px solid rgb(49, 95, 88)`, `2px` offset) on the tabbed header control. The in-app browser's keyboard injector did not advance Tab focus between controls, so full sequential sidebar traversal could not be independently automated. | Limitation only; no app failure evidenced | Low | None | Static focus rule is in `src/app/globals.css`; direct browser automation limitation retained for follow-up. |
| Empty search state | Query `zzzz-unmatched` displayed `No people found.` visibly in the command list. | Pass | — | None | Direct check passed. |
| Pan, zoom, and drift | After a graph pan and zoom, two full-viewport screenshots 1.1 s apart had the same SHA-256 (`2a280471…170ed3a`), showing the settled viewport was not perpetually drifting. | Pass | — | None | Direct check passed. |
| 1280×800 overflow and search | `documentElement.scrollWidth === clientWidth === 1280`; shell bounds were exactly 1280×800. Open search is captured in `pass-1-search-1280.png`. | Pass | — | None | Direct visual and measurement check passed. |
| Reduced-motion panel, palette, and graph | The in-app browser exposes a viewport override but no media-feature emulation API. No macOS setting was changed because that would alter a local system setting. Source inspection confirms the reduced-motion branches in `NetworkWorkspace.tsx`, `ForceGraphCanvas.tsx`, and `globals.css`, but this pass could not directly emulate the preference. | Limitation only; no app failure evidenced | Low | None | Requires a browser media-emulation capability or user-approved system setting change. |
| Screenshot file format | Initial browser outputs were JPEG bytes bearing `.png` names. | Resolved artifact-format finding | Low | Converted the three required files with `sips -s format png`; no product source changed. | `file` now reports PNG data at 1440×900, 1440×900, and 1280×800. |

No product source or test changes were warranted by the completed pass-one findings.

## Pass 2 — production reinspection and Markdown recovery

- Date: 2026-08-28
- Browser: Codex In-app Browser
- Commit inspected: `ba420f765321900eb43a527123be1d326081be22` (`fix: complete first Orbit visual QA pass`)
- Runtime: a freshly completed `npm run build`, followed by the production server at `http://127.0.0.1:3111` (`npm run start -- --port 3111`). A direct HTTP request returned `200` and 28,258 bytes before browser inspection.
- Screenshots: `screenshots/pass-2-default-1440.png` (1440×900), `screenshots/pass-2-selected-1440.png` (1440×900), and `screenshots/pass-2-search-1280.png` (1280×800). The browser screenshot API again supplied JPEG bytes with `.png` filenames; all three were converted and verified as actual PNG files with `file` and `sips`.

| Check | Evidence | Finding | Severity | Change | Recheck |
| --- | --- | --- | --- | --- | --- |
| 1440×900 default graph, labels, and first scan | Fresh default capture shows all 12 people in the map, explicit central-person anchoring, readable labels, and a stable two-column relationship rail; `pass-2-default-1440.png`. | Pass | — | None | Direct visual inspection passed. |
| Maya and Priya selected states | Maya's detail panel synchronized with the active rail entry (`aria-current="true"`), including relationship, relevance, date, Markdown sections, and the selected edge emphasis; Priya's button then opened `Priya Desai details`. `pass-2-selected-1440.png` records Maya. | Pass | — | None | Direct browser state checks passed. |
| Reconnect scanning | Reconnect presents four compact people rows with explicit, right-aligned overdue values (`135d`, `120d`, `28d`, `20d`), so the needed next action is readable without opening a panel. | Pass | — | None | Direct visual and DOM inspection passed. |
| Introduced-by edges and selection | Theo's panel visibly states `Introduced by` with a `Maya Patel` button. Activating it opened Maya's panel; after close, the detail region count was zero, and Priya reopened normally. Dashed directional edges are also visible in both graph captures. | Pass | — | None | Direct browser interactions passed. |
| Command search and keyboard lifecycle | Cmd+K focused the combobox; `zzzz-unmatched` visibly produced `No people found.`; `Theo`, ArrowDown, Enter selected Theo; Escape removed the visible dialog and restored focus to the Search control. | Pass | — | None | Direct keyboard/DOM inspection passed. |
| Keyboard focus treatment | The command-palette lifecycle above was directly keyboard-verified. Visible focus styling remains defined through `:focus-visible`; the in-app browser's focus injector again did not provide a reliable sequential-Tab traversal of sidebar controls, so that narrower traversal remains an automation limitation rather than an observed application defect. | Limitation only; no app failure evidenced | Low | None | Source rule and direct command-keyboard evidence retained. |
| Graph pan, zoom, and drift | A pointer drag in the graph region followed by wheel zoom completed without page overflow. Two full viewport captures 1.1 s apart after the gesture had identical SHA-256 prefixes (`6dc1d4519ba6e3d0`), showing the viewport settled rather than drifting. | Pass | — | None | Direct pointer, wheel, layout, and capture check passed. |
| 1280×800 layout and search | `documentElement.scrollWidth === clientWidth === 1280`; compact command search with the Theo result remained completely within the viewport; `pass-2-search-1280.png`. | Pass | — | None | Direct visual and measurement check passed. |
| Reduced motion | The selected browser exposes viewport control but no media-feature emulation. No macOS setting was changed because that would alter a local system setting. The production code still contains the `prefers-reduced-motion` branches in `NetworkWorkspace.tsx`, `ForceGraphCanvas.tsx`, and `globals.css`; direct preference emulation was unavailable. | Limitation only; no app failure evidenced | Low | None | Requires browser media emulation or an approved system-setting change. |
| Live valid Markdown refresh, no restart | With `apply_patch`, the exact Maya sentence changed to `Maya offers candid platform leadership advice.`. A production-browser refresh displayed that exact sentence in the visible `WHY THEY MATTER` panel. After restoring `gives`, another refresh visibly restored `Maya gives candid platform leadership advice.` and the 12-person graph remained loaded. | Pass | — | Seed edit restored | Direct live-server evidence passed. |
| Live invalid Markdown error and recovery, no restart | With `apply_patch`, changing `relationship_strength: 5` to `6` and refreshing showed `Couldn't load your network`, `data/people/maya-patel.md`, and `relationship_strength: Too big: expected number to be <=5`. Restoring `5` and refreshing returned the graph (`12 people loaded`, graph region visible, no error region). `git diff --quiet -- data/people/maya-patel.md` exited `0`. | Pass | — | Seed edit restored | Direct live-server and Git evidence passed. |

### Visual critique

- **Generated:** Nothing reads as an ungrounded dashboard template: each rail group answers a relationship-management question, the graph exposes the concrete network, and the details carry source-backed notes. `RELATIONSHIP FIELD` is slightly abstract/showroom-like copy, but it is small, subdued, and does not obstruct orientation; it is not a material usability failure.
- **Unnecessary:** No control felt unnecessary in the captured states. Search, Refresh, the rail, graph, details, close affordance, and Markdown path all correspond to a plausible local-network workflow.
- **Cheap:** Borders, muted colors, directional links, and detail hierarchy held up at both tested sizes. The compact palette uses the same restrained visual language rather than a generic overlay treatment.
- **Prominence and hiding:** Search is discoverable without overwhelming the title; overdue reconnect values and high-priority targets are scannable. The selected graph deliberately fades unrelated nodes to foreground the active person's ties; it still retains sufficient context through the central anchor and visible connected edges.
- **Usefulness:** The graph is useful as a spatial relationship view because selection exposes concrete people, direct links, and introducer direction rather than decorative activity. The rail is faster for a task-driven scan, and the two surfaces complement rather than duplicate one another.
- **Sidebar scanning:** Fast: short headings divide the list into action-oriented groups, each row gives the minimum identity/context signal, and the right-edge recency/priority markers make comparison immediate.
- **Motion:** Panel and palette motion communicates entry/exit; selection emphasis and pan/zoom have direct interaction purpose. No animation was observed that exists solely for decoration. Reduced-motion execution could not be directly emulated with the available browser capability.

No pass-two product failure was recorded, so no source or test change was warranted and no behavioral TDD cycle applied.

## Enhancement pass — action filters, drag layout, and Conversation Prep

- Date: 2026-08-29
- Browser: Codex In-app Browser
- Branch state inspected: `feature/map-conversation-prep` after `7e1d88d` plus the Task 6 seed/documentation changes
- Runtime: freshly completed `npm run build`, followed by the production server at `http://127.0.0.1:3142/`
- Automated baseline: 18 test files, 126 tests passed; typecheck, lint, build, and `git diff --check` passed
- Screenshots: `screenshots/enhancement-default-1440.png`, `screenshots/enhancement-filter-1440.png`, and `screenshots/enhancement-prep-1440.png`, each verified as real 1440×900 PNG data

| Check | Evidence | Finding | Severity | Change / recheck |
| --- | --- | --- | --- | --- |
| Filter control semantics | At 1440×900, the toolbar exposed All, Inner Circle, Reconnect, Recent, and Targets. Activating each produced exactly one matching `aria-pressed="true"` button in the sequence requested. | Pass | — | No change. |
| Dim without hiding | The Targets capture retains every person and relationship while Marcus Vale and Priya Desai remain fully legible with the active-view treatment; unrelated nodes and links remain as quiet context. | Pass | — | `enhancement-filter-1440.png`. |
| Breathing effect | Two Targets captures 850 ms apart produced different full-frame SHA-256 prefixes (`73e50ad0847a9545` and `c9b5b049c02c8369`) after the physics layout had settled, consistent with active canvas halo animation. Labels did not change position. | Pass | — | Direct animation-frame evidence. |
| Reduced-motion fallback | The browser still does not expose media-feature emulation. Source and build inspection confirm `useReducedMotion()` makes the pulse constant and enables canvas auto-pause, but the preference could not be toggled directly without changing a system setting. | Limitation only | Low | Requires media emulation or explicit approval to change the macOS setting. |
| Hover/selection priority | With Targets active, selecting Maya made Maya and her connected topology visually dominant while target halos remained contextual. The rail and detail selection stayed synchronized. | Pass | — | `enhancement-prep-1440.png`. |
| Node drag and refresh persistence | Maya was dragged from approximately `(826, 701)` to `(560, 618)`. After a full browser reload and force-layout cooldown, Maya remained spatially far left of Charlie rather than returning to her automatic position. | Pass | — | Direct drag, reload, and screenshot comparison passed. |
| Reset layout | Reset layout released the dragged Maya position and produced a new automatic layout. A subsequent full reload retained the automatic behavior rather than restoring the fixed coordinate. | Pass | — | Direct reset, reload, and screenshot comparison passed. |
| Conversation Prep ordering | Maya's visible detail headings were Why they matter, Context, Conversation Prep, Next conversation, Latest interaction, Conversation notes, and Follow-up. Next conversation therefore preceded history as designed. | Pass | — | Direct DOM order and visible-text check passed. |
| Conversation Prep content | Maya's Next conversation and open Their world content were visible; the other durable sections appeared as compact disclosures. | Pass | — | `enhancement-prep-1440.png`. |
| Empty prep template | Owen displayed Copy Conversation Prep template and announced `Template copied.` after activation. The in-app tab clipboard inspection surface returned an empty value, so exact live clipboard contents could not be independently read there; the component test verifies all five schema headings passed to `navigator.clipboard.writeText`. | Pass with automation limitation | Low | UI status verified live; payload verified by automated test. |
| 1280×800 layout | The document reported `clientWidth === scrollWidth === 1280`. Graph controls ended at x=899, the graph ended at x=912, and the detail began at x=912, so controls did not overlap the detail panel or cause horizontal overflow. | Pass | — | Direct measurement and visual inspection passed. |
| Browser errors | The production tab reported zero captured console errors after filter, detail, copy, drag, reload, and reset interactions. | Pass | — | No change. |
| Screenshot format | The browser again returned JPEG bytes under `.png` names. | Resolved artifact-format finding | Low | Converted with `sips -s format png` and verified all three with `file`. |

### Enhancement visual critique

- The filter toolbar is compact, readable, and secondary to the network itself. It remains distinct from the Relationship field label and does not intrude into the detail panel at 1280 or 1440 pixels.
- Action-view halos add a second visual channel without replacing strategic-relevance rims. The Targets view remains interpretable even when a non-target person is selected.
- Dimming is intentionally strong. It keeps the active group unmistakable while retaining enough topology to understand how highlighted people connect through Charlie and introducers.
- Conversation Prep changes the detail panel from historical reference to practical preparation: the next discussion is visible first, durable context is available without forcing every block open, and existing interactions remain close beneath it.
- Drag persistence makes personal spatial organization possible without compromising Markdown portability. Reset layout is visible beside the filters and successfully restores the automatic model.
