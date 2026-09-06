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
| T1 | Coverage | candidate vs live brand CSS | 0 brand-defined `--od-*` missing | RUN | vasic 86/86, milos 82/82 covered (0 missing) |
| T2 | In-browser resolution | candidate in headless chromium | 4/4 sample tokens non-empty + `--od-fs-base` >0px | RUN | 4/4 non-empty; `--od-fs-base` → 18px |
| T3 | Determinism | `gen-tokens→dtcg-to-od` ×2 | byte-identical across runs | RUN | run1==run2 true (both seeds) |
| T4 | Contrast (WCAG 2.1/2.2) | every adjacency the design-system creates | text ≥ 4.5:1, non-text strokes ≥ 3:1, light + dark | RUN | 32 pairs both candidates; min 3.24:1, tightest margin +0.24 |
| T5 | Uniqueness | two seeds' accent-700 **+ the diagram/status family** | hue Δ ≥ 15° AND ΔE00 ≥ 10; family derived, not tabulated; same seed identical | RUN | hue Δ 140.95°, ΔE00 41.72; 4 gated family tokens clear their tier |

Overall verdict = PASS only if **all** Challenges PASS (§11.4.134 — loop to the
responsible specialist on any FAIL; never relax the assertion).

**Baseline — the T1 red recorded here on 2026-09-06 is CLOSED, measured 2026-09-07.**
Both real candidates now reach **exit 0 with T1–T5 all PASS**:

```
node qa/check-tokens.mjs --candidate proposed/vasic-digital.od-tokens.css   # exit 0
T1 coverage: PASS (brand defines 86, candidate defines 86; 0 missing)
T4 contrast: PASS (32 pairs; min 3.24:1; tightest margin +0.24; text 4.5:1 / non-text 3:1)
T5 uniqueness: PASS (vasic-digital #865219 vs milosvasic #585799; hue Δ 140.95deg, ΔE00 41.72)

node qa/check-tokens.mjs --candidate proposed/milosvasic.od-tokens.css      # exit 0
T1 coverage: PASS (brand defines 82, candidate defines 86; 0 missing)
```

**What the red said, and how it was closed — the distinction matters.** The 11
missing tokens were
`--od-diagram-{good,good-ink,good-line,ink,line,muted,panel,panel2,tint}` and
`--od-status-fg-{dark,light}`: the gate was right and the candidates were stale,
because the brand CSS this challenge derives its expectation from lives in the
CONSUMING umbrella (`design-system/brand-*/`) and grew those tokens after the
candidates were generated. **It was NOT closed by copying the umbrella's values.**
Those values are a hand-tuned, brand-NEUTRAL literal table — identical in both
brands, by that file's own comment — and pasting them into `dtcg-to-od.mjs` would
have made T1 green while giving every seed vasic.digital's slate diagram palette,
i.e. satisfying the coverage gate by destroying the thing the module exists for.
`dtcg-to-od.mjs` now DERIVES all 11 from the design-DNA (three HCT tonal palettes;
see `proposed/README.md` and the block comment in the generator), the candidates
were regenerated, and T5 gained an assertion that the family is derived rather
than tabulated. `qa/prove-three-valued-exits.sh` M15/M16/M17 are the paired proof.

**Two findings surfaced by that work, recorded because neither is fixed by it.**

1. **The live `design-system` hairline does not clear WCAG 1.4.11.** The live
   `--od-diagram-line #94a3b8` on the live `--od-diagram-panel #f8fafc` measures
   **2.45:1** in the light theme, against a 3:1 non-text floor. That is a
   measurement of the umbrella, which this module does not own and did not
   change; the derived tone was chosen to clear the floor instead of matching it.
2. **A theme-flipping success fill under a theme-invariant foreground cannot be
   AA in both themes.** The generator used to emit `--od-success` /
   `--od-badge-success-bg` as `#2b8a3e` in dark, which measures **4.26:1** under
   ANY light foreground — below AA — and the live `vasic-digital.css` carries the
   same `#2b8a3e` in its own dark block. The generator's two success fills are now
   derived and theme-INVARIANT, which is what that brand file's own comment says
   these fills are meant to be. **The live brand CSS was not touched.**

Golden-bad fixture → **T4 FAIL (exit 1)** when run with `--brand` pointed at itself,
which is how `qa/prove-three-valued-exits.sh` (M6) drives it. The historical
"T1/T2/T4 FAIL" figure is for the run against the real brand CSS.

**Do not read any exit code off this page — run the command.** This paragraph is a
dated observation, and its predecessor was quoted as current long after it stopped
being true.

---

## T1 — Coverage

**Claim under guard.** Every `--od-*` custom property the **live** brand CSS DEFINES
(`design-system/brand-*/*.css`) is present in the candidate, so swapping the candidate
in cannot leave a token undefined.

**Assertions (RUN).** Parse the `--od-*: …` **definitions** (comment-aware — a
commented-out declaration does not count) from both files; `missing = brand − candidate`.
PASS iff `missing` is empty. Extra tokens in the candidate are reported but do not fail.

**Threshold (SPEC).** `missing.length === 0`.

**golden-GOOD (real candidates = PASS).** Re-measured 2026-09-07 — vasic-digital:
brand defines **86**, candidate defines **86**, 0 missing. milosvasic: brand defines
**82**, all covered (candidate defines 86). The candidate is a superset of both
brands by design. **These counts move whenever the umbrella brand CSS grows a
token — they went 75/71 → 86/82 in one week. Run the gate; do not quote them.**

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

**Claim under guard.** Every foreground/background adjacency the design-system
actually creates clears **its own** WCAG floor in **both** light and dark schemes —
after resolving `var()` chains into the accent ramp.

**Assertions (RUN).** Parse the `:root` (light) and `:root[data-theme="dark"]`
(dark = light overridden by dark) declaration blocks; resolve `var(--od-accent-NNN)`
into the ramp; compute `contrastRatio` (colorjs.io via `generators/lib/color.mjs`)
for **16 pairs × 2 modes = 32 rows**:

| Pairs | Floor | Why that floor |
|---|---|---|
| `--od-text`/`--od-bg`, `--od-on-accent`/`--od-accent` | 4.5:1 | WCAG 1.4.3 normal text |
| diagram `ink` on `panel`/`panel2`/`tint`, `muted` on `panel`/`panel2`, `good-ink` on `good` | 4.5:1 | SVG labels (`.t .h .s .lbl .note .gt`) — normal text |
| diagram `line` on `panel`/`panel2`/`--od-bg`, `good-line` on `good`, `--od-accent` on `tint` | 3:1 | WCAG 1.4.11 — a 1.5px stroke is a graphical object, not text |
| `status-fg-light` on `--od-success` and `--od-badge-success-bg`, `status-fg-dark` on `--od-warning` | 4.5:1 | status-pill text |

The pair list is the set of adjacencies **measured** from the 33 SVGs in
`design-system/diagrams/` and the `.od-badge--status` rules in both brand files —
not every possible combination. The status foregrounds are theme-INVARIANT by
contract, so they are measured against **both** themes' fills: that is the row that
catches a semantic fill flipping out from under a foreground that does not.

**The 3:1 tier is the standard's own non-text floor, not a relaxation.** No text
pair is ever measured against it, and `--min-contrast` moves only the text tier.

**Threshold (SPEC).** every row `ratio ≥ its own threshold`. Both `minRatio` and the
tightest **margin** are reported — with mixed floors, a bare minimum ratio no longer
says how close the run came to failing.

**golden-GOOD (real candidates = PASS).** Re-measured 2026-09-07, both candidates:
**32 pairs, min 3.24:1, tightest margin +0.24** (the `--od-diagram-line` /
`--od-diagram-panel2` hairline in light — the dashed plate, which is tighter than
the node plate and the row an earlier tone choice failed at 2.91:1).

**golden-BAD (MUST FAIL).** Light pairs unresolvable (light `:root` dropped) → FAIL;
active dark block ships `--od-text #7a7a7a` on `--od-bg #6e6e6e` and
`--od-on-accent #7a7a7a` on `--od-accent #6e6e6e` → **measured 1.19:1 < 4.5** → T4 FAIL.
The fixture defines no diagram/status tokens either, so those rows are additionally
unresolvable → FAIL. Paired mutation **M16** is the sharper control: it leaves every
name PRESENT (so T1 passes) and only sets `--od-diagram-ink` to its own plate colour,
proving T4 asserts the derived VALUES and not merely their existence.

**Evidence schema.**
```json
{ "challenge": "T4-contrast-wcag21", "verdict": "PASS",
  "measurements": { "metric": "WCAG 2.1 relative-luminance contrast (colorjs.io)",
    "textThreshold": 4.5, "nonTextThreshold": 3, "minRatio": 3.24, "minMargin": 0.24,
    "rows": [ { "mode": "light", "pair": "--od-text/--od-bg", "role": "body text", "threshold": 4.5, "fg": "#211a1a", "bg": "#fff8f7", "ratio": 16.31, "pass": true },
              { "mode": "light", "pair": "--od-diagram-line/--od-diagram-panel2", "role": "diagram hairline on dashed plate", "threshold": 3, "fg": "#937f7e", "bg": "#ffe9e8", "ratio": 3.24, "pass": true } ] } }
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

**Also asserted: the diagram/status family is DERIVED, not tabulated.** The eleven
`--od-diagram-*` / `--od-status-fg-*` tokens exist in the live brand CSS as a
hand-tuned brand-neutral literal table; copying it would satisfy T1 and give every
seed the same diagram palette. A copied table scores **ΔE00 exactly 0 on every
row**, so each token is compared across the two seeds at the floor **its role can
actually meet**:

| Tier | Floor | Tokens | Why |
|---|---|---|---|
| `brand` | ΔE00 ≥ `--de00-threshold` (10) | `--od-diagram-tint` | it IS the brand accent at a plate tone, so it must carry the accent's own separation |
| `jnd` | ΔE00 ≥ **1.0** (CIEDE2000 just-noticeable difference) | `--od-diagram-ink` `-muted` `-line` | M3 **neutral-variant** at mid tones — a neutral tinted by the seed hue at single-digit chroma. Demanding ΔE00 ≥ 10 of a neutral demands that it stop being neutral |
| reported | none | `panel` `panel2` `good` `good-line` `good-ink` `status-fg-light` `status-fg-dark` | plates/foregrounds at tone 92–99 sit near the white point; the `good` family is pinned near green by SEMANTICS. No floor is meetable by role — measured and printed instead |

**This tiering is a MEASURED correction, not a convenience.** A first draft used the
flat ΔE00 ≥ 10 floor for the scaffold and reported `FAIL … --od-diagram-line ΔE00
2.56`. The finding was about the threshold, not the tokens: the two seeds' scaffolds
are perceptibly different (2.5–2.8 ΔE00, above the JND) and they are *supposed* to
be near-neutral. Same-seed reproducibility of the whole family is also asserted.

**Threshold (SPEC).** `hueDelta ≥ 15` (`--hue-threshold`) AND `ΔE00 ≥ 10`
(`--de00-threshold`), `accentA !== accentB`, `sameSeedIdentical === true`, every
gated family token ≥ its tier's floor, family same-seed identical. Accent thresholds
mirror `run-checks.mjs` D7/D8.

**golden-GOOD (real candidates = PASS).** Re-measured 2026-09-07. `vasic-digital
#865219` vs `milosvasic #585799`: **hue Δ 140.95°**, **ΔE00 41.72**; same-seed accent
identical. Family, from the vasic-digital run (seed A carries its own adjectives, so
the two runs measure different seed pairings and the scaffold figures differ):
`tint` **20.26**, `ink` **2.82**, `muted` **2.80**, `line` **2.56**; reported-only
`panel` **0.00 (IDENTICAL)**, `panel2` 0.42, `good` 14.92, `good-line` 15.54,
`good-ink` 12.92, `status-fg-light` **0.00 (IDENTICAL)**, `status-fg-dark` **0.00**.
From the milosvasic run: `ink` 12.84, `muted` 13.17, `line` 12.65.

**The two IDENTICAL rows are the honest boundary, printed rather than hidden.** A
tone-98 plate and a tone-99 foreground can be byte-identical for two different
seeds, because near the white point two hues are a fraction of a ΔE00 apart. That is
the role constraining the derivation, not the derivation failing.

**golden-BAD.** T5 tests the generator across seeds, so it stays **PASS** on the static
fixture (the fixture's teeth are T1/T2/T4). A real T5 FAIL would require two seeds to
land within 15°/ΔE00 10 of each other, a gated family token to repeat across seeds,
or a seed to be non-deterministic — the uniqueness engine's own negative controls
(`run-checks.mjs` D7/D8/U2/U3) guard the first.

**Evidence schema.**
```json
{ "challenge": "T5-uniqueness", "verdict": "PASS",
  "measurements": { "seedA": "vasic-digital", "seedB": "milosvasic",
    "accentA": "#865219", "accentB": "#585799",
    "oklchHueA": 63.47, "oklchHueB": 282.53, "hueDelta": 140.95, "hueThreshold": 15,
    "deltaE00": 41.72, "de00Threshold": 10, "sameSeedIdentical": true,
    "newFamily": { "tiers": { "brand": 10, "jnd": 1, "reported": null },
      "gatedCount": 4, "reportedCount": 7, "minGatedDeltaE00": 2.56,
      "sameSeedIdentical": true,
      "identicalAcrossSeeds": ["--od-diagram-panel", "--od-status-fg-light", "--od-status-fg-dark"],
      "rows": [ { "token": "--od-diagram-tint", "tier": "brand", "floor": 10,
                  "a": "#ffe3cd", "b": "#e8e5ff", "deltaE00": 20.26, "identical": false, "pass": true } ] } } }
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

Executable now — all five Challenges are RUN checks in `check-tokens.mjs`.

**Both real candidates pass 5/5 (exit 0), re-measured 2026-09-07** — see the
Baseline section for what closed the T1 red and, more importantly, for what was
deliberately NOT done to close it. The golden-bad fixture still fails T4 (exit 1)
under the invocation the proof drives.

**This green is a measurement of today.** T1's expectation is derived from brand CSS
in a repository this module does not own; it went red once already when that CSS grew
eleven tokens, and it will again. Run the gate.

**Exit codes are THREE-VALUED as of 2026-09-06** — 0 PASS, 1 a real FAIL, **2 COULD
NOT DETERMINE**, and a 2 is never a pass. A challenge that reports `ERROR` (Playwright
not importable, chromium refused to launch, `--skip-browser`, generator pipeline not
invocable) now yields **2**, not 1: it used to be indistinguishable from a broken
candidate. Precedence is CONFIRMED over UNDETERMINED — any FAIL makes the exit 1 even
alongside an ERROR, so a broken environment cannot mask a finding.

The §1.1 paired proof is `qa/prove-three-valued-exits.sh` — **17** DATA-only mutations
(arguments, input files, the shipped golden-bad fixture, scratch git repositories, a
dependency-free copy of the working tree, two derived candidate files; **no edit to
any gate's source**) driving all three exit codes of all three gates. Re-measured
2026-09-07: **17 passed, 0 failed, 0 undetermined, exit 0**. The historical "12/12,
and 4 FAIL against the pre-fix gates restored from `git show HEAD:`" reading is
superseded by count, not withdrawn by measurement.

**M15/M16/M17 were added for the diagram/status family and they check WHICH
challenge failed, not just the exit code** — an rc-1-only assertion would have been
satisfied by any unrelated failure and would keep passing if the new assertions were
deleted. M15 deletes the nine `--od-diagram-*` declarations → `failing=[T1-coverage,
T4-contrast-wcag21]`. M16 leaves every name present and corrupts one value →
`failing=[T4-contrast-wcag21]` alone. M17 is the rc-0 control against the **live**
brand CSS — M8's existing rc-0 row compares the candidate against ITSELF, so coverage
there is a self-comparison that cannot see the family at all.

**One robustness defect was found and fixed while writing M17.** The rc-0 rows used
to gate on Playwright *resolving*, which is not the same as chromium *launching*.
Measured on this host under load average 74 with swap exhausted, every launch died
with `SIGTRAP`: `check-tokens` correctly reported `T2=ERROR → rc 2`, and the
resolve-only probe still drove the rc-0 rows and scored them FAIL — this proof
accusing a working gate for an environment fault. The probe now launches and closes
a browser, and its failure is this proof's own UNDETERMINED row.

Any future FAIL on a real candidate is a genuine defect — fix the generator/candidate
and re-green; **never weaken an assertion here.**
