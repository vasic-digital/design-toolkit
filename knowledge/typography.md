# Typography — Fluid Scales, Ratios, Variable Fonts

> **Sources:** Utopia (utopia.fyi — free calculators; *concepts* encodable) · web.dev Variable Fonts
> (content CC-BY-4.0, code Apache-2.0) · Material 3 Typography (open) · MDN CSS text/font (CC-BY-SA).
> Distilled rules only.

## 1. Fluid type & space with `clamp()` (Utopia method)

Instead of enumerated breakpoints, size type/space fluidly between a **min viewport** (e.g. 320px)
and a **max viewport** (e.g. 1240px):

```
clamp( <min-size>, <slope × 100vi> + <intercept>, <max-size> )
```

`utopia-core` computes these from parameters: `{minViewport, maxViewport, minFontSize, maxFontSize,
typeScaleRatioMin, typeScaleRatioMax, positiveSteps, negativeSteps}` → a full fluid **type scale**
and a matching fluid **space scale**. The generator feeds `typeRatio` + `spaceMultiplier` here.

- Prefer `vi` (inline) over `vw` for logical/RTL correctness.
- Space scale is derived from the base step so type and rhythm stay proportional.

## 2. Type-scale ratio = hierarchy personality

The ratio between adjacent steps sets how dramatic the hierarchy feels:

| Ratio | Name | Feel |
|-------|------|------|
| 1.2 | minor third | calm, dense, utilitarian |
| 1.25 | major third | balanced, corporate/enterprise |
| 1.333 | perfect fourth | confident, marketing |
| 1.5 | perfect fifth | dramatic, editorial |

Larger ratios = more drama between heading and body. This is a `theming-designer` personality axis.

## 3. Type-scale roles (Material 3 — encode the role set)

Emit named roles, not ad-hoc sizes: `display-large/medium/small`, `headline-l/m/s`, `title-l/m/s`,
`body-l/m/s`, `label-l/m/s`. Each role = size + line-height + weight + tracking. Map your fluid scale
steps onto these roles.

## 4. Pairing = voice (highest differentiation per unit effort)

Two-font systems by voice (all pairs must be OSS/SIL OFL and **self-hosted**):
- **Geometric-sans display + humanist body** → modern, clean (`Space Grotesk` / `Inter`).
- **Serif display + grotesque body** → editorial, trustworthy (`Fraunces` / `Inter`).
- **Humanist throughout** → warm, approachable (`Instrument Sans`).
- **Mono accent** → technical/developer (`JetBrains Mono` for code/labels).

Curate an adjective-keyed pair matrix (the `theming-designer` `fontPairId`). Use the `google-fonts`
MCP to confirm availability + emit the type system, then **self-host** the files (no runtime Google
Fonts request — matches the enforced self-hosted-fonts discipline; avoids CLS + a privacy/perf hit).

## 5. Variable fonts (perf + expressiveness)

One variable font file can replace many static weights. Expose axes as tokens where useful:
`wght` (weight), `opsz` (optical size — critical for legibility at display vs caption sizes),
`slnt`/`ital`, `wdth`. Subset to the glyphs/axes actually used; `font-display: swap` with a metrics
fallback to minimize layout shift.

## 6. Legibility rules the agents enforce
1. Body line length ~45–75ch (`max-inline-size: 65ch` on prose).
2. Body line-height ~1.4–1.6; headings tighter (~1.1–1.25).
3. Respect user font-size / zoom (size in `rem`, never px lock); text-spacing overrides must not
   break layout (WCAG 1.4.12).
4. Minimum body size ~16px equivalent at base.
5. Self-host fonts; subset; `font-display: swap` + size-adjust fallback.
