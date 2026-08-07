# Knowledge — Design Cheat-Sheets

Distilled, **machine-usable** design references the agents reason with. Decision rule: *knowledge an
agent should reason with* → an **authored** cheat-sheet of rules (never copied prose).

## Sourcing & license discipline (read first)
- **Facts and heuristics are not copyrightable** — we encode the *rules/numbers*, not the prose.
- **Truly open** sources (CC-BY / MIT / Apache / W3C Document License) may be quoted/vendored **with
  attribution**: Material Design 3, WCAG 2.2, WAI-ARIA APG, DTCG spec, easings.net, Radix/Open Color,
  MDN (CC-BY-SA), WHATWG HTML (CC-BY).
- **Free-to-read but copyrighted** sources are **paraphrased into checklists only, never copied**:
  Apple HIG, Microsoft Fluent 2 site, Atomic Design online book, Every Layout, Refactoring UI.
- Each file carries its **source URL + license note** at the top.

## Files
| File | Covers | Primary sources (license) |
|------|--------|---------------------------|
| [`a11y-wcag22.md`](a11y-wcag22.md) | WCAG 2.2 success criteria as a hard gate + thresholds | W3C WCAG 2.2 (W3C Document License) |
| [`aria-apg.md`](aria-apg.md) | Keyboard + ARIA models for common widgets | W3C WAI-ARIA APG (open, examples vendorable) |
| [`color.md`](color.md) | OKLCH model, HCT/dynamic color, WCAG contrast gate, scales | oklch.com, M3, Radix/Open Color (MIT), WCAG |
| [`typography.md`](typography.md) | Utopia fluid formulas, type ratios, variable-font axes, MD3 roles | Utopia (concepts), web.dev (CC-BY), M3 |
| [`layout.md`](layout.md) | Layout primitives, container queries, 4/8pt grid | Every Layout (concepts), MDN (CC-BY-SA), M3 |
| [`motion.md`](motion.md) | MD3 motion tokens, easings table, reduced-motion gate | M3 Motion (open), easings.net (MIT), MDN |
| [`material3.md`](material3.md) | M3 color roles, tonal palette, type scale, layout classes | Material Design 3 (Apache-2.0 / CC-BY-4.0) |
| [`dtcg-tokens.md`](dtcg-tokens.md) | DTCG token document shape the generator emits | Design Tokens Community Group spec (open) |

**Highest-leverage to internalize** (open × cross-platform value): WCAG 2.2 + WAI-ARIA APG (a11y
gate + widget specs) · Material 3 (richest vendorable defaults) · DTCG (+ Style Dictionary) token
backbone · OKLCH + Radix + Open Color + WCAG contrast (color stack) · Every Layout primitives +
container queries + 8pt grid (layout engine) · Utopia + variable fonts (fluid type).

**Platform-adaptation rules** (Apple HIG / Fluent 2 / GNOME — paraphrased checklists) live inline in
`layout.md` §"Cross-platform" and in the `layout-architect` agent, since they are copyrighted and
encoded only as rules.
