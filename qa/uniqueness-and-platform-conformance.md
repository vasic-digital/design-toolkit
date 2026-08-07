# Uniqueness & Platform-Conformance Test-Bank / Challenge — SPEC

A HelixQA-style **Challenge** structure for the three things the base
[`design-qa-testbank.md`](design-qa-testbank.md) does not yet cover: cross-project **UNIQUENESS**, the
**a11y HARD-FAIL** floor, **PLATFORM-CONFORMANCE**, and **DETERMINISM**. This is the *spec* — checks,
thresholds, `[E]/[H]` tags, golden-good/golden-bad mutations, and the machine-readable evidence
schema. The runners are [`../agents/design-qa-auditor.md`](../agents/design-qa-auditor.md) (rendered
pixels via Chrome DevTools + Playwright) and [`run-checks.mjs`](run-checks.mjs) (token-level math).

**Anti-bluff contract (§11.4.5 / §11.4.69 / §11.4.170):** every PASS is backed by **captured,
machine-readable POSITIVE evidence** (verdict + per-check measurement + artifact paths). A structural
or heuristic check never substitutes for a measurement. Any FAIL loops back to the responsible
specialist agent until a **zero-finding clean verdict** (§11.4.134).

**Executable-status honesty (read before trusting a PASS).** Only some checks below are wired into
[`run-checks.mjs`](run-checks.mjs) today; the rest are **SPEC-only** pending deps/harness. Each check
carries an **`exec`** column: `RUN` (implemented + asserted in run-checks.mjs), `AUDITOR` (rendered by
the design-qa-auditor MCP harness), or `SPEC` (defined here, **not yet executed — do not report PASS
without building the runner first**). As of this writing, run-checks.mjs implements **D1 (DTCG
validity), D2 (WCAG AA contrast), D7 (hue-delta), D8 (min pairwise ΔE00 ≥10 on primaries)** with real
assertions; everything marked `SPEC` here is unproven until its runner exists. Do **not** claim any
`SPEC` check passes.

**Load-bearing caveats (carry verbatim, never launder):**
- **JND caveat** — ΔE00 ≈ 1.0 is the *nominal* JND but the JND is **not uniform** across color space
  and ΔE00 is contested at large differences; thresholds are guidance, not physics
  (`../knowledge/uniqueness-engine.md` §4).
- **APCA-draft caveat** — APCA is a **DRAFT (WCAG 3, non-normative)**; it is an *additional* screen,
  **never a replacement** for the normative WCAG 2.2 AA gate (uniqueness-engine §5).
- **DTCG-status caveat** — DTCG is a **Community Group draft** (first stable module set 2025.10), not
  a W3C Recommendation (uniqueness-engine §7).
- **Capacity caveat** — the blue-noise space is finite; as it fills, radius `r` must **shrink
  (graceful degradation)** or the engine **reports saturation** — it must not loop forever
  (uniqueness-engine §4, Bridson 2007).
- **Platform-metric caveat** — Apple HIG numbers are Google-indexed secondhand; several Android/
  GNOME/KDE/Wear/RN values are `[UNVERIFIED]`. A conformance assertion against an `[UNVERIFIED]` value
  inherits that flag — do not present it as confirmed (`../knowledge/platforms/*`).

`feature_class = design_uniqueness_platform`. Evidence bundles land under
`_tests/evidence/design-toolkit/<run-id>/`.

---

## 1. Challenges (four, each with its own dimensions)

| Challenge | Verifies | Runner |
|-----------|----------|--------|
| **C-UNIQ** — Uniqueness | ≥2 projects on the shared engine read as **distinct brands** in token space | run-checks.mjs (U1) + SPEC (U2–U5) |
| **C-A11Y** — a11y HARD-FAIL | a per-project accessibility **floor** that fails the build the instant it is breached | run-checks.mjs (A1 token-level) + AUDITOR (A1–A4 rendered) |
| **C-PLAT** — Platform-conformance | native target-size / type-scale / safe-area / contrast per target platform | AUDITOR + SPEC (per `platforms/*`) |
| **C-DET** — Determinism | same seed ⇒ **byte-identical** tokens (+ SVG mark) | run-checks.mjs-adjacent (D1) — see §5 |

---

## 2. C-UNIQ — Cross-project uniqueness

Compare **≥2 projects** generated from **different seeds** on the shared engine. All metrics operate
on the resolved design-DNA / emitted tokens (not pixels — pixel-diff is D7 in the base test-bank).

| # | Check | Metric | Threshold | Tag | exec |
|---|-------|--------|-----------|-----|------|
| **U1** | perceptual color separation | min pairwise **CIEDE2000 ΔE00** on primary role colors | **≥ 10** | metric **[E]**, threshold **[H]** | **RUN** (D8) |
| **U2** | large-diff / gamut-aware separation | **CAM16-UCS ΔE′** on primaries (used where ΔE00 saturates) | **≥ 8** | metric **[E]**, threshold **[H]** | **SPEC** (pending pinned CAM16 dep; `qa/lib/deltae.mjs` currently ships ΔE-OK/OKLab, **not** CAM16-UCS) |
| **U3** | overall DNA separation (blue-noise) | combined **weighted DNA-distance** (color>type>shape≈layout>spacing>motion≈texture, axes normalized [0,1]) — Poisson-disk min-radius invariant | **≥ 0.25** | method **[E]** (Bridson), r **[H]** | **SPEC** |
| **U4** | type identity separation | **type-pair distance** (display+body pairing distance in the curated pool's feature space) | **≥ 0.3** | **[H]** | **SPEC** |
| **U5** | capacity report | as space fills, radius shrank gracefully **or** saturation was reported (no infinite loop) | report present + honest | **[E]** method, **[H]** r | **SPEC** |

**Order of operations (uniqueness-engine §1):** the blue-noise gate (U1–U4) runs on the **raw DNA
vector** for novelty; guardrail projection (C-A11Y) then repairs it for safety; **re-run U1–U4 after
projection** (projection can pull two designs closer). U5 governs the whole loop.

**JND caveat** applies to U1/U2 thresholds — they are tunable defaults recorded in provenance, not
standards.

## 3. C-A11Y — Accessibility HARD-FAIL floor (per project)

A **binary floor**: any breach fails the build immediately (no "score", no partial credit).

| # | Check | Metric | Threshold | Tag | exec |
|---|-------|--------|-----------|-----|------|
| **A1a** | WCAG 2.2 AA contrast (normative) | `contrast_pass_rate` over **all** semantic fg/bg pairs, **both** light+dark | **== 100%** (text 4.5:1, large 3:1, UI/graphic 3:1) | **[E]** | **RUN** (D2, token-level) + **AUDITOR** (rendered) |
| **A1b** | APCA (secondary screen) | APCA **Lc** per font-size class | **Lc ≥ 90 / 75 / 45 / 30** (body-fine / body / large / non-text, per APCA table) | **[E]** metric, **DRAFT** | **SPEC** — **APCA-draft caveat: additional screen only, never replaces A1a** |
| **A2** | body size | rendered body font-size | **≥ platform min** (web ~16px; iOS 17pt; Android body 16sp; per `platforms/*`) | **[H]** on the floor | **AUDITOR** |
| **A3** | measure + line-height | line length (measure) + line-height | measure **45–75 char** (print/editorial); body line-height **≥ 1.4** (WCAG 1.4.12 spacing) | **[H]**/[E] | **AUDITOR** |
| **A4** | reduced-motion collapse | every motion token has a reduced-motion counterpart that lands the **same end-state** with no movement (2.3.3/2.2.2) | 100% of motions collapse | **[E]** | **AUDITOR** (grep + rendered reduced-motion golden) |

A1a is the **hard gate** (normative). A1b is an *additional* screen only. A2/A3 use platform floors
from `platforms/*` (inherit any `[UNVERIFIED]` flag). A4 pairs with the motion dimension of the base
test-bank + `motion-system-designer` (every role ships its reduced-motion pair).

## 4. C-PLAT — Platform-conformance (per target platform)

One assertion set **per target platform**, sourced from `../knowledge/platforms/*`. Values marked
`[UNVERIFIED]` in the source file inherit the flag here — assert against the documented default and say
so. All `exec = AUDITOR` (rendered/measured) unless noted `SPEC`.

| # | Check | Source (`platforms/*`) | Assertion (examples) |
|---|-------|------------------------|----------------------|
| **P1** | **target size** | apple / android-material3 / windows-fluent / web / specialized | iOS/watchOS **≥44pt**; Android **≥48dp** (Wear 48/40[UNVERIFIED]); Fluent **≥40epx base / 44epx touch + 4epx gap**; web **≥24×24 CSS px (AA)**; visionOS **≥60pt angular**; Auto/AAOS **≥64dp**; macOS/GNOME/KDE/RN **no published min → assert system-default sizes, flag [UNVERIFIED]** |
| **P2** | **type scale** | apple / android-material3 / windows-fluent | iOS body **17pt** + Dynamic Type; Android body **16sp** + font-scale respected; M3 type-scale roles present; Fluent Segoe UI Variable optical grades |
| **P3** | **safe area / insets** | apple / android-material3 / specialized | iOS notch/Dynamic-Island/home-indicator via `env(safe-area-inset-*)` (not hard-coded); Android edge-to-edge insets; tvOS overscan **90/60pt**, Android-TV **58/28dp[UNVERIFIED]**; Wear percentage margins; foldable hinge via `FoldingFeature` (device-reported) |
| **P4** | **contrast (platform)** | android-material3 / web / all | text **4.5:1** / large + UI **3:1** on the target; Windows high-contrast theme remap; honors platform reduce-transparency/increase-contrast |
| **P5** | **material fallback** | apple / windows-fluent / uniqueness-engine §5 | every Liquid Glass / Mica / Acrylic / blur / elevation ships an **opaque/flat/high-contrast** fallback |
| **P6** | **distraction / focus** (specialized surfaces) | specialized / android-material3 §6 | Automotive glance **≤2s** / task **≤12s**, ≤5 levels; 10-foot + XR focus-engine + no-cursor focus state; TUI 80×24; E-ink no-animation |

## 5. C-DET — Determinism

| # | Check | Metric | Threshold | Tag | exec |
|---|-------|--------|-----------|-----|------|
| **DET1** | token reproducibility | `sha256(tokens.json)` for two runs of the same seed + options + generator version | **byte-identical** (hashes equal) | **[E]** | RUN-adjacent — the generator's `npm test` already asserts determinism; this Challenge re-hashes the emitted DTCG (and the SVG mark) as external proof |

No `Math.random()` anywhere in the pipeline; every choice draws from the seeded PRNG
(`../generators/lib/prng.mjs`). Seed + resolved DNA vector + generator version are recorded in the
DTCG `$description`/provenance so a hash mismatch is diagnosable.

---

## 6. Verdict schema (per check, machine-readable)

```json
{
  "run_id": "2026-08-07T…",
  "feature_class": "design_uniqueness_platform",
  "challenge": "C-UNIQ | C-A11Y | C-PLAT | C-DET",
  "check": "U1 | A1a | P1 | DET1 | …",
  "targets": ["milosvasic.ru@seedA", "vasic.rs@seedB"],
  "platform": "web | ios | android | windows | gnome | kde | watchos | tvos | wear | androidtv | auto | visionos | tui | print | null",
  "verdict": "PASS | FAIL",
  "exec": "RUN | AUDITOR | SPEC",
  "rationale": "…",
  "measurements": { "metric": "deltaE00", "value": 12.4, "threshold": 10, "op": ">=" },
  "tags": ["[E]-metric", "[H]-threshold"],
  "caveats": ["JND-non-uniform", "APCA-draft", "platform-metric-UNVERIFIED"],
  "evidence": ["uniqueness/deltae.json", "goldens/…png", "hashes/tokens.sha256"]
}
```

- A `SPEC` check MUST emit `"verdict": "SPEC"` (or be omitted) — it may **not** emit `"PASS"` until its
  runner exists (anti-bluff).
- Overall verdict = PASS only if **every non-SPEC check** in the enabled Challenges PASSes; any FAIL
  loops to the owner agent (§11.4.134).

## 7. Golden-good / golden-bad mutations (the suite must catch these)

A uniqueness/conformance suite is only trustworthy if a **deliberately broken** variant FAILS
(paired-mutation, HelixQA §1.1). Each mutation MUST flip the named check to FAIL:

| Check | golden-GOOD (must PASS) | golden-BAD mutation (must FAIL) |
|-------|------------------------|--------------------------------|
| U1 ΔE00 | two seeds → primaries ΔE00 = 14 | reuse the **same seed** for both projects (ΔE00 = 0) |
| U2 CAM16 ΔE′ | primaries ΔE′ = 11 | pick two seeds whose primaries differ in hue but collide in appearance (ΔE′ < 8) |
| U3 DNA-distance | full-vector distance = 0.34 | vary only `seedHue` slightly, hold all other axes equal (distance < 0.25) |
| U4 type-pair | different display+body pairs (distance 0.5) | assign both projects the **same** font pair (distance 0) |
| U5 capacity | radius shrank + saturation logged | request N+1 designs in a full space with **no** shrink/report (infinite loop) |
| A1a contrast | all pairs ≥ threshold, both modes | drop one on-primary pair to 3.8:1 (rate < 100%) |
| A1b APCA | Lc meets the size class | drop body Lc below 75 (secondary screen flags; A1a still governs) |
| A4 reduced-motion | every motion collapses to end-state | delete one `prefers-reduced-motion` branch |
| P1 target size | iOS control = 44pt | shrink one iOS control to 32pt |
| P3 safe area | uses `env(safe-area-inset-*)` | hard-code a 0px top inset (content under the notch) |
| P5 material fallback | glass has opaque fallback | remove the Reduce-Transparency fallback from one surface |
| DET1 determinism | two runs → equal sha256 | inject `Math.random()` into one axis (hashes differ) |

## 8. Gates (CI wiring — next checkpoint)

- **CM-DESIGN-UNIQUENESS** (blocking when ≥2 projects share the engine): C-UNIQ **U1** PASS (RUN
  today); U2–U5 become blocking once their runners land.
- **CM-DESIGN-A11Y-FLOOR** (blocking): C-A11Y **A1a == 100%** (RUN token-level + AUDITOR rendered);
  A2–A4 blocking via the auditor harness.
- **CM-DESIGN-PLATFORM** (blocking per shipped platform): C-PLAT P1–P5 PASS for each target.
- **CM-DESIGN-DETERMINISM** (blocking): C-DET DET1 byte-identical.
- **Draft/secondary never gate alone:** APCA (A1b) is advisory; pilot MCPs don't gate (INSTALL.md §3).
  Playwright `toHaveScreenshot` + Chrome DevTools Lighthouse + run-checks.mjs are the gate-grade tools.

## 9. Evidence bundle layout

```
_tests/evidence/design-toolkit/<run-id>/
├── verdict.json                      # overall + per-check (§6 schema)
├── uniqueness/
│   ├── deltae.json                   # U1 ΔE00 pairwise matrix (RUN)
│   ├── cam16.json                    # U2 (SPEC)
│   ├── dna-distance.json             # U3 (SPEC)
│   ├── type-pair.json                # U4 (SPEC)
│   └── capacity-report.json          # U5 (SPEC)
├── a11y/
│   ├── contrast-table.json           # A1a per pair × mode (RUN + AUDITOR)
│   ├── apca.json                     # A1b (SPEC, advisory)
│   ├── type-metrics.json             # A2/A3 body-size/measure/line-height
│   └── reduced-motion/*.png          # A4 collapse goldens
├── platform/<platform>/
│   ├── conformance.json              # P1–P6 assertions (with [UNVERIFIED] flags preserved)
│   └── goldens/*.png                 # rendered per-platform proof (web/PWA via chrome-devtools)
└── determinism/
    ├── tokens.sha256                 # DET1 hash, run A vs run B
    └── mark.svg.sha256               # DET1 SVG mark hash
```

## 10. Status

**SPEC** for the first increment: dimensions, thresholds, `[E]/[H]` tags + caveats, mutations, and the
evidence schema are defined. Executable **today**: U1 (ΔE00), A1a (token-level contrast), and the
generator's determinism test; the base [`design-qa-testbank.md`](design-qa-testbank.md) covers the
rendered D1–D7. Building the SPEC runners (CAM16-UCS ΔE′ with a pinned dep, weighted DNA-distance,
type-pair distance, capacity report, the AUDITOR-side platform + a11y-floor assertions) and wiring the
CM gates is a **next-checkpoint** task — **do not report a SPEC check as PASS until its runner exists.**
