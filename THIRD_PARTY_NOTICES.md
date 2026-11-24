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

`@adobe/leonardo-contrast-colors` (with its `apca-w3` -> `colorparsley` chain) was **removed on 2026-11-24**; see "Removed dependencies" below.

## Transitive dependencies in `generators/package-lock.json`

The lockfile records 219 packages besides the project itself (1 marked optional). Counted by
the licence field recorded in the lockfile:

| Licence (registry metadata) | Packages |
|---|---:|
| MIT | 153 |
| Apache-2.0 | 29 |
| ISC | 23 |
| BlueOak-1.0.0 | 5 |
| BSD-3-Clause | 4 |
| BSD-2-Clause | 1 |
| (BSD-3-Clause AND Apache-2.0) | 1 |
| Public Domain | 1 |
| CC0-1.0 | 1 |
| 0BSD | 1 |

No package in the lockfile carries an AGPL/GPL/LGPL/SSPL or "Limited W3 License" value;
`generators/test/no-restricted-licences.test.mjs` fails if one returns.

The complete per-package list (name, version, licence) is the lockfile itself; it is not
duplicated here so it cannot drift from it. Re-derive the count above with:

```bash
python3 -c "import json,collections as c;d=json.load(open('generators/package-lock.json'));print(c.Counter(v.get('license','UNKNOWN') for k,v in d['packages'].items() if k))"
```

### Removed dependencies

| Package | Locked version | Licence (verified from the tarball, 2026-11-24) | Disposition |
|---|---|---|---|
| `@adobe/leonardo-contrast-colors` | `1.1.0` | Apache-2.0 | REMOVED. Declared as an optional dependency but imported nowhere in this repository (`evidence/EVIDENCE.md` already called it "optional, unused"). Its dependency chain reached `apca-w3` and `colorparsley`. npm installs optional dependencies by default, so `colorparsley` WAS installed by a plain `npm ci`. Operator decision 2026-11-24: remove the AGPL path. |
| `apca-w3` | `0.1.9` | `LICENSE.md` is a custom "W3 License for Compliant Code Only", not MIT: use is limited to web-content accessibility guidelines, prohibits other uses (medical, safety, aerospace, transportation, military), forbids modification of the essential code or constants except to port, obliges users to track the current version, restricts use of the APCA terms and logo, and states that files outside the W3 cooperative agreement are under "AGPU v3". `qa/lib/apca.mjs` called it "W3C-CG / MIT"; that was wrong. | REMOVED (transitive). The terms do not clearly permit reuse, so no APCA code or constants are kept; see `qa/lib/apca.mjs` below. |
| `colorparsley` | `0.1.8` | `package.json` says "AGPL v3" and `LICENSE.md` is the GNU AGPL v3 text. | REMOVED (transitive). No AGPL code is installed or reachable. |

### Packages checked for a human decision

| Package | Locked version | Real licence (from the published tarball, 2026-11-24) | Disposition |
|---|---|---|---|
| `chroma-js` | `3.2.0` | `package.json`: `(BSD-3-Clause AND Apache-2.0)`. `LICENSE` is the BSD-3-Clause text (Copyright 2011-2025 Gregor Aisch) plus an Apache-2.0 notice for the embedded ColorBrewer colours (Copyright 2002 Cynthia Brewer, Mark Harrower, Pennsylvania State University). | RESOLVED: both permissive, the compound expression is accurate. Declared in `package.json` but not imported by any tracked source file (measured by `grep` over `generators/` and `qa/`). Kept; removal is a separate decision. |
| `jsonify` | `0.0.1` | `package.json`: "Public Domain"; its README says "public domain" and describes Douglas Crockford's JSON implementation. It ships no `LICENSE` file. | RECORDED: a public-domain dedication stated in metadata and README only, no licence file, not an SPDX identifier. Not legal review. It is a transitive dependency (`style-dictionary` -> `patch-package` -> `json-stable-stringify` -> `jsonify`). Kept. |
| `@iconify/json` | `2.2.510` | The wrapper is MIT, but the package bundles 236 icon sets, each with its own licence in its `info.license.spdx`. See the table below. | RECORDED, NOT RESOLVED: the data carries non-permissive sets. The package is declared in `package.json` but no tracked source file imports it. Whether to drop it or restrict it to permissive sets is an operator decision (it is a shipped component, `CLAUDE.md` 11.4.122). Nothing from it is copied into this repository. |

`@iconify/json` 2.2.510, per-set licences counted from `json/*.json` in the tarball (`info.license.spdx`):

| Licence (SPDX as recorded by each set) | Sets | Sets named |
|---|---:|---|
| MIT | 106 | |
| CC-BY-4.0 | 53 | |
| Apache-2.0 | 30 | |
| OFL-1.1 | 13 | |
| CC0-1.0 | 10 | |
| CC-BY-SA-4.0 | 7 | `arcticons`, `entypo-social`, `emojione-v1`, `typcn`, and 3 more |
| ISC | 3 | `file-icons`, `lucide`, `lucide-lab` |
| GPL-2.0-or-later | 2 | `dashicons`, `wordpress` |
| CC-BY-SA-3.0 | 2 | `fontelico`, `brandico` |
| GPL-3.0-or-later | 2 | `et`, `icomoon-free` |
| BSD-3-Clause | 1 | `rivet-icons` |
| CC-BY-NC-SA-4.0 | 1 | `cbi` |
| GPL-3.0 | 1 | `gala` |
| MPL-2.0 | 1 | `circum` |
| GPL-2.0-only | 1 | `gridicons` |
| Unlicense | 1 | `system-uicons` |
| CC-BY-NC-4.0 | 1 | `ps` |
| CC-BY-3.0 | 1 | `game-icons` |

Any use of icon data from `@iconify/json` must check the specific set; the GPL, CC-BY-SA and
non-commercial (`cbi`, `ps`) sets in particular are not covered by the wrapper's MIT.

## Tracked content derived from third-party sources

| Path | What it derives from | What the file itself states | Status |
|---|---|---|---|
| `qa/lib/apca.mjs` | (deleted 2026-11-24) was a port of the APCA-W3 0.1.9 constants and functions | Removed because the `apca-w3` licence (see "Removed dependencies") does not clearly permit a port; the A1b screen in `qa/run-checks.mjs` now uses WCAG 2.x contrast ratios (colorjs.io, MIT) | None remains in this tree; it stays in git history |
| `qa/lib/deltae.mjs` | CIEDE2000 (Sharma, Wu and Dalal 2005), CIE Lab, OKLab (Bjorn Ottosson 2020) | Says it implements published formulas; no prose is vendored | Formulas; no licence asserted by this repository |
| `generators/lib/vendor-color.mjs` | Re-exports `@material/material-color-utilities` (Apache-2.0) and `colorjs.io` (MIT) | A barrel file; contains no third-party source | Governed by the dependency rows above |
| `knowledge/a11y-wcag22.md`, `knowledge/platforms/web.md` | W3C WCAG 2.2 | Distilled checklist, not normative text; W3C Document License | As stated by the file |
| `knowledge/aria-apg.md` | W3C WAI-ARIA Authoring Practices Guide | Distilled keyboard and ARIA models | As stated by the file |
| `knowledge/dtcg-tokens.md` | Design Tokens Community Group format | Distilled | As stated by the file |
| `knowledge/material3.md`, `knowledge/platforms/android-material3.md`, `knowledge/color.md`, `knowledge/motion.md`, `knowledge/typography.md` | Material Design 3 and other open sources named in each header | Header states Apache-2.0 / CC-BY-4.0 for Material Design 3; CC-BY-SA for MDN; MIT for Radix Colors, Open Color and easings.net | As stated by each file; attribution is the file headers |
| `knowledge/layout.md`, `knowledge/platforms/web.md`, `knowledge/platforms/linux-desktop.md` | MDN (CC-BY-SA), Every Layout (paid, concepts only), GNOME HIG (CC-BY-SA, reference only) | Paraphrased rules only | As stated by each file |
| `knowledge/platforms/apple.md`, `knowledge/platforms/windows-fluent.md` | Apple Human Interface Guidelines; Microsoft Fluent 2 | Header says copyrighted, free to read, paraphrased into checklists and never copied | As stated by the file; not re-verified here that no prose was copied |
| `knowledge/platforms/cross-platform.md`, `knowledge/platforms/specialized.md` | Flutter, React Native, .NET MAUI documentation; cited game-UI and XR sources | Cite source URLs; no licence statement | UNKNOWN |

The "what the file itself states" column quotes this repository's own claims. This file did
not audit whether those claims hold line by line.
