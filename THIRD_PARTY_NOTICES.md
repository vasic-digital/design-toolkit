# Third-party notices

| Field | Value |
|---|---|
| Repository | `design-toolkit` |
| Revision | measured 2026-11-24 against `generators/package.json` and `generators/package-lock.json` |
| Referenced by | `LICENSE` section 4 |
| Gate | `scripts/verify_licence.sh` requires this file |

`LICENSE` section 4 states that third-party components remain under their own licences,
listed in this file. This file lists them. It does not grant, change or restrict any right
under those licences.

## Scope and method

- **No third-party source tree is vendored.** `generators/node_modules/` is not tracked
  (`helix-deps.yaml` records this) and the repository has no git submodules. Third-party
  packages are installed on demand from `generators/package.json`, pinned by
  `generators/package-lock.json`.
- **Licence names below are the `license` field recorded for each package in
  `generators/package-lock.json`** (npm registry metadata at lock time). They were NOT
  re-verified against each package's licence file, and an SPDX expression in registry
  metadata is not legal review. Where this repository could not establish a licence, the row
  says UNKNOWN.
- **Tracked content that derives from third-party sources** is listed in its own section
  below, with the statement each file makes about itself.

## Direct dependencies (`generators/package.json`)

| Package | Locked version | Kind | Licence (registry metadata) |
|---|---|---|---|
| `@adobe/leonardo-contrast-colors` | `1.1.0` | optional | Apache-2.0 |
| `@iconify/json` | `2.2.510` | runtime | MIT |
| `@material/material-color-utilities` | `0.3.0` | runtime | Apache-2.0 |
| `@phosphor-icons/core` | `2.1.1` | runtime | MIT |
| `@svgdotjs/svg.js` | `3.2.8` | runtime | MIT |
| `@tabler/icons` | `3.46.0` | runtime | MIT |
| `chroma-js` | `3.2.0` | runtime | (BSD-3-Clause AND Apache-2.0) |
| `colorjs.io` | `0.5.2` | runtime | MIT |
| `culori` | `4.0.2` | runtime | MIT |
| `lucide` | `1.30.0` | runtime | ISC |
| `motion` | `13.0.0` | runtime | MIT |
| `open-props` | `1.7.23` | runtime | MIT |
| `pagedjs` | `0.4.3` | runtime | MIT |
| `style-dictionary` | `4.4.0` | runtime | Apache-2.0 |
| `svgdom` | `0.1.19` | runtime | MIT |
| `utopia-core` | `1.6.0` | runtime | ISC |

`@adobe/leonardo-contrast-colors` is the open-source library, not the paid Adobe product.

## Transitive dependencies in `generators/package-lock.json`

The lockfile records 226 packages besides the project itself (8 marked optional). Counted by
the licence field recorded in the lockfile:

| Licence (registry metadata) | Packages |
|---|---:|
| MIT | 155 |
| Apache-2.0 | 30 |
| ISC | 23 |
| BlueOak-1.0.0 | 5 |
| BSD-3-Clause | 4 |
| BSD-2-Clause | 3 |
| Limited W3 License | 1 |
| (BSD-3-Clause AND Apache-2.0) | 1 |
| AGPL v3 | 1 |
| Public Domain | 1 |
| CC0-1.0 | 1 |
| 0BSD | 1 |

The complete per-package list (name, version, licence) is the lockfile itself; it is not
duplicated here so it cannot drift from it. Re-derive the count above with:

```bash
python3 -c "import json,collections as c;d=json.load(open('generators/package-lock.json'));print(c.Counter(v.get('license','UNKNOWN') for k,v in d['packages'].items() if k))"
```

### Packages that need a human decision

These are recorded as found. This file does not decide them.

| Package | Locked version | Licence (registry metadata) | Why it is listed |
|---|---|---|---|
| `colorparsley` | `0.1.8` | AGPL v3 | Optional, reached only through `@adobe/leonardo-contrast-colors` -> `apca-w3` -> `colorparsley`. A copyleft licence on an installable optional package; `generators/package.json` states that copyleft items are kept out. Not copied into this repository. Whether it is installed in a given environment was not measured. |
| `apca-w3` | `0.1.9` | Limited W3 License | Optional, reached through `@adobe/leonardo-contrast-colors`. `qa/lib/apca.mjs` describes the same package as "W3C-CG / MIT"; the two statements disagree and this repository did not resolve which governs. UNKNOWN. |
| `@iconify/json` | `2.2.510` | MIT (wrapper) | The package bundles many icon sets, each under its own licence (the package.json note says so). Per-set licences were NOT enumerated here. UNKNOWN per set. |
| `chroma-js` | `3.2.0` | (BSD-3-Clause AND Apache-2.0) | Compound expression as recorded. |
| `jsonify` | `0.0.1` | Public Domain | Not an SPDX identifier as recorded. |

## Tracked content derived from third-party sources

| Path | What it derives from | What the file itself states | Status |
|---|---|---|---|
| `qa/lib/apca.mjs` | APCA-W3 0.1.9 (Myndex/apca-w3), the SA98G constant block and contrast functions | Says it implements the published algorithm; constants are facts, not copyrightable expression; no prose is vendored; calls the upstream "W3C-CG / MIT" | Licence of the upstream constants UNKNOWN (see `apca-w3` above) |
| `qa/lib/deltae.mjs` | CIEDE2000 (Sharma, Wu and Dalal 2005), CIE Lab, OKLab (Bjorn Ottosson 2020) | Says it implements published formulas; no prose is vendored | Formulas; no licence asserted by this repository |
| `generators/lib/vendor-color.mjs` | Re-exports `@material/material-color-utilities` (Apache-2.0) and `colorjs.io` (MIT); references `apca-w3` | A barrel file; contains no third-party source | Governed by the dependency rows above |
| `knowledge/a11y-wcag22.md`, `knowledge/platforms/web.md` | W3C WCAG 2.2 | Distilled checklist, not normative text; W3C Document License | As stated by the file |
| `knowledge/aria-apg.md` | W3C WAI-ARIA Authoring Practices Guide | Distilled keyboard and ARIA models | As stated by the file |
| `knowledge/dtcg-tokens.md` | Design Tokens Community Group format | Distilled | As stated by the file |
| `knowledge/material3.md`, `knowledge/platforms/android-material3.md`, `knowledge/color.md`, `knowledge/motion.md`, `knowledge/typography.md` | Material Design 3 and other open sources named in each header | Header states Apache-2.0 / CC-BY-4.0 for Material Design 3; CC-BY-SA for MDN; MIT for Radix Colors, Open Color and easings.net | As stated by each file; attribution is the file headers |
| `knowledge/layout.md`, `knowledge/platforms/web.md`, `knowledge/platforms/linux-desktop.md` | MDN (CC-BY-SA), Every Layout (paid, concepts only), GNOME HIG (CC-BY-SA, reference only) | Paraphrased rules only | As stated by each file |
| `knowledge/platforms/apple.md`, `knowledge/platforms/windows-fluent.md` | Apple Human Interface Guidelines; Microsoft Fluent 2 | Header says copyrighted, free to read, paraphrased into checklists and never copied | As stated by the file; not re-verified here that no prose was copied |
| `knowledge/platforms/cross-platform.md`, `knowledge/platforms/specialized.md` | Flutter, React Native, .NET MAUI documentation; cited game-UI and XR sources | Cite source URLs; no licence statement | UNKNOWN |

The "what the file itself states" column quotes this repository's own claims. This file did
not audit whether those claims hold line by line.
