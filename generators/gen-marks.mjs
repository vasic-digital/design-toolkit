#!/usr/bin/env node
// CLI: seed -> deterministic generative SVG mark/background.
//
//   node gen-marks.mjs --seed "vasic-digital" --out mark.svg
//   node gen-marks.mjs --seed helix --kind background --size 800 --out bg.svg
//
// Same seed => byte-identical SVG.

import { writeFileSync } from "node:fs";
import { generateMark } from "./lib/marks.mjs";

function parseArgs(argv) {
  const args = { seed: undefined, out: undefined, kind: "mark", size: 512, stdout: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--seed") args.seed = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--kind") args.kind = argv[++i];
    else if (a === "--size") args.size = parseInt(argv[++i], 10);
    else if (a === "--stdout") args.stdout = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    "Usage: node gen-marks.mjs --seed <string> [--out mark.svg] [--kind mark|background] [--size 512] [--stdout]\n"
  );
}

const args = parseArgs(process.argv);
if (args.seed == null) {
  process.stderr.write("error: --seed is required\n");
  printHelp();
  process.exit(2);
}

const { svg, palette, kind, size } = generateMark(args.seed, { kind: args.kind, size: args.size });
const out = svg.endsWith("\n") ? svg : svg + "\n";

if (args.out) {
  writeFileSync(args.out, out);
  process.stderr.write(`wrote ${args.out}\n`);
} else if (args.stdout || !process.stdout.isTTY) {
  process.stdout.write(out);
}

process.stderr.write(`seed="${args.seed}" kind=${kind} size=${size} palette=${palette.join(",")}\n`);
