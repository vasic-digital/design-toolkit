# Generators — the parametric-uniqueness engine

Deterministic, seed-driven generators that turn a **seed** (and optional brand
adjectives) into an accessible, on-brand theme expressed as a **DTCG design-token
document**, plus a matching **generative SVG mark**. This is the executable core
of `agents/theming-designer.md`; the contract it honors is in
`../knowledge/` (`color.md`, `material3.md`, `typography.md`, `dtcg-tokens.md`).

Two guarantees, both machine-checked in `npm test` and `qa/run-checks.mjs`:

1. **Determinism** — `same seed + same options + same generator version ⇒
   byte-identical output`. No `Math.random()`; every choice is drawn from a
   seeded PRNG (`lib/prng.mjs`).
2. **Distinctness (the uniqueness engine)** — different seeds produce measurably
   different palettes (distinct primary OKLCH hues) while every theme still
   clears the WCAG contrast gate.

## Requirements

- Node `>= 20` (developed on Node 22).
- `npm install` in this directory.

```bash
cd generators
npm install
```

## Generate tokens

```bash
# seed → DTCG token document
node gen-tokens.mjs --seed "vasic-digital" --out tokens.json

# with brand adjectives (deterministic nudges to the design-DNA vector)
node gen-tokens.mjs --seed milosvasic --adjectives "modern,minimal" --out tokens.json

# print to stdout instead of a file (resolved vector still goes to stderr)
node gen-tokens.mjs --seed helix --stdout
```

The emitted document contains:

- `color.light` / `color.dark` — full Material-3 semantic role set (primary /
  secondary / tertiary / error accent groups with `on-*` + container partners,
  the surface/container elevation family, outline, inverse, scrim, shadow), each
  toned by `material-color-utilities` to pass contrast in **both** modes.
- `dimension.space` — fluid space scale (Utopia `clamp()` in a
  `digital.vasic.fluid` extension, `px` fallback as the DTCG `$value`).
- `dimension.radius` — shape scale derived from the `radiusBase` axis.
- `typography.font-family` — an OSS/SIL-OFL, self-hosted display/body/mono pair.
- `typography.type-scale` — MD3 type roles on a fluid Utopia scale.
- `$extensions.digital.vasic.provenance` — the seed and resolved design-DNA
  vector, so any theme is reproducible and auditable.

> Tokens are the source of truth for **OpenDesign** to consume and emit
> (§11.4.162). The generator never writes CSS / `var(--*)` / literals.

## Generate marks

```bash
# seeded generative SVG mark (default 512×512)
node gen-marks.mjs --seed "vasic-digital" --out mark.svg

# a calmer scattered-shape background
node gen-marks.mjs --seed helix --kind background --size 800 --out bg.svg
```

Marks pull their colors from the same seed's generated palette, so a project's
mark and its theme are visibly the same family. Same seed ⇒ byte-identical SVG.

## Run the design-QA checks

```bash
# validate a token set: DTCG validity (D1), WCAG contrast (D2), cross-seed
# uniqueness variance (D7). Exit 0 = all PASS, non-zero = FAIL.
node ../qa/run-checks.mjs \
  --tokens tokens.json \
  --seeds "vasic-digital,milosvasic,helix" \
  --hue-threshold 15
```

Machine-readable verdict JSON → stdout; human summary → stderr. See
`../qa/design-qa-testbank.md` for the full dimension/threshold spec.

## Test

```bash
npm test    # node --test: determinism + contrast gate + uniqueness
```

## Layout

```
generators/
├── gen-tokens.mjs        # CLI: seed → DTCG tokens
├── gen-marks.mjs         # CLI: seed → SVG mark/background
├── lib/
│   ├── prng.mjs          # seeded PRNG (cyrb128 + mulberry32)
│   ├── tokens.mjs        # seed → design-DNA vector → DTCG document
│   ├── marks.mjs         # seed → SVG (svg.js + svgdom headless DOM)
│   ├── color.mjs         # WCAG contrast + OKLCH hue + semantic pairs
│   └── dtcg.mjs          # DTCG structural validator + scheme extractor
└── test/engine.test.mjs  # npm test
```

## Dependencies & licenses

All permissive (Apache-2.0 / MIT / BSD-3 / ISC), pinned in `package.json`:
`@material/material-color-utilities` (seed→scheme), `colorjs.io` (contrast, OKLCH),
`chroma-js`, `style-dictionary`, `utopia-core` (fluid scales), `@svgdotjs/svg.js`
+ `svgdom` (headless SVG in Node).

> **Note:** `svgdom` is pinned to the exact version `0.1.19` — newer 0.1.x
> releases regressed serialization with `@svgdotjs/svg.js@3.2.x`.

> **Known audit finding:** the 5 `high` advisories reported by `npm audit` all
> originate from the **optional** dependency `@adobe/leonardo-contrast-colors`
> (transitive `mout`/`ciebase`/`ciecam02`). The engine does **not** import
> leonardo — contrast is measured with `colorjs.io` — so the core pipeline is
> unaffected. Remove the optional dep (or `npm install --omit=optional`) to
> clear the advisories entirely.
