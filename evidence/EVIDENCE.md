# EVIDENCE — parametric-uniqueness engine is executable, with verified output

Captured on Node `v22.22.3`, npm `10.9.8`. All commands run from
`design-toolkit/generators`. Raw artifacts live beside this file:

```
evidence/
├── npm-install.log            # clean `npm install` (exit 0)
├── npm-test.log              # `npm test` full output (7/7 pass)
├── determinism-and-diff.txt  # same-seed hashes + cross-seed primary diff
├── tokens/                   # 3 generated DTCG token sets + gen-tokens.log
├── marks/                    # 4 generated SVGs + determinism hashes
└── qa/                       # verdict.json + human summary + negative controls
```

Nothing here is hand-edited: every number below is copied from a captured run.

---

## 1. `npm install` works (real deps, real install)

`evidence/npm-install.log` — clean install into an empty `node_modules`,
**exit 0**, 181 packages. `svgdom` verified pinned to exactly `0.1.19`
(newer 0.1.x regressed serialization with `@svgdotjs/svg.js@3.2.8`).

Honest audit note: `npm audit` reports 5 `high` advisories, **all** from the
**optional, unused** dep `@adobe/leonardo-contrast-colors`
(transitive `mout`/`ciebase`/`ciecam02`). The engine measures contrast with
`colorjs.io`, not leonardo, so the core pipeline is unaffected;
`npm install --omit=optional` clears them.

## 2. Determinism — same seed twice ⇒ identical sha256

From `evidence/determinism-and-diff.txt` (tokens) and
`evidence/marks/marks-summary.txt` (marks):

**Tokens** (`node gen-tokens.mjs --seed <s> --stdout | shasum -a 256`):

| seed | sha256 (run1 == run2) |
|------|------------------------|
| vasic-digital | `9d427bce347a3ef188137368eb041591d2c11623c7797c452dab169039a8c39c` ✅ IDENTICAL |
| milosvasic | `d8193c3d5b49681154e63509d228155885f1475c58c20894e33b2410ea9dfbc9` ✅ IDENTICAL |
| helix | `e6c5cdffc828a384fa4961e2adf71353ae014eb2f813da3f73a01db39c8f8571` ✅ IDENTICAL |

**Marks** (`node gen-marks.mjs --seed <s> --stdout | shasum -a 256`):

| seed | sha256 (run1 == run2) |
|------|------------------------|
| vasic-digital | `23c7e0b692cb0c4a6e3ed474f3dbefcf1bb855e2291012933c71ca7ba7a76ee9` ✅ IDENTICAL |
| helix | `5ad557d3d1139ac00b864555613ad96c5158a793d6db5596a1b84c901f6ab160` ✅ IDENTICAL |

## 3. Uniqueness — different seeds ⇒ measurably different palettes

Resolved design-DNA vectors (from `evidence/tokens/gen-tokens.log`) differ per seed:

| seed | variant | seedHue | typeRatio | space | radius | contrast | fontPair |
|------|---------|---------|-----------|-------|--------|----------|----------|
| vasic-digital | Rainbow | 63 | 1.333 | 1.0 | 8 | premium-dark | geometric-modern |
| milosvasic | Expressive | 46 | 1.5 | 1.25 | 4 | standard | humanist-warm |
| helix | TonalSpot | 112 | 1.25 | 0.85 | 4 | standard | geometric-modern |

Primary colors (light scheme) and their OKLCH hues clearly differ:

| seed | primary | OKLCH hue |
|------|---------|-----------|
| vasic-digital | `#683a00` | 63.14° |
| milosvasic | `#585799` | 282.53° |
| helix | `#616219` | 110.21° |

Pairwise primary-hue deltas (threshold ≥ 15°): vasic-digital↔milosvasic
**140.61°**, milosvasic↔helix **172.31°**, vasic-digital↔helix **47.08°** —
minimum **47.08° ≫ 15°**.

## 4. `qa/run-checks.mjs` — PASS with real numbers

```
node ../qa/run-checks.mjs --tokens ../evidence/tokens/vasic-digital.tokens.json \
     --seeds "vasic-digital,milosvasic,helix" --hue-threshold 15   # exit 0
```

From `evidence/qa/qa-summary.txt` / `verdict.json`:

| dimension | verdict | measurement |
|-----------|---------|-------------|
| D1 token-validity | **PASS** | 103 tokens structurally valid DTCG, 0 errors |
| D2 contrast | **PASS** | 28 semantic pairs (light+dark); **min text 4.65:1**, min any 4.65:1 |
| D7 uniqueness | **PASS** | min primary-hue delta **47.08°** over 3 seeds (≥ 15°) |
| **OVERALL** | **PASS** | exit code 0 |

## 5. The QA is real — negative controls FAIL (anti-bluff)

`evidence/qa/negative-controls.txt` — deliberately broken inputs flip the
verdict to FAIL (a suite that still passes a mutant is itself broken):

| mutation | expected | result |
|----------|----------|--------|
| `on-primary` set to grey `#8a8a8a` on colored primary | FAIL D2 | **FAIL D2** — min text drops to **1.86:1** |
| single seed (no cross-seed variance) | FAIL D7 | **FAIL D7** — delta Infinity, 1 seed; exit 1 |
| same seed reused for both projects | FAIL D7 | **FAIL D7** — hue delta **0°** |

## 6. `npm test` — green

`evidence/npm-test.log` — `node --test`, **exit 0**:

```
# tests 7
# pass 7
# fail 0
```

Covers: token determinism (sha256), vector determinism, SVG determinism, DTCG
validity, the contrast gate in both modes, cross-seed hue uniqueness, and vector
variance.
