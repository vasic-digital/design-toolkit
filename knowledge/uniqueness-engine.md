# Parametric Uniqueness Engine — Full Spec

> The deterministic pipeline that turns a **seed** into a **provably distinct, accessible** design
> system emitted as DTCG tokens. Every design-DNA axis is tagged **[E] established** (grounded in a
> cited theory/standard) or **[H] heuristic** (our tunable rule of thumb — not authoritative).
> **All [E]/[H] tags and UNVERIFIED/caveat flags below are load-bearing — do not strip them.**

## 1. Pipeline

```
seed
  → PRNG (deterministic; seed reproduces the whole system)
  → design-DNA vector (bounded axes, §3)
  → blue-noise gate (reject candidates too close to prior designs, §4)
  → guardrail projection (clamp/repair into the accessible+brand-locked feasible region, §5)
  → emitters (color / type / space / shape / motion / layout / texture)
  → DTCG document (tokens + provenance in $description)
  → QA (guardrail + variance re-check; HelixQA gate)
```

- **Deterministic:** same seed ⇒ same DNA ⇒ same tokens. Record seed + generator version in DTCG
  `$description` provenance (see `dtcg-tokens.md` §5).
- **Order matters:** blue-noise gate runs on the *raw DNA vector* (novelty), then guardrail
  projection repairs it (safety). Re-check variance after projection — projection can pull two
  designs closer.

## 2. Design-DNA vector
A fixed-length vector of bounded, weighted axes (§3). It is the unit of comparison for the blue-noise
separation gate (§4) and the artifact recorded for reproducibility.

## 3. DNA axes (bounded ranges, tagged)

- **Color [E]** — via **Material Color Utilities (MCU) HCT** + one of **9 `DynamicScheme`
  variants** (TonalSpot, Vibrant, Expressive, Neutral, Monochrome, Fidelity, Content, Rainbow,
  FruitSalad) + **`contrastLevel`** ∈ [−1, 1] (0 default, 0.5 medium, 1 high). Seed hue ∈ [0,360),
  chroma bounded per variant. *Established:* HCT + DynamicScheme are MCU's published model.
- **Type pairing [H]** — display/body font pairing selected from a curated, licensed pool;
  pairing rules (contrast in structure, shared x-height sanity) are heuristic.
- **Spacing / Utopia ratios [E]** — spacing scale from a **Utopia**-style modular scale; ratio ∈ a
  bounded set (e.g. 1.2 minor-third … 1.5 perfect-fifth). *Established:* Utopia fluid-scale method.
- **Shape / radius [H]** — `radiusBase` ∈ bounded px range mapped to the M3 shape scale
  (none/xs/s/m/l/xl/full); concentric derivation is heuristic.
- **Motion [E/H]** — **M3 motion tokens** (duration + emphasized/standard easing sets) as the
  established base [E]; the per-design personality dial (speed/spring intensity) is heuristic [H].
- **Layout [H]** — grid density, column count, pane strategy per size class — heuristic dials over
  the established window-size-class breakpoints.
- **Texture / depth [H]** — elevation/shadow intensity, glass/blur amount, grain — heuristic, with a
  mandatory flat/opaque fallback (§5).

## 4. Variance quantification (how "distinct" is measured)

- **Color difference — CIEDE2000 (ΔE00) [E].** Perceptual color-difference metric.
  **Caveat:** ΔE00 ≈ **1.0 is the nominal JND**, but the JND is *not* uniform across color space and
  ΔE00 is contested at large differences — treat thresholds as guidance, not physics.
  Source: CIE 142:2001 / Sharma-Wu-Dalal 2005 implementation notes.
- **Perceptual UCS — CAM16-UCS (ΔE′) [E].** Used for large-difference / gamut-aware comparison where
  ΔE00 is weak. Source: CIE CAM16-UCS (Li et al. 2017).
- **Hue pre-filter [H].** Cheaply reject candidates whose seed hue is within a small Δh window of an
  existing design before running the expensive full-vector distance.
- **Weighted DNA distance [H].** Overall separation = weighted Euclidean/normalized distance over the
  DNA axes. Weights (heuristic, tunable): **color > type > shape ≈ layout > spacing > motion ≈
  texture** (color/type dominate perceived identity). All axes normalized to [0,1] first.
- **Blue-noise / Poisson-disk separation [E].** New designs must be **≥ r** (min-distance radius) from
  all prior designs in DNA space — **Bridson's** Poisson-disk sampling. **Capacity limit:** as the
  bounded space fills, feasible points with radius r run out — the engine must **shrink r** (graceful
  degradation) or **report saturation**, not loop forever. Source: Bridson 2007, "Fast Poisson Disk
  Sampling in Arbitrary Dimensions."

## 5. Guardrails (project every candidate into the feasible region)

- **Contrast dual-gate: WCAG AA + APCA [E, w/ caveat].** Every text/UI pair must pass **WCAG 2.2 AA**
  (4.5:1 / 3:1) **and** APCA. **Caveat: APCA is a DRAFT (WCAG 3 / not normative)** — use it as an
  *additional* screen, never as a replacement for the normative WCAG AA gate. Sources:
  https://www.w3.org/TR/WCAG22/ · APCA https://git.apcacontrast.com/ .
- **Type guardrail [H]** — enforce min body size (per target platform, see `platforms/*`), min line
  length/height, cap ratio extremes.
- **Motion guardrail [E]** — respect `prefers-reduced-motion` / platform reduce-motion; provide a
  static fallback for every animated token.
- **Brand-lock [H]** — locked brand tokens (e.g. mandated primary/logo colors) are held fixed; the
  engine varies *around* them, never overwrites them.
- **Depth fallback [H]** — every glass/blur/elevation effect ships an opaque/flat fallback
  (Reduce Transparency / high-contrast / low-GPU).
- Projection = clamp/repair the raw DNA into this region. **Re-run the variance check (§4) after
  projection.**

## 6. Variance thresholds (table)

| Check | Metric | Threshold | Tag |
|-------|--------|-----------|-----|
| Two designs perceptibly different (color) | CIEDE2000 ΔE00 | ≥ ~5 on key roles (well above JND≈1) | [H] on the number, [E] on metric |
| Large-diff / gamut color | CAM16-UCS ΔE′ | used when ΔE00 saturates | [E] metric, [H] threshold |
| Hue pre-filter reject window | Δh | < ~15° ⇒ candidate suspect | [H] |
| DNA separation (blue-noise) | weighted DNA distance | ≥ r (Poisson-disk radius) | [E] method, [H] r |
| Contrast (normative) | WCAG 2.2 | ≥ 4.5:1 / 3:1 | [E] |
| Contrast (secondary screen) | APCA Lc | per APCA font-size table | [E] metric, DRAFT caveat |

*All numeric thresholds marked [H] are tunable defaults, not standards — record the values used in
provenance.*

## 7. Theory sources (cite these)

- **DTCG** — Design Tokens Community Group format spec, https://www.designtokens.org/ .
  **Status-conflict flag:** the spec is a **Community Group draft** (first stable module set 2025.10),
  *not* a W3C Recommendation — cite it as a CG draft, not a ratified standard.
- **Material Color Utilities (MCU)** — HCT + DynamicScheme, https://github.com/material-foundation/material-color-utilities (Apache-2.0).
- **Utopia** — fluid responsive type/space scales, https://utopia.fyi/ .
- **CIEDE2000 (ΔE00)** — CIE 142:2001; impl. Sharma, Wu & Dalal (2005),
  https://www.rit.edu/cos/colorscience/rc_useful_data.php (with the JND-non-uniformity caveat, §4).
- **CAM16-UCS (ΔE′)** — Li et al. (2017), CIE color-appearance uniform color space.
- **Bridson blue-noise / Poisson-disk** — Bridson (2007), SIGGRAPH sketch (with capacity-limit
  caveat, §4).
- **APCA** — Advanced Perceptual Contrast Algorithm, https://git.apcacontrast.com/ — **DRAFT, WCAG 3,
  non-normative** (dual-gate caveat, §5).
