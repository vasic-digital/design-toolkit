# User Guide — Designing With the Toolkit

Task-oriented. How to use the toolkit + agents to design any material or app. For the full reference
(every part, the design-DNA model, all platforms/formats) see [`MANUAL.md`](MANUAL.md).

> **First-increment note:** the agents, knowledge, MCP list, and QA spec are real and usable now. The
> `generators/` code that `theming-designer` drives is *specified* here and stood up as runnable code
> at the next checkpoint. Where a step needs it, this guide says so.

---

## 0. One-time setup

1. Install the MCP servers you'll use — copy the `claude mcp add …` commands from
   [`../mcp/INSTALL.md`](../mcp/INSTALL.md). Minimum: **Chrome DevTools** (already a plugin) +
   **Playwright** + **shadcn**.
2. Skim [`../knowledge/a11y-wcag22.md`](../knowledge/a11y-wcag22.md) and
   [`../knowledge/color.md`](../knowledge/color.md) — the two gates every design step must clear.
3. Know the rule: **OpenDesign owns tokens.** Agents emit DTCG; nothing hand-writes `var(--*)`/hex/px
   into a site stylesheet.

---

## 1. Which agent for which job

| You want to… | Use agent |
|--------------|-----------|
| Create/rebrand a project's whole look (color, type, space, shape) from a seed | **theming-designer** |
| Structure a page/screen + make it responsive + cross-platform | **layout-architect** |
| Add motion / micro-interactions / transitions | **animation-designer** |
| Choose + build a self-hosted icon system | **iconographer** |
| Design IA / navigation / user flows / page templates + interaction semantics | **ux-flow-designer** |
| Prove a surface passes (a11y, contrast, responsive, motion, CWV, uniqueness) | **design-qa-auditor** |

Each file in [`../agents/`](../agents/) is a self-contained agent definition — load it as a subagent/
skill or paste its body as a system prompt.

---

## 2. Workflow: design a new project end-to-end

```
1. ux-flow-designer   → IA, nav model, flows, page templates, interaction/keyboard specs
2. theming-designer   → seed + adjectives → design-DNA vector → DTCG token set (color/type/space/shape)
                        → OpenDesign emits tokens; contrast gate verified
3. layout-architect   → structure each screen from primitives; container-query responsive; layout tokens
4. iconographer       → pick set matching personality; self-hosted sprite; a11y labels
5. animation-designer → tokenized, GPU-only, reduced-motion-gated motion
6. design-qa-auditor  → render × state × mode × viewport; a11y + contrast + motion + CWV; evidence bundle
                        → any FAIL routes back to the responsible agent (loop to clean verdict)
```

**Iterate, don't batch:** run each step as a small verifiable increment; let `design-qa-auditor` gate
before moving on. Two projects run this same flow with **different seeds** → distinct brands on one
component library (the uniqueness payoff — D7 in the QA spec).

---

## 3. Recipe: "make this project look distinct" (theming-designer)

1. Give the agent the **project name + domain** (→ seed) and 2–4 **brand adjectives**
   (e.g. *modern, trustworthy, technical*).
2. It resolves the **design-DNA vector** `{seedHue, mcuVariant, harmonyRule, typeRatio,
   spaceMultiplier, radiusBase, fontPairId, contrastMode}` from bounded ranges — and **justifies each**.
3. It generates (via `generators/`, next checkpoint for code): MCU palettes (light+dark), OKLCH harmony
   ramps (P3 + sRGB), Utopia fluid type/space, radius+density → **one DTCG document** → OpenDesign.
4. It runs the **contrast gate** on every semantic pair; adjusts tone until all-pass.
5. Hand the result to **design-qa-auditor** for the rendered proof.

Same seed + version ⇒ identical theme (reproducible). Change the seed ⇒ a different, still-accessible,
still-on-brand brand.

---

## 4. Recipe: audit before merge (design-qa-auditor)

1. Point it at the surface (URL or built pages).
2. It enumerates `screen × state × {light,dark} × {phone,tablet,desktop}`, renders each, and runs
   Lighthouse + axe + keyboard drive + contrast sweep + motion perf trace.
3. It returns PASS/FAIL per dimension (see [`../qa/design-qa-testbank.md`](../qa/design-qa-testbank.md))
   with evidence paths, and routes each failure to the responsible agent.
4. Nothing ships without an **all-PASS verdict backed by rendered evidence** (anti-bluff).

---

## 5. Designing for non-web formats

The same tokens fan out (via OpenDesign / Style Dictionary behind it):
- **iOS/Android/desktop apps:** DTCG → SwiftUI / Material3(Kotlin) / platform CSS; apply the platform
  adaptation checklist in [`../knowledge/layout.md`](../knowledge/layout.md) §5 via `layout-architect`.
- **PDF / print:** tokens drive print CSS; `design-qa-auditor` covers the PDF validation path
  (§11.4.168).
- **Diagrams / brand assets:** `ux-flow-designer` (draw.io/Mermaid MCP) for architecture/flow diagrams;
  `theming-designer` gen-marks (svg.js, build-time) for seeded SVG signatures.

See [`MANUAL.md`](MANUAL.md) §"All platforms & formats" for the full matrix.

---

## 6. Common mistakes (and the rule that prevents them)

- Hand-writing `var(--*)`/hex/px in site CSS → **never**; emit DTCG to OpenDesign (§11.4.162).
- Free-form "invent a design" → **no**; select from bounded ranges + justify (avoids AI slop).
- "Looks responsive" without rendering → **render + click** at all three viewports.
- Animating `width`/`box-shadow` → **transform/opacity only**, reduced-motion gated.
- Remote font/icon CDNs → **self-host** (no CLS, no privacy/perf hit).
- Claiming PASS without evidence → **anti-bluff**; a PASS needs captured pixels + measurements.
