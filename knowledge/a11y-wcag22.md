# WCAG 2.2 — Accessibility Gate

> **Source:** W3C — Web Content Accessibility Guidelines 2.2 (Recommendation, 2024-12-12).
> https://www.w3.org/TR/WCAG22/ · **License:** W3C Document License (freely readable/redistributable;
> normative text unmodifiable). Ratios are the **legally authoritative** baseline — enforce these,
> not APCA (advisory only). This file is a distilled checklist, not the normative text.

**Target conformance: WCAG 2.2 Level AA.** This is a hard gate — `design-qa-auditor` fails the build
on any violation.

## The four principles → the criteria that bite design work

### Perceivable
- **1.1.1 Non-text content (A):** every meaningful image/icon has a text alternative; decorative ones
  are `aria-hidden` / empty `alt`.
- **1.3.1 Info & relationships (A):** structure conveyed visually is in the markup (headings, lists,
  `<label>`, table headers, landmarks). Reading order in DOM = visual order (**1.3.2**).
- **1.4.1 Use of color (A):** color is never the *only* means of conveying info (add icon/text/underline).
- **1.4.3 Contrast (minimum) (AA):** **text ≥ 4.5:1**; **large text ≥ 3:1** (large = ≥24px, or ≥18.66px
  bold ≈ 14pt bold / 18pt).
- **1.4.11 Non-text contrast (AA):** UI components (borders, focus rings, form field edges) and
  meaningful graphics/icons **≥ 3:1** against adjacent colors.
- **1.4.10 Reflow (AA):** usable at 320 CSS px wide with no 2-D scrolling (no horizontal scroll for
  vertical content).
- **1.4.12 Text spacing (AA):** no loss of content when users override line-height/letter/word/paragraph
  spacing.
- **1.4.13 Content on hover/focus (AA):** hover/focus popups are dismissable, hoverable, persistent.

### Operable
- **2.1.1 Keyboard (A):** all functionality via keyboard; **2.1.2** no keyboard trap.
- **2.2.2 Pause/stop/hide (A):** moving/auto-updating content > 5s can be paused/stopped.
- **2.3.3 Animation from interactions (AAA, but we enforce):** motion triggered by interaction can be
  disabled unless essential → honor `prefers-reduced-motion` (pairs with `motion.md`).
- **2.4.7 Focus visible (AA):** keyboard focus indicator is always visible.
- **2.4.11 Focus not obscured (minimum) (AA — NEW in 2.2):** focused element not fully hidden by
  sticky headers/footers/overlays.
- **2.4.13 Focus appearance (AAA — NEW in 2.2):** aim for a thick, high-contrast focus ring
  (≥2px perimeter, ≥3:1) — we target this even though AAA.
- **2.5.7 Dragging movements (AA — NEW):** any drag has a single-pointer (non-drag) alternative.
- **2.5.8 Target size (minimum) (AA — NEW):** interactive targets **≥ 24×24 CSS px** (or adequate
  spacing/inline exception). On touch, prefer ≥44pt (iOS) / ≥48dp (Android) — stricter platform rule.

### Understandable
- **3.2.1/3.2.2 On focus / on input (A):** focus or input change doesn't cause an unexpected context
  change.
- **3.3.1 Error identification (A):** input errors are identified in text; **3.3.2** every field has a
  visible label/instruction; **3.3.3** error suggestion where known.
- **3.3.7 Redundant entry (A — NEW):** don't force re-entering info already provided in the session.
- **3.3.8 Accessible authentication (minimum) (AA — NEW):** no cognitive-function test (e.g. transcribe
  a code) without an alternative; allow paste into password fields.

### Robust
- **4.1.2 Name, role, value (A):** every UI component exposes correct name/role/state to AT (use
  native elements or correct ARIA — see `aria-apg.md`).
- **4.1.3 Status messages (AA):** status updates announced via `role="status"`/`aria-live` without
  moving focus.

## New in WCAG 2.2 (don't forget these — commonly missed)
2.4.11 focus-not-obscured · 2.4.13 focus appearance · 2.5.7 dragging alternatives · 2.5.8 target size ·
3.2.6 consistent help · 3.3.7 redundant entry · 3.3.8 accessible authentication.
(4.1.1 Parsing was **removed** in 2.2.)

## Auditor quick-checklist (what `design-qa-auditor` runs)
- [ ] Contrast: every text pair ≥4.5:1 (≥3:1 large); every UI/graphic edge ≥3:1.
- [ ] Focus: visible on all interactive elements; not obscured; order = visual order.
- [ ] Keyboard: full operation, no trap; every APG widget's key map works.
- [ ] Targets ≥24×24 CSS px (≥44pt/48dp on touch).
- [ ] Names/roles/states correct (axe/Lighthouse a11y pass, 0 serious).
- [ ] Reflow at 320px; text-spacing override survives; motion respects reduced-motion.
- [ ] Forms: labels, error identification + suggestion, no redundant entry.
