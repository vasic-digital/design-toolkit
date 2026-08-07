# Design Specialist Agents — recipe index

Eleven composable **design-specialist agent recipes**. Each is a Markdown agent definition (YAML
frontmatter: `name` / `description` / `tools` / `mcp_tools` / `model`; body: a usable system prompt
encoding real design knowledge, guardrails, when-to-use, the `knowledge/*.md` it consumes, and the
MCPs from [`../mcp/INSTALL.md`](../mcp/INSTALL.md) it calls).

They share one spine: a **seed → design-DNA → DTCG token document** pipeline (the parametric
uniqueness engine — [`../knowledge/uniqueness-engine.md`](../knowledge/uniqueness-engine.md), executed
by [`../generators/`](../generators/)). Tokens are the source of truth for **OpenDesign** to consume
and emit (§11.4.162) — **no agent writes site CSS / `var(--*)` / literals.** Every deliverable passes
the [`../qa/`](../qa/) HelixQA gate. `[E]/[H]` and `UNVERIFIED`/caveat flags in the knowledge base are
load-bearing — agents preserve them, never launder them into hard facts.

## The 11 recipes

### Foundational (identity + theme)
| Agent | One-liner | Model | Key knowledge · MCPs |
|-------|-----------|-------|----------------------|
| [`brand-identity-designer`](brand-identity-designer.md) | **NEW.** Tiered tokens (global→semantic→component), logo/clear-space/voice; seeds the engine's brand-lock (pinned) axes so themes vary *around* the brand. | opus | dtcg-tokens · specialized §8 · uniqueness-engine §5 · color · google-fonts, design-systems |
| [`theming-designer`](theming-designer.md) | The parametric-uniqueness engine: seed + adjectives → accessible, on-brand color/type/space/shape DTCG theme, deterministically. | opus | color · material3 · typography · dtcg-tokens · uniqueness-engine · google-fonts, coolors, chrome-devtools |
| [`motion-system-designer`](motion-system-designer.md) | **NEW.** The motion *signature* + tokens (M3 easing/duration, energy + duration-scale axes), reduced-motion-gated, deterministic. | opus | motion · uniqueness-engine §3/§5 · dtcg-tokens · platforms · chrome-devtools, playwright, design-systems |

### Structure + surface
| Agent | One-liner | Model | Key knowledge · MCPs |
|-------|-----------|-------|----------------------|
| [`layout-architect`](layout-architect.md) | Page/screen structure from composable primitives, container-query-first responsiveness, as layout tokens. | opus | layout · material3 · platforms · shadcn, chrome-devtools |
| [`ux-flow-designer`](ux-flow-designer.md) | IA, navigation, page/flow templates + APG interaction semantics; produces flow/architecture diagrams. | opus | aria-apg · UX frameworks · draw.io/mermaid, framelink-figma |
| [`component-systems-engineer`](component-systems-engineer.md) | **NEW.** Headless primitives (Radix/Ark/Base UI/Headless UI) skinned via OpenDesign tokens; Carbon/Fluent/PatternFly + USWDS/GOV.UK a11y refs; WAI-ARIA APG. | opus | aria-apg · a11y-wcag22 · dtcg-tokens · platforms · shadcn, design-systems, Storybook |
| [`platform-ux-specialist`](platform-ux-specialist.md) | **NEW.** Native-idiomatic UI for ONE target (iOS/Liquid Glass, Android M3, Fluent, GNOME/KDE, web/PWA, watch/tv/Wear/TV/Auto/visionOS/XR/TUI/print); enforces that platform's targets/type/safe-areas/a11y. | opus | platforms/* · a11y-wcag22 · dtcg-tokens · hig, design-systems, wcag, chrome-devtools |

### Assets + data
| Agent | One-liner | Model | Key knowledge · MCPs |
|-------|-----------|-------|----------------------|
| [`iconographer`](iconographer.md) | Consistent, self-hosted icon system per personality; token-colored, accessible; no icon CDN. | sonnet | icon-system theory · self-hosted sprite · sharp, better-icons |
| [`animation-designer`](animation-designer.md) | Individual micro-interactions / scroll / view-transitions as compositor-safe, reduced-motion-gated CSS/SVG, against the motion tokens. | opus | motion · uniqueness-engine · chrome-devtools, playwright |
| [`dataviz-designer`](dataviz-designer.md) | **NEW.** Cleveland–McGill encoding accuracy, ColorBrewer/viridis CVD-safe palettes, never-color-alone, chart-lib selection (D3/Plot/Vega-Lite/ECharts/visx). | opus | specialized §7 · color · a11y-wcag22 · dtcg-tokens · antv-chart, chrome-devtools |

### Gate
| Agent | One-liner | Model | Key knowledge · MCPs |
|-------|-----------|-------|----------------------|
| [`design-qa-auditor`](design-qa-auditor.md) | The gate: audits every screen×state×{light,dark} by rendered pixels for tokens/WCAG/responsive/motion/CWV/uniqueness; fails the build on regressions; produces the evidence bundle. | opus | a11y-wcag22 · aria-apg · qa/* · chrome-devtools, playwright |

**NEW in this pass (5):** `brand-identity-designer`, `motion-system-designer`,
`platform-ux-specialist`, `dataviz-designer`, `component-systems-engineer`.
**Existing (6):** `theming-designer`, `layout-architect`, `animation-designer`, `iconographer`,
`ux-flow-designer`, `design-qa-auditor`.

---

## Fan-out: a complete UI/UX design pass in parallel

The recipes are designed to be **dispatched concurrently** in dependency waves. Foundations are
sequential (identity must exist before the theme; the theme before things that skin it); the
independent specialists then run in parallel; the auditor gates last. Every agent that emits tokens
writes into the same DTCG document (with provenance), so OpenDesign gets one coherent source of truth.

```
                          ┌───────────────────────┐
 Wave 0  identity ───────►│ brand-identity-designer│  (pins brand-lock axes; tiered tokens)
                          └───────────┬───────────┘
                                      │ brand-lock manifest + type voice
                          ┌───────────▼───────────┐
 Wave 1  theme ─────────► │  theming-designer      │  (seed → free axes AROUND the pins → DTCG)
                          └───────────┬───────────┘
                                      │ shared DTCG theme + design-DNA (incl. seed)
        ┌──────────────┬─────────────┼──────────────┬────────────────┬──────────────────┐
        ▼              ▼             ▼              ▼                ▼                  ▼
 Wave 2 (parallel — all consume the shared theme, all emit tokens/specs back into it):
  ux-flow-designer  layout-      motion-system-  platform-ux-     component-systems-  iconographer
  (IA, flows, APG)  architect    designer        specialist ×N    engineer            (icon system)
                    (structure)  (motion sig.)   (one per target) (token-skinned
                                       │                            headless prims)
                                       ▼
                                 animation-designer
                                 (authors motions vs the motion tokens)
                                       │
                              dataviz-designer (where charts/dashboards appear)
        └──────────────┴─────────────┴──────────────┴────────────────┴──────────────────┘
                                      │ one merged DTCG document + rendered deliverable
                          ┌───────────▼───────────┐
 Wave 3  gate ─────────►  │  design-qa-auditor     │  runs qa/design-qa-testbank.md +
                          └────────────────────────┘  qa/uniqueness-and-platform-conformance.md
                                      │ any FAIL → route to the responsible agent (§11.4.134 loop)
                                      ▼
                              zero-finding clean verdict + evidence bundle
```

### Dispatch waves (what runs when, and why)
- **Wave 0 — `brand-identity-designer`** (alone): establishes the pinned identity + tiered tokens.
  Nothing that varies the design can run before the pins exist.
- **Wave 1 — `theming-designer`** (alone): resolves the seed → design-DNA → color/type/space/shape,
  varying the *free* axes around the brand-lock. Emits the shared DTCG theme every Wave-2 agent reads.
- **Wave 2 — the specialists, in parallel** (they don't depend on each other, only on the theme):
  - `ux-flow-designer` (IA + flows + APG interaction specs),
  - `layout-architect` (screen structure + responsive layout tokens),
  - `motion-system-designer` (the motion signature + tokens) → then `animation-designer` authors
    concrete motions against those tokens,
  - `platform-ux-specialist` — **one instance per target platform** (iOS + Android + web = 3 in
    parallel), each producing a platform-conformant token delta + spec,
  - `component-systems-engineer` (headless primitives skinned with the tokens),
  - `iconographer` (self-hosted icon system),
  - `dataviz-designer` (only when the deliverable has charts/dashboards).
- **Wave 3 — `design-qa-auditor`** (the gate, alone): renders + operates every matrix cell, runs the
  test-banks, and on any FAIL routes the fix to the responsible Wave-0/1/2 agent, looping until a
  zero-finding verdict (§11.4.134).

### How the seed→DTCG engine ties it together
The **seed** flows from Wave 1 into every downstream agent, so color, type, space, shape, **and
motion** are all deterministic functions of it (same seed ⇒ byte-identical tokens — verified by the
DETERMINISM check in `qa/uniqueness-and-platform-conformance.md`). The **brand-lock manifest** (Wave
0) tells the engine which axes stay pinned; the free axes diverge per project, which is exactly what
the **UNIQUENESS** checks prove (cross-project ΔE00/CAM16/DNA-distance/type-pair separation), while
the **a11y HARD-FAIL** and **PLATFORM-CONFORMANCE** checks prove that divergence never breaks
accessibility or native idiom. See [`../generators/README.md`](../generators/README.md) for the
runnable core and [`../qa/`](../qa/) for the gates.
