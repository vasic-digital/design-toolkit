#!/usr/bin/env node
// CLI: seed -> DTCG design-token document.
//
//   node gen-tokens.mjs --seed "vasic-digital" --out tokens.json
//   node gen-tokens.mjs --seed milosvasic --adjectives "modern,minimal" --out out.json
//
// Determinism (theming-designer.md #2): same seed + options + generator version
// => byte-identical output. Prints the resolved design-DNA vector for audit.

import { writeFileSync } from "node:fs";
import { generateTokens } from "./lib/tokens.mjs";

function parseArgs(argv) {
  const args = { seed: undefined, out: undefined, adjectives: [], stdout: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed") args.seed = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--adjectives") args.adjectives = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--stdout") args.stdout = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    "Usage: node gen-tokens.mjs --seed <string> [--out tokens.json] [--adjectives a,b] [--stdout]\n"
  );
}

const args = parseArgs(process.argv);
if (args.seed == null) {
  process.stderr.write("error: --seed is required\n");
  printHelp();
  process.exit(2);
}

const { vector, document } = generateTokens(args.seed, { adjectives: args.adjectives });
// Stable 2-space JSON; object key order is fixed by construction => deterministic.
const json = JSON.stringify(document, null, 2) + "\n";

if (args.out) {
  writeFileSync(args.out, json);
  process.stderr.write(`wrote ${args.out}\n`);
} else if (args.stdout || !process.stdout.isTTY) {
  process.stdout.write(json);
}

// Human-readable resolved vector (to stderr so --stdout stays pure JSON).
process.stderr.write(
  `seed="${vector.seed}" -> variant=${vector.mcuVariant} hue=${vector.seedHue}` +
  ` harmony=${vector.harmonyRule} typeRatio=${vector.typeRatio}` +
  ` space=${vector.spaceMultiplier} radius=${vector.radiusBase}` +
  ` contrast=${vector.contrastMode} fontPair=${vector.fontPairId}\n`
);
