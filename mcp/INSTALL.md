# MCP Servers — Install Guide

The **free, local, license-clean** MCP servers the design agents call at runtime. Decision rule: a
thing an agent invokes over stdio with **no vendored code** → MCP install (vs. libraries/skills we
version-pin → submodules, see `../submodules/PLAN.md`).

**Every server below is free with no paid subscription.** GPL and no-license servers are kept out
entirely (see §"Explicitly excluded"). Facts (license, stars, last-push) were verified against the
live repos/npm on 2026-08-06 in `../../_analysis/design-research/CATALOG.md`; re-verify before you
standardize on any low-star item.

> These commands install into your local Claude config. They do **not** touch any remote repo. Some
> require a runtime: Node/`npx` (most), `uvx` (google-fonts). Chrome DevTools MCP is already present
> as a plugin in this environment.

---

## 1. Core set — install these first (Fit 5)

```bash
# Design QA: Lighthouse a11y/perf, screenshots, perf traces — feeds §11.4.170 proof.
# (Already a plugin in this environment; command shown for portability.)
claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest      # Apache-2.0

# Screenshot / visual-regression backbone; accessibility-tree-driven automation.
claude mcp add playwright npx @playwright/mcp@latest                            # Apache-2.0

# Component discovery/reuse before building custom (official shadcn).
npx shadcn@latest mcp init --client claude                                      # MIT

# Multi-framework component source (React / Vue / Svelte / React Native).
claude mcp add shadcn -- npx -y @jpisnice/shadcn-ui-mcp-server                  # MIT
```

Used by: `design-qa-auditor` (Chrome DevTools + Playwright), `layout-architect` (shadcn),
`animation-designer` (Chrome DevTools + Playwright).

---

## 2. Design ingestion, diagrams, fonts, images (Fit 4–5)

```bash
# Figma design INGESTION via a FREE Figma Personal Access Token (any plan, no Dev seat).
# Put the PAT in ~/api_keys.sh as $FIGMA_PAT — never in repo/config.
claude mcp add framelink-figma -- npx -y figma-developer-mcp --figma-api-key=$FIGMA_PAT --stdio   # MIT

# Architecture / diagram authoring (draw.io / diagrams.net), fully local.
npx -y drawio-mcp-server --editor                                              # MIT

# Mermaid code → rendered PNG/SVG diagram assets, fully local (headless Puppeteer).
claude mcp add mermaid -- npx -y @peng-shawn/mermaid-mcp-server                # MIT

# Font pairing → CSS/Tailwind type systems, fully offline, no key (~1,923 Google Fonts metadata).
claude mcp add google-fonts -- uvx google-fonts-mcp                            # MIT

# Local AVIF/WebP/resize/metadata (libvips/Sharp) — backs responsive-image work.
npx -y sharp-mcp                                                               # MIT
```

Used by: `ux-flow-designer` (framelink-figma, draw.io, mermaid), `theming-designer` (google-fonts),
`iconographer` (sharp).

---

## 3. Pilot-first — evaluate before you standardize (low stars / single author)

Do **not** gate CI on these until proven in a real project. Listed because the research rates their
capability highly, but maturity is thin.

```bash
# MD3 + OKLCH + HCT color ops, Delta-E, WCAG, image color extraction. Fully local, no key. (~2★)
claude mcp add coolors -- npx -y @trishchuk/coolors-mcp                        # MIT — PILOT

# DTCG → Material 3 (Kotlin) / SwiftUI / Tailwind / CSS Variables. Local, no key. (~5★)
npm install -g design-token-bridge-mcp                                         # MIT — PILOT

# Pixel-diff of two images or URL-screenshot-vs-baseline (Pixelmatch). (~3★)
# Prefer Playwright's own toHaveScreenshot as the default; use this only if it adds value.
# repo: leky90/mcp-image-compare-server                                         # MIT — PILOT
```

Pilot candidates map to `theming-designer` (coolors, token-bridge) and `design-qa-auditor`
(image-compare).

---

## 3b. Expansion (verified 2026-08-07) — additional FREE / OSS / no-key MCPs

New capability breadth from the 2026-08-07 research pass. All are **FREE, no API key, MIT** unless a
caveat is noted. Added **without removing** any §1–§3 entry. Re-verify low-star items before gating CI.

```bash
# Icon search/insertion across 200k+ icons (Iconify-backed) — empowers `iconographer`.
claude mcp add better-icons -- npx -y better-icons                               # MIT

# Local, editable hand-drawn wireframes/diagrams (no hosted endpoint needed) — `ux-flow-designer`.
claude mcp add excalidraw -- npx -y mcp-excalidraw-server                        # MIT

# Local image optimize/resize/convert (a Sharp superset: AVIF/WebP + LQIP) — `iconographer`.
claude mcp add image-optimizer -- npx -y mcp-image-optimizer                     # MIT

# Apple Human Interface Guidelines search + audit — `design-qa-auditor` / `layout-architect`.
claude mcp add hig -- npx -y hig-mcp                                             # MIT

# WCAG 2.2 success-criteria lookup for a11y audits — `design-qa-auditor`.
# CAVEAT: MIT is declared on npm but the repo has NO LICENSE file — treat as external tool only.
claude mcp add wcag -- npx -y wcag-guidelines-mcp                                # MIT-on-npm (no LICENSE file)

# Design-systems knowledge (patterns/components/tokens), hosted HTTP — `layout-architect` / `theming-designer`.
claude mcp add --transport http design-systems https://design-systems-mcp.southleft.com/mcp   # MIT

# Tailwind utility / grid / flex guidance + class optimization — `layout-architect`.
claude mcp add tailwindcss -- npx -y tailwindcss-mcp-server                      # MIT

# Fast full-page screenshots for visual capture — `design-qa-auditor` / `animation-designer`.
claude mcp add screenshot-fast -- npx -y @just-every/mcp-screenshot-website-fast # MIT

# Chart/diagram generation (25+ chart types) — `ux-flow-designer` / `design-qa-auditor`.
# CAVEAT: renders via AntV's HOSTED service by default; set VIS_REQUEST_SERVER to a self-hosted
# renderer for fully offline/local use.
claude mcp add antv-chart -- npx -y @antv/mcp-server-chart                       # MIT (hosted-render default)
```

**Agent mapping (Expansion):**
- `iconographer` → better-icons, image-optimizer
- `ux-flow-designer` → excalidraw, antv-chart
- `design-qa-auditor` → hig, wcag, screenshot-fast, antv-chart
- `layout-architect` → design-systems, tailwindcss, hig
- `theming-designer` → design-systems

**Submodule-candidates (build-from-source, not one-line `npx`):** these have no clean published-npx
path, so vendor them as **submodules pinned to a reviewed SHA** (see `../submodules/PLAN.md`) rather
than `claude mcp add`:
- **daisyui-mcp** — MIT — daisyUI/Tailwind component guidance (build required).
- **registry-directory-mcp** — MIT — shadcn-style registry directory browsing (build required).
- **joenorton/comfyui-mcp-server** — Apache-2.0 — text-to-image via a **local ComfyUI**; needs your
  own ComfyUI + models + GPU (nothing hosted). Local image-gen is only useful if you have the GPU.

---

## 4. License note

- **Vendored code** (submodules) must be MIT / Apache-2.0 / BSD / ISC. **MCP servers run as external
  processes**, so a GPL MCP is *usable* without making our tree GPL — but we still avoid GPL/no-license
  servers here to keep the whole toolkit uniformly redistributable and to prefer the skill+local-data
  path for icons.
- Every server in §1–§2 is **MIT or Apache-2.0**. §3 pilots are **MIT**.
- Chrome DevTools MCP sends perf-trace URLs to Google's CrUX API + anonymous usage stats — **both
  opt-out**; it is otherwise fully local.
- Framelink Figma needs only a **free** Figma PAT (no paid Dev/Full seat).

---

## 5. Explicitly EXCLUDED (paid / hosted-gated / no-license)

Do not install these — they fail the no-subscription or license bar (details in CATALOG.md).
Refreshed 2026-08-07:

| Excluded server | Why excluded |
|-----------------|-------------|
| **Official Figma Dev Mode MCP** | Requires a **paid Dev/Full seat**; free tier ~6 calls/mo (unusable); vendor states it will become usage-based paid. Use **Framelink** (free PAT) instead. |
| **Apple UI / "Apple Design" MCP (paid)** | Commercial/subscription-gated Apple-UI server — fails the no-subscription bar. Use the FREE **hig-mcp** (MIT) instead. |
| **21st.dev Magic MCP** | Requires a 21st.dev **API key**; README references **paid** code retrieval; free-tier limits undocumented; license unspecified. |
| **LottieFiles Creator MCP** | Hosted product tied to a **LottieFiles account** (not free/local). Prefer CSS/SVG + `motion` (OSS) via `animation-designer`. |
| **Paid cloud image APIs** (TinyPNG/remote optimizers, hosted bg-removal, cloud image-gen) | Require paid keys / send assets off-box. Use local **image-optimizer** / **sharp-mcp**, or local ComfyUI (your own GPU). |
| **storybook-mcp-server** | **AGPL-3.0** copyleft — kept out to keep the toolkit uniformly permissive/redistributable. |
| **iconify-mcp (imjac0b)** and other **GPL iconify servers** | **GPL-3.0** — kept out for uniform permissiveness; use **better-icons** (MIT) + local Iconify *data* via `iconographer`. |
| **mcp-universal-icons (awssat)** | **NO LICENSE** (all-rights-reserved) — unsafe. |
| **Osmansiddiquer/iconify-mcp**, **color-scheme-mcp (deepakkumardewani)**, other **no-LICENSE-file servers** | No LICENSE file (= all-rights-reserved) and/or abandoned (last push 2025) — unsafe to rely on. |
| **agentic-ph/icon-mcp**, **archived puppeteer MCP**, **Squoosh-based optimizers** | Stale/abandoned/archived (>~12 months) — archival risk. |

**Honest caveats on the FREE items we DID include (see §3b):**
- **wcag-guidelines-mcp** and **material3-style servers** declare MIT on npm but ship **NO LICENSE
  file** in the repo — usable as an external process, but do **not** vendor their source.
- **@antv/mcp-server-chart** renders via AntV's **hosted service by default**; set
  `VIS_REQUEST_SERVER` to a self-hosted renderer for fully offline use.
- **Local image-generation** (ComfyUI-backed servers) needs **your own GPU + models** — there is no
  free hosted path; skip it if you lack the hardware.

---

## 6. Optional: a shippable MCP config

For a team-mergeable config, collect the §1–§2 servers into an `mcp.design.json` your projects merge
(rather than each dev running the commands). That file is a **next-checkpoint** artifact once the
toolkit is nested under HelixConstitution; for this first increment, the `claude mcp add` commands
above are the source of truth.
