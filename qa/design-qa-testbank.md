# Design QA Test-Bank / Challenge — SKELETON SPEC

A HelixQA-style **Challenge** structure for **design deliverables**. This is the *spec* (what a
design-QA suite checks, thresholds, evidence schema, golden-good/golden-bad mutations, gates); the
[`../agents/design-qa-auditor.md`](../agents/design-qa-auditor.md) agent is the **runner** that
produces the evidence, using Chrome DevTools + Playwright MCP.

**Anti-bluff contract (§11.4.5 / §11.4.69 / §11.4.170):** every PASS is backed by **captured,
machine-readable POSITIVE evidence** (verdict + per-dimension rationale + artifact paths). A structural
or heuristic check never substitutes for a rendered-pixel measurement. Any FAIL loops back to the
responsible specialist agent until a **zero-finding clean verdict** (§11.4.134).

`feature_class = design_qa`. Evidence bundles land under `_tests/evidence/design-toolkit/<run-id>/`.

---

## 1. Dimensions (the challenge checks all of these)

| # | Dimension | What it verifies | Threshold / gate | Primary evidence |
|---|-----------|------------------|------------------|------------------|
| D1 | **Token validity** | emitted tokens are valid DTCG; no raw hex/px/rem or hand-authored `var(--*)` in site CSS; every value traces to OpenDesign | DTCG-valid + **0** literals in site stylesheets | DTCG lint JSON + grep report |
| D2 | **Contrast / WCAG color** | every semantic fg/bg pair meets WCAG 2.2 | text ≥4.5:1, large ≥3:1, UI/graphic ≥3:1 (both light+dark) | contrast table (per pair, both modes) |
| D3 | **Accessibility (a11y)** | axe/Lighthouse a11y; focus visible + not obscured; names/roles/states; keyboard maps (APG); targets | Lighthouse a11y = 100 / **0** serious axe; targets ≥24×24 CSS px | Lighthouse JSON + axe JSON + keyboard log |
| D4 | **Responsive** | render + operate at phone/tablet/desktop; reflow; no h-scroll/overlap | usable at 320px; no h-scroll; targets meet min at each viewport | 3× viewport goldens per screen×state |
| D5 | **Motion performance** | each animation compositor-only, 60fps; reduced-motion variant lands same end-state; no forbidden animated props | 0 layout/paint on animated frames; reduced-motion present; grep clean | perf trace + reduced-motion golden + CSS grep |
| D6 | **Core Web Vitals** | lab CWV per key page | LCP ≤2.5s · CLS ≤0.1 · INP ≤200ms | Lighthouse perf JSON |
| D7 | **Uniqueness variance** (cross-project) | ≥2 projects on the shared component library read as distinct brands while both pass D1–D6 | design-DNA vectors differ **and** key screens pixel-diff clearly different | vector diff + pixel-diff report |

**Verdict schema (per dimension), machine-readable:**
```json
{
  "run_id": "…", "feature_class": "design_qa", "target": "milosvasic.ru/home",
  "dimension": "D2-contrast", "verdict": "PASS|FAIL",
  "rationale": "…", "evidence": ["path/…json", "path/…png"],
  "measurements": { "min_ratio": 4.62, "threshold": 4.5, "mode": "dark" }
}
```
Overall verdict = PASS only if **all** dimensions PASS (§11.4.134 loop on any FAIL).

---

## 2. Audit matrix (the runner enumerates every cell)

`screen × state × mode × viewport`

- **screens:** every route/screen in the deliverable.
- **states:** `default · hover · focus · active · disabled · empty · loading · error`.
- **modes:** `light · dark`.
- **viewports:** `phone 360×640 · tablet 768×1024 · desktop 1440×900`.

Each cell yields a golden screenshot; D2/D3/D5 measurements attach per screen.

---

## 3. Golden-good / golden-bad mutations (the challenge must catch these)

A design-QA suite is only trustworthy if a **deliberately broken** variant FAILS. For each dimension,
the bank defines a mutation that MUST flip the verdict to FAIL (a suite that still passes the mutant
is itself broken — paired §1.1 mutation, HelixQA convention):

| Dimension | golden-GOOD (must PASS) | golden-BAD mutation (must FAIL) |
|-----------|------------------------|--------------------------------|
| D1 tokens | all values via OpenDesign tokens | inject one raw `#3366ff` / `12px` literal into site CSS |
| D2 contrast | on-surface text at 4.6:1 | drop one on-primary pair to 3.8:1 |
| D3 a11y | icon-only button has `aria-label` | remove the accessible name from one control |
| D4 responsive | reflows at 320px | force a fixed 1200px-wide element (h-scroll on phone) |
| D5 motion | transform/opacity + reduced-motion gate | animate `width`; delete the `prefers-reduced-motion` branch |
| D6 CWV | CLS 0.02 | add a late-loading unsized image (CLS spike) |
| D7 uniqueness | two seeds → different vectors + pixels | reuse the same seed for both projects (must FAIL variance) |

---

## 4. Gates (CI wiring — next checkpoint)

- **CM-DESIGN-QA-PROOF** (blocking): D1–D6 all PASS with evidence for every matrix cell, else build fails.
- **CM-DESIGN-UNIQUENESS** (blocking when ≥2 projects share the library): D7 PASS.
- **Pilot-tool caveat:** do NOT gate CI on pilot-first MCPs (coolors, design-token-bridge,
  image-compare); Playwright `toHaveScreenshot` + Chrome DevTools Lighthouse are the gate-grade tools.

## 5. Evidence bundle layout

```
_tests/evidence/design-toolkit/<run-id>/
├── verdict.json                 # overall + per-dimension machine-readable verdicts
├── contrast-table.json          # D2, per pair × mode
├── lighthouse/<screen>.json     # D3 a11y + D6 perf
├── axe/<screen>.json            # D3
├── goldens/<screen>__<state>__<mode>__<viewport>.png   # D4
├── motion/<anim>-trace.json + <anim>-reduced.png       # D5
├── css-grep.txt                 # D1 (literals) + D5 (forbidden animated props)
└── uniqueness/vector-diff.json + pixel-diff/*.png        # D7
```

## 6. Status
This is the **skeleton spec** for the first increment — structure, thresholds, evidence schema, and
mutations are defined. Turning it into an executable suite (glue over Playwright/Chrome DevTools MCP +
the `anti-bluff-web-harness`) and wiring the CM gates is a **next-checkpoint** task, tracked alongside
`design-qa-auditor`.
