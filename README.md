# Design Toolkit

A reusable, license-clean **design-capability layer** that combines with **OpenDesign** to
produce **unique, enterprise-grade, non-repeatable UI/UX** across every platform, OS, and app
type — deterministically, from a per-project seed.

> **Status: FIRST INCREMENT — review-ready local scaffold.**
> This is the local-files deliverable of Phase A/B from
> `_analysis/design-research/INCORPORATION-PLAN.md`. No remote repos are created yet, no git
> submodules are added yet, and the generator code is specified but not yet vendored. Remote
> repo creation under `vasic-digital` (GitHub + GitLab) and nesting under `HelixConstitution`
> is the **NEXT checkpoint** (see `submodules/PLAN.md` §"Next checkpoint").

Source of record for every recommendation here:
[`_analysis/design-research/CATALOG.md`](../_analysis/design-research/CATALOG.md) (the verified
inventory) and [`_analysis/design-research/INCORPORATION-PLAN.md`](../_analysis/design-research/INCORPORATION-PLAN.md)
(the plan). Only genuinely free / OSS / no-subscription items are incorporated; every excluded
paid/unlicensed item is listed explicitly.

---

## 1. What the toolkit is

Four cooperating parts, each chosen by a single decision rule:

| Part | What it is | Decision rule | Lives in |
|------|-----------|---------------|----------|
| **Agents** | 6 design-specialist agent recipes (theming, layout, animation, icons, UX-flow, QA) | *Knowledge an agent reasons with* → encoded recipe | [`agents/`](agents/) |
| **MCP servers** | Vetted FREE MCP tools the agents call at runtime (Chrome DevTools, Playwright, shadcn, Framelink Figma, draw.io/Mermaid, google-fonts, sharp) | *A tool an agent calls at runtime, no vendored code* → MCP install | [`mcp/INSTALL.md`](mcp/INSTALL.md) |
| **Submodules** | OSS libraries/skills we version-pin and ship (material-color-utilities, color.js, chroma.js, Style Dictionary, utopia-core, svg.js, Radix/Open Color, the skill repos) | *Artifacts we vendor (must be pinned + license-clean)* → git submodule | [`submodules/PLAN.md`](submodules/PLAN.md) |
| **Knowledge** | Distilled, cited, machine-usable design cheat-sheets (Material 3, WCAG 2.2, WAI-ARIA APG, DTCG, color/type/space/shape/motion scales) | *Rules an agent should reason with* → authored, never copied | [`knowledge/`](knowledge/) |

Plus a **QA test-bank spec** ([`qa/`](qa/)) — a HelixQA-style Challenge skeleton that defines what
a design deliverable must pass — and **docs** ([`docs/`](docs/)) — user guide + full manual.

The **parametric-uniqueness generator** (`generators/` in the full plan) is the engine the
`theming-designer` agent drives; in this first increment it is *specified* (agent recipe +
`submodules/PLAN.md` §Generator libraries + `knowledge/`), and stood up as real code in the next
checkpoint.

---

## 2. How it combines with OpenDesign

**OpenDesign stays the single token source of truth (§11.4.162).** The toolkit never hand-writes
`var(--*)`, hex, or px into a site stylesheet. Instead:

```
per-project seed
   │   design-dna  (seed → parameter vector)
   ▼
{seedHue, mcuVariant, typeRatio, spaceMultiplier, radiusBase, fontPairId, contrastMode}
   │   gen-tokens
   ├─ material-color-utilities → HCT tonal palettes + role-mapped light/dark scheme (variant = personality)
   ├─ color.js / chroma.js     → custom OKLCH harmony ramps, gamut-safe P3 (+ sRGB fallback)
   ├─ utopia-core              → fluid type/space clamp() scales from ratio + multiplier
   └─ radius + density tokens
   ▼
DTCG token document  ──►  OpenDesign (consumes / emits)  ──►  tokens.css / iOS / Android / …
   │                        Style Dictionary sits *behind* OpenDesign's contract, never beside it
   ▼
sites / PDFs consume ONLY the emitted OpenDesign tokens
   +
build-time seeded SVG marks / backgrounds (svg.js) → per-project visual signature (colors from tokens)
```

- **OpenDesign owns structure + semantics** — the component set, token *names*, light/dark
  mapping, accessibility contract.
- **The generator supplies values** from a different point in the parameter space per project.
- **The seeded SVG layer** adds a build-time visual signature (static assets — no runtime cost, no
  a11y regression).

If OpenDesign cannot yet ingest a generator-produced token or emit a needed construct (e.g.
`light-dark()`, a specific `clamp()` shape), that gap is an **upstream OpenDesign PR (§11.4.74)** —
never a local escape hatch.

---

## 3. The per-project uniqueness philosophy

Reduce a project's aesthetic to a small **"design-DNA" parameter vector**, deterministically expand
it into a full accessible token set, and add build-time seeded generative accents — so every
project is **distinct-but-on-brand and reproducible**:

- **Deterministic:** `seed = hash(project-name + domain)` → color seed, hue offsets, scale ratio,
  radius, pattern params. **Same seed + options + version ⇒ identical output.** Re-runs are stable;
  different projects diverge.
- **Bounded, not free-form:** the agent does *not* "invent a design." It selects values from
  curated ranges and **justifies each choice** (the CPT research finding — controllable, editable
  variation under brand constraints). This is what keeps output on-brand instead of generic AI slop.
- **Proven pattern:** Material 3 dynamic color is the canonical shipping example of "one seed →
  whole accessible system" (Apache-2.0). The toolkit generalizes it to **type + space + shape +
  marks**, which no single OSS "brand-in-a-box" does end-to-end — the assembly is the value-add.

Two Vasic projects can share the exact same component library and still read as unmistakably
different brands.

See [`docs/MANUAL.md`](docs/MANUAL.md) §"Design-DNA vector" for the full parameter model and
adjective→range mapping.

---

## 4. How to load it out-of-the-box

> These steps stand the toolkit up *locally* for review. They do **not** create remote repos or
> add submodules — that is the next checkpoint (`submodules/PLAN.md`).

1. **Read the two design cheat-sheets you always need:**
   [`knowledge/a11y-wcag22.md`](knowledge/a11y-wcag22.md) (the hard a11y gate) and
   [`knowledge/color.md`](knowledge/color.md) (the color model + contrast gate).

2. **Install the free MCP servers** you want the agents to call — copy/paste the exact
   `claude mcp add …` commands from [`mcp/INSTALL.md`](mcp/INSTALL.md). Minimum useful set:
   Chrome DevTools MCP (already a plugin here) + Playwright MCP + shadcn MCP.

3. **Point Claude at an agent recipe.** Each file in [`agents/`](agents/) is a self-contained
   agent definition (frontmatter + system prompt). Load it as a subagent / skill, or paste its body
   as a system prompt. Start with `theming-designer` (make a theme) or `design-qa-auditor` (audit a
   surface).

4. **When you reach the generator step,** follow `submodules/PLAN.md` to vendor
   material-color-utilities + color.js + utopia-core + Style Dictionary + svg.js, then let
   `theming-designer` drive them. (Next checkpoint stands this up as runnable code.)

5. **Gate design work with the QA spec:** [`qa/design-qa-testbank.md`](qa/design-qa-testbank.md)
   defines the Challenge every design deliverable must pass (token validity, contrast/WCAG,
   responsive, motion perf, cross-project uniqueness variance).

---

## 5. Directory map

```
design-toolkit/
├── README.md                 ← you are here
├── agents/                   ← 6 design-specialist agent recipes (Markdown agent defs)
│   ├── theming-designer.md       (parametric uniqueness engine — seed → DTCG tokens)
│   ├── layout-architect.md
│   ├── animation-designer.md
│   ├── iconographer.md
│   ├── ux-flow-designer.md
│   └── design-qa-auditor.md
├── mcp/INSTALL.md            ← exact `claude mcp add` commands + license notes + exclusions
├── submodules/PLAN.md        ← `git submodule add` commands + HelixConstitution nesting + NEXT checkpoint
├── knowledge/                ← distilled, cited design cheat-sheets (open-licensed sources only)
│   ├── README.md                 (index + how to cite)
│   ├── a11y-wcag22.md
│   ├── aria-apg.md
│   ├── color.md
│   ├── typography.md
│   ├── layout.md
│   ├── motion.md
│   ├── material3.md
│   └── dtcg-tokens.md
├── qa/design-qa-testbank.md  ← HelixQA-style Challenge/test-bank skeleton for design deliverables
└── docs/
    ├── USER-GUIDE.md             (task-oriented: how to design a thing with the toolkit)
    └── MANUAL.md                 (reference: every part, the design-DNA model, all platforms/formats)
```

---

## 6. Governance & honesty

- **License hygiene:** only MIT / Apache-2.0 / BSD / ISC items are vendored. GPL tools stay as
  external MCP processes (never vendored source). No-license (= all-rights-reserved) items are
  **not** incorporated until relicensed. Every exclusion is listed in `mcp/INSTALL.md` and
  `submodules/PLAN.md`.
- **Verified during this build:** `utopia-core` is **ISC** (confirmed via npm registry +
  package.json, 2026-08-06) — resolving the "verify LICENSE" flag from the research.
- **Anti-bluff:** anything unverified is marked **unverified** inline. Low-star / single-author MCPs
  are marked **pilot-first** and must not gate CI until proven.
- **Proof:** every surface the toolkit produces is proven by host-rendered pixels + PDF validation
  (§11.4.170 / §11.4.168) via the `design-qa-auditor` agent + Chrome DevTools / Playwright MCP.

Full provenance: [`_analysis/design-research/CATALOG.md`](../_analysis/design-research/CATALOG.md).
