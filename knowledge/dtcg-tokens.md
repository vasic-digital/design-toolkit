# DTCG — Design Token Document Shape

> **Source:** Design Tokens Community Group (W3C CG) format spec, https://www.designtokens.org/ ·
> drafts https://www.designtokens.org/TR/ · first stable module set **2025.10**. **Open** (Community
> Group). The interoperable token JSON the generator emits and OpenDesign consumes. Distilled.

## 1. Why DTCG

The generator (`theming-designer`) outputs **one DTCG document**, not CSS. OpenDesign consumes it and
emits per-platform output (CSS, iOS, Android, …), with **Style Dictionary sitting *behind* OpenDesign's
contract** — never a parallel token system in site CSS. This is how §11.4.162 (OpenDesign =
source of truth) is honored while the generator supplies *values*.

## 2. Document shape

A token = an object with **`$value`** and **`$type`**. Groups nest. `$` prefixes are reserved for
spec keys; `$description` documents intent.

```json
{
  "$description": "Generated from seed=... variant=Expressive typeRatio=1.333 (record provenance here)",
  "color": {
    "$type": "color",
    "primary":        { "$value": "#4658b0" },
    "on-primary":     { "$value": "#ffffff" },
    "primary-container":    { "$value": "#dde1ff" },
    "on-primary-container": { "$value": "#001452" },
    "surface":        { "$value": "#fdfbff" },
    "on-surface":     { "$value": "#1b1b1f" },
    "outline":        { "$value": "#767680" }
  },
  "dimension": {
    "$type": "dimension",
    "space": {
      "100": { "$value": { "value": 8,  "unit": "px" } },
      "200": { "$value": { "value": 16, "unit": "px" } }
    },
    "radius": {
      "md": { "$value": { "value": 12, "unit": "px" } }
    }
  },
  "typography": {
    "font-family": {
      "$type": "fontFamily",
      "display": { "$value": ["Space Grotesk", "system-ui", "sans-serif"] },
      "body":    { "$value": ["Inter", "system-ui", "sans-serif"] }
    }
  }
}
```

## 3. Types used by the toolkit
`color` · `dimension` (`{value, unit}` — for space/radius/size, unit `px`/`rem`) · `fontFamily` ·
`fontWeight` · `duration` (motion) · `cubicBezier` (easing) · `number` · composite `typography`,
`shadow`, `border`, `transition`, `gradient`.

## 4. Aliases (reference, don't duplicate)
Reference another token with a `{group.token}` alias so semantic tokens point at primitives:

```json
"button": { "background": { "$value": "{color.primary}", "$type": "color" } }
```

Layer as **primitive → semantic → component**: raw ramp values → role tokens (M3 roles) → component
tokens. Only semantic/component tokens reach OpenDesign consumers.

## 5. Rules the generator follows
1. Emit **DTCG**, never CSS/`var(--*)`/literals into a site stylesheet.
2. Record **provenance** in `$description` (seed, variant, ratios, generator version) for
   reproducibility + audit.
3. Every value maps to a **semantic role** (`color.md`, `material3.md`), not a bare hex/px.
4. Wide-gamut colors carry an sRGB fallback (handled at emit).
5. If OpenDesign can't ingest a token/emit a construct → **upstream PR (§11.4.74)**, not a local hack.
6. Validate the document against the DTCG shape before hand-off (part of the QA token gate).
