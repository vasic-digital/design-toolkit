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
validity), D2 (WCAG AA contrast), D7 (hue-delta), U1/D8 (min pairwise ΔE00 ≥10 on primaries),
U2 (min pairwise CAM16-UCS ΔE′ ≥8 on primaries), U3 (combined weighted DNA-distance ≥0.25 + color
axis floor — GATING), U4 (type-pair distance ≥0.3 — GATING), U5 (Poisson-disk capacity — RUN but
reported as a METRIC, never gates), A1b (APCA Lc — RUN but ADVISORY, never gates), DET1
(determinism: same seed ⇒ byte-identical token + SVG-mark sha256), and C-PLAT platform conformance
(web + android contrast, and android body-size, RUN + GATING against the emitted tokens;
UNVERIFIED/secondhand/non-token floors honestly SKIP)** with real assertions.
Real captured output for all of these lives at
[`../evidence/qa-run-hardened-checks.txt`](../evidence/qa-run-hardened-checks.txt) (ΔE00, CAM16-UCS
ΔE′, weighted DNA distance, type-pair distance, capacity, APCA Lc, and determinism hashes — no
hardcoded numbers); the U3/U4/U5 slice plus its golden-BADs is also captured at
[`../evidence/qa-uniqueness-extended.txt`](../evidence/qa-uniqueness-extended.txt); the C-PLAT slice
(clean run + golden-BAD exit-1 proof + per-platform gate/SKIP table) is captured at
[`../evidence/qa-platform-conformance.txt`](../evidence/qa-platform-conformance.txt). The C-PLAT
floors live as data in [`platform-metrics.mjs`](platform-metrics.mjs) (each value cites its
`knowledge/platforms/*.md` source and carries its verification tag verbatim); the runner is
[`lib/platform.mjs`](lib/platform.mjs). Everything still marked `SPEC`/`AUDITOR` here (rendered
platform target-size / safe-area / rendered a11y — no token to measure) is unproven until its runner
exists. Do **not** claim any `SPEC` check passes.

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
| **C-UNIQ** — Uniqueness | ≥2 projects on the shared engine read as **distinct brands** in token space | run-checks.mjs (U1/D8 + U2 + U3 + U4 gating; U5 reported metric) |
| **C-A11Y** — a11y HARD-FAIL | a per-project accessibility **floor** that fails the build the instant it is breached | run-checks.mjs (A1a gating + A1b APCA advisory, token-level) + AUDITOR (A1–A4 rendered) |
| **C-PLAT** — Platform-conformance | per-platform target-size / type-scale / safe-area / contrast | run-checks.mjs (**web + android contrast/body-size RUN + GATING**; UNVERIFIED/secondhand/target-size floors honestly SKIP) + AUDITOR (rendered) |
| **C-DET** — Determinism | same seed ⇒ **byte-identical** tokens (+ SVG mark) | run-checks.mjs (DET1) — see §5 |

---

## 2. C-UNIQ — Cross-project uniqueness

Compare **≥2 projects** generated from **different seeds** on the shared engine. All metrics operate
on the resolved design-DNA / emitted tokens (not pixels — pixel-diff is D7 in the base test-bank).

| # | Check | Metric | Threshold | Tag | exec |
|---|-------|--------|-----------|-----|------|
| **U1** | perceptual color separation | min pairwise **CIEDE2000 ΔE00** on primary role colors | **≥ 10** | metric **[E]**, threshold **[H]** | **RUN** (D8) |
| **U2** | large-diff / gamut-aware separation | **CAM16-UCS ΔE′** on primaries (used where ΔE00 saturates) | **≥ 8** | metric **[E]**, threshold **[H]** | **RUN** (`qa/lib/cam16.mjs` — raw Euclidean CAM16-UCS ΔE′ via the pinned Google material-color-utilities `Cam16`, Li et al. 2017; checked both modes, min = worse mode; measured min ΔE′ **18.09** over the 3 default seeds ≫ 8) |
| **U3** | overall DNA separation (blue-noise) | combined **weighted DNA-distance** D=sqrt(Σ wᵢ·d̂ᵢ²) over color 0.40/type 0.25/shape 0.12/layout 0.10/motion 0.08/depth 0.05 (axes normalized [0,1]) — Poisson-disk min-radius invariant, **AND** the color sub-distance must clear its own ΔE00 floor (no uniqueness via non-color tweaks alone) | **≥ 0.25** | method **[E]** (Bridson), r **[H]**, color-metric **[E]**, weights **[H]** | **RUN** (`qa/lib/dnadist.mjs` — real resolved DNA vectors + measured worst-mode ΔE00; measured min D **0.4447** over the 3 default seeds ≫ 0.25, color floor min ΔE00 **20.68** ≥ 10) |
| **U4** | type identity separation | **type-pair distance** (display+body face-feature vector: class one-hot + normalized x-height/contrast/weight/width/slant, from the engine's own `FACE_FEATURES`) | **≥ 0.3** | **[H]** | **RUN** (`qa/lib/typedna.mjs` — measured min type distance **0.4284** over the 3 default seeds ≥ 0.3; identical font pair ⇒ 0) |
| **U5** | capacity report | Poisson-disk packing upper-bound of the bounded DNA space at r = D_min: remaining capacity + saturation flag + graceful-degradation policy | report present + honest | **[E]** method, **[H]** r | **RUN — METRIC, NEVER GATES** (`qa/lib/dnadist.mjs` `poissonCapacityReport`; at the default seeds r=D_min **0.4447**, ≈3 max points, ≈0 remaining, saturated=true — honestly reported as an upper-bound estimate, loose in high dimension) |

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
| **A1b** | APCA (secondary screen) | APCA **Lc** per font-size class | **Lc ≥ 90 / 75 / 60 / 45 / 30** (fluent-body-info / body / supporting+container / fill-label+large / non-text, per APCA table) | **[E]** metric, **DRAFT** | **RUN — ADVISORY, NEVER GATES** (`qa/lib/apca.mjs` — faithful APCA-W3 0.1.9, cross-validated exact vs `apca-w3`; each semantic pair assigned its role-appropriate APCA minimum; all 84 pairs (3 seeds ×2 modes) clear their tier — dark-mode primary body lands Lc ~88.5–88.9, honestly reported as just under the informational fluent-90 tier). **APCA-draft caveat: additional screen only, never replaces A1a** — excluded from the overall verdict/exit code |
| **A2** | body size | rendered body font-size | **≥ platform min** (web ~16px; iOS 17pt; Android body 16sp; per `platforms/*`) | **[H]** on the floor | **AUDITOR** |
| **A3** | measure + line-height | line length (measure) + line-height | measure **45–75 char** (print/editorial); body line-height **≥ 1.4** (WCAG 1.4.12 spacing) | **[H]**/[E] | **AUDITOR** |
| **A4** | reduced-motion collapse | every motion token has a reduced-motion counterpart that lands the **same end-state** with no movement (2.3.3/2.2.2) | 100% of motions collapse | **[E]** | **AUDITOR** (grep + rendered reduced-motion golden) |

A1a is the **hard gate** (normative). A1b is an *additional* screen only. A2/A3 use platform floors
from `platforms/*` (inherit any `[UNVERIFIED]` flag). A4 pairs with the motion dimension of the base
test-bank + `motion-system-designer` (every role ships its reduced-motion pair).

## 4. C-PLAT — Platform-conformance (per target platform)

One assertion set **per target platform**, sourced from `../knowledge/platforms/*`. Values marked
`[UNVERIFIED]` in the source file inherit the flag here — assert against the documented default and say
so. The **token-level** floors (contrast from the emitted color tokens; body-size from the emitted
type-scale) are now **RUN** via [`lib/platform.mjs`](lib/platform.mjs) + [`platform-metrics.mjs`](platform-metrics.mjs);
everything that requires a rendered surface (target-size, safe-area, material fallback, focus) stays
`AUDITOR`/`SPEC`.

**Honesty rule encoded in the runner:** a floor is asserted (PASS/FAIL, gating) **iff** it is a clean
first-party `[E]` number **and** derivable from the tokens the generator actually emits. `[E]-secondhand`
(Apple HIG — indexed, not live-rendered), `[UNVERIFIED]`, and non-token floors (target-size / safe-area)
are **SKIP with reason** (measured value still reported where knowable) — never a fake PASS.

| # | Check | Source (`platforms/*`) | Assertion (examples) | exec |
|---|-------|------------------------|----------------------|------|
| **P1** | **target size** | apple / android-material3 / windows-fluent / web / specialized | iOS/watchOS **≥44pt**; Android **≥48dp** (Wear 48/40[UNVERIFIED]); Fluent **≥40epx base / 44epx touch + 4epx gap**; web **≥24×24 CSS px (AA)**; visionOS **≥60pt angular**; Auto/AAOS **≥64dp**; macOS/GNOME/KDE/RN **no published min → [UNVERIFIED]** | **SKIP** (no target-size token emitted → AUDITOR/rendered; all values kept in `platform-metrics.mjs` with source+tag) |
| **P2** | **type scale (body size)** | apple / android-material3 / windows-fluent | Android body **≥16sp** (clean [E]); iOS body **17pt** ([E]-secondhand); M3 type-scale roles present; Fluent optical grades | **RUN (android body ≥16sp — GATING)**; iOS 17pt measured but **SKIP** (secondhand); rendered Dynamic-Type/optical-grade = AUDITOR |
| **P3** | **safe area / insets** | apple / android-material3 / specialized | iOS notch/Dynamic-Island/home-indicator via `env(safe-area-inset-*)`; Android edge-to-edge; tvOS overscan **90/60pt**, Android-TV **58/28dp[UNVERIFIED]**; Wear % margins; foldable hinge via `FoldingFeature` | **SKIP** (no safe-area token emitted → AUDITOR/rendered) |
| **P4** | **contrast (platform)** | android-material3 / web / all | text **4.5:1** / large + UI **3:1** on the target; Windows high-contrast remap; honors reduce-transparency/increase-contrast | **RUN (web + android, both modes — GATING)** from the emitted color tokens; Windows high-contrast remap = AUDITOR |
| **P5** | **material fallback** | apple / windows-fluent / uniqueness-engine §5 | every Liquid Glass / Mica / Acrylic / blur / elevation ships an **opaque/flat/high-contrast** fallback | **AUDITOR/SPEC** (rendered) |
| **P6** | **distraction / focus** (specialized surfaces) | specialized / android-material3 §6 | Automotive glance **≤2s** / task **≤12s**, ≤5 levels; 10-foot + XR focus-engine; TUI 80×24; E-ink no-animation | **AUDITOR/SPEC** (rendered); note AAOS **font ≥24sp** is a clean [E] token floor — `--platforms auto` asserts it (a generic non-driving token set honestly FAILs it) |

## 5. C-DET — Determinism

| # | Check | Metric | Threshold | Tag | exec |
|---|-------|--------|-----------|-----|------|
| **DET1** | token reproducibility | `sha256(tokens.json)` for two runs of the same seed + options + generator version | **byte-identical** (hashes equal) | **[E]** | **RUN** — run-checks.mjs re-generates each seed twice and asserts byte-identical `sha256(canonical DTCG)` **and** `sha256(SVG mark)` (in addition to the generator's `npm test` determinism test). Real hashes captured in the evidence file |

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

- **CM-DESIGN-UNIQUENESS** (blocking when ≥2 projects share the engine): C-UNIQ **U1 + U2 + U3 + U4**
  PASS (all RUN + gating today in run-checks.mjs). **U5 is RUN but a reported METRIC — it never gates**
  (capacity is informational; the graceful-degradation policy governs the generation loop, not the
  build). Any U1–U4 FAIL blocks.
- **CM-DESIGN-A11Y-FLOOR** (blocking): C-A11Y **A1a == 100%** (RUN token-level + AUDITOR rendered);
  A2–A4 blocking via the auditor harness. **A1b (APCA) is RUN but ADVISORY — it is measured and
  reported, but never gates (draft/secondary never gates alone).**
- **CM-DESIGN-PLATFORM** (blocking per shipped platform): C-PLAT P1–P5 PASS for each target. **Token-level
  today (RUN + gating in run-checks.mjs):** P4 contrast (web + android) and P2 body-size (android ≥16sp).
  UNVERIFIED/secondhand/non-token floors (target-size P1, safe-area P3, material P5, focus P6) honestly
  **SKIP** (advisory) pending the AUDITOR rendered harness — they do not gate until that runner exists.
- **CM-DESIGN-DETERMINISM** (blocking): C-DET DET1 byte-identical (RUN in run-checks.mjs).
- **Draft/secondary never gate alone:** APCA (A1b) is advisory; pilot MCPs don't gate (INSTALL.md §3).
  Playwright `toHaveScreenshot` + Chrome DevTools Lighthouse + run-checks.mjs are the gate-grade tools.

## 9. Evidence bundle layout

```
_tests/evidence/design-toolkit/<run-id>/
├── verdict.json                      # overall + per-check (§6 schema)
├── uniqueness/
│   ├── deltae.json                   # U1 ΔE00 pairwise matrix (RUN)
│   ├── cam16.json                    # U2 (RUN)
│   ├── dna-distance.json             # U3 (RUN, gating)
│   ├── type-pair.json                # U4 (RUN, gating)
│   └── capacity-report.json          # U5 (RUN, reported metric)
├── a11y/
│   ├── contrast-table.json           # A1a per pair × mode (RUN + AUDITOR)
│   ├── apca.json                     # A1b (SPEC, advisory)
│   ├── type-metrics.json             # A2/A3 body-size/measure/line-height
│   └── reduced-motion/*.png          # A4 collapse goldens
├── platform/<platform>/
│   ├── conformance.json              # P1–P6 assertions (token-level P2/P4 RUN via lib/platform.mjs; [UNVERIFIED]/secondhand flags preserved; rendered P1/P3/P5/P6 = AUDITOR)
│   └── goldens/*.png                 # rendered per-platform proof (web/PWA via chrome-devtools)
└── determinism/
    ├── tokens.sha256                 # DET1 hash, run A vs run B
    └── mark.svg.sha256               # DET1 SVG mark hash
```

## 10. Status

Dimensions, thresholds, `[E]/[H]` tags + caveats, mutations, and the evidence schema are defined.
Executable **today** in [`run-checks.mjs`](run-checks.mjs) with real assertions and captured evidence
([`../evidence/qa-run-hardened-checks.txt`](../evidence/qa-run-hardened-checks.txt) +
[`../evidence/qa-uniqueness-extended.txt`](../evidence/qa-uniqueness-extended.txt)): **U1/D8 (ΔE00),
U2 (CAM16-UCS ΔE′ via the pinned material-color-utilities), U3 (weighted DNA-distance ≥0.25 + color
floor — gating), U4 (type-pair distance ≥0.3 — gating), U5 (Poisson-disk capacity — reported metric),
A1a (token-level WCAG AA contrast), A1b (APCA Lc — advisory), DET1 (determinism), and **C-PLAT
platform conformance** — web + android **contrast** and android **body-size (≥16sp)** RUN + GATING
against the emitted tokens ([`platform-metrics.mjs`](platform-metrics.mjs) floors +
[`lib/platform.mjs`](lib/platform.mjs) runner; captured in
[`../evidence/qa-platform-conformance.txt`](../evidence/qa-platform-conformance.txt))**; the base
[`design-qa-testbank.md`](design-qa-testbank.md) covers the rendered D1–D7. The U3/U4 golden-BADs are
proven: a forced type-collision (two color-distinct seeds sharing a font pair) flips **U4** to FAIL
with exit 1 while U1/U2/U3 stay PASS, and two identical seeds flip **U3** (and U4) to FAIL. The
**C-PLAT golden-BAD** is proven too: a token set with body-large 12px (< 16sp) and a collapsed
on-primary/primary contrast pair (< 4.5:1) flips **C-PLAT web** (contrast) and **C-PLAT android**
(contrast + body) to FAIL with **exit 1** (`qa/fixtures/golden-bad-platform.tokens.json`), while
UNVERIFIED/secondhand platforms (iOS/visionOS/macOS/GNOME/RN) honestly **SKIP** (advisory, never
gate). Still **AUDITOR/SPEC** (no runner yet): the rendered platform floors (target-size, safe-area,
material fallback, focus) and rendered a11y — no token to measure. Wiring those remaining CM gates is
a **next-checkpoint** task — **do not report a SPEC check as PASS until its runner exists.**
