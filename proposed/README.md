# Proposed OpenDesign token candidates (STAGED — not applied)

These `*.od-tokens.css` files are **OpenDesign-direction → deterministic-token
candidates**, staged here for review. They are **NOT** wired into either live
site. The live token layers remain:

- `design-system/brand-vasic-digital/vasic-digital.css`
- `design-system/brand-milosvasic/milosvasic.css`

## What produced them (Helix Constitution §11.4.162 — hybrid direction-generator)

Each file is the output of a deterministic two-stage pipeline in
`design-toolkit/generators/`:

```
gen-tokens.mjs  --seed <s> --adjectives <dir> [--anchor-color <hex>]  # → DTCG JSON
   │  (parametric-uniqueness engine: seed+adjectives+anchor+version → tokens)
   ▼
dtcg-to-od.mjs  --stdin --out <candidate>.css   # → the sites' --od-* contract
```

`dtcg-to-od.mjs` is a **pure function of the DTCG JSON** (no Date, no random, no
network), so `same input → byte-identical CSS`.

## Free-hue vs brand-anchored mode

The generator supports **two hue modes**. Everything else (adjectives → MCU
variant, type ratio, space, radius, contrast, fonts, motion, depth) is identical
in both — only the accent/identity hue differs:

- **Free-hue (default):** the base hue is derived from the **seed hash**. This
  explores a *new* color direction unrelated to today's palette (e.g.
  `vasic-digital` lands on gold `#865219`, `milosvasic` on indigo `#585799`).
  Use for greenfield direction exploration.

- **Brand-anchored (`--anchor-color <hex>`):** the palette is rebuilt **around
  an existing brand hue** so the deterministic tokens *refine* the current brand
  rather than replacing its color identity. Pass the site's current
  `--od-accent-700`. The candidates checked in here are anchored, so their accent
  ramps stay in the **crimson family** matching the live sites.

### How anchoring actually works (and why it is not just `seedHue = anchorHue`)

The flag sets the **target accent hue**, then solves for the MCU **source** hue
so the resulting M3 *primary* (== `--od-accent-700`, tone 40) lands on that
target. This matters because some MCU variants (Expressive, Vibrant, Rainbow,
FruitSalad) deliberately **rotate** the primary palette away from the source
hue. Naïvely feeding the anchor as the source rotates the accent off-brand — e.g.
`milosvasic`'s hash-selected **Expressive** variant would turn crimson into
**blue** (`#2d6195`). The solver inverts that rotation, so the accent returns to
crimson (`#93474f`) while the variant's tonal personality is preserved. The
anchor and the achieved source/primary hues are recorded in the DTCG provenance
vector (`anchorColor`, `anchorHue`, `sourceHue`, `seedHue`) and echoed into each
generated file's header comment.

### Direction seeds + anchors

| Candidate | seed | adjectives (direction) | anchor (live `--od-accent-700`) | accent-700 (anchored) |
|---|---|---|---|---|
| `vasic-digital.od-tokens.css` | `vasic-digital` | `industrial, editorial, precise` (MACHINA) | `#8f1d2d` | `#94474b` |
| `milosvasic.od-tokens.css` | `milosvasic` | `terminal, brutalist, mono` | `#a31e39` | `#93474f` |

## Regenerate + verify

```sh
cd design-toolkit/generators
# Brand-anchored (what is checked in — accent stays in the live crimson family):
node gen-tokens.mjs --seed vasic-digital --adjectives "industrial,editorial,precise" \
  --anchor-color "#8f1d2d" --stdout \
  | node dtcg-to-od.mjs --stdin --out ../proposed/vasic-digital.od-tokens.css
node gen-tokens.mjs --seed milosvasic --adjectives "terminal,brutalist,mono" \
  --anchor-color "#a31e39" --stdout \
  | node dtcg-to-od.mjs --stdin --out ../proposed/milosvasic.od-tokens.css

# Free-hue (drop --anchor-color) explores a new direction instead.
```

## Coverage / mapping / synthesized tokens

Every candidate emits the full `--od-*` superset (the union of both brand
files). **Do not quote a token count off this page — run
`node qa/check-tokens.mjs --candidate proposed/<brand>.od-tokens.css` and read
its T1 line.** The "75-name superset / vasic-digital 75/75" figure this section
used to carry is **WITHDRAWN**: the umbrella brand CSS grew an eleven-token
diagram/status family after those candidates were generated, T1 correctly went
red at `brand defines 86, candidate defines 75; 11 missing`, and the count has
moved once already for exactly that reason.

The M3-role → `--od-*` mapping and each synthesized (not-seed-derived) token are
documented in the header comment of each generated file and in
`dtcg-to-od.mjs`. Synthesized tokens: `--od-logo-plate` (constant white plate),
`--od-warning`, shadow recipes, line-height, tracking, easing, z-index,
container-max, and the named font vars
(`--od-font-space-grotesk/inter/jetbrains-mono`).

### The diagram/status family is DERIVED, not copied

The eleven tokens `--od-diagram-{ink,muted,line,panel,panel2,tint,good,good-line,good-ink}`
and `--od-status-fg-{light,dark}` exist in the live `design-system/brand-*/*.css`
as a hand-tuned **brand-neutral literal table** — the same nine slate hexes in
both brands, by that file's own comment. Pasting those literals into
`dtcg-to-od.mjs` would have satisfied T1 and **destroyed the premise of this
generator**: every project seeded through it would inherit vasic.digital's slate
diagram palette. The live values were used only as evidence of what **role** each
token plays (measured from how the 33 SVGs in `design-system/diagrams/` and the
`.od-badge--status` rules in both brand files consume them). The values are
computed from the design-DNA, via three HCT tonal palettes:

| Slot | Palette | Tones (light / dark) |
|---|---|---|
| `ink` `muted` `line` `panel` `panel2` | M3 **neutral-VARIANT** (the seed's own hue at neutral chroma) | 20 40 55 98 94 / 90 80 62 22 28 |
| `tint` | the **primary** palette — the same one the accent ramp is built from | 92 / 22 |
| `good` `good-line` `good-ink` | semantic success hue **harmonized ≤15° toward the brand primary** (`Blend.harmonize`) | 92 45 25 / 18 70 88 |
| `status-fg-light` `status-fg-dark` | M3 **neutral**, theme-invariant | 99 / 12 |

Tones were chosen by measurement, not taste — `qa/check-tokens.mjs` T4 asserts
every adjacency the SVGs and status pills actually create, each against its own
WCAG floor (text 4.5:1, non-text strokes 3:1), in both themes. T5 asserts the
family is derived rather than tabulated. `qa/prove-three-valued-exits.sh`
(M15/M16/M17) is the paired mutation proof that both assertions bite.

**Two honest limits, both measured and printed on every run.** `--od-diagram-panel`
and `--od-status-fg-light` sit at tone 98/99 — near the white point, where two
different hues are a fraction of a ΔE00 apart, so they can be *identical* for two
seeds and no separation floor is meetable by role. The `good` family is pinned
near green by **semantics**; two seeds whose primaries share a hue get an
identical success family. Neither is a derivation failure; both are the role
constraining the derivation, and T5 reports them rather than gating on them.
