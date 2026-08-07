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
| [`uniqueness-engine.md`](uniqueness-engine.md) | Parametric uniqueness pipeline: seed→DNA→blue-noise→guardrails→DTCG; variance metrics; [E]/[H] tags | DTCG, MCU, Utopia, CIEDE2000, CAM16-UCS, Bridson, APCA |

## Platform cheat-sheets (`platforms/`)
Per-platform design language, key metrics (targets/type/spacing/safe-areas), a11y, canonical source
URL. **UNVERIFIED / caveat flags are load-bearing — preserve verbatim.**

| File | Covers | Primary sources (license) |
|------|--------|---------------------------|
| [`platforms/apple.md`](platforms/apple.md) | Liquid Glass (WWDC25, unified 26); iOS 44pt/16pt/17pt; watchOS/tvOS/visionOS; macOS min target UNVERIFIED | Apple HIG (copyright, free-to-read; metrics via Google-indexed text) |
| [`platforms/android-material3.md`](platforms/android-material3.md) | M3 / Material You / M3 Expressive; 8dp grid, 48dp target; window size classes; type scale; Wear/TV/Auto-AAOS/Foldables | m3.material.io (Apache-2.0/CC-BY-4.0), developer.android.com |
| [`platforms/windows-fluent.md`](platforms/windows-fluent.md) | Fluent 2, Segoe UI Variable, 40/44epx targets, radius 8/4/0, Mica/Acrylic/Smoke, UI Automation | Fluent 2 (copyright, free-to-read) |
| [`platforms/linux-desktop.md`](platforms/linux-desktop.md) | GNOME HIG (libadwaita/GTK4) + KDE HIG (Kirigami gridUnit=18); AT-SPI/Orca; targets UNVERIFIED | GNOME HIG (CC-BY-SA, reference-only), KDE HIG |
| [`platforms/web.md`](platforms/web.md) | Responsive (clamp/container queries/dvh), PWA manifest+icons, WCAG 2.2, HTML email | MDN (CC-BY-SA), W3C WCAG22, caniemail |
| [`platforms/cross-platform.md`](platforms/cross-platform.md) | Flutter (M3 default, .adaptive), React Native (no DS, no target UNVERIFIED), .NET MAUI | Flutter / RN / MAUI docs |
| [`platforms/specialized.md`](platforms/specialized.md) | Game UI/HUD (80% title-safe folklore UNVERIFIED), XR, Automotive/NHTSA, TUI, E-ink, Print, Data-viz, Brand | per-domain (Game/Xbox A11y, NHTSA, ECMA-48, ColorBrewer, Cleveland-McGill) |

**Highest-leverage to internalize** (open × cross-platform value): WCAG 2.2 + WAI-ARIA APG (a11y
gate + widget specs) · Material 3 (richest vendorable defaults) · DTCG (+ Style Dictionary) token
backbone · OKLCH + Radix + Open Color + WCAG contrast (color stack) · Every Layout primitives +
container queries + 8pt grid (layout engine) · Utopia + variable fonts (fluid type).

**Platform-adaptation rules** (Apple HIG / Fluent 2 / GNOME — paraphrased checklists) live inline in
`layout.md` §"Cross-platform" and in the `layout-architect` agent, since they are copyrighted and
encoded only as rules.
