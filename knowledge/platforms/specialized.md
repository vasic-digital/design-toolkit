# Specialized Surfaces — Game UI · XR · Automotive · Embedded/TUI · E-ink · Print · Data-viz · Brand

> Distilled cross-domain reference. Each domain carries its canonical source; **[UNVERIFIED]** and
> folklore flags preserved.

## 1. Game UI / HUD
- **Taxonomy (Fagerholt & Lorentzon):** **diegetic** (exists in the game world, character can
  perceive it) · **non-diegetic** (overlay, only the player sees — classic HUD) · **spatial** (in the
  3D world but not part of fiction, e.g. floating waypoints) · **meta** (in fiction but not spatial,
  e.g. blood on screen).
- **Safe zone:** keep critical HUD inside the **inner ~90%** of the screen. The oft-cited **"80%
  title-safe" is TV-broadcast folklore for modern displays — [UNVERIFIED] as a game requirement**;
  use platform TRC/cert values where they exist.
- **Controller focus navigation** — explicit focusable elements + directional (D-pad/stick) traversal
  and a clear focused state (no cursor).
- Accessibility: **Game Accessibility Guidelines** (https://gameaccessibilityguidelines.com/) and
  **Xbox Accessibility Guidelines (XAGs)**
  (https://learn.microsoft.com/gaming/accessibility/guidelines).

## 2. XR (VR / AR / MR)
- **Meta Quest:** app target frame rate **72 Hz** (baseline; higher on newer devices). Source:
  https://developers.meta.com/horizon/
- **visionOS:** **60 pt** minimum target (angular; ≈2.5°) — see `apple.md` §5. Source:
  https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos
- **HoloLens 2:** place primary interactable content about **2 m** away ("table" distance ~1.25–2 m
  comfort zone). Source: https://learn.microsoft.com/windows/mixed-reality/design/
- General: comfort (avoid vergence-accommodation strain), gaze+gesture targets, world-locked vs
  head-locked placement.

## 3. Automotive (driver distraction)
- **NHTSA guidelines:** any single glance off-road **≤ 2 s**, cumulative task time **≤ 12 s**.
- Lock out complex interactions while driving; large targets, high contrast, minimal steps.
- Source: NHTSA Visual-Manual Driver Distraction Guidelines,
  https://www.nhtsa.gov/ (Driver Distraction). See also `android-material3.md` §6 for AAOS specifics.

## 4. Embedded / TUI (terminal)
- **Classic canvas: 80 × 24** character cells (default terminal) — design to it, reflow beyond.
- **Color: ECMA-48 / ANSI escape codes** (SGR) — 16 base colors, 256-color, and truecolor; don't
  assume truecolor support.
- **Box-drawing characters** (U+2500 block) for borders/tables; test in the target font/locale.
- Source: ECMA-48 https://ecma-international.org/publications-and-standards/standards/ecma-48/

## 5. E-ink
- **Partial refresh** (fast, may ghost) vs **full refresh** (slow, clears ghosting) — choose per
  interaction; batch updates.
- **1-bit or grayscale** panels; design for low/no color and slow refresh.
- **No animation** (smearing/ghosting) — use discrete state changes, not transitions.

## 6. Print / editorial
- **Measure: 45–75 characters per line** for body text.
- **Bleed: 3 mm** beyond trim for edge-to-edge art.
- **CMYK** color space for offset print (not RGB); **300 DPI** for images at final size.
- **Baseline grid** to align cross-column text.

## 7. Data visualization
- **Cleveland–McGill ranking** of encodings (most→least accurate): position on common scale →
  position on non-aligned scales → length → angle/slope → area → volume → color/saturation. Prefer
  higher-ranked encodings for quantitative data. Source: Cleveland & McGill (1984).
- **Palettes:** **ColorBrewer** (https://colorbrewer2.org/) for categorical/sequential/diverging;
  **viridis** for perceptually-uniform sequential.
- **Never encode by color alone** — add shape/label/pattern (color-blind safe; WCAG 1.4.1). See core
  `dataviz` skill/`color.md`.

## 8. Brand / identity
- **Tiered tokens:** **global (primitive) → semantic → component** (see `dtcg-tokens.md` §4). Brand
  personality lives at the global/semantic layers; components consume semantics, never raw primitives.
