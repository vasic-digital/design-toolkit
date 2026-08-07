# Submodules — Vendoring Plan

The OSS repos we **version-pin and ship** as git submodules. Decision rule: an *artifact we vendor*
(code / tokens / knowledge that must be pinned + license-clean) → git submodule (vs. a runtime tool
→ MCP install, see `../mcp/INSTALL.md`).

**License rule:** vendor **MIT / Apache-2.0 / BSD / ISC only.** GPL stays external (MCP process, not
vendored source). No-license (= all-rights-reserved) items are **not** vendored until relicensed.

> **Nothing here is executed in this first increment.** These are the exact commands to run at the
> **next checkpoint** (after remote repos exist and the toolkit is nested under HelixConstitution).
> Commands are `git submodule add` invocations to run from the `design-toolkit/` root once it is a
> git repo of its own.

Provenance + license verification: `../../_analysis/design-research/CATALOG.md` (verified 2026-08-06).

---

## A. Generator libraries — the parametric uniqueness engine

Vendored (or added as npm deps) under `generators/lib/_vendor/`. These power the `theming-designer`
agent and the `gen-tokens.mjs` / `gen-marks.mjs` pipeline.

| Library | License | Role |
|---------|---------|------|
| material-color-utilities | **Apache-2.0** | seed → HCT tonal palettes + role-mapped light/dark scheme; named variants = personality. The deterministic uniqueness primitive. |
| color.js (colorjs.io) | **MIT** | OKLCH-first conversion/interpolation, gamut-safe P3, WCAG/APCA contrast. |
| chroma.js | **BSD-3-Clause** | tiny perceptual `chroma.scale()` ramps (alt/base to color.js). |
| Style Dictionary | **Apache-2.0** | DTCG → CSS/iOS/Android/JS emitter — sits *behind* OpenDesign's contract. |
| utopia-core | **ISC** ✅ *verified 2026-08-06 (npm registry + package.json)* | fluid `clamp()` type/space scales from ratio + multiplier. Research flagged "verify LICENSE" — now confirmed ISC (permissive, MIT-equivalent). |
| @svgdotjs/svg.js | **MIT** | build-time seeded generative SVG marks/backgrounds (visual signature). |
| @adobe/leonardo-contrast-colors | **Apache-2.0** (OSS, NOT the paid Adobe CC product) | *optional* — contrast-driven theme modes (premium-dark / airy-light). |

```bash
# Run from design-toolkit/ once it is its own git repo (next checkpoint).
# Preferred: pin as npm deps in generators/package.json. Submodules shown for source-pinned option:
git submodule add https://github.com/material-foundation/material-color-utilities.git generators/lib/_vendor/material-color-utilities
git submodule add https://github.com/color-js/color.js.git                             generators/lib/_vendor/colorjs
git submodule add https://github.com/gka/chroma.js.git                                 generators/lib/_vendor/chroma-js
git submodule add https://github.com/amzn/style-dictionary.git                         generators/lib/_vendor/style-dictionary
git submodule add https://github.com/trys/utopia-core.git                              generators/lib/_vendor/utopia-core
git submodule add https://github.com/svgdotjs/svg.js.git                               generators/lib/_vendor/svg.js
# optional:
git submodule add https://github.com/adobe/leonardo.git                               generators/lib/_vendor/leonardo
```

> **npm-vs-submodule:** default to npm deps (pinned by exact version + lockfile) for these libs —
> simpler and equally reproducible. Use submodules only if source-level pinning/patching is required.

---

## B. Color-scale references (vendored data)

| Repo | License | Role |
|------|---------|------|
| Radix Colors | **MIT** | 12-step accessible scales, APCA-tuned, auto dark, P3 — the "restrained" personality. |
| Open Color | **MIT** (v1.9.1) | 13 hues × 10 shades utility palette. |

```bash
git submodule add https://github.com/radix-ui/colors.git      knowledge/_vendor/radix-colors
git submodule add https://github.com/yeun/open-color.git      knowledge/_vendor/open-color
```

---

## C. Skill repos — the design-knowledge foundation

Nested under `skills/_vendor/`, each pinned to a **reviewed SHA** (not a moving branch).

| Repo | License | What we take |
|------|---------|--------------|
| anthropics/skills | **Apache-2.0** (per-skill LICENSE) | `frontend-design`, `theme-factory`, `web-artifacts-builder`, `brand-guidelines`, `canvas-design`, `algorithmic-art`. Foundation. |
| Owl-Listener/designer-skills | **MIT** | subset that complements OpenDesign (design-research, ux-strategy, visual-critique); skip anything duplicating our recipes. |
| nextlevelbuilder/ui-ux-pro-max-skill | **MIT** | cross-platform stack coverage (Compose/Flutter/SwiftUI/WinUI/Avalonia) — a *reference our recipes cite*, gated by OpenDesign tokens so it doesn't drift generic. |
| jezweb/claude-skills | **MIT** | `frontend` + `design-assets` (palette/favicon/icon/image). |
| uxKero/anydesign | **MIT** | design→token extraction (ingestion counterpart to OpenDesign). |

```bash
git submodule add https://github.com/anthropics/skills.git                       skills/_vendor/anthropics-skills
git submodule add https://github.com/Owl-Listener/designer-skills.git            skills/_vendor/designer-skills
git submodule add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git    skills/_vendor/ui-ux-pro-max
git submodule add https://github.com/jezweb/claude-skills.git                     skills/_vendor/jezweb-skills
git submodule add https://github.com/uxKero/anydesign.git                         skills/_vendor/anydesign
# After each add, pin to a reviewed SHA:
#   git -C skills/_vendor/<name> checkout <reviewed-sha> && git add skills/_vendor/<name>
```

**NOT vendored (license blocked — from CATALOG.md):** `tommyjepsen/awesome-ux-skills` (no license →
all-rights-reserved; clear license first), the awesome-list indexes (Composio/travisvn/wilwaldon —
no license), `obra/superpowers` (not a design pack; and `superpowers-skills` is archived).

---

## D. How it nests under HelixConstitution

Mirrors the existing "decouple then nest under constitution" plan (`project-vasic-monorepo`):

```
HelixConstitution/                 (git@github.com:HelixDevelopment/HelixConstitution.git)
└── design-toolkit/                 ← this toolkit, added as a submodule of the constitution
    ├── agents/  mcp/  submodules/  knowledge/  qa/  docs/   (this increment)
    ├── skills/_vendor/*            (§C — nested submodules, pinned SHAs)
    ├── knowledge/_vendor/*         (§B)
    └── generators/lib/_vendor/*    (§A, if source-pinned)
```

Then, since `HelixConstitution` is already a submodule of `vasic`
(`.gitmodules → submodules/constitution`), `vasic` inherits `design-toolkit/` **transitively**. Sites
consume only the **emitted OpenDesign tokens** — they never reach into `generators/` at runtime.

`§11.4.162` is honored because the generator emits a **DTCG document into OpenDesign**; Style
Dictionary sits *behind* OpenDesign's contract, not beside it. Any construct OpenDesign can't yet
emit → upstream OpenDesign PR (§11.4.74).

---

## Next checkpoint — exact commands (DO NOT run yet)

Creating the remote repos and nesting is a **separate, gated checkpoint** (entangled with the
un-pushed §11.4.236 amendment + umbrella push, held for user GO per `project-design-state`). When
GO is given, the sequence is:

```bash
# 1. Create the remote repo on BOTH forges under the vasic-digital org (mirror strategy).
gh repo create vasic-digital/design-toolkit --private \
  --description "Design-capability toolkit combining with OpenDesign for unique, per-project UI/UX"
glab repo create vasic-digital/design-toolkit --private \
  --description "Design-capability toolkit combining with OpenDesign for unique, per-project UI/UX"

# 2. Initialize this directory as its own repo and push to both remotes.
cd design-toolkit
git init -b main
git add . && git commit -m "First increment: design-toolkit scaffold"
git remote add origin    git@github.com:vasic-digital/design-toolkit.git
git remote set-url --add --push origin git@github.com:vasic-digital/design-toolkit.git
git remote set-url --add --push origin git@gitlab.com:vasic-digital/design-toolkit.git
git push -u origin main

# 3. Add the vendored submodules (§A–§C above), pin each to a reviewed SHA, commit, push.

# 4. Nest under HelixConstitution.
cd ../submodules/constitution
git submodule add git@github.com:vasic-digital/design-toolkit.git design-toolkit
git commit -am "Add design-toolkit submodule"
git push

# 5. Bump the constitution pointer in vasic so it inherits design-toolkit transitively.
cd ../..
git add submodules/constitution && git commit -m "Bump constitution: add design-toolkit"
```

> Do not run steps 1–5 in this increment. They are listed so the next checkpoint is unambiguous.
> Confirm org/remote naming (`vasic-digital` on GitHub + GitLab) and the private/public choice with
> the user before creating anything.
