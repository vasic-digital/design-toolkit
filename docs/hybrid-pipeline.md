# Hybrid OpenDesign direction-generator pipeline — operator guide

**Scope.** How to run the two-stage generator that turns an aesthetic *direction*
(mood / adjectives / seed, optionally anchored to a brand hue) into the sites'
`--od-*` CSS token contract, deterministically, and stage it for review.

**Status of this doc.** Operator guide for the tooling under
`design-toolkit/generators/` and `_tools/od/`. Every command below was run against
the real scripts and cross-checked flag-by-flag (see "Verified against the real
scripts" at the end). This doc changes no source.

**Governing mandates.** §11.4.162 (OpenDesign is the UI-design-system / single
source of truth), §11.4.216 (the canonical machine-readable token source is ONE
generated CSS custom-property file — not hand-authored), §11.4.6 (anti-bluff /
no-guessing), and §11.4.50 (Deterministic Consistency — identical input ⇒
byte-identical output).

> **Anchor accuracy note (§11.4.6).** The determinism anchor is **§11.4.50**
> ("Deterministic Consistency Mandate") in the checked-out
> `submodules/constitution/Constitution.md`. Some in-repo docs (e.g.
> `_tests/helixqa/v171-hardcoding-testbank.md`) cite "§11.4.65 render
> determinism"; in that same constitution **§11.4.65 is actually the "Universal
> Markdown export mandate"**. This guide uses §11.4.50 for determinism to avoid
> repeating the mis-citation. The determinism *behavior* is real and verified
> either way.

---

## 1. Concept

OpenDesign supplies the aesthetic **direction**; the generator expands that
direction into concrete, accessible tokens; a pure converter maps those tokens to
the sites' contract. **Content stays real and data-driven — only the design tokens
are (re)generated.**

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ (optional) OpenDesign daemon — supplies DIRECTION                          │
 │   mood / adjectives / seed  (± a brand-anchored hue)                       │
 │   _tools/od/start-daemon.sh  +  _tools/od/od-mcp-call.mjs od_generate_...  │
 └───────────────┬───────────────────────────────────────────────────────────┘
                 │  a direction (adjectives + a seed string)
                 ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 1  gen-tokens.mjs   (parametric-uniqueness engine)                   │
 │   seed + adjectives + generator-version  →  design-DNA vector             │
 │   → DTCG design-token document (JSON, M3 roles light+dark, fluid scales)  │
 │   deterministic: no Date, no Math.random (seeded PRNG)                    │
 └───────────────┬───────────────────────────────────────────────────────────┘
                 │  DTCG JSON (stdout)   +   resolved vector (stderr, for audit)
                 ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ STAGE 2  dtcg-to-od.mjs   (the NEW bridge, §11.4.162)                      │
 │   DTCG JSON  →  the sites' `--od-*` CSS contract                          │
 │   pure function of the JSON: no Date, no random, no network              │
 │   M3 role → --od-* mapping + HCT accent ramp; synthesized constants       │
 └───────────────┬───────────────────────────────────────────────────────────┘
                 │  <name>.od-tokens.css
                 ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ design-toolkit/proposed/<name>.od-tokens.css   — STAGED CANDIDATE         │
 │   NOT wired into either live site. Review, then (future) apply.           │
 └───────────────────────────────────────────────────────────────────────────┘

 LIVE (today, hand-authored bespoke restyles — NOT yet generator output):
   design-system/brand-vasic-digital/vasic-digital.css   ("MACHINA", hue locked)
   design-system/brand-milosvasic/milosvasic.css
```

Why two stages: Stage 1 owns *taste made reproducible* (a seed + adjectives
resolve to a full Material-3 palette, fluid type/space, radius, motion — all
contrast-checked). Stage 2 owns *the site contract* (the ~75-name `--od-*`
superset both sites consume). Keeping them separate means the DTCG document stays
a portable, tool-neutral artifact and the CSS mapping is a small, auditable pure
function.

---

## 2. End-to-end runbook

All paths are relative to the repo root `/Volumes/T7/Projects/vasic` unless noted.
Stages 1 and 2 need only Node ≥ 20 and `npm install` in
`design-toolkit/generators/`. The OpenDesign daemon (step A) is **optional** — it
is only needed if you want OpenDesign to *propose* a fresh direction; the seed +
adjectives can also be chosen by hand.

### A. (optional) Start the OpenDesign daemon and get a direction

The daemon must run under the app's **bundled Electron runtime** — its native
`better-sqlite3` is built for that ABI, not system Node.

```sh
# starts http://127.0.0.1:4321 (override with OD_PORT); run it in the background
bash _tools/od/start-daemon.sh
```

Drive a tool through the minimal MCP stdio client. `od_generate_design` needs a
BYOK provider in the environment (`source ~/api_keys.sh` first):

```sh
export OD_DAEMON_URL=http://127.0.0.1:4321
node _tools/od/od-mcp-call.mjs <toolName> '<argsJSON>'

# or the reproducible wrapper (§11.4.77) that fills BYOK_* + strips code fences:
#   generate.sh <promptFile> <outFile> [kind] [maxTokens]
bash _tools/od/generate.sh prompt.txt out.txt other 16000
```

Use OpenDesign's output only to *choose the direction* — a set of adjectives and a
seed. **Do not ship its page output** (see §3). Typical directions already in use:

| Candidate | seed | adjectives (direction) |
|---|---|---|
| `vasic-digital` | `vasic-digital` | `industrial, editorial, precise` (MACHINA) |
| `milosvasic`    | `milosvasic`    | `terminal, brutalist, mono` |

### B. Generate the tokens and map them to the `--od-*` contract

The real one-liner (Stage 1 → Stage 2, in one pipe):

```sh
cd design-toolkit/generators
node gen-tokens.mjs --seed vasic-digital --adjectives "industrial,editorial,precise" --stdout \
  | node dtcg-to-od.mjs --stdin --out ../proposed/vasic-digital.od-tokens.css
```

```sh
node gen-tokens.mjs --seed milosvasic --adjectives "terminal,brutalist,mono" --stdout \
  | node dtcg-to-od.mjs --stdin --out ../proposed/milosvasic.od-tokens.css
```

- Stage 1 writes the DTCG JSON to **stdout**; the resolved design-DNA vector goes
  to **stderr** (so a pipe stays pure JSON), e.g.
  `seed="vasic-digital" -> variant=Fidelity hue=63 harmony=mono typeRatio=1.5 …`.
- Stage 2 writes the `--od-*` CSS to the file named by `--out` (and its own
  "wrote …" line to stderr).

Inspect a candidate on stdout instead of writing a file:

```sh
node gen-tokens.mjs --seed helix --adjectives "modern,minimal" --stdout \
  | node dtcg-to-od.mjs --stdin --stdout | head -40
```

### C. Review the candidate

The candidate lands in `design-toolkit/proposed/<name>.od-tokens.css`. Each file
starts with a **provenance header comment** echoing the seed, adjectives, the full
design-DNA vector, the generator version, and the M3-role → `--od-*` mapping —
read that first.

Render it to see it. The preview harness builds a component gallery and shoots it
in light + dark via Chromium:

```sh
# builds design-system/preview/{milosvasic,vasic-digital}.html (links the LIVE brand css)
node _tools/od/build-preview.mjs
# screenshot any preview HTML to <name>-{light,dark}.png (viewport 1280×2400, full page)
NODE_PATH=_tests/node_modules node _tools/od/shoot.cjs \
  '[{"file":"'"$PWD"'/design-system/preview/vasic-digital.html","out":"'"$PWD"'/design-system/preview/vasic-digital-THEME.png"}]'
```

> **Honest gap (§11.4.6).** `build-preview.mjs` links the **live**
> `design-system/brand-*/*.css`, not `proposed/*.od-tokens.css`, and there is no
> committed `CANDIDATE-*.png` preview step. To eyeball a *candidate*, point a copy
> of a preview HTML's `<link rel="stylesheet">` at the `proposed/*.od-tokens.css`
> file and run `shoot.cjs` on that copy. Wiring a candidate-preview target is a
> future task.

Run the QA token bank against the candidate's DTCG source (see §4).

### D. (future) Apply to live

Not yet automated. Today the live `design-system/brand-*/*.css` are hand-authored
bespoke restyles; promoting a `proposed/*.od-tokens.css` candidate to live is a
deliberate, separately-gated step (must pass §11.4.170 rendered-pixel proof and
the QA bank in both themes). Until then, `proposed/` is review-only.

---

## 3. Determinism & anti-hardcoding

**Same seed ⇒ byte-identical output (§11.4.50).** Neither stage calls `Date`,
`Math.random`, or the network. Stage 1 draws every choice from a seeded PRNG
(`lib/prng.mjs`), and the generator version is part of the contract
(`GENERATOR_VERSION`, currently `1.0.0`). Stage 2 is a pure function of the DTCG
JSON. Verified: running the same command twice is `diff`-clean, and it reproduces
the committed `proposed/vasic-digital.od-tokens.css` byte-for-byte.

**Only tokens are shipped — never OpenDesign's page output.** OpenDesign's raw
generated *pages* are unsafe to ship: they invent facts and hardcode values. This
is exactly the class of defect the **v1.7.1 hardcoded-content elimination** work
(#67) pinned down and now guards against —

- hardcoded `© 2026` footers baked into content JSON (must be a generated year),
- English marketing copy leaking into localized surfaces,
- invented metrics and transliterated brand names.

The gate `_tools/audit-hardcoding.sh` builds with a **2099 sentinel year** and
greps the output; any surviving literal year fails the build. The rule the
pipeline honors: **OpenDesign supplies the aesthetic direction; the generator
supplies the values; content stays real and data-driven.** The only thing that
crosses from OpenDesign into the sites is design *tokens*, produced by a
deterministic generator — not prose, not numbers, not years.

---

## 4. Verification gates

### 4.1 HelixQA design-token bank — `design-toolkit/qa/`

Validate a token set for DTCG validity (D1), WCAG contrast in both modes (D2), and
cross-seed uniqueness variance (D7). Exit 0 = all PASS.

```sh
cd design-toolkit/generators
node gen-tokens.mjs --seed vasic-digital --adjectives "industrial,editorial,precise" --out tokens.json
node ../qa/run-checks.mjs \
  --tokens tokens.json \
  --seeds "vasic-digital,milosvasic,helix" \
  --hue-threshold 15
```

`run-checks.mjs` accepts (all optional):
`--tokens <file>`, `--seeds a,b,c`, `--hue-threshold`, `--de00-threshold`,
`--cam16-threshold`, `--dna-threshold`, `--type-threshold`, `--platforms web,android,ios,visionos`.
Machine-readable verdict JSON → stdout; human summary → stderr. The full
dimension/threshold spec (D1–D7, evidence schema, golden-good/golden-bad
mutations, CI gates `CM-DESIGN-QA-PROOF` / `CM-DESIGN-UNIQUENESS`) is in
`design-toolkit/qa/design-qa-testbank.md`. `npm test` in `generators/` runs the
determinism + contrast + uniqueness assertions.

### 4.2 Browser-verify that tokens actually resolve (the "*/"-bug lesson)

A structural check is **not** proof the CSS applies. `dtcg-to-od.mjs` emits a
C-style header comment that interpolates the seed and adjectives. A literal `*/`
inside that text (e.g. a `brand-*/*.css` path, or an adjective containing `*/`)
would **terminate the comment early and silently drop the entire `:root` rule** —
every token would vanish and the page would fall back to unstyled defaults, while
a "the file was written" check still passes.

The fix is the `pc()` comment-sanitizer in `dtcg-to-od.mjs`: it replaces any `*/`
with `* /` before emitting comment lines, so the comment can never self-close. The
operator lesson: after generating, **confirm the rendered page actually picks up
the tokens** (the §11.4.170 rendered-pixel discipline), not merely that a file
exists. Quick sanity check that `:root` survived:

```sh
grep -c '^:root {' design-toolkit/proposed/vasic-digital.od-tokens.css   # expect 1
```

---

## 5. Extending — adding a site / brand direction

1. **Pick a direction.** Choose a seed string (usually the brand slug) and a set
   of adjectives. Adjectives are deterministic nudges to the design-DNA vector, not
   free text — the ones with wired effects (in `lib/tokens.mjs`) are:
   `modern`/`minimal` (Neutral variant, radius 8, ratio 1.25),
   `enterprise`/`trustworthy` (TonalSpot, radius 4),
   `playful` (Expressive, pill radius, livelier motion/depth),
   `editorial` (Fidelity, ratio 1.5),
   `technical`/`developer` (Monochrome, radius 0, high contrast, calm motion),
   plus font-pair matches (`warm`, `approachable`, …). Unrecognized adjectives are
   harmless (they're lowercased and ignored by the nudge table).
2. **Generate + stage** with the §2 one-liner, writing to
   `design-toolkit/proposed/<newbrand>.od-tokens.css`.
3. **Document it** in `design-toolkit/proposed/README.md` (seed + adjectives row).
4. **Gate it** through §4 (QA bank) and a rendered preview in both themes.

### Anchored-hue vs free-hue

- **Free-hue (default, what the generator does today).** The base hue is derived
  from the **seed hash** (`seedHue = rng.words[0] % 360`), not from a brand color.
  So `--seed vasic-digital` currently lands on a **gold/amber** accent (hue ≈ 63),
  deliberately *exploring a new direction* rather than re-skinning today's crimson.
  Different seeds provably diverge (the D7 uniqueness gate).
- **Anchored-hue (brand-locked).** To reproduce a specific brand hue you must pin
  it, because there is **no `--hue`/`--anchor` flag on `gen-tokens.mjs`** (verified
  — the only flags are `--seed`, `--out`, `--adjectives`, `--stdout`, `--help`).
  Options: (a) choose/search a seed whose hash-hue lands where you want; or (b)
  extend `deriveVector()` in `lib/tokens.mjs` to accept an explicit hue override
  (a source change, out of scope for this doc). The live `vasic-digital.css`
  ("MACHINA") is hand-locked to `#8f1d2d`, which is *why* it is not the current
  generator output.

---

## 6. Troubleshooting

**Daemon won't start / native-module ABI errors.**
`start-daemon.sh` deliberately runs the daemon through
`/Applications/Open Design.app` with `ELECTRON_RUN_AS_NODE=1` — the app's
`better-sqlite3` is compiled for the Electron runtime's ABI, **not** system Node.
Running the daemon CLI under plain `node` will fail to load the native module. If
the app isn't installed at that path the script exits with "Open Design app not
found". Port defaults to `4321` (`OD_PORT`); `OD_DAEMON_URL` must match.

**`od_generate_design` fails / auth or provider errors (BYOK).**
`od-mcp-call.mjs` forwards the environment to the MCP server; keys are expected to
already be exported (`source ~/api_keys.sh`). `generate.sh` sets BYOK defaults you
may need to override: `BYOK_PROVIDER=openai`, `BYOK_BASE_URL=https://api.mistral.ai/v1`,
`BYOK_API_KEY=$MISTRAL_API_KEY`, `BYOK_MODEL=codestral-latest` — note the provider
is labelled `openai` while the base URL points at Mistral (OpenAI-compatible
endpoint), a deliberate quirk. `OD_MCP_SERVER` defaults to
`/opt/homebrew/lib/node_modules/open-design-mcp/dist/src/server.js`; override it if
installed elsewhere. Long generations: bump `OD_TIMEOUT_MS` (client default
600000 ms; `generate.sh` uses 480000 ms).

**Generated `:root` is empty / page renders unstyled.**
Almost certainly the `*/`-in-comment bug (§4.2). Confirm you're on a
`dtcg-to-od.mjs` that has the `pc()` sanitizer, re-generate, and `grep -c '^:root'`
the output (expect `1`). Never trust "file written" as proof the tokens apply.

**`gen-tokens.mjs` printed nothing.**
`--seed` is required (exit code 2 without it). Output goes to `--out <file>`, or to
stdout when `--stdout` is passed **or** when stdout is not a TTY (i.e. piped) — so
the `| dtcg-to-od.mjs` pipe works even without `--stdout`, but pass `--stdout`
explicitly for clarity. The design-DNA vector always prints to stderr; that's
expected, not an error.

**`dtcg-to-od.mjs` errors on input.**
It requires exactly one input source (`--in <file>` **or** `--stdin`) and one sink
(`--out <file>` **or** `--stdout`); missing either exits 2. It throws
`input is not a gen-tokens DTCG document (missing color.light/color.dark)` if fed
anything other than a `gen-tokens.mjs` document.

---

## Verified against the real scripts

Every command above was run or the flag confirmed by reading the source:

- **`gen-tokens.mjs`** — flags `--seed` (required), `--out`, `--adjectives`
  (comma-split, trimmed), `--stdout`, `--help`/`-h`. Confirmed: no `--hue`/anchor
  flag; JSON → stdout (on `--stdout` or non-TTY), vector → stderr; deterministic
  provenance vector emitted.
- **`dtcg-to-od.mjs`** — flags `--in`, `--stdin`, `--out`, `--stdout`,
  `--help`/`-h`. Confirmed: pure (no Date/random/network), HCT `TonalPalette`
  accent ramp (700 == primary tone 40), the documented M3→`--od-*` mapping in the
  header, and the `pc()` `*/`→`* /` comment-sanitizer.
- **`_tools/od/start-daemon.sh`** — `ELECTRON_RUN_AS_NODE=1` via the app runtime,
  `OD_PORT` (default 4321), serves `127.0.0.1`.
- **`_tools/od/od-mcp-call.mjs`** — `node od-mcp-call.mjs <tool> <argsJSON>`;
  `OD_DAEMON_URL`, `OD_MCP_SERVER`, `OD_TIMEOUT_MS` (600000), BYOK_* for
  `od_generate_design`.
- **`_tools/od/generate.sh`** — `generate.sh <promptFile> <outFile> [kind] [maxTokens]`;
  BYOK defaults (openai/Mistral/codestral-latest), fence-stripping.
- **Determinism** — two identical runs `diff`-clean and reproduce the committed
  `proposed/vasic-digital.od-tokens.css` byte-for-byte; `grep -c '^:root {'` == 1.
- **`qa/run-checks.mjs`** — usage/flags confirmed via `--help`.
- **Constitution anchors** — verified in `submodules/constitution/Constitution.md`:
  §11.4.162 (OpenDesign UI design-system mandate), §11.4.216 (canonical
  machine-readable design-token source), §11.4.6 (anti-bluff), §11.4.50
  (Deterministic Consistency). §11.4.65 is the *Markdown export* mandate, **not**
  render determinism (see the note in the header).
