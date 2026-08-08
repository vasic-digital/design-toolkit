# HelixQA Challenge Bank — `--od-*` Token Candidates (T1–T5)

A HelixQA-style **Challenge bank** that verifies the `--od-*` design-token
**candidates** the hybrid direction-generator emits into
`design-toolkit/proposed/*.od-tokens.css` (Helix **§11.4.162**) against the token
contract the **live brand CSS** actually defines. It is the **spec** (what is
checked, thresholds, evidence schema, golden-good / golden-bad mutations,
executable-check column); the **runner** is the executable node CLI
[`check-tokens.mjs`](./check-tokens.mjs):

```
node design-toolkit/qa/check-tokens.mjs --candidate design-toolkit/proposed/vasic-digital.od-tokens.css
node design-toolkit/qa/check-tokens.mjs --candidate design-toolkit/proposed/milosvasic.od-tokens.css
# prove the checks bite (must exit non-zero; T1/T2/T4 FAIL):
node design-toolkit/qa/check-tokens.mjs \
  --candidate design-toolkit/qa/fixtures/golden-bad-tokens.css \
  --brand    design-system/brand-vasic-digital/vasic-digital.css
```

`--brand` is inferred from the candidate basename for the two known brands; the
seed/adjectives that drive T3/T5 are parsed from the candidate header comment. JSON
verdict → **stdout**; human summary → **stderr**; **exit 0 = all PASS, non-zero =
any FAIL/ERROR**.

**Anti-bluff contract (§11.4.5 / §11.4.69 / §11.4.170).** Every PASS is backed by a
captured, machine-readable **POSITIVE measurement** (the assertion's measured value,
not merely "no error"). A check that only ever passes is worthless, so each gating
challenge is **proven to bite** by the paired **golden-BAD** fixture
[`fixtures/golden-bad-tokens.css`](./fixtures/golden-bad-tokens.css): one file, three
planted defects, and the run must report **T1/T2/T4 FAIL** with real measured values.
Structural shortcuts are rejected on principle: **T2 loads the candidate in a real
headless browser** because a malformed comment/paren can silently drop the whole
`:root` rule while braces stay balanced — brace-counting is not sufficient, only the
CSSOM tells the truth.

`feature_class = design_token_candidate_qa`.

**Check class legend**
- **RUN** — executed by `check-tokens.mjs` now; real pass/fail, gating.
- **AUDITOR** — needs a human/agent judgement beyond the automated proxy (none gate here).
- **SPEC** — declared threshold/mutation, documented here, enforced by the RUN check.

**Relationship to `run-checks.mjs`.** `run-checks.mjs` gates the *generator's DTCG
output and cross-seed uniqueness engine* (D1/D2/D7/D8/U2–U5/DET1/C-PLAT). This bank
gates the *emitted `--od-*` CSS candidate* — the last mile where a DTCG doc becomes
the CSS the sites consume. T3/T5 overlap the determinism/uniqueness invariants but
assert them **through the full `gen-tokens → dtcg-to-od` CLI pipeline** and on the
CSS-level accent primary, not the in-memory DTCG.

---

## Challenge index

| ID | Challenge | Object under test | Gate | Class | Measured (real candidates) |
|----|-----------|-------------------|------|-------|----------------------------|
| T1 | Coverage | candidate vs live brand CSS | 0 brand-defined `--od-*` missing | RUN | vasic 75/75, milos 71/71 covered (0 missing) |
| T2 | In-browser resolution | candidate in headless chromium | 4/4 sample tokens non-empty + `--od-fs-base` >0px | RUN | 4/4 non-empty; `--od-fs-base` → 18px |
| T3 | Determinism | `gen-tokens→dtcg-to-od` ×2 | byte-identical across runs | RUN | run1==run2 true (both seeds) |
| T4 | Contrast (WCAG 2.1) | candidate text/accent pairs | all ≥ 4.5:1, light + dark | RUN | vasic min 6.44:1, milos min 5.72:1 |
| T5 | Uniqueness | two seeds' accent-700 | hue Δ ≥ 15° AND ΔE00 ≥ 10; same seed identical | RUN | hue Δ 140.95°, ΔE00 41.72 |

Overall verdict = PASS only if **all** Challenges PASS (§11.4.134 — loop to the
responsible specialist on any FAIL; never relax the assertion).

**Baseline (measured now):** both real candidates → **5/5 PASS (exit 0)**; golden-bad
fixture → **T1/T2/T4 FAIL, T3/T5 PASS (exit 1)**.

---

## T1 — Coverage

**Claim under guard.** Every `--od-*` custom property the **live** brand CSS DEFINES
(`design-system/brand-*/*.css`) is present in the candidate, so swapping the candidate
in cannot leave a token undefined.

**Assertions (RUN).** Parse the `--od-*: …` **definitions** (comment-aware — a
commented-out declaration does not count) from both files; `missing = brand − candidate`.
PASS iff `missing` is empty. Extra tokens in the candidate are reported but do not fail.

**Threshold (SPEC).** `missing.length === 0`.

**golden-GOOD (real candidates = PASS).** vasic-digital: brand defines 75, candidate
defines 75, 0 missing. milosvasic: brand defines 71, all covered (candidate defines 75).

**golden-BAD (MUST FAIL).** The fixture's only active block defines 6 tokens; **69**
brand tokens are missing, **including `--od-focus`** → T1 FAIL, list emitted.

**Evidence schema.**
```json
{ "challenge": "T1-coverage", "verdict": "PASS",
  "measurements": { "brand": "vasic-digital.css", "brandDefined": 75,
                    "candidateDefined": 75, "missing": [], "extraInCandidate": [] } }
```

---

## T2 — In-browser resolution (headless chromium)

**Claim under guard.** The candidate is not just syntactically brace-balanced but
**actually applies**: loaded into a real browser, its `:root` tokens resolve to
non-empty computed values. This catches the class of bug where a malformed comment
(`*/` inside the header) or an unbalanced paren silently drops the entire `:root`
rule — invisible to a brace counter, fatal in the browser.

**Assertions (RUN).** Launch headless chromium (Playwright), `setContent` the
candidate CSS (no `data-theme` ⇒ plain `:root`), then in-page:
1. `getComputedStyle(:root).getPropertyValue(t)` is **non-empty** for each of
   `--od-accent-700`, `--od-bg`, `--od-fs-base`, `--od-text`.
2. Extra teeth: setting `font-size: var(--od-fs-base)` on a probe yields a real
   computed **`> 0px`** size (proves the fluid token is consumable, not just present).

**Invocation note.** Playwright is not resolvable from `qa/` via the ordinary
`node_modules` walk-up — it lives in the repo's `_tests/` workspace. `check-tokens.mjs`
imports `chromium` via `createRequire` pointed at `_tests/package.json` (the repo's
real Playwright + chromium install). No new dependency is added to `design-toolkit/`.

**Threshold (SPEC).** 0 empty sample tokens **and** `--od-fs-base` computes `> 0px`.

**golden-GOOD (real candidates = PASS).** 4/4 sample tokens resolve to non-empty
values (hex for colors, the `clamp(…)` string for `--od-fs-base`); `--od-fs-base`
computes to **18px** at the default viewport.

**golden-BAD (MUST FAIL).** The light `:root` is swallowed by comment scope (braces
still balanced) and the only active rule targets `[data-theme="dark"]`, which does not
match a plain `:root` → all **4/4 sample tokens resolve EMPTY** → T2 FAIL.

**Evidence schema.**
```json
{ "challenge": "T2-in-browser-resolution", "verdict": "PASS",
  "measurements": { "engine": "headless chromium via @playwright/test (resolved from _tests/)",
    "resolved": { "--od-accent-700": "#…", "--od-bg": "#…",
                  "--od-fs-base": "clamp(1rem, 0.9565rem + 0.2174vw, 1.125rem)",
                  "--od-text": "#…" },
    "fsBasePx": 18, "emptyTokens": [] } }
```

---

## T3 — Determinism

**Claim under guard.** The candidate pipeline is a **pure function of the seed**: the
same seed + adjectives run through `gen-tokens → dtcg-to-od` twice produces
byte-identical CSS (no `Date`, no `Math.random`, no network).

**Assertions (RUN).** Invoke the two CLIs (`cwd = generators/`, piping DTCG JSON on
stdin) **twice** for the seed parsed from the candidate header; assert `run1 === run2`
byte-for-byte. Reproduction of the on-disk candidate is **reported** (a mismatch means
the committed candidate is stale vs the current generator) but is **informational,
non-gating** — determinism is about the generator, not disk freshness.

**Threshold (SPEC).** `byteIdenticalAcrossRuns === true`.

**golden-GOOD (real candidates = PASS).** `run1 == run2` true for both `vasic-digital`
and `milosvasic`.

**golden-BAD.** T3 tests the generator, not a static fixture, so it correctly stays
**PASS** on the golden-bad file — the fixture's teeth are T1/T2/T4. (A real T3 FAIL
would require the pipeline to emit non-identical bytes across runs, e.g. a
reintroduced `Date.now()` / `Math.random()` — the negative control lives in the
generator's own `npm test`.)

**Evidence schema.**
```json
{ "challenge": "T3-determinism", "verdict": "PASS",
  "measurements": { "seed": "vasic-digital", "adjectives": ["industrial","editorial","precise"],
    "bytesRun1": 6305, "bytesRun2": 6305, "byteIdenticalAcrossRuns": true,
    "reproducesOnDiskCandidate": false } }
```

---

## T4 — Contrast (WCAG 2.1)

**Claim under guard.** The candidate's body and accent-label text clear the WCAG 2.1
AA normal-text ratio **4.5:1** in **both** light and dark schemes — after resolving
`var()` chains into the accent ramp.

**Assertions (RUN).** Parse the `:root` (light) and `:root[data-theme="dark"]`
(dark = light overridden by dark) declaration blocks; resolve `var(--od-accent-NNN)`
into the ramp; compute `contrastRatio` (colorjs.io via `generators/lib/color.mjs`) for:
- `--od-text` on `--od-bg` (body text)
- `--od-on-accent` on `--od-accent` (label on accent fill)

in light **and** dark. PASS iff all four ratios `≥ 4.5`. Ratios are always reported.

**Threshold (SPEC).** `min(ratios) ≥ 4.5` (override with `--min-contrast`).

**golden-GOOD (real candidates = PASS).**
- vasic-digital: light text 16.31, on-accent 6.44; dark text 14.29, on-accent 7.01 → **min 6.44:1**.
- milosvasic: light text 16.28, on-accent 6.45; dark text 14.39, on-accent 5.72 → **min 5.72:1**.

**golden-BAD (MUST FAIL).** Light pairs unresolvable (light `:root` dropped) → FAIL;
active dark block ships `--od-text #7a7a7a` on `--od-bg #6e6e6e` and
`--od-on-accent #7a7a7a` on `--od-accent #6e6e6e` → **measured 1.19:1 < 4.5** → T4 FAIL.

**Evidence schema.**
```json
{ "challenge": "T4-contrast-wcag21", "verdict": "PASS",
  "measurements": { "metric": "WCAG 2.1 relative-luminance contrast (colorjs.io)",
    "threshold": 4.5, "minRatio": 6.44,
    "rows": [ { "mode": "light", "pair": "--od-text/--od-bg", "fg": "#211a1a", "bg": "#fff8f7", "ratio": 16.31, "pass": true },
              { "mode": "dark",  "pair": "--od-on-accent/--od-accent", "fg": "#450a11", "bg": "#ef9194", "ratio": 7.01, "pass": true } ] } }
```

---

## T5 — Uniqueness

**Claim under guard.** Two **different** seeds produce perceptually distinct accent
primaries (no two projects on the shared library collide), while the **same** seed
produces an identical accent (the determinism corollary at the CSS level).

**Assertions (RUN).** Generate candidates for `seedA` (the candidate's own seed) and a
distinct `seedB` via the CLI pipeline; extract `--od-accent-700` from each; assert
`hueDelta ≥ 15°` (OKLCH, `color.mjs`) **AND** `ΔE00 ≥ 10` (CIEDE2000, `qa/lib/deltae.mjs`).
Regenerate `seedA` twice and assert its `--od-accent-700` is identical.

**Threshold (SPEC).** `hueDelta ≥ 15` (`--hue-threshold`) AND `ΔE00 ≥ 10`
(`--de00-threshold`), `accentA !== accentB`, `sameSeedIdentical === true`. Thresholds
mirror `run-checks.mjs` D7/D8.

**golden-GOOD (real candidates = PASS).** `vasic-digital #865219` vs
`milosvasic #585799`: **hue Δ 140.95°**, **ΔE00 41.72**; same-seed accent identical.

**golden-BAD.** T5 tests the generator across seeds, so it stays **PASS** on the static
fixture (the fixture's teeth are T1/T2/T4). A real T5 FAIL would require two seeds to
land within 15°/ΔE00 10 of each other, or a seed to be non-deterministic — the
uniqueness engine's own negative controls (`run-checks.mjs` D7/D8/U2/U3) guard that.

**Evidence schema.**
```json
{ "challenge": "T5-uniqueness", "verdict": "PASS",
  "measurements": { "seedA": "vasic-digital", "seedB": "milosvasic",
    "accentA": "#865219", "accentB": "#585799",
    "oklchHueA": 63.47, "oklchHueB": 282.53, "hueDelta": 140.95, "hueThreshold": 15,
    "deltaE00": 41.72, "de00Threshold": 10, "sameSeedIdentical": true } }
```

---

## Golden-BAD fixture — proof of teeth

[`fixtures/golden-bad-tokens.css`](./fixtures/golden-bad-tokens.css) plants three
defects in one file:

| Defect | Caught by | Measured failure |
|--------|-----------|------------------|
| Light `:root` swallowed by comment scope (braces balanced) | **T2** | 4/4 sample tokens resolve `""` (empty) |
| Only active block omits `--od-focus` + ~68 more tokens | **T1** | 69 brand tokens missing (incl. `--od-focus`) |
| Active dark pair `#7a7a7a` on `#6e6e6e` | **T4** | 1.19:1 < 4.5:1 |

Run → **T1/T2/T4 FAIL, T3/T5 PASS, exit 1**. This is the anti-bluff control: it proves
the coverage, in-browser-resolution, and contrast checks actually reject bad input
rather than rubber-stamping. T3/T5 remaining green is correct — they gate the
generator, which the static fixture does not exercise.

---

## Status

Executable now — all five Challenges are RUN checks in `check-tokens.mjs`. Real
candidates in `design-toolkit/proposed/` pass **5/5 (exit 0)**; the golden-bad fixture
fails **T1/T2/T4 (exit 1)**. Any future FAIL on a real candidate is a genuine defect —
fix the generator/candidate and re-green; **never weaken an assertion here.**
