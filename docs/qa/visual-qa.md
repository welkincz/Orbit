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
