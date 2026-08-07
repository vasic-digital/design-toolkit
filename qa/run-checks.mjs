#!/usr/bin/env node
// Executable design-QA runner — the runnable slice of design-qa-testbank.md.
//
// Validates a generated token set with REAL assertions and real pass/fail.
// GATING checks (contribute to the overall verdict / exit code):
//   D1   DTCG structural validity      (dtcg-tokens.md)
//   D2   WCAG AA contrast gate         (color.md §4; text >=4.5:1, UI >=3:1, both modes)
//   D7   cross-seed uniqueness variance (distinct primary OKLCH hues beyond a threshold)
//   D8   cross-seed ΔE00 uniqueness     (U1: min pairwise CIEDE2000 on primaries >= 10)
//   U2   cross-seed CAM16-UCS ΔE′       (min pairwise CAM16-UCS ΔE′ on primaries >= 8)
//   U3   combined weighted DNA-distance (min pairwise D=sqrt(Σwᵢd̂ᵢ²) >= 0.25 AND color axis clears its ΔE00 floor)
//   U4   type-pair distance             (min pairwise display+body face-feature distance >= 0.3)
//   DET1 determinism                    (same seed twice -> byte-identical token + mark hash)
// ADVISORY checks (RUN + measured, but NEVER gate — reported for information):
//   A1b  APCA Lc                        (perceptual contrast; DRAFT/WCAG3, additional screen only)
//   U5   Poisson-disk capacity report   (remaining blue-noise capacity at r=D_min; a METRIC, not a gate)
//
// Perceptual uniqueness rationale: hue delta (D7) is a cheap screen; two seeds
// can share a hue while differing in tone/chroma or differ in hue while
// colliding perceptually. D8 (ΔE00) and U2 (CAM16-UCS ΔE′) measure the actual
// perceptual gap with two independent color-difference models. ΔE00/ΔE-OK are
// implemented dependency-free in qa/lib/deltae.mjs (validated vs colorjs.io);
// CAM16-UCS ΔE′ is computed in qa/lib/cam16.mjs via the pinned Google
// material-color-utilities Cam16 (Li et al. 2017); APCA Lc in qa/lib/apca.mjs
// is a faithful APCA-W3 0.1.9 implementation (cross-validated vs apca-w3).
// U3 (DNA-distance), U4 (type-pair) are now RUN + gating; U5 (capacity) is RUN
// but reported as a METRIC (never gates). Still SPEC (no runner yet): the
// AUDITOR-side platform / rendered a11y checks — see
// qa/uniqueness-and-platform-conformance.md.
//
// Usage:
//   node run-checks.mjs --tokens path/to/tokens.json \
//        --seeds "vasic-digital,milosvasic,helix" \
//        --hue-threshold 15 --de00-threshold 10 --cam16-threshold 8
//
// If --tokens is omitted, a set is generated in-memory from the first seed.
// Exit code 0 = all GATING checks PASS; non-zero = at least one gating FAIL.
// (A1b APCA is advisory and never changes the exit code.) Machine-readable JSON
// verdict goes to stdout; human summary to stderr.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { validateDtcg, extractSchemes } from "../generators/lib/dtcg.mjs";
import { evaluateScheme, SEMANTIC_PAIRS } from "../generators/lib/color.mjs";
import { oklchHue, hueDelta } from "../generators/lib/color.mjs";
import { generateTokens } from "../generators/lib/tokens.mjs";
import { generateMark } from "../generators/lib/marks.mjs";
import { deltaE00, deltaEOK } from "./lib/deltae.mjs";
import { deltaEPrimeCam16, deltaECam16 } from "./lib/cam16.mjs";
import { apcaLc } from "./lib/apca.mjs";
import { deriveVector } from "../generators/lib/tokens.mjs";
import { typePairDistance } from "./lib/typedna.mjs";
import { axisSubDistances, dnaDistance, DNA_WEIGHTS, COLOR_ANCHOR, poissonCapacityReport } from "./lib/dnadist.mjs";

function parseArgs(argv) {
  const args = {
    tokens: undefined,
    seeds: ["vasic-digital", "milosvasic", "helix"],
    hueThreshold: 15,
    de00Threshold: 10, // research U1 [E]: min pairwise ΔE00 on primaries
    cam16Threshold: 8, // research U2 [E]: min pairwise CAM16-UCS ΔE′ on primaries
    dnaThreshold: 0.25, // U3 [H]: min pairwise weighted DNA distance (Poisson r)
    typeThreshold: 0.3, // U4 [H]: min pairwise type-pair distance
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tokens") args.tokens = argv[++i];
    else if (a === "--seeds") args.seeds = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--hue-threshold") args.hueThreshold = parseFloat(argv[++i]);
    else if (a === "--de00-threshold") args.de00Threshold = parseFloat(argv[++i]);
    else if (a === "--cam16-threshold") args.cam16Threshold = parseFloat(argv[++i]);
    else if (a === "--dna-threshold") args.dnaThreshold = parseFloat(argv[++i]);
    else if (a === "--type-threshold") args.typeThreshold = parseFloat(argv[++i]);
    else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node run-checks.mjs [--tokens tokens.json] [--seeds a,b,c] [--hue-threshold 15] [--de00-threshold 10] [--cam16-threshold 8] [--dna-threshold 0.25] [--type-threshold 0.3]\n");
      process.exit(0);
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const log = (s) => process.stderr.write(s + "\n");

// --- Load the token document under test (D1/D2) ------------------------------
let doc;
let source;
if (args.tokens) {
  doc = JSON.parse(readFileSync(args.tokens, "utf8"));
  source = args.tokens;
} else {
  doc = generateTokens(args.seeds[0]).document;
  source = `generated:${args.seeds[0]}`;
}

const dimensions = [];

// --- D1: DTCG structural validity -------------------------------------------
const d1 = validateDtcg(doc);
dimensions.push({
  dimension: "D1-token-validity",
  verdict: d1.valid ? "PASS" : "FAIL",
  rationale: d1.valid
    ? `${d1.tokenCount} tokens are structurally valid DTCG`
    : `${d1.errors.length} structural error(s)`,
  measurements: { tokenCount: d1.tokenCount, errorCount: d1.errors.length },
  errors: d1.errors.slice(0, 20),
});
log(`D1 token-validity: ${d1.valid ? "PASS" : "FAIL"} (${d1.tokenCount} tokens, ${d1.errors.length} errors)`);
for (const e of d1.errors.slice(0, 10)) log(`   - ${e}`);

// --- D2: WCAG contrast gate (both modes) ------------------------------------
const schemes = extractSchemes(doc);
const contrastRows = [
  ...evaluateScheme(schemes.light, "light"),
  ...evaluateScheme(schemes.dark, "dark"),
];
const contrastFails = contrastRows.filter((r) => !r.pass);
const minText = Math.min(...contrastRows.filter((r) => r.kind === "text").map((r) => r.ratio));
const minAll = Math.min(...contrastRows.map((r) => r.ratio));
dimensions.push({
  dimension: "D2-contrast",
  verdict: contrastFails.length === 0 ? "PASS" : "FAIL",
  rationale: contrastFails.length === 0
    ? `all ${contrastRows.length} semantic pairs clear their WCAG threshold in both modes`
    : `${contrastFails.length} pair(s) below threshold`,
  measurements: { pairsChecked: contrastRows.length, minTextRatio: minText, minAnyRatio: minAll },
  failures: contrastFails.map((r) => ({ mode: r.mode, pair: `${r.fg}/${r.bg}`, ratio: r.ratio, threshold: r.threshold })),
});
log(`D2 contrast: ${contrastFails.length === 0 ? "PASS" : "FAIL"} ` +
    `(${contrastRows.length} pairs; min text ${minText}:1, min any ${minAll}:1)`);
for (const r of contrastFails) log(`   - FAIL ${r.mode} ${r.fg}/${r.bg} = ${r.ratio}:1 < ${r.threshold}:1`);

// --- D7: cross-seed uniqueness variance -------------------------------------
const hues = args.seeds.map((seed) => {
  const { schemes: s, vector } = generateTokens(seed);
  return { seed, primary: s.light.primary, hue: oklchHue(s.light.primary), variant: vector.mcuVariant };
});
let minHueDelta = Infinity;
const deltaPairs = [];
for (let i = 0; i < hues.length; i++) {
  for (let j = i + 1; j < hues.length; j++) {
    const d = hueDelta(hues[i].hue, hues[j].hue);
    deltaPairs.push({ a: hues[i].seed, b: hues[j].seed, delta: Math.round(d * 100) / 100 });
    if (d < minHueDelta) minHueDelta = d;
  }
}
const uniquePass = args.seeds.length >= 2 && minHueDelta >= args.hueThreshold;
dimensions.push({
  dimension: "D7-uniqueness",
  verdict: uniquePass ? "PASS" : "FAIL",
  rationale: uniquePass
    ? `${args.seeds.length} seeds produce primary hues separated by >= ${args.hueThreshold} deg (min ${Math.round(minHueDelta * 100) / 100} deg)`
    : `min primary-hue delta ${Math.round(minHueDelta * 100) / 100} deg < ${args.hueThreshold} deg threshold`,
  measurements: {
    seeds: hues.map((h) => ({ seed: h.seed, primary: h.primary, oklchHue: Math.round(h.hue * 100) / 100, variant: h.variant })),
    pairDeltas: deltaPairs,
    minHueDelta: Math.round(minHueDelta * 100) / 100,
    threshold: args.hueThreshold,
  },
});
log(`D7 uniqueness: ${uniquePass ? "PASS" : "FAIL"} (min primary-hue delta ${Math.round(minHueDelta * 100) / 100} deg over ${args.seeds.length} seeds)`);
for (const h of hues) log(`   - ${h.seed}: primary ${h.primary} oklchHue ${Math.round(h.hue * 100) / 100} deg (${h.variant})`);

// --- D8: cross-seed perceptual ΔE00 uniqueness ------------------------------
// The research's primary uniqueness invariant (U1 [E]): the min pairwise
// CIEDE2000 between project primaries must be >= threshold (default 10) so no
// two projects on the shared library collide perceptually. Checked in BOTH
// light and dark schemes; the reported min is the worse of the two modes.
// ΔE-OK is reported alongside as a companion metric (not gated).
const primaries = args.seeds.map((seed) => {
  const { schemes: s } = generateTokens(seed);
  return { seed, light: s.light.primary, dark: s.dark.primary };
});
const de00Pairs = [];
let minDe00 = Infinity;
for (let i = 0; i < primaries.length; i++) {
  for (let j = i + 1; j < primaries.length; j++) {
    const A = primaries[i], B = primaries[j];
    const dLight = deltaE00(A.light, B.light);
    const dDark = deltaE00(A.dark, B.dark);
    const worst = Math.min(dLight, dDark);
    de00Pairs.push({
      a: A.seed, b: B.seed,
      de00Light: Math.round(dLight * 100) / 100,
      de00Dark: Math.round(dDark * 100) / 100,
      deOKLight: Math.round(deltaEOK(A.light, B.light) * 1000) / 1000,
    });
    if (worst < minDe00) minDe00 = worst;
  }
}
const de00Pass = args.seeds.length >= 2 && minDe00 >= args.de00Threshold;
dimensions.push({
  dimension: "D8-uniqueness-deltaE00",
  verdict: de00Pass ? "PASS" : "FAIL",
  rationale: de00Pass
    ? `${args.seeds.length} seeds produce primaries separated by ΔE00 >= ${args.de00Threshold} in both modes (min ${Math.round(minDe00 * 100) / 100})`
    : `min pairwise ΔE00 ${Math.round(minDe00 * 100) / 100} < ${args.de00Threshold} threshold`,
  measurements: {
    metric: "CIEDE2000",
    primaries: primaries.map((p) => ({ seed: p.seed, light: p.light, dark: p.dark })),
    pairDeltas: de00Pairs,
    minDeltaE00: Math.round(minDe00 * 100) / 100,
    threshold: args.de00Threshold,
  },
});
log(`D8 uniqueness-ΔE00: ${de00Pass ? "PASS" : "FAIL"} (min pairwise ΔE00 ${Math.round(minDe00 * 100) / 100} over ${args.seeds.length} seeds, threshold ${args.de00Threshold})`);
for (const p of de00Pairs) log(`   - ${p.a} vs ${p.b}: ΔE00 light ${p.de00Light}, dark ${p.de00Dark}`);

// --- U2: cross-seed CAM16-UCS ΔE′ uniqueness --------------------------------
// Second, independent perceptual-uniqueness invariant (U2 [E]): the min pairwise
// CAM16-UCS ΔE′ (raw Euclidean distance in CAM16-UCS J*a*b*) between project
// primaries must be >= threshold (default 8). CAM16 is a full color-appearance
// model, so it complements ΔE00 (CIELab-based) — used where ΔE00 saturates or
// gamut/appearance effects dominate. Checked in BOTH schemes; reported min is
// the worse mode. The compressed form (1.41·ΔE′^0.63) is reported alongside.
const cam16Pairs = [];
let minCam16 = Infinity;
for (let i = 0; i < primaries.length; i++) {
  for (let j = i + 1; j < primaries.length; j++) {
    const A = primaries[i], B = primaries[j];
    const dLight = deltaEPrimeCam16(A.light, B.light);
    const dDark = deltaEPrimeCam16(A.dark, B.dark);
    const worst = Math.min(dLight, dDark);
    cam16Pairs.push({
      a: A.seed, b: B.seed,
      dEPrimeLight: Math.round(dLight * 100) / 100,
      dEPrimeDark: Math.round(dDark * 100) / 100,
      dECompressedLight: Math.round(deltaECam16(A.light, B.light) * 100) / 100,
    });
    if (worst < minCam16) minCam16 = worst;
  }
}
const cam16Pass = args.seeds.length >= 2 && minCam16 >= args.cam16Threshold;
dimensions.push({
  dimension: "U2-uniqueness-cam16ucs",
  verdict: cam16Pass ? "PASS" : "FAIL",
  rationale: cam16Pass
    ? `${args.seeds.length} seeds produce primaries separated by CAM16-UCS ΔE′ >= ${args.cam16Threshold} in both modes (min ${Math.round(minCam16 * 100) / 100})`
    : `min pairwise CAM16-UCS ΔE′ ${Math.round(minCam16 * 100) / 100} < ${args.cam16Threshold} threshold`,
  measurements: {
    metric: "CAM16-UCS ΔE′ (Euclidean J*a*b*; MCU Cam16, Li et al. 2017)",
    primaries: primaries.map((p) => ({ seed: p.seed, light: p.light, dark: p.dark })),
    pairDeltas: cam16Pairs,
    minDeltaEPrime: Math.round(minCam16 * 100) / 100,
    threshold: args.cam16Threshold,
  },
  tags: ["[E]-metric", "[H]-threshold"],
  caveats: ["JND-non-uniform"],
});
log(`U2 uniqueness-CAM16-UCS ΔE′: ${cam16Pass ? "PASS" : "FAIL"} (min pairwise ΔE′ ${Math.round(minCam16 * 100) / 100} over ${args.seeds.length} seeds, threshold ${args.cam16Threshold})`);
for (const p of cam16Pairs) log(`   - ${p.a} vs ${p.b}: ΔE′ light ${p.dEPrimeLight}, dark ${p.dEPrimeDark} (compressed ΔE ${p.dECompressedLight})`);

// --- U3/U4/U5: resolved design-DNA vectors ----------------------------------
// U3 (weighted DNA distance), U4 (type-pair distance), and U5 (Poisson-disk
// capacity report) all operate on the engine's REAL resolved DNA vectors and the
// already-measured perceptual color distance — not on mocks. The blue-noise gate
// (uniqueness-engine §1) runs on the raw DNA vector; these are the token-level
// executable slice of that gate.
const dnaVectors = args.seeds.map((seed) => ({ seed, vector: deriveVector(seed) }));

// --- U4: cross-seed type-pair distance --------------------------------------
// U4 [H]: the min pairwise type-pair distance (display+body face pairing in the
// curated pool's feature space, qa/lib/typedna.mjs) must be >= threshold (0.3).
// Two projects assigned the SAME font pair score exactly 0 (golden-BAD) — so a
// design cannot read as type-distinct without an actually different pairing.
const typePairs = [];
let minTypeDist = Infinity;
for (let i = 0; i < dnaVectors.length; i++) {
  for (let j = i + 1; j < dnaVectors.length; j++) {
    const A = dnaVectors[i], B = dnaVectors[j];
    const d = typePairDistance(A.vector.fontPair, B.vector.fontPair);
    typePairs.push({
      a: A.seed, b: B.seed,
      aPair: A.vector.fontPairId, bPair: B.vector.fontPairId,
      distance: Math.round(d * 10000) / 10000,
    });
    if (d < minTypeDist) minTypeDist = d;
  }
}
const typePass = args.seeds.length >= 2 && minTypeDist >= args.typeThreshold;
dimensions.push({
  dimension: "U4-uniqueness-type-pair",
  verdict: typePass ? "PASS" : "FAIL",
  rationale: typePass
    ? `${args.seeds.length} seeds produce type pairings separated by >= ${args.typeThreshold} in face-feature space (min ${Math.round(minTypeDist * 10000) / 10000})`
    : `min pairwise type-pair distance ${Math.round(minTypeDist * 10000) / 10000} < ${args.typeThreshold} threshold (font pairing collision?)`,
  measurements: {
    metric: "type-pair distance (display+body face feature vector: class one-hot + normalized x-height/contrast/weight/width/slant; qa/lib/typedna.mjs)",
    pairs: dnaVectors.map((d) => ({ seed: d.seed, fontPairId: d.vector.fontPairId, display: d.vector.fontPair.display, body: d.vector.fontPair.body })),
    pairDistances: typePairs,
    minTypeDistance: Math.round(minTypeDist * 10000) / 10000,
    threshold: args.typeThreshold,
  },
  tags: ["[H]-metric", "[H]-threshold"],
});
log(`U4 uniqueness-type-pair: ${typePass ? "PASS" : "FAIL"} (min pairwise type distance ${Math.round(minTypeDist * 10000) / 10000} over ${args.seeds.length} seeds, threshold ${args.typeThreshold})`);
for (const p of typePairs) log(`   - ${p.a}(${p.aPair}) vs ${p.b}(${p.bPair}): type distance ${p.distance}`);

// --- U3: combined weighted DNA-distance (blue-noise / Poisson invariant) -----
// U3: D(A,B) = sqrt(Σ wᵢ·d̂ᵢ²) over color/type/shape/layout/motion/depth
// (weights color 0.40 > type 0.25 > shape 0.12 ≈ layout 0.10 > motion 0.08 ≈
// depth 0.05). The color sub-distance uses the worse-of-modes ΔE00 measured
// above. PASS requires BOTH: (a) min pairwise D >= dnaThreshold (0.25, the
// Poisson-disk radius r [H]); AND (b) the color axis clears its own floor
// (min worst-mode ΔE00 >= de00Threshold) so "uniqueness" can't be won by
// non-color tweaks while primaries collide perceptually.
const worstDe00 = {}; // "a|b" -> worse-of-modes ΔE00 (reuse the D8 pair math)
for (const p of de00Pairs) worstDe00[`${p.a}|${p.b}`] = Math.min(p.de00Light, p.de00Dark);
const dnaPairs = [];
let minDna = Infinity;
let minColorDe00 = Infinity;
for (let i = 0; i < dnaVectors.length; i++) {
  for (let j = i + 1; j < dnaVectors.length; j++) {
    const A = dnaVectors[i], B = dnaVectors[j];
    const cDe00 = worstDe00[`${A.seed}|${B.seed}`] ?? worstDe00[`${B.seed}|${A.seed}`] ?? 0;
    const sub = axisSubDistances(A.vector, B.vector, cDe00);
    const D = dnaDistance(sub);
    dnaPairs.push({
      a: A.seed, b: B.seed,
      distance: Math.round(D * 10000) / 10000,
      colorDeltaE00: Math.round(cDe00 * 100) / 100,
      sub: Object.fromEntries(Object.entries(sub).map(([k, v]) => [k, Math.round(v * 10000) / 10000])),
    });
    if (D < minDna) minDna = D;
    if (cDe00 < minColorDe00) minColorDe00 = cDe00;
  }
}
const colorFloorPass = minColorDe00 >= args.de00Threshold;
const dnaSepPass = minDna >= args.dnaThreshold;
const dnaPass = args.seeds.length >= 2 && dnaSepPass && colorFloorPass;
dimensions.push({
  dimension: "U3-uniqueness-dna-distance",
  verdict: dnaPass ? "PASS" : "FAIL",
  rationale: dnaPass
    ? `${args.seeds.length} seeds separated by weighted DNA distance >= ${args.dnaThreshold} (min ${Math.round(minDna * 10000) / 10000}) with the color axis clearing its own ΔE00 floor (min ${Math.round(minColorDe00 * 100) / 100} >= ${args.de00Threshold})`
    : !dnaSepPass
      ? `min pairwise weighted DNA distance ${Math.round(minDna * 10000) / 10000} < ${args.dnaThreshold} (Poisson-disk radius r)`
      : `DNA separation met (${Math.round(minDna * 10000) / 10000}) but color axis floor breached: min worst-mode ΔE00 ${Math.round(minColorDe00 * 100) / 100} < ${args.de00Threshold} (can't be unique via non-color tweaks alone)`,
  measurements: {
    metric: "weighted DNA distance D = sqrt(Σ wᵢ·d̂ᵢ²); axes color/type/shape/layout/motion/depth",
    weights: DNA_WEIGHTS,
    colorAnchorDeltaE00: COLOR_ANCHOR,
    pairDistances: dnaPairs,
    minDnaDistance: Math.round(minDna * 10000) / 10000,
    threshold: args.dnaThreshold,
    colorFloor: { minWorstModeDeltaE00: Math.round(minColorDe00 * 100) / 100, floor: args.de00Threshold, pass: colorFloorPass },
  },
  tags: ["[E]-method", "[H]-r", "[E]-color-metric", "[H]-axis-weights"],
  caveats: ["JND-non-uniform", "axis-normalization-heuristic"],
});
log(`U3 uniqueness-DNA-distance: ${dnaPass ? "PASS" : "FAIL"} (min weighted DNA distance ${Math.round(minDna * 10000) / 10000} over ${args.seeds.length} seeds, threshold ${args.dnaThreshold}; color floor min ΔE00 ${Math.round(minColorDe00 * 100) / 100} ${colorFloorPass ? ">=" : "<"} ${args.de00Threshold})`);
for (const p of dnaPairs) log(`   - ${p.a} vs ${p.b}: D ${p.distance} (color ${p.sub.color}/ΔE00 ${p.colorDeltaE00}, type ${p.sub.type}, shape ${p.sub.shape}, layout ${p.sub.layout}, motion ${p.sub.motion}, depth ${p.sub.depth})`);

// --- U5: Poisson-disk capacity report (METRIC only — never gates) ------------
// U5 [E]-method/[H]-r: report remaining blue-noise capacity of the bounded DNA
// space at r = D_min (the achieved min pairwise DNA distance). This is a REPORT,
// not a pass/fail gate — as the space fills, r must shrink (graceful degradation)
// or saturation must be reported; the engine must not loop forever (§4, Bridson).
const capacity = poissonCapacityReport(Number.isFinite(minDna) ? minDna : 0, args.seeds.length);
dimensions.push({
  dimension: "U5-capacity-report",
  advisory: true,
  verdict: "REPORT",
  rationale: `at r = D_min = ${capacity.radius_r_eq_Dmin} with ${capacity.acceptedCount} accepted designs, the bounded DNA space can hold ≈${capacity.estimatedMaxPoints} min-distance designs (≈${capacity.estimatedRemainingCapacity} remaining; saturated=${capacity.saturated})`,
  measurements: capacity,
  tags: ["[E]-method", "[H]-r"],
  caveats: ["capacity-upper-bound-estimate", "curse-of-dimensionality", "report-not-gate"],
});
log(`U5 capacity-report (METRIC, non-gating): r=D_min ${capacity.radius_r_eq_Dmin}, accepted ${capacity.acceptedCount}, est. max ≈${capacity.estimatedMaxPoints}, remaining ≈${capacity.estimatedRemainingCapacity}, saturated=${capacity.saturated}`);

// --- A1b: APCA Lc (ADVISORY — DRAFT/WCAG3, never gates) ----------------------
// APCA is a DRAFT (WCAG 3, non-normative). This is an ADDITIONAL perceptual
// screen only; it NEVER replaces the normative WCAG 2.2 AA gate (D2). It is
// therefore marked advisory:true and does NOT affect the overall verdict/exit
// code (uniqueness-and-platform-conformance.md A1b + "draft never gates alone").
// Each semantic pair is assigned the APCA minimum appropriate to its rendered
// text role (per the APCA font/size lookup tiers): running body text Lc>=75,
// supporting/container text Lc>=60, fill labels & large/headline Lc>=45,
// non-text UI edges Lc>=30. The stricter "fluent body" Lc>=90 tier is reported
// informationally for the primary running-text pairs.
const APCA_ROLE = {
  // primary running body text
  "on-surface/surface": { cls: "body", min: 75, fluent90: true },
  "on-background/background": { cls: "body", min: 75, fluent90: true },
  "inverse-on-surface/inverse-surface": { cls: "body", min: 75 },
  // supporting / secondary text
  "on-surface-variant/surface-variant": { cls: "supporting", min: 60 },
  // text on tonal containers (supporting copy)
  "on-primary-container/primary-container": { cls: "container", min: 60 },
  "on-secondary-container/secondary-container": { cls: "container", min: 60 },
  "on-tertiary-container/tertiary-container": { cls: "container", min: 60 },
  "on-error-container/error-container": { cls: "container", min: 60 },
  // labels on saturated fills (buttons/chips — large/emphasis tier)
  "on-primary/primary": { cls: "fill-label", min: 45 },
  "on-secondary/secondary": { cls: "fill-label", min: 45 },
  "on-tertiary/tertiary": { cls: "fill-label", min: 45 },
  "on-error/error": { cls: "fill-label", min: 45 },
};
const APCA_UI_MIN = 30; // non-text UI / graphic edges (kind:"ui")
const apcaRows = [];
for (const seed of args.seeds) {
  const { schemes: s } = generateTokens(seed);
  for (const mode of ["light", "dark"]) {
    const scheme = s[mode];
    for (const { fg, bg, kind } of SEMANTIC_PAIRS) {
      if (scheme[fg] == null || scheme[bg] == null) continue;
      const key = `${fg}/${bg}`;
      const role = kind === "ui" ? { cls: "non-text-ui", min: APCA_UI_MIN } : APCA_ROLE[key];
      if (!role) continue;
      const Lc = apcaLc(scheme[fg], scheme[bg]);
      const absLc = Math.abs(Lc);
      apcaRows.push({
        seed, mode, pair: key, cls: role.cls,
        Lc: Math.round(Lc * 10) / 10, absLc: Math.round(absLc * 10) / 10,
        min: role.min, pass: absLc >= role.min,
        fluent90: role.fluent90 ? absLc >= 90 : undefined,
      });
    }
  }
}
const apcaFails = apcaRows.filter((r) => !r.pass);
const apcaFluentMiss = apcaRows.filter((r) => r.fluent90 === false);
dimensions.push({
  dimension: "A1b-apca",
  advisory: true,
  verdict: apcaFails.length === 0 ? "PASS" : "FAIL",
  rationale: apcaFails.length === 0
    ? `all ${apcaRows.length} semantic pairs meet their role-appropriate APCA Lc minimum (body>=75, supporting/container>=60, fill/large>=45, non-text>=30) across ${args.seeds.length} seeds x2 modes`
    : `${apcaFails.length} pair(s) below their APCA Lc minimum (advisory only; WCAG 2.2 AA gate is D2)`,
  measurements: {
    metric: "APCA Lc (APCA-W3 0.1.9; qa/lib/apca.mjs, cross-validated vs apca-w3)",
    thresholds: { body: 75, supporting: 60, container: 60, "fill-label": 45, "non-text-ui": 30, "fluent-body-informational": 90 },
    pairsChecked: apcaRows.length,
    rows: apcaRows,
    fluent90MissesOnPrimaryBody: apcaFluentMiss.map((r) => ({ seed: r.seed, mode: r.mode, pair: r.pair, Lc: r.absLc })),
  },
  tags: ["[E]-metric", "DRAFT"],
  caveats: ["APCA-draft: additional screen only, never replaces the normative WCAG 2.2 AA gate (D2)"],
});
log(`A1b APCA (ADVISORY, non-gating): ${apcaFails.length === 0 ? "PASS" : "FAIL"} ` +
    `(${apcaRows.length} pairs; ${apcaFails.length} below role min; ${apcaFluentMiss.length} primary-body pairs under the informational fluent-90 tier)`);
for (const r of apcaFails) log(`   - below-min ${r.seed} ${r.mode} ${r.pair} = Lc ${r.absLc} < ${r.min} (${r.cls})`);
for (const r of apcaFluentMiss) log(`   - fluent-90 info: ${r.seed} ${r.mode} ${r.pair} = Lc ${r.absLc} (< 90 fluent tier; >= 75 body min OK)`);

// --- DET1: determinism (same seed -> byte-identical tokens + mark) -----------
// C-DET / DET1 [E]: re-generate each seed twice and hash the canonical DTCG
// document and the SVG mark; both hashes must be byte-identical across runs.
// This is the external proof that the pipeline draws only from the seeded PRNG
// (no Math.random) — run here in-process, not just in `npm test`.
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const detRows = [];
let detAllStable = true;
for (const seed of args.seeds) {
  const t1 = sha256(JSON.stringify(generateTokens(seed).document));
  const t2 = sha256(JSON.stringify(generateTokens(seed).document));
  const m1 = sha256(generateMark(seed).svg);
  const m2 = sha256(generateMark(seed).svg);
  const stable = t1 === t2 && m1 === m2;
  if (!stable) detAllStable = false;
  detRows.push({ seed, tokensSha256: t1, tokensStable: t1 === t2, markSha256: m1, markStable: m1 === m2 });
}
dimensions.push({
  dimension: "DET1-determinism",
  verdict: args.seeds.length >= 1 && detAllStable ? "PASS" : "FAIL",
  rationale: detAllStable
    ? `every seed re-generates byte-identical DTCG tokens and SVG mark (sha256 stable) across ${args.seeds.length} seed(s)`
    : `at least one seed produced a non-deterministic token document or mark`,
  measurements: { metric: "sha256(canonical DTCG) + sha256(SVG mark), run x2 per seed", runs: detRows },
  tags: ["[E]"],
});
log(`DET1 determinism: ${detAllStable ? "PASS" : "FAIL"} (same seed -> byte-identical token+mark hash, ${args.seeds.length} seeds)`);
for (const d of detRows) log(`   - ${d.seed}: tokens ${d.tokensSha256.slice(0, 12)}… (${d.tokensStable ? "stable" : "DRIFT"}), mark ${d.markSha256.slice(0, 12)}… (${d.markStable ? "stable" : "DRIFT"})`);

// --- Overall verdict (advisory checks excluded from the gate) ----------------
const gatingDims = dimensions.filter((d) => !d.advisory);
const overall = gatingDims.every((d) => d.verdict === "PASS") ? "PASS" : "FAIL";
const verdict = {
  feature_class: "design_qa",
  target: source,
  generatedAt_omitted_for_determinism: true,
  overall,
  gatingDimensions: gatingDims.map((d) => d.dimension),
  advisoryDimensions: dimensions.filter((d) => d.advisory).map((d) => d.dimension),
  dimensions,
};
process.stdout.write(JSON.stringify(verdict, null, 2) + "\n");
const advisoryNote = dimensions.some((d) => d.advisory)
  ? ` (advisory, not gated: ${dimensions.filter((d) => d.advisory).map((d) => `${d.dimension}=${d.verdict}`).join(", ")})`
  : "";
log(`\nOVERALL: ${overall}${advisoryNote}`);
process.exit(overall === "PASS" ? 0 : 1);
