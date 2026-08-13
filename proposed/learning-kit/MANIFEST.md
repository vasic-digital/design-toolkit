# Component Pack Manifest — OpenDesign Learning Kit

- **Name:** OpenDesign Learning Kit (`learning-kit`)
- **Version:** 1.0.0
- **Type:** Reusable, fully-decoupled CSS component pack (OpenDesign component layer)
- **Namespace:** `lk-*` (classes), `--lk-*` (tokens)
- **Status:** proposed
- **Dependencies:** the OpenDesign token layer **only** (`--od-*` custom properties,
  e.g. as provided by `brand-*/milosvasic.css`). No other CSS, no JavaScript, no
  framework, no build step, no external assets/CDN.
- **Runtime:** plain CSS — drops into any OpenDesign-tokened surface.

## Contents

| File | Role |
| --- | --- |
| `kit-tokens.css` | `--lk-*` token layer (radius, elevation, gap, ring geometry, flip, skeleton, semantic tints), all derived from `--od-*`. Includes an `@supports` standalone fallback. |
| `learning-kit.css` | The component library — all `lk-*` classes. |
| `README.md` | Full per-component documentation: classes, variants/states, consumed tokens, copy-paste HTML examples. |

> The interactive `demo.html` and the source-of-truth copies live alongside the
> design system at `design-system/learning-kit/`. This `proposed/` copy is the
> portable, self-contained pack for reuse.

## Components (15)

`lk-card`, `lk-track-card`, `lk-module-card`, `lk-flashcard` (3D flip),
`lk-quiz-option` (default/selected/correct/incorrect), `lk-progress-ring`
(SVG + conic-gradient variants), `lk-pill` / `lk-badge`, `lk-hero`, `lk-stat`,
`lk-chip`, `lk-skeleton` (shimmer), `lk-nav`, `lk-breadcrumb`, `lk-fab`,
`lk-toast`.

## Design guarantees

- **Brand-neutral / theme-driven.** Colour, spacing, type and motion come solely
  from `--od-*` / `--lk-*` tokens, so the pack renders correctly in light and dark
  by consuming the host's active theme — no hardcoded brand hex (only documented
  token fallbacks in the `@supports` block).
- **Accessible.** Visible `--od-focus` rings on every interactive control; WCAG AA
  semantic-marker contrast held in both themes (§11.4.107).
- **Motion-safe.** Honours `prefers-reduced-motion: reduce` — non-essential motion
  is disabled while final states remain visible.
- **Responsive.** Fluid `clamp()`/relative units, `aspect-ratio`, flex/grid; wide
  content scrolls within its own container.
- **No-bluff grounding.** Every `--od-*` reference resolves against the real
  OpenDesign token contract (Constitution §11.4.6).

## Intended reuse

Reusable across any project that adopts the OpenDesign token layer — course sites,
LMS front-ends, onboarding/tutorial flows, documentation learning paths. Copy the
two CSS files (and this manifest/README) into the target; no wiring into other
systems is required or implied. This pack is intentionally left **self-contained
and decoupled** — it is not imported by any other component here.

## Integrity (sanity-checked at authoring)

- Both CSS files are non-empty and contain `lk-` classes.
- Balanced braces (`{` count == `}` count) in both CSS files.
- `@media (prefers-reduced-motion: reduce)` present in `learning-kit.css`.
