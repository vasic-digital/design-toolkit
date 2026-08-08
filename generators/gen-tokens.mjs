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
  const args = { seed: undefined, out: undefined, adjectives: [], anchor: undefined, stdout: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed") args.seed = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--adjectives") args.adjectives = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    // --anchor-color / --anchor-hue (aliases): a brand hex (e.g. #8f1d2d) or bare
    // degrees. When set, the palette is built AROUND this hue (refine, not replace).
    else if (a === "--anchor-color" || a === "--anchor-hue") args.anchor = argv[++i];
    else if (a === "--stdout") args.stdout = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    "Usage: node gen-tokens.mjs --seed <string> [--out tokens.json] [--adjectives a,b]\n" +
    "                          [--anchor-color <hex>|--anchor-hue <hex|deg>] [--stdout]\n" +
    "\n" +
    "  --anchor-color <hex>  Anchor the palette to an existing brand color's HCT hue\n" +
    "  --anchor-hue <val>    Alias of --anchor-color; also accepts bare degrees (0..360)\n" +
    "                        When set, the deterministic palette REFINES the current\n" +
    "                        brand hue (still deterministic per seed+anchor+version)\n" +
    "                        instead of using the hash-derived hue. All other axes\n" +
    "                        (adjectives -> variant/type/space/...) stay seed-driven.\n"
  );
}

const args = parseArgs(process.argv);
if (args.seed == null) {
  process.stderr.write("error: --seed is required\n");
  printHelp();
  process.exit(2);
}

const { vector, document } = generateTokens(args.seed, { adjectives: args.adjectives, anchor: args.anchor });
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
  `seed="${vector.seed}"` +
  (vector.anchorHue == null ? "" : ` anchor=${vector.anchorColor || vector.anchorHue}(hue ${vector.anchorHue})`) +
  ` -> variant=${vector.mcuVariant} hue=${vector.seedHue}` +
  ` harmony=${vector.harmonyRule} typeRatio=${vector.typeRatio}` +
  ` space=${vector.spaceMultiplier} radius=${vector.radiusBase}` +
  ` contrast=${vector.contrastMode} fontPair=${vector.fontPairId}\n`
);
