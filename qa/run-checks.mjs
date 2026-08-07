#!/usr/bin/env node
// Executable design-QA runner — the runnable slice of design-qa-testbank.md.
//
// Validates a generated token set with REAL assertions and real pass/fail:
//   D1  DTCG structural validity      (dtcg-tokens.md)
//   D2  WCAG AA contrast gate         (color.md §4; text >=4.5:1, UI >=3:1, both modes)
//   D7  cross-seed uniqueness variance (distinct primary OKLCH hues beyond a threshold)
//
// Usage:
//   node run-checks.mjs --tokens path/to/tokens.json \
//        --seeds "vasic-digital,milosvasic,helix" --hue-threshold 15
//
// If --tokens is omitted, a set is generated in-memory from the first seed.
// Exit code 0 = all PASS; non-zero = at least one FAIL. Machine-readable JSON
// verdict goes to stdout; human summary to stderr.

import { readFileSync } from "node:fs";
import { validateDtcg, extractSchemes } from "../generators/lib/dtcg.mjs";
import { evaluateScheme } from "../generators/lib/color.mjs";
import { oklchHue, hueDelta } from "../generators/lib/color.mjs";
import { generateTokens } from "../generators/lib/tokens.mjs";

function parseArgs(argv) {
  const args = {
    tokens: undefined,
    seeds: ["vasic-digital", "milosvasic", "helix"],
    hueThreshold: 15,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tokens") args.tokens = argv[++i];
    else if (a === "--seeds") args.seeds = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--hue-threshold") args.hueThreshold = parseFloat(argv[++i]);
    else if (a === "--help" || a === "-h") {
      process.stdout.write("Usage: node run-checks.mjs [--tokens tokens.json] [--seeds a,b,c] [--hue-threshold 15]\n");
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

// --- Overall verdict ---------------------------------------------------------
const overall = dimensions.every((d) => d.verdict === "PASS") ? "PASS" : "FAIL";
const verdict = {
  feature_class: "design_qa",
  target: source,
  generatedAt_omitted_for_determinism: true,
  overall,
  dimensions,
};
process.stdout.write(JSON.stringify(verdict, null, 2) + "\n");
log(`\nOVERALL: ${overall}`);
process.exit(overall === "PASS" ? 0 : 1);
