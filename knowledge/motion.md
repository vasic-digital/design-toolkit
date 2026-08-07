# Motion — Tokens, Easings, Reduced-Motion Gate

> **Sources:** Material 3 Motion (m3.material.io/styles/motion — open, Apache-2.0/CC-BY-4.0) ·
> easings.net (MIT, github.com/ai/easings.net — table vendorable) · MDN prefers-reduced-motion
> (CC-BY-SA) · Disney 12 principles (Wikipedia CC-BY-SA summary — *concepts* only, book is paid).
> Distilled rules only.

## 1. Duration tokens (Material 3 scale)

| Token | ms | Use |
|-------|----|----|
| `short1–4` | 50 / 100 / 150 / 200 | small utility (hover, selection, icon state) |
| `medium1–4` | 250 / 300 / 350 / 400 | standard component transitions |
| `long1–4` | 450 / 500 / 550 / 600 | large surface / full-screen transitions |
| `extra-long1–4` | 700–1000 | ambient / large expressive (rare) |

Budget: UI feedback ≤ ~200ms; transitions 200–400ms; nothing essential > ~500ms.

## 2. Easing tokens (Material 3 emphasized/standard)

| Token | cubic-bezier | Feel |
|-------|--------------|------|
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` | default in/out |
| `standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` | entering (ease-out) |
| `standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | exiting (ease-in) |
| `emphasized` | `cubic-bezier(0.2, 0, 0, 1)` (spatial, longer) | expressive spatial moves |
| `emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | expressive enter |
| `emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | expressive exit |

Reference general-purpose curves from **easings.net** (MIT) when M3 tokens don't fit
(`easeOutCubic (0.33,1,0.68,1)`, `easeInOutQuart`, etc.). Enter with decelerate, exit with accelerate.

## 3. The reduced-motion gate (mandatory)

```css
@media (prefers-reduced-motion: no-preference) {
  .thing { transition: transform var(--motion-medium2) var(--motion-standard); }
}
/* Reduced-motion path = same FINAL state, no movement. */
```

- Every non-trivial motion is inside `no-preference`. Default (no query) = static end-state.
- WCAG 2.3.3 (animation from interactions) + 2.2.2 (pause/stop/hide). Essential motion (e.g. a
  loading indicator) is the only exception and must still be minimal.

## 4. GPU-only rule (CI-enforced)

Animate **only** `transform`, `opacity`, and compositor-safe `filter`. **Never** animate
`width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` (layout/paint → jank). CI greps
emitted CSS and fails on forbidden animated properties. Use `transform: scale/translate` for size/
position illusions; use layered box-shadow *swaps* (opacity of a shadow layer) not shadow animation.

## 5. Motion vocabulary (choose by intent — Disney concepts)

- **Feedback** (hover/press/focus): opacity + tiny scale/translate, `short2–3`, `standard`. Focus ring
  stays visible; never animate it away.
- **Entrance/reveal:** scroll-driven (`animation-timeline: view()` or IntersectionObserver) →
  opacity + translateY; one-shot; reduced-motion → visible immediately.
- **Continuity:** View Transitions API with a static-crossfade fallback; name only persisting elements.
- **Staging/anticipation/follow-through** (Disney): direct attention, hint before a big move, settle
  naturally — but always within the budget and GPU-only constraints.

## 6. Determinism
Motion must settle to a stable, testable end-state (Playwright forces it for goldens). No timing-
dependent final states; no infinite essential motion.
