# Color — Model, Scales, Contrast Gate

> **Sources:** OKLCH picker (Evil Martians, oklch.com, free/OSS) · Material 3 color system
> (Apache-2.0 / CC-BY-4.0, m3.material.io/styles/color) · Radix Colors (MIT, radix-ui.com/colors) ·
> Open Color (MIT, yeun.github.io/open-color) · WCAG 2.2 contrast (W3C, authoritative). Distilled
> rules only.

## 1. The color model: OKLCH + HCT

Author perceptual, not sRGB. Two perceptual spaces we use:

- **OKLCH** `oklch(L C H)` — `L` lightness 0–1 (perceptually uniform), `C` chroma 0–~0.37, `H` hue
  0–360°. Equal `L` steps *look* equally spaced; changing `H` at fixed `L`/`C` keeps perceived
  lightness stable. Use for **custom harmony ramps** and gamut-safe P3.
- **HCT** (Hue, Chroma, Tone) — Google's space behind Material dynamic color; **Tone** maps ~1:1 to
  WCAG lightness, so *"tone difference ≈ contrast"*. Use via `material-color-utilities` for
  seed→scheme.

**P3 with sRGB fallback:** emit wide-gamut where supported, always with an sRGB fallback (color.js
gamut-maps). Never ship a P3-only value.

## 2. Seed → full scheme (the uniqueness primitive)

`material-color-utilities`: one **seed hue** → HCT → **tonal palettes** (tones 0,10,20,…,100 per key
color) → **role-mapped light + dark scheme**. Scheme **variants** are per-project personality dials:
`TonalSpot` (default), `Vibrant`, `Expressive`, `Neutral`, `Monochrome`, `Fidelity`, `Content`,
`Rainbow`, `FruitSalad`.

**Harmony rules** (for secondary/tertiary hue offsets, via color.js/chroma.js):
complementary +180° · analogous ±30° · triadic ±120° · split-complementary · monochrome.
The *rule chosen* is a per-project lever.

## 3. Semantic roles (map every value to a role — never a raw hex)

From Material 3 (encode the role set; `theming-designer` emits these as DTCG):
`primary / on-primary / primary-container / on-primary-container` (× secondary, tertiary, error),
`surface / on-surface / surface-variant / on-surface-variant`, `background / on-background`,
`outline / outline-variant`, `inverse-surface / inverse-on-surface`, `scrim / shadow`.
Every foreground has an `on-*` partner sized to pass contrast against its background.

## 4. Contrast gate (HARD — WCAG 2.2, authoritative)

| Pair | Minimum ratio |
|------|---------------|
| Normal text vs background | **4.5:1** |
| Large text (≥24px / ≥18.66px bold) | **3:1** |
| UI component / graphic edge (borders, focus ring, icon) — 1.4.11 | **3:1** |

- Compute with `color.js` `contrastWCAG21()` (or coolors MCP). **Any failing pair → adjust HCT tone /
  OKLCH L until it passes.** Do not ship a failing pair.
- **APCA** (Lc) is **advisory only** — bespoke beta license, pulled from the WCAG 3 draft, unsettled
  as of 2026. May inform tuning; never the gate.
- Dark mode is not "invert" — regenerate roles from the tonal palette (M3 uses lower tones for
  surfaces, higher for on-colors). Re-check every pair in both modes.

## 5. Ready-made scales (when not generating from a seed)

- **Radix Colors** (MIT): 12-step scales, steps have fixed *purposes* (1–2 app bg, 3–5 component bg,
  6–8 borders, 9–10 solid, 11–12 text); APCA-tuned, auto dark, P3. The "restrained/safe" personality.
- **Open Color** (MIT): 13 hues × 10 shades — quick utility palette.
- **Tailwind palette generators** (tints.dev MIT, etc.): one hex → 11 steps — only for Tailwind-native
  projects; less rigorous than MCU/OKLCH.

## 6. Rules the agents enforce
1. No raw hex/rgb literals in site CSS — every color is an OpenDesign token mapped to a semantic role.
2. Generate light **and** dark from the tonal palette; verify both.
3. Every `on-*`/background pair passes the WCAG ratio for its size class before hand-off.
4. Wide-gamut P3 always has an sRGB fallback.
5. Color never the sole information carrier (WCAG 1.4.1 — pair with icon/text).
