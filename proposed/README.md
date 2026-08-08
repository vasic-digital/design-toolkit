# Proposed OpenDesign token candidates (STAGED — not applied)

These `*.od-tokens.css` files are **OpenDesign-direction → deterministic-token
candidates**, staged here for review. They are **NOT** wired into either live
site. The live token layers remain:

- `design-system/brand-vasic-digital/vasic-digital.css`
- `design-system/brand-milosvasic/milosvasic.css`

## What produced them (Helix Constitution §11.4.162 — hybrid direction-generator)

Each file is the output of a deterministic two-stage pipeline in
`design-toolkit/generators/`:

```
gen-tokens.mjs  --seed <s> --adjectives <dir>   # → DTCG design-token JSON
   │  (parametric-uniqueness engine: seed+adjectives+version → tokens)
   ▼
dtcg-to-od.mjs  --stdin --out <candidate>.css   # → the sites' --od-* contract
```

`dtcg-to-od.mjs` is a **pure function of the DTCG JSON** (no Date, no random, no
network), so `same input → byte-identical CSS`.

### Direction seeds (OpenDesign-derived adjectives)

| Candidate | seed | adjectives (direction) |
|---|---|---|
| `vasic-digital.od-tokens.css` | `vasic-digital` | `industrial, editorial, precise` (MACHINA) |
| `milosvasic.od-tokens.css` | `milosvasic` | `terminal, brutalist, mono` |

> Note: the generator derives its base hue from the **seed hash**, not from the
> current brand-locked crimson. These candidates therefore explore a *new*
> direction (e.g. vasic-digital lands on a gold/amber accent). That is by design
> — they are direction proposals, not a re-skin of today's palette.

## Regenerate + verify

```sh
cd design-toolkit/generators
node gen-tokens.mjs --seed vasic-digital --adjectives "industrial,editorial,precise" --stdout \
  | node dtcg-to-od.mjs --stdin --out ../proposed/vasic-digital.od-tokens.css
node gen-tokens.mjs --seed milosvasic --adjectives "terminal,brutalist,mono" --stdout \
  | node dtcg-to-od.mjs --stdin --out ../proposed/milosvasic.od-tokens.css
```

## Coverage / mapping / synthesized tokens

Every candidate emits the full **75-name `--od-*` superset** (the union of both
brand files), so it covers vasic-digital (75/75) and milosvasic (71/71). The
M3-role → `--od-*` mapping and each synthesized (not-seed-derived) token are
documented in the header comment of each generated file and in
`dtcg-to-od.mjs`. Synthesized tokens: `--od-logo-plate` (constant white plate),
status colors (`--od-success`/`--od-warning`/`--od-badge-success-bg`),
shadow recipes, line-height, tracking, easing, z-index, container-max, and the
named font vars (`--od-font-space-grotesk/inter/jetbrains-mono`).
