# Material Design 3 — Vendorable System Reference

> **Source:** Material Design 3, https://m3.material.io/ · **License:** Apache-2.0 / CC-BY-4.0 —
> **truly open, vendorable with attribution.** This is the richest open, cross-platform design
> system, and the reference the parametric-uniqueness layer generalizes (M3 dynamic color is the
> canonical "one seed → whole accessible system"). Distilled rules.

## 1. Color roles (the semantic contract)

Key colors → tonal palettes → roles. Emit these as tokens (see `color.md`, `dtcg-tokens.md`):

- **Accent groups (× primary, secondary, tertiary):** `<accent>`, `on-<accent>`,
  `<accent>-container`, `on-<accent>-container`.
- **Error:** `error`, `on-error`, `error-container`, `on-error-container`.
- **Neutral/surface:** `surface`, `on-surface`, `surface-variant`, `on-surface-variant`,
  `surface-container-lowest…highest` (elevation via tone, not just shadow), `background`,
  `on-background`, `inverse-surface`, `inverse-on-surface`, `inverse-primary`.
- **Utility:** `outline`, `outline-variant`, `scrim`, `shadow`.

Each `on-*` is toned to pass contrast (see `color.md` gate) against its background, in **both** light
and dark. Elevation in M3 is expressed through **surface-container tones** (tonal elevation), with
shadow as a secondary cue.

## 2. Tonal palette & tone convention

Each key color expands to tones `0,10,20,…,90,95,99,100` (HCT tone ≈ WCAG lightness). Light scheme
pulls surfaces from high tones and on-colors from low; dark inverts. `material-color-utilities`
computes this from a seed + variant.

## 3. Scheme variants (personality dials)

`TonalSpot` (balanced default) · `Vibrant` (high chroma primary) · `Expressive` (playful,
wider hue spread) · `Neutral` (muted) · `Monochrome` (grayscale) · `Fidelity`/`Content` (stay close
to source color) · `Rainbow` / `FruitSalad`. The `theming-designer` `mcvVariant` axis.

## 4. Type scale roles
`display l/m/s` · `headline l/m/s` · `title l/m/s` · `body l/m/s` · `label l/m/s` — each a
size/line-height/weight/tracking set (see `typography.md`).

## 5. Shape scale
`none (0)` · `extra-small (4)` · `small (8)` · `medium (12)` · `large (16)` · `extra-large (28)` ·
`full (pill)`. Maps to the `radiusBase` personality axis.

## 6. Layout / adaptive
Window size classes: **compact** (<600dp) · **medium** (600–840dp) · **expanded** (>840dp) — plus
large/extra-large in newer guidance. Adaptive panes: single pane (compact) → list-detail /
supporting-pane (medium+). Spacing on the 4/8dp grid. Touch targets ≥48dp.

## 7. Motion
Duration + easing token sets (standard / emphasized × accelerate/decelerate) — see `motion.md`.

## 8. How the toolkit uses M3
- As the **default semantic role set** and **tonal-elevation** convention the generator emits.
- As the **proven pattern** for seed→scheme (generalized to type/space/shape/marks by the toolkit).
- **Not** as a visual skin to copy verbatim — variants + our harmony/type/shape axes make each
  project distinct while keeping M3's accessibility and structure. Attribute M3 where its tokens/
  guidance are used.
