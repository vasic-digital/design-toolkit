#!/usr/bin/env node
// =============================================================================
// check-chromatic-range.mjs — the ANTI-MONOTONE gate (Helix §1.1, §11.4.6).
//
// WHY THIS EXISTS. The `--od-*` contract that dtcg-to-od.mjs emits was, until
// this gate was written, free to collapse to ONE accent hue plus neutrals and
// still pass every other check: T1 counts token NAMES, T2 asks the CSSOM whether
// they resolve, T3 asks whether the generator is a pure function, T4 asks about
// CONTRAST (which a two-colour sepia scheme passes trivially — grey on grey
// clears 4.5:1 all day), and T5 asks whether two SEEDS differ from each other.
// Not one of them asks whether a SINGLE seed's palette is interesting. The
// measured consequence, recorded before the fix with this gate's own --report:
// BOTH shipped candidates occupied the IDENTICAL 3 of 12 hue bins
// [0-30 30-60 120-150] over a 120deg span, in BOTH themes. Every other gate was
// green. Two brands that are supposed to be measurably different were shipping
// the same three-family colour structure.
//
// So this gate measures the ONE property none of the others do: does a single
// seed's emitted palette span a real chromatic range, or is it a sepia duotone?
//
// WHAT IS MEASURED — per theme (light = :root, dark = :root + the dark override
// block, composed exactly as the cascade would), over the RESOLVED values of
// every `--od-*` token that is a colour (var()-into-ramp chains resolved; rgba()
// literals parsed; non-colour tokens ignored):
//
//   chromaticShare   fraction of colour tokens with OKLCH chroma >= CHROMA_MIN.
//                    A neutral is not a defect — surfaces and text MUST be
//                    near-neutral to be readable. The floor is on the share, so
//                    a palette may be mostly neutral but not ENTIRELY.
//   hueBins          count of 30-degree OKLCH hue bins occupied by the chromatic
//                    tokens, with singleton bins (one lonely token) counted. A
//                    duotone occupies 1-2 bins however many tokens it has.
//   hueSpread        the largest angular gap between adjacent occupied bins,
//                    subtracted from 360 — i.e. how much of the hue circle the
//                    palette actually reaches around. A palette of five hues all
//                    inside 40 degrees scores high on hueBins-by-tokens and low
//                    here, which is the sepia failure mode exactly.
//   meanChroma       mean OKLCH chroma over the CHROMATIC tokens only. Averaging
//                    in the neutrals would make the metric a function of how many
//                    surface tokens the contract happens to have, not of colour.
//   meanSaturationHsl  mean HSL saturation over ALL colour tokens. Reported ONLY
//                    for comparability with the hand measurement that opened this
//                    work; it is NOT gated, because HSL saturation is not
//                    perceptually uniform and a floor on it would reward
//                    fluorescent junk over a well-built palette.
//   warm/cool/neutral shares, by the same hue convention that hand measurement
//                    used (warm = OKLCH hue [0,105) u [330,360), cool = the rest),
//                    reported and not gated for the same reason: "more cool" is
//                    not a design goal, "not stuck in one family" is.
//
// FLOORS. Every one is set from a 36-seed x 2-theme SWEEP of the generator, not
// from a round number, and every one is stated with the margin it actually has.
// The sweep's minima, measured after the derivation fix:
//
//     min hueBins 4    min hueSpread 150    min chromaticShare 0.211
//     min meanChroma 0.0772           (36 seeds, both themes, 72 observations)
//
// The pre-fix state, measured on the two shipped candidates, was hueBins 3 and
// hueSpread 120 in BOTH themes of BOTH brands. A floor is only useful if it sits
// strictly between those two populations:
//
//   MIN_HUE_BINS 4       pre-fix 3, post-fix min 4. Bin counts are integers, so
//                        there is no gap to sit in and 4 is exactly right: it
//                        rejects the pre-fix palette and accepts every seed
//                        measured. This is the primary anti-monotone assertion.
//   MIN_HUE_SPREAD 135   pre-fix 120, post-fix min 150. Spreads are quantised to
//                        multiples of 30 by the bin grid, so 135 sits INSIDE the
//                        quantisation gap: it rejects 120 and carries 15deg of
//                        margin below the tightest real emit. A floor of 150
//                        would have had ZERO margin and would have been a floor
//                        fitted to the answer.
//   MIN_CHROMATIC_SHARE 0.15   post-fix min 0.211 (a Monochrome-variant seed,
//                        which is a LEGITIMATE brand: its accent is greyscale by
//                        design). This floor is deliberately weak and is NOT the
//                        anti-monotone lever — hueBins and hueSpread are. Its
//                        only job is to catch a total colour collapse, where a
//                        candidate emits no chromatic token at all.
//   MIN_MEAN_CHROMA 0.045      post-fix min 0.0772. Also a tripwire rather than a
//                        mandate: a palette whose chromatic tokens average below
//                        0.045 is pastel to the point of being neutral in use.
//                        Set low on purpose; this gate must never reward
//                        saturation for its own sake.
//
// HONEST BOUNDARY (§11.4.6). This gate measures the TOKEN SET, not a rendered
// page. A page that defines twelve hues and paints with two would pass it. What
// it can prove is that the derivation still OFFERS a range; what it cannot prove
// is that a consumer uses one. No claim is made about the latter.
//
// THREE-VALUED EXIT (a 2 is NEVER a pass):
//   0 = every gated metric clears its floor, in both themes
//   1 = a real finding: a theme's palette is below a floor (monotone regression)
//   2 = COULD NOT DETERMINE: the candidate parsed to zero colour tokens, or the
//       colour library is not installed. Nothing was measured.
// Precedence: FAIL (1) outranks UNDETERMINED (2).
//
// Usage:
//   node check-chromatic-range.mjs --candidate ../proposed/vasic-digital.od-tokens.css
//   node check-chromatic-range.mjs --candidate <css> --report   (measure, never fail)
// Paired mutation proof (§1.1): qa/prove-chromatic-range.sh
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

// ---- gate floors (see the block comment for the measurement behind each) ----
const CHROMA_MIN = 0.03;          // OKLCH chroma at/above which a token is "chromatic"
const MIN_CHROMATIC_SHARE = 0.15;
const MIN_HUE_BINS = 4;           // of 12 thirty-degree bins
const MIN_HUE_SPREAD = 135;       // degrees of hue circle actually reached
const MIN_MEAN_CHROMA = 0.045;

// ---- CLI -------------------------------------------------------------------
function parseArgs(argv) {
  const a = { candidate: undefined, report: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--candidate") a.candidate = argv[++i];
    else if (t === "--report") a.report = true;
    else if (t === "--json") a.json = true;
    else if (t === "--help" || t === "-h") {
      process.stdout.write(
        "Usage: node check-chromatic-range.mjs --candidate <css> [--report] [--json]\n" +
        "  --report  measure and print, but always exit 0 unless nothing could be measured\n"
      );
      process.exit(0);
    }
  }
  return a;
}
const args = parseArgs(process.argv);
const log = (s) => process.stderr.write(s + "\n");

function undetermined(reason, extra = {}) {
  const v = { feature_class: "design_token_chromatic_range", candidate: args.candidate, overall: "UNDETERMINED", exitCode: 2, reason, ...extra };
  process.stdout.write(JSON.stringify(v, null, 2) + "\n");
  log(`chromatic-range: COULD NOT DETERMINE — ${reason}`);
  log("  This is NOT a pass and NOT a finding about the candidate.");
  process.exit(2);
}

if (!args.candidate) { process.stderr.write("error: --candidate <css> is required\n"); process.exit(2); }
const candidatePath = resolve(process.cwd(), args.candidate);
if (!existsSync(candidatePath)) undetermined(`candidate not found: ${candidatePath}`);
const css = readFileSync(candidatePath, "utf8");

let Color;
// qa/ has no node_modules of its own; the pinned colour deps live in
// generators/ and are reached through the vendor barrel (see its header).
try { ({ Color } = await import("../generators/lib/vendor-color.mjs")); }
catch (e) { undetermined(`colorjs.io not importable via generators/lib/vendor-color.mjs (run npm install in generators/): ${e.message}`); }

// ---- CSS parsing (same comment-aware approach as check-tokens.mjs) ----------
// Strip C-style comments so a commented-out (i.e. NON-active) declaration is
// never measured as if it were live.
//
// The second replace is not decoration and was added because the paired proof
// caught its absence (M4d). A `/*` with NO closing `*/` makes a browser discard
// everything to the end of the stylesheet, so those declarations are dead — but
// a balanced-pair regex alone leaves them in the string, and the gate then
// reported hue measurements about tokens no browser would ever apply. It failed
// such a file as MONOTONE (rc 1) when the honest answer is "this file has no
// active colour to measure" (rc 2). Accusing a candidate on the strength of dead
// text is exactly the bluff §11.4.6 forbids.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\*[\s\S]*$/, "");
function blockDeclarations(source, selectorRe) {
  const active = stripComments(source);
  const m = active.match(selectorRe);
  if (!m) return new Map();
  const start = active.indexOf("{", m.index);
  if (start < 0) return new Map();
  let depth = 0, end = -1;
  for (let i = start; i < active.length; i++) {
    if (active[i] === "{") depth++;
    else if (active[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return new Map();
  const map = new Map();
  const re = /(--od-[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let d;
  while ((d = re.exec(active.slice(start + 1, end))) !== null) map.set(d[1], d[2].trim());
  return map;
}
function resolveValue(map, name, seen = new Set()) {
  if (seen.has(name)) return undefined;
  seen.add(name);
  const raw = map.get(name);
  if (raw == null) return undefined;
  const v = raw.match(/^var\(\s*(--od-[a-z0-9-]+)\s*\)$/);
  return v ? resolveValue(map, v[1], seen) : raw;
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGBA_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/;
/** A token value -> a colorjs Color, or null when the value is not a colour. */
function asColor(v) {
  if (!v) return null;
  if (HEX_RE.test(v)) { try { return new Color(v); } catch { return null; } }
  const m = RGBA_RE.exec(v);
  if (m) { try { return new Color("srgb", [+m[1] / 255, +m[2] / 255, +m[3] / 255]); } catch { return null; } }
  return null;
}

const norm360 = (h) => (Number.isNaN(h) ? NaN : ((h % 360) + 360) % 360);

/** Measure one composed theme map. Pure. */
function measure(map, mode) {
  const tokens = [];
  for (const name of map.keys()) {
    const c = asColor(resolveValue(map, name));
    if (!c) continue;
    const [l, chroma, hRaw] = c.to("oklch").coords;
    const h = norm360(hRaw);
    const chromatic = chroma >= CHROMA_MIN && Number.isFinite(h);
    const s = c.to("hsl").coords[1] / 100;
    tokens.push({ name, hex: c.to("srgb").toString({ format: "hex" }), l, chroma, hue: h, chromatic, sat: Number.isNaN(s) ? 0 : s });
  }
  if (tokens.length === 0) return null;

  const chromaticTokens = tokens.filter((t) => t.chromatic);
  const bins = new Set(chromaticTokens.map((t) => Math.floor(t.hue / 30) % 12));
  const binList = [...bins].sort((a, b) => a - b);

  // hueSpread: 360 minus the largest gap between adjacent occupied bin CENTRES.
  // One bin => spread 0. Two opposite bins => 180. Even coverage => near 360.
  let hueSpread = 0;
  if (binList.length >= 2) {
    const centres = binList.map((b) => b * 30 + 15);
    let maxGap = 0;
    for (let i = 0; i < centres.length; i++) {
      const next = centres[(i + 1) % centres.length];
      const gap = norm360(next - centres[i]) || 360;
      if (gap > maxGap) maxGap = gap;
    }
    hueSpread = Math.round((360 - maxGap) * 100) / 100;
  }

  const isWarm = (h) => (h >= 0 && h < 105) || (h >= 330 && h < 360);
  const warm = chromaticTokens.filter((t) => isWarm(t.hue)).length;
  const cool = chromaticTokens.length - warm;
  const neutral = tokens.length - chromaticTokens.length;
  const r2 = (n) => Math.round(n * 10000) / 10000;
  const pct = (n) => Math.round((n / tokens.length) * 1000) / 10;

  return {
    mode,
    colourTokens: tokens.length,
    chromaticTokens: chromaticTokens.length,
    chromaticShare: r2(chromaticTokens.length / tokens.length),
    hueBins: binList.length,
    hueBinsOccupied: binList.map((b) => `${b * 30}-${b * 30 + 30}`),
    hueSpread,
    meanChroma: chromaticTokens.length ? r2(chromaticTokens.reduce((s, t) => s + t.chroma, 0) / chromaticTokens.length) : 0,
    meanSaturationHsl: r2(tokens.reduce((s, t) => s + t.sat, 0) / tokens.length),
    sharePct: { neutral: pct(neutral), warm: pct(warm), cool: pct(cool) },
    tokens,
  };
}

// ---- compose the two themes exactly as the cascade would -------------------
const light = blockDeclarations(css, /:root(?![\w[])/);
const darkOverrides = blockDeclarations(css, /:root\[data-theme="dark"\]/);
const dark = new Map(light);
for (const [k, v] of darkOverrides) dark.set(k, v);
if (light.size === 0) undetermined("the candidate defines no --od-* declarations in an active :root block");

const results = [measure(light, "light"), measure(dark, "dark")].filter(Boolean);
if (results.length === 0) undetermined("the candidate's :root blocks contain zero parseable colour values");

// ---- verdict ---------------------------------------------------------------
const METRICS = [
  { key: "chromaticShare", floor: MIN_CHROMATIC_SHARE, label: `chromatic share (OKLCH C>=${CHROMA_MIN})` },
  { key: "hueBins", floor: MIN_HUE_BINS, label: "occupied 30deg hue bins (of 12)" },
  { key: "hueSpread", floor: MIN_HUE_SPREAD, label: "hue-circle span reached (deg)" },
  { key: "meanChroma", floor: MIN_MEAN_CHROMA, label: "mean OKLCH chroma of chromatic tokens" },
];
const rows = [];
for (const r of results) {
  for (const m of METRICS) {
    rows.push({ mode: r.mode, metric: m.key, label: m.label, value: r[m.key], floor: m.floor, pass: r[m.key] >= m.floor });
  }
}
const fails = rows.filter((r) => !r.pass);
const pass = fails.length === 0;
const exitCode = args.report ? 0 : pass ? 0 : 1;

const verdict = {
  feature_class: "design_token_chromatic_range",
  candidate: basename(candidatePath),
  mode: args.report ? "report (never fails)" : "gate",
  overall: pass ? "PASS" : "FAIL",
  exitCode,
  floors: { CHROMA_MIN, MIN_CHROMATIC_SHARE, MIN_HUE_BINS, MIN_HUE_SPREAD, MIN_MEAN_CHROMA },
  rows,
  themes: results.map((r) => ({ ...r, tokens: args.json ? r.tokens : undefined })),
};
process.stdout.write(JSON.stringify(verdict, null, 2) + "\n");

for (const r of results) {
  log(`${r.mode.padEnd(5)}  tokens ${String(r.colourTokens).padStart(3)}  chromatic ${r.chromaticTokens} (${(r.chromaticShare * 100).toFixed(1)}%)  ` +
      `hueBins ${r.hueBins}/12 [${r.hueBinsOccupied.join(" ")}]  spread ${r.hueSpread}deg  ` +
      `meanC ${r.meanChroma}  meanSatHSL ${r.meanSaturationHsl}  ` +
      `neutral/warm/cool ${r.sharePct.neutral}%/${r.sharePct.warm}%/${r.sharePct.cool}%`);
}
for (const r of rows) log(`   - ${r.pass ? "PASS" : "FAIL"} ${r.mode} ${r.label} = ${r.value} (>=${r.floor})`);
log(`\nchromatic-range: ${pass ? "PASS" : "FAIL"} (exit ${exitCode}${args.report && !pass ? "; --report suppresses the 1" : ""})`);
process.exit(exitCode);
