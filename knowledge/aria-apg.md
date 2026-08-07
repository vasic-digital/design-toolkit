# WAI-ARIA APG — Widget Keyboard & ARIA Models

> **Source:** W3C WAI — ARIA Authoring Practices Guide, https://www.w3.org/WAI/ARIA/apg/ · **truly
> open** (patterns + code examples vendorable). Distilled keyboard/ARIA models for the widgets the
> `ux-flow-designer` specifies and `design-qa-auditor` tests. **Rule 1 of ARIA: prefer a native HTML
> element over ARIA whenever one exists.**

## Global rules
- Every interactive control has an **accessible name** (visible label, `aria-label`, or `aria-labelledby`).
- **Tab** moves between widgets; **Arrow keys** move *within* a composite widget (menu, tabs, radio
  group, listbox, grid) — a composite is **one** tab stop.
- Visible focus always (WCAG 2.4.7); manage focus on open/close; **Esc** closes/cancels.
- State exposed via ARIA (`aria-expanded`, `aria-selected`, `aria-checked`, `aria-current`,
  `aria-disabled`, `aria-invalid`) — kept in sync with the visual state.

## Patterns (keyboard map + key roles/states)

**Disclosure (show/hide)** — button with `aria-expanded`; `aria-controls` → region. Enter/Space toggles.

**Menu / Menu button** — button `aria-haspopup="menu"` `aria-expanded`; menu `role="menu"`, items
`role="menuitem"`. Enter/Space/Down opens; **Up/Down** move; Enter activates; **Esc** closes + returns
focus to button; Home/End to ends; type-ahead optional.

**Tabs** — `role="tablist"` > `role="tab"` (`aria-selected`, `aria-controls`) + `role="tabpanel"`
(`aria-labelledby`). **Left/Right** (horizontal) move; only the active tab is in tab order
(`tabindex=0`, others `-1`); Home/End to ends. Activation follows focus (automatic) or on Enter (manual).

**Dialog (modal)** — `role="dialog"` `aria-modal="true"` + `aria-labelledby`. On open, move focus into
the dialog; **trap focus** within; **Esc** closes; on close, **return focus** to the trigger.
Background is inert.

**Combobox** — input `role="combobox"` `aria-expanded` `aria-controls` `aria-activedescendant`; popup
`role="listbox"`/`grid`. Down opens/moves; Up/Down navigate options; Enter selects; Esc closes/clears.

**Listbox** — `role="listbox"` > `role="option"` (`aria-selected`). Up/Down move; Home/End; single or
`aria-multiselectable` with Shift/Ctrl; type-ahead.

**Radio group** — `role="radiogroup"` > `role="radio"` (`aria-checked`). Arrow keys move **and**
select (roving tabindex); the group is one tab stop.

**Checkbox / Switch** — `role="checkbox"`/`switch` `aria-checked` (support `mixed`). Space toggles.

**Accordion** — stacked disclosures; each header is a `<button>` with `aria-expanded` +
`aria-controls`; Up/Down between headers optional.

**Slider** — `role="slider"` `aria-valuemin/max/now` (+ `aria-valuetext`). Left/Right (or Up/Down)
step; Home/End to bounds; PageUp/PageDown large step. Provide a non-drag alternative (WCAG 2.5.7).

**Tooltip** — `role="tooltip"` referenced by `aria-describedby`; show on hover **and** focus;
dismissable, hoverable, persistent (WCAG 1.4.13).

**Table / Grid** — data table uses native `<table>` with `<th scope>`; an interactive **grid**
(`role="grid"`) uses Arrow keys to move between cells, Home/End, Ctrl+Home/End.

## What the auditor checks
For each interactive widget: correct role, correct name, correct states kept in sync, the full
keyboard map operates, focus is visible and managed (open/close/return), and no keyboard trap
(WCAG 2.1.1/2.1.2, 4.1.2). No `href="#"` / dead controls — real behavior + semantics on everything.
