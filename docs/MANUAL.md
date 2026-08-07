# Manual — Design Toolkit Reference

Complete reference for the toolkit: every part, the design-DNA model, the OpenDesign combination, and
coverage across all platforms and formats. Task-oriented steps live in [`USER-GUIDE.md`](USER-GUIDE.md);
provenance/verification lives in [`../../_analysis/design-research/CATALOG.md`](../../_analysis/design-research/CATALOG.md).

---

## 1. Architecture

Four cooperating parts + a QA gate, each chosen by one decision rule:

- **Vendored artifact** (must be pinned + license-clean) → **git submodule** — `submodules/PLAN.md`.
- **Runtime tool** (no vendored code, stdio) → **MCP install** — `mcp/INSTALL.md`.
- **Knowledge to reason with** → **authored cheat-sheet** — `knowledge/`.
- **A specialist's know-how + procedure + guardrails** → **agent recipe** — `agents/`.
- **What "done" means for a design deliverable** → **QA Challenge spec** — `qa/`.

```
seed ─► design-dna ─► parameter vector ─► gen-tokens ─► DTCG ─► OpenDesign ─► per-platform tokens ─► product
                                          gen-marks (svg.js, build-time) ─► seeded SVG signature
                    agents drive each stage · MCP servers are the tools · knowledge is the rulebook · QA is the gate
```

---

## 2. The design-DNA vector (the uniqueness model)

Every project reduces to a small parameter vector, deterministically derived from a seed and nudged by
brand adjectives. Full range table + adjective heuristics live in
[`../agents/theming-designer.md`](../agents/theming-designer.md); summary:

| Param | Range | Personality axis |
|-------|-------|------------------|
| `seedHue` | 0–360° | core color identity |
| `mcuVariant` | TonalSpot / Vibrant / Expressive / Neutral / Monochrome / Fidelity / Content / Rainbow / FruitSalad | overall color feel |
| `harmonyRule` | complementary / analogous / triadic / split-comp / mono | color richness/tension |
| `typeRatio` | 1.2 / 1.25 / 1.333 / 1.5 | hierarchy drama |
| `spaceMultiplier` | 0.85 / 1.0 / 1.25 | density (compact→airy) |
| `radiusBase` | 0 / 4 / 8 / 12 / 999 | technical→friendly→playful |
| `fontPairId` | id into OSS font-pair matrix | voice |
| `contrastMode` | standard / high / premium-dark | light-airy vs dark-premium |

**Determinism:** `seed = hash(project-name + domain)`; `same seed + options + generator version ⇒
byte-identical tokens`. **Bounded selection:** the agent picks within ranges and justifies — it does
not free-form invent (the CPT "controllable, editable variation under brand constraints" finding).

**Why this is enterprise-grade, not a gimmick:** Material 3 dynamic color already ships "one seed →
whole accessible system" at Google scale (Apache-2.0). The toolkit generalizes that proven pattern
from color to **type + space + shape + marks** — which no single OSS "brand-in-a-box" does end-to-end;
the assembly (MCU + color.js/chroma.js + utopia-core + Style Dictionary + svg.js) is the value-add.

---

## 3. The parametric pipeline + OpenDesign

```
project seed
   │ design-dna.mjs
   ▼ parameter vector
   │ gen-tokens.mjs
   ├─ material-color-utilities → HCT tonal palettes + light/dark role scheme (variant = personality)
   ├─ color.js / chroma.js     → OKLCH harmony ramps, gamut-safe P3 (+ sRGB fallback)
   ├─ utopia-core              → fluid type/space clamp() from ratio + multiplier
   └─ radius + density tokens
   ▼
DTCG document ─► OpenDesign (consumes/emits; §11.4.162 source of truth; Style Dictionary sits behind it)
   ▼
sites / apps / PDFs consume ONLY emitted OpenDesign tokens
   +
gen-marks.mjs (svg.js, seeded RNG, BUILD TIME) → static SVG marks/backgrounds (colors from tokens)
```

**§11.4.162 reconciliation:** the generator's output is a **DTCG document fed into OpenDesign**, never
hand-written CSS. If OpenDesign can't ingest a token or emit a construct (`light-dark()`, a specific
`clamp()`), that gap is an **upstream OpenDesign PR (§11.4.74)** — the generator never writes
`var(--*)` or literals into a site stylesheet. Confirm OpenDesign's ingestion contract accepts an
external DTCG doc during Phase A; if not, that's the first upstream PR.

**Container-only:** the generator and any image-gen run in a container; keys from `~/api_keys.sh`,
never in repo/config.

---

## 4. The agents (roles, tools, guardrails)

| Agent | Role | Key MCP tools | Hard guardrail |
|-------|------|---------------|----------------|
| `theming-designer` | seed+adjectives → DTCG token set; the uniqueness engine | google-fonts, coolors(pilot), chrome-devtools | emit DTCG only; contrast gate all-pass; determinism |
| `layout-architect` | screen structure, container-query responsive, cross-platform | shadcn, chrome-devtools | PE base (no-JS); verify by render+click at 3 viewports |
| `animation-designer` | tokenized, GPU-only, reduced-motion motion | chrome-devtools, playwright | transform/opacity only; reduced-motion gate; deterministic end-state |
| `iconographer` | self-hosted icon system per personality | sharp, jezweb design-assets | no remote CDNs; no CLS; token color; a11y names |
| `ux-flow-designer` | IA, nav, flows, page templates, APG interaction | draw.io/mermaid, framelink-figma, anydesign | real behavior+semantics (no `href="#"`); APG keyboard maps |
| `design-qa-auditor` | render-proof audit + evidence bundle; the gate | chrome-devtools, playwright | rendered pixels, not heuristics; anti-bluff evidence |

Shared substrate: all read `knowledge/`, defer token authority to OpenDesign, and build on the
vendored `anthropics/skills:frontend-design` + `theme-factory` aesthetic base; `ui-ux-pro-max`
supplies cross-platform stack specifics on demand.

---

## 5. Knowledge base (cited, open-licensed)

`knowledge/` = authored rules (never copied prose), each with source + license:
`a11y-wcag22` (W3C) · `aria-apg` (W3C) · `color` (OKLCH/M3/Radix/Open Color/WCAG) · `typography`
(Utopia/M3/web.dev) · `layout` (Every Layout concepts/MDN/M3 + platform checklists) · `motion`
(M3/easings.net/MDN) · `material3` (Apache-2.0/CC-BY) · `dtcg-tokens` (DTCG CG). Copyrighted sources
(Apple HIG, Fluent 2, Atomic Design, Every Layout) are paraphrased into checklists only.

---

## 6. All platforms & formats

The token set + agents cover the full matrix; OpenDesign (Style Dictionary behind it) fans DTCG out:

| Target | How | Agent focus |
|--------|-----|-------------|
| **Web (SPA/SSR/static)** | DTCG → CSS custom properties; container queries; PE base | layout-architect, animation-designer |
| **iOS / iPadOS / macOS** | DTCG → SwiftUI tokens; HIG rules-only checklist (safe areas, ≥44pt, Dynamic Type) | layout-architect (§knowledge/layout §5) |
| **Android** | DTCG → Material3 Kotlin tokens; window size classes, adaptive panes, ≥48dp | layout-architect |
| **Windows / GNOME desktop** | DTCG → platform CSS/theme; resizable windows, keyboard nav | layout-architect |
| **Cross-platform stacks** (Flutter, RN, Compose, Avalonia, WinUI, Uno) | `ui-ux-pro-max` stack refs gated by OpenDesign tokens | theming + layout |
| **PDF / print** | tokens → print CSS; PDF validation (§11.4.168) | design-qa-auditor |
| **Diagrams / brand assets** | draw.io/Mermaid diagrams; svg.js seeded marks (build-time) | ux-flow-designer, theming-designer |
| **Component libraries** | shadcn (React/Vue/Svelte/RN) reuse before custom | layout-architect |

App *types* covered: marketing/portfolio sites, web apps/dashboards, docs, native mobile, desktop
apps, design-system libraries, print/PDF deliverables. The QA Challenge (`qa/`) proves each on real
pixels regardless of format.

---

## 7. QA & proof

[`../qa/design-qa-testbank.md`](../qa/design-qa-testbank.md) defines the Challenge: dimensions D1–D7
(token validity, contrast/WCAG, a11y, responsive, motion perf, CWV, cross-project uniqueness), the
`screen × state × mode × viewport` matrix, golden-good/golden-bad mutations, machine-readable evidence
schema, and CI gates. `design-qa-auditor` executes it; PASS requires captured rendered evidence
(anti-bluff, §11.4.5/§11.4.69/§11.4.170); any FAIL loops to the responsible agent until a clean
verdict (§11.4.134).

---

## 8. Governance, licensing, honesty

- **Licenses:** vendor MIT/Apache/BSD/ISC only; GPL stays external (MCP process); no-license items not
  incorporated. Verified this build: **utopia-core = ISC**.
- **Excluded (do not add):** Official Figma Dev Mode MCP (paid seat), 21st.dev Magic MCP (paid/keyed),
  LottieFiles Creator MCP (hosted), Every Layout / Refactoring UI (paid — concepts only), APCA as an
  authoritative gate (advisory — enforce WCAG 2.2). Full list: `mcp/INSTALL.md`, `submodules/PLAN.md`.
- **Pilot-first (don't gate CI):** coolors-mcp, design-token-bridge-mcp, mcp-image-compare.
- **Anti-bluff:** unverified items marked inline; PASS requires evidence.

---

## 9. Roadmap (from the incorporation plan)

- **Phase A** — scaffold + prove the pipeline (vertical slice; confirm OpenDesign ingests generated
  DTCG or file the upstream PR). ← *this increment scaffolds; pipeline code is next.*
- **Phase B** — vendor skill foundation (anthropics/skills, designer-skills); author theming-designer +
  design-qa-auditor (done as recipes here).
- **Phase C** — cross-platform + remaining recipes (done as recipes); add ui-ux-pro-max/jezweb/anydesign
  submodules; encode `knowledge/` (done).
- **Phase D** — gen-marks build-time signature; prove milosvasic.ru vs vasic.digital render as distinct
  brands (D7).
- **Phase E** — nest under HelixConstitution + wire into vasic; gate CI on design-qa-auditor. *(Held for
  user GO — entangled with the un-pushed §11.4.236 amendment + umbrella push. See `submodules/PLAN.md`
  §"Next checkpoint" for exact commands.)*
