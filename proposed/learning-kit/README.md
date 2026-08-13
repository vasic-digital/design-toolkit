# OpenDesign Learning Kit

A **decoupled, reusable** CSS component library for learning / education platforms.
Every class is namespaced `lk-`. The kit is **brand-neutral and theme-driven**: it
consumes only the OpenDesign `--od-*` token layer (plus a small `--lk-*` layer
derived from it), so it renders correctly in **light and dark** with zero code
changes and never hardcodes a brand colour (except as documented token fallbacks).

- **No external dependencies. No build step. No framework.** Plain CSS custom
  properties and standard selectors.
- **Depends only on the OpenDesign token layer** (`brand-*/milosvasic.css`) — see
  Constitution §11.4.6 (no bluff): the `--od-*` names below resolve against the
  real OpenDesign contract.
- **Accessible focus** on every interactive element via `--od-focus`.
- **Respects `prefers-reduced-motion: reduce`** — non-essential motion is disabled
  while final visual states are preserved.

## Files

| File | Purpose |
| --- | --- |
| `kit-tokens.css` | The `--lk-*` token layer (radius, elevation, gap, ring geometry, flip, skeleton, tints) — all derived from `--od-*`. |
| `learning-kit.css` | The component library (all `lk-*` classes). |
| `demo.html` | Standalone page rendering every component in light **and** dark. Open directly in a browser. |
| `README.md` | This document. |

## Install / use

Load the OpenDesign token layer first, then the kit tokens, then the components:

```html
<link rel="stylesheet" href="brand-milosvasic/milosvasic.css">
<link rel="stylesheet" href="learning-kit/kit-tokens.css">
<link rel="stylesheet" href="learning-kit/learning-kit.css">
```

Or with `@import` (order matters — tokens before components):

```css
@import url("brand-milosvasic/milosvasic.css");
@import url("learning-kit/kit-tokens.css");
@import url("learning-kit/learning-kit.css");
```

Theme switching is inherited from OpenDesign: set `data-theme="dark"` /
`data-theme="light"` on `:root` (or leave it to `prefers-color-scheme`). The kit
needs no theme code of its own.

> **Standalone fallback.** If the OpenDesign brand stylesheet is ever absent,
> `kit-tokens.css` supplies a neutral fallback palette via an `@supports` block so
> the kit still renders — but the OpenDesign layer is the intended dependency.

---

## Kit tokens (`kit-tokens.css`)

All are declared on `:root` and derived from `--od-*`:

| Token | Derived from | Purpose |
| --- | --- | --- |
| `--lk-radius-sm` / `--lk-radius` / `--lk-radius-lg` / `--lk-radius-pill` | `--od-radius-*` | Component corner radii. |
| `--lk-elev-1` / `--lk-elev-2` / `--lk-elev-3` | `--od-shadow-color` | Elevation ramp (re-tints in dark). |
| `--lk-gap-xs…xl` | `--od-space-*` | Kit spacing scale. |
| `--lk-ring-size` / `--lk-ring-thickness` | — (structural) | Progress-ring geometry. |
| `--lk-ring-track` / `--lk-ring-fill` / `--lk-ring-text` | `--od-surface-2` / `--od-accent` / `--od-text` | Progress-ring colours. |
| `--lk-flip-dur` / `--lk-flip-ease` / `--lk-flip-perspective` | `--od-dur-slow` / `--od-ease-emphasized` | Flashcard 3D flip. |
| `--lk-skeleton-base` / `--lk-skeleton-sheen` / `--lk-skeleton-dur` | `--od-surface-2` / `--od-text` | Loading shimmer. |
| `--lk-tint-accent` / `--lk-tint-success` / `--lk-tint-danger` | `--od-accent` / `--od-success` / `--od-danger` + `--od-surface` | Soft semantic washes. |
| `--lk-lift` / `--lk-z-fab` | — (structural) | Hover lift, FAB stacking. |

---

## Components

### `lk-card`
Base surface card. Elements: `lk-card__title`, `lk-card__body`.
**Variants:** `lk-card--interactive` (lifts on hover/focus), `lk-card--accent`
(leading accent rail).
**Tokens:** `--od-surface`, `--od-border`, `--lk-radius`, `--lk-elev-1/3`,
`--od-accent`, `--od-focus`.

```html
<article class="lk-card lk-card--interactive lk-card--accent" tabindex="0">
  <h3 class="lk-card__title">Card title</h3>
  <p class="lk-card__body">Supporting copy.</p>
</article>
```

### `lk-track-card`
Learning-track / course card with a media band and a linear progress footer.
Elements: `lk-track-card__media` (drop an `<img>` inside), `lk-track-card__content`,
`lk-track-card__eyebrow`, `lk-track-card__title`, `lk-track-card__desc`,
`lk-track-card__footer`, `lk-track-card__progress`, `lk-track-card__progress-label`.
Set progress with the inline custom property `--lk-progress` (a percentage).
**Tokens:** `--od-surface`, `--od-border`, `--lk-elev-1/3`, `--od-accent`,
`--od-surface-2`.

```html
<article class="lk-track-card" tabindex="0">
  <div class="lk-track-card__media"></div>
  <div class="lk-track-card__content">
    <span class="lk-track-card__eyebrow">12 modules · 6h</span>
    <h3 class="lk-track-card__title">Design Systems 101</h3>
    <p class="lk-track-card__desc">Tokens, components, theming and accessibility.</p>
  </div>
  <div class="lk-track-card__footer">
    <span class="lk-track-card__progress" style="--lk-progress:64%"></span>
    <span class="lk-track-card__progress-label">64%</span>
  </div>
</article>
```

### `lk-module-card`
Compact lesson/module row: leading index, title + meta, trailing state.
Elements: `lk-module-card__index`, `lk-module-card__main`, `lk-module-card__title`,
`lk-module-card__meta`.
**Variants/states:** `lk-module-card--interactive`, `lk-module-card--done`
(accent index), `lk-module-card--locked` (dimmed, not-allowed).
**Tokens:** `--od-surface`, `--od-border`, `--od-accent`, `--od-on-accent`,
`--od-surface-2`, `--lk-elev-1/2`.

```html
<div class="lk-module-card lk-module-card--done lk-module-card--interactive" tabindex="0">
  <span class="lk-module-card__index">✓</span>
  <span class="lk-module-card__main">
    <span class="lk-module-card__title">Introduction to tokens</span>
    <span class="lk-module-card__meta">Completed · 18 min</span>
  </span>
  <span class="lk-pill lk-pill--success">Done</span>
</div>
```

### `lk-flashcard`
3D flip card with a front and back face. Toggle with `.is-flipped` on the root
(e.g. via JS on click) — CSS also flips on `:focus-within` as a no-JS fallback.
Elements: `lk-flashcard__inner`, `lk-flashcard__face` +
`lk-flashcard__face--front` / `lk-flashcard__face--back`, plus content helpers
`lk-flashcard__kicker`, `lk-flashcard__term`, `lk-flashcard__definition`.
**Tokens:** `--lk-flip-dur`, `--lk-flip-ease`, `--lk-flip-perspective`,
`--od-surface`, `--od-accent`, `--od-on-accent`, `--lk-elev-2`, `--od-focus`.

```html
<div class="lk-flashcard" tabindex="0" role="button" aria-label="Flip to reveal">
  <div class="lk-flashcard__inner">
    <div class="lk-flashcard__face lk-flashcard__face--front">
      <span class="lk-flashcard__kicker">Term</span>
      <p class="lk-flashcard__term">Cascade</p>
    </div>
    <div class="lk-flashcard__face lk-flashcard__face--back">
      <span class="lk-flashcard__kicker">Definition</span>
      <p class="lk-flashcard__definition">The algorithm that resolves which CSS rule wins.</p>
    </div>
  </div>
</div>
```

### `lk-quiz-option`
Selectable answer (`<button>` recommended). Elements: `lk-quiz-option__marker`,
`lk-quiz-option__text`.
**States:** default; `lk-quiz-option--selected` (or `[aria-checked="true"]`);
`lk-quiz-option--correct`; `lk-quiz-option--incorrect`; plus `:disabled` /
`[aria-disabled="true"]`.
**Tokens:** `--od-surface`, `--od-border`, `--od-accent`, `--lk-tint-accent`,
`--od-success`, `--lk-tint-success`, `--od-danger`, `--lk-tint-danger`,
`--od-focus`.

```html
<button class="lk-quiz-option lk-quiz-option--selected" type="button" aria-checked="true">
  <span class="lk-quiz-option__marker">B</span>
  <span class="lk-quiz-option__text">Selected option</span>
</button>
```

### `lk-progress-ring`
Circular progress in two interchangeable forms.

- **SVG variant:** classes `lk-progress-ring__svg`, `lk-progress-ring__track`,
  `lk-progress-ring__value`. Drive the arc with `stroke-dasharray` (circumference)
  and `stroke-dashoffset`. For `r="43"` the circumference is `270.18`.
- **Conic variant:** `lk-progress-ring--conic` — no SVG. Set `--lk-progress`
  (0–100, unitless) inline.

Both center a `lk-progress-ring__label`.
**Tokens:** `--lk-ring-size`, `--lk-ring-thickness`, `--lk-ring-track`,
`--lk-ring-fill`, `--lk-ring-text`.

```html
<!-- SVG -->
<div class="lk-progress-ring" role="img" aria-label="72 percent complete">
  <svg class="lk-progress-ring__svg" viewBox="0 0 96 96">
    <circle class="lk-progress-ring__track" cx="48" cy="48" r="43"></circle>
    <circle class="lk-progress-ring__value" cx="48" cy="48" r="43"
      stroke-dasharray="270.18" stroke-dashoffset="75.65"></circle>
  </svg>
  <span class="lk-progress-ring__label">72%</span>
</div>

<!-- Conic -->
<div class="lk-progress-ring lk-progress-ring--conic" style="--lk-progress:45"
     role="img" aria-label="45 percent complete">
  <span class="lk-progress-ring__label">45%</span>
</div>
```

### `lk-pill` / `lk-badge`
`lk-pill` — soft status/label token. **Variants:** `lk-pill--accent`,
`lk-pill--success`, `lk-pill--warning`, `lk-pill--danger`; optional leading
`lk-pill__dot`.
`lk-badge` — tiny count badge; **variant** `lk-badge--dot` (indicator dot).
**Tokens:** `--od-surface-2`, `--lk-tint-accent`, `--od-accent`, `--od-success`,
`--od-warning`, `--od-danger`, `--od-on-accent`, `--lk-radius-pill`.

```html
<span class="lk-pill lk-pill--success">Completed</span>
<span class="lk-pill"><span class="lk-pill__dot"></span>Neutral</span>
<span class="lk-badge">9+</span>
<span class="lk-badge lk-badge--dot" aria-label="new"></span>
```

### `lk-hero`
Course / page hero band with a token-tinted radial wash. Elements:
`lk-hero__eyebrow`, `lk-hero__title`, `lk-hero__lede`, `lk-hero__actions`.
**Tokens:** `--od-accent`, `--od-surface`, `--od-border`, `--od-text`,
`--od-text-muted`, `--od-font-display`, `--lk-radius-lg`.

```html
<div class="lk-hero">
  <span class="lk-hero__eyebrow">Path · Frontend</span>
  <h2 class="lk-hero__title">Master Modern CSS</h2>
  <p class="lk-hero__lede">Twelve hands-on modules from tokens to container queries.</p>
  <div class="lk-hero__actions"><button>Start learning</button></div>
</div>
```

### `lk-stat`
Metric tile. Elements: `lk-stat__value`, `lk-stat__label`, `lk-stat__trend`
(+ `lk-stat__trend--up` / `lk-stat__trend--down`).
**Tokens:** `--od-surface`, `--od-border`, `--od-accent`, `--od-success`,
`--od-danger`, `--lk-elev-1`.

```html
<div class="lk-stat">
  <span class="lk-stat__value">68%</span>
  <span class="lk-stat__label">Course progress</span>
  <span class="lk-stat__trend lk-stat__trend--up">▲ 12% this week</span>
</div>
```

### `lk-chip`
Filter / tag chip. **States:** `lk-chip--selected` (or `[aria-pressed="true"]`).
Optional trailing `lk-chip__remove` button.
**Tokens:** `--od-surface`, `--od-border`, `--od-accent`, `--od-on-accent`,
`--od-focus`, `--lk-radius-pill`.

```html
<button class="lk-chip lk-chip--selected" aria-pressed="true">All</button>
<span class="lk-chip">React
  <button class="lk-chip__remove" aria-label="Remove React filter">×</button>
</span>
```

### `lk-skeleton`
Loading placeholder with a shimmer sweep (`@keyframes lk-shimmer`). **Shapes:**
`lk-skeleton--text`, `lk-skeleton--title`, `lk-skeleton--line-sm`,
`lk-skeleton--line-lg`, `lk-skeleton--avatar`, `lk-skeleton--thumb`.
**Tokens:** `--lk-skeleton-base`, `--lk-skeleton-sheen`, `--lk-skeleton-dur`,
`--lk-radius`. Motion is removed under `prefers-reduced-motion`.

```html
<div class="lk-card" aria-busy="true">
  <div class="lk-skeleton lk-skeleton--thumb"></div>
  <div class="lk-skeleton lk-skeleton--title"></div>
  <div class="lk-skeleton lk-skeleton--text lk-skeleton--line-lg"></div>
</div>
```

### `lk-nav`
Horizontal learning nav / tab strip. Item: `lk-nav__item`; **active** via
`lk-nav__item--active`, `[aria-current="page"]` or `[aria-selected="true"]`
(accent underline scales in).
**Tokens:** `--od-border`, `--od-text-muted`, `--od-text`, `--od-accent`,
`--od-focus`.

```html
<nav class="lk-nav" aria-label="Course sections">
  <a class="lk-nav__item lk-nav__item--active" href="#" aria-current="page">Overview</a>
  <a class="lk-nav__item" href="#">Modules</a>
  <a class="lk-nav__item" href="#">Practice <span class="lk-badge">3</span></a>
</nav>
```

### `lk-breadcrumb`
Path trail (`<ol>`). Elements: `lk-breadcrumb__item`, `lk-breadcrumb__link`,
`lk-breadcrumb__sep` (mark `aria-hidden`), and the current page via
`[aria-current="page"]` on the item.
**Tokens:** `--od-text-muted`, `--od-text`, `--od-accent`, `--od-border`,
`--od-focus`.

```html
<ol class="lk-breadcrumb">
  <li class="lk-breadcrumb__item"><a class="lk-breadcrumb__link" href="#">Home</a></li>
  <li class="lk-breadcrumb__sep" aria-hidden="true">/</li>
  <li class="lk-breadcrumb__item" aria-current="page">Modern CSS</li>
</ol>
```

### `lk-fab`
Floating action button (`position: fixed`, bottom-right). **Variant:**
`lk-fab--icon` (circular, icon-only).
**Tokens:** `--od-accent`, `--od-accent-hover`, `--od-on-accent`, `--lk-elev-3`,
`--od-focus`, `--lk-z-fab`, `--lk-radius-pill`.

```html
<button class="lk-fab">＋ New note</button>
<button class="lk-fab lk-fab--icon" aria-label="Add">＋</button>
```

### `lk-toast`
Notification inside a stacking `lk-toast-region`. Elements: `lk-toast__icon`,
`lk-toast__body`, `lk-toast__title`, `lk-toast__msg`, `lk-toast__close`.
**Variants:** `lk-toast--success`, `lk-toast--warning`, `lk-toast--danger`
(default is accent). Enter animation `@keyframes lk-toast-in`; disabled under
reduced motion.
**Tokens:** `--od-surface`, `--od-text`, `--od-accent`, `--od-success`,
`--od-warning`, `--od-danger`, `--lk-elev-3`, `--od-z-toast`, `--od-focus`.

```html
<div class="lk-toast-region">
  <div class="lk-toast lk-toast--success" role="status">
    <span class="lk-toast__icon">✓</span>
    <span class="lk-toast__body">
      <span class="lk-toast__title">Module complete</span>
      <span class="lk-toast__msg">You earned the Color &amp; Contrast badge.</span>
    </span>
    <button class="lk-toast__close" aria-label="Dismiss">×</button>
  </div>
</div>
```

---

## Accessibility & motion

- Every interactive control exposes a visible focus ring
  (`outline: 2px solid var(--od-focus)`).
- Semantic marker colours on quiz options / pills use fixed white/near-black text
  where needed to hold WCAG AA contrast on green/amber/red in both themes
  (per §11.4.107), rather than a theme-flipping token.
- `@media (prefers-reduced-motion: reduce)` disables hover lifts, the flashcard
  flip transition, progress transitions, the skeleton shimmer and the toast enter
  animation, while keeping all final states visible.

## Decoupling statement

This kit is **fully self-contained and reusable across projects**. Its only
dependency is the OpenDesign `--od-*` token layer. It introduces no JavaScript
requirement (the `demo.html` script is illustrative only), no framework binding,
and no build tooling. Drop the two CSS files into any OpenDesign-tokened site and
the `lk-*` components inherit that site's brand and theme automatically.

**Version:** 1.0.0
