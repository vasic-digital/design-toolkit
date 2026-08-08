#!/usr/bin/env node
// =============================================================================
// check-tokens.mjs — HelixQA executable test bank for `--od-*` design-token
// CANDIDATES produced by the hybrid direction-generator (Helix §11.4.162).
//
// This is the runnable slice of qa/token-testbank.md. It verifies a generated
// `design-toolkit/proposed/*.od-tokens.css` candidate against the `--od-*`
// contract the LIVE brand CSS actually defines, with REAL assertions that FAIL
// on bad input (see qa/fixtures/golden-bad-tokens.css). Anti-bluff: every PASS
// carries a captured POSITIVE measurement; a check that only ever passes is
// worthless, so each is proven to bite via the golden-BAD fixture.
//
// Challenges (each -> machine-readable PASS/FAIL + measured value):
//   T1 Coverage          every `--od-*` the brand CSS DEFINES is present in the
//                        candidate (comment-aware name-set diff). FAIL lists missing.
//   T2 In-browser resolve  load the candidate in headless chromium and assert a
//                        sample of tokens resolve to NON-EMPTY computed values
//                        (--od-accent-700/--od-bg/--od-fs-base/--od-text), and
//                        that --od-fs-base resolves to a real >0px font-size.
//                        Catches the class of bug where a malformed comment/paren
//                        silently drops the whole :root rule — brace-balance is
//                        NOT sufficient, only the CSSOM tells the truth.
//   T3 Determinism       gen-tokens -> dtcg-to-od run twice for a seed is
//                        byte-identical (and reproduces the on-disk candidate).
//   T4 Contrast (WCAG21) --od-text/--od-bg and --od-on-accent/--od-accent, light
//                        + dark, all >= 4.5:1 (var()-into-ramp resolved). Ratios
//                        reported (colorjs.io via generators/lib/color.mjs).
//   T5 Uniqueness        two DIFFERENT seeds -> accent primaries separated by a
//                        min hue delta AND min ΔE00 (qa/lib/deltae.mjs); same
//                        seed -> identical accent (determinism corollary).
//
// Usage:
//   node check-tokens.mjs --candidate ../proposed/vasic-digital.od-tokens.css
//   node check-tokens.mjs --candidate <css> --brand <brand.css> [--seed s]
//        [--seed-b s2] [--min-contrast 4.5] [--hue-threshold 15]
//        [--de00-threshold 10] [--skip-browser]
//
// --brand is inferred from the candidate basename when it maps to a known brand.
// The seed/adjectives for T3/T5 are parsed from the candidate header comment when
// present; otherwise the default seed pair (vasic-digital, milosvasic) is used.
// Exit code 0 = all checks PASS; non-zero = at least one FAIL/ERROR. JSON verdict
// -> stdout; human summary -> stderr.
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";
import { contrastRatio, oklchHue, hueDelta } from "../generators/lib/color.mjs";
import { deltaE00 } from "./lib/deltae.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const GEN_DIR = resolve(HERE, "../generators");
const GEN_TOKENS = resolve(GEN_DIR, "gen-tokens.mjs");
const DTCG_TO_OD = resolve(GEN_DIR, "dtcg-to-od.mjs");

// ---- CLI -------------------------------------------------------------------
function parseArgs(argv) {
  const a = {
    candidate: undefined,
    brand: undefined,
    seed: undefined,
    seedB: undefined,
    minContrast: 4.5, // WCAG 2.1 AA normal text
    hueThreshold: 15, // deg (matches run-checks D7)
    de00Threshold: 10, // ΔE00 (matches run-checks D8/U1)
    skipBrowser: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--candidate") a.candidate = argv[++i];
    else if (t === "--brand") a.brand = argv[++i];
    else if (t === "--seed") a.seed = argv[++i];
    else if (t === "--seed-b") a.seedB = argv[++i];
    else if (t === "--min-contrast") a.minContrast = parseFloat(argv[++i]);
    else if (t === "--hue-threshold") a.hueThreshold = parseFloat(argv[++i]);
    else if (t === "--de00-threshold") a.de00Threshold = parseFloat(argv[++i]);
    else if (t === "--skip-browser") a.skipBrowser = true;
    else if (t === "--help" || t === "-h") {
      process.stdout.write(
        "Usage: node check-tokens.mjs --candidate <css> [--brand <css>] [--seed s] [--seed-b s2] [--min-contrast 4.5] [--hue-threshold 15] [--de00-threshold 10] [--skip-browser]\n"
      );
      process.exit(0);
    }
  }
  return a;
}

const args = parseArgs(process.argv);
const log = (s) => process.stderr.write(s + "\n");
if (!args.candidate) {
  process.stderr.write("error: --candidate <css> is required\n");
  process.exit(2);
}
const candidatePath = resolve(process.cwd(), args.candidate);
if (!existsSync(candidatePath)) {
  process.stderr.write(`error: candidate not found: ${candidatePath}\n`);
  process.exit(2);
}
const candidateCss = readFileSync(candidatePath, "utf8");

// Infer the brand CSS from the candidate basename when it maps to a known brand.
const BRAND_BY_NAME = {
  "vasic-digital": resolve(REPO_ROOT, "design-system/brand-vasic-digital/vasic-digital.css"),
  "milosvasic": resolve(REPO_ROOT, "design-system/brand-milosvasic/milosvasic.css"),
};
let brandPath = args.brand ? resolve(process.cwd(), args.brand) : undefined;
if (!brandPath) {
  const base = basename(candidatePath).replace(/\.od-tokens\.css$/, "");
  brandPath = BRAND_BY_NAME[base];
}

// ---- shared CSS helpers ----------------------------------------------------
// Strip C-style comments so token parsing/coverage never counts a commented-out
// (i.e. NON-active) declaration as defined. This is the correctness that makes
// the golden-BAD "*/-drops-:root" fixture actually bite T1/T4 (a naive regex over
// raw text would be fooled by tokens hiding inside a broken comment).
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Names of every `--od-*` custom property DEFINED (name followed by ':') in an
// active (comment-stripped) stylesheet.
function definedTokens(css) {
  const active = stripComments(css);
  const set = new Set();
  const re = /(--od-[a-z0-9-]+)\s*:/g;
  let m;
  while ((m = re.exec(active)) !== null) set.add(m[1]);
  return set;
}

// Extract the declarations of a specific selector block from active CSS.
// Returns a Map name->rawValue for the FIRST matching block.
function blockDeclarations(css, selectorRe) {
  const active = stripComments(css);
  const m = active.match(selectorRe);
  if (!m) return new Map();
  // find the block body starting at the '{' that follows the match
  const start = active.indexOf("{", m.index);
  if (start < 0) return new Map();
  let depth = 0, end = -1;
  for (let i = start; i < active.length; i++) {
    if (active[i] === "{") depth++;
    else if (active[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return new Map();
  const body = active.slice(start + 1, end);
  const map = new Map();
  const re = /(--od-[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let d;
  while ((d = re.exec(body)) !== null) map.set(d[1], d[2].trim());
  return map;
}

// Resolve a token value that may be `var(--od-x)` (single level or chained) against
// a merged map. Returns the resolved hex/string, or undefined if unresolvable.
function resolveValue(map, name, seen = new Set()) {
  if (seen.has(name)) return undefined;
  seen.add(name);
  const raw = map.get(name);
  if (raw == null) return undefined;
  const varMatch = raw.match(/^var\(\s*(--od-[a-z0-9-]+)\s*\)$/);
  if (varMatch) return resolveValue(map, varMatch[1], seen);
  return raw;
}

// Parse `seed="..."` and `adjectives=[...]` from a generated candidate header.
function parseProvenance(css) {
  const seed = (css.match(/seed="([^"]+)"/) || [])[1];
  const adjRaw = (css.match(/adjectives=\[([^\]]*)\]/) || [])[1];
  const adjectives = adjRaw ? adjRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return { seed, adjectives };
}

const dimensions = [];
const push = (d) => { dimensions.push(d); };

// ============================================================================
// T1 — Coverage: every `--od-*` the brand CSS DEFINES is present in the candidate
// ============================================================================
function runT1() {
  if (!brandPath || !existsSync(brandPath)) {
    push({
      challenge: "T1-coverage", verdict: "ERROR",
      rationale: `brand CSS not found (looked at ${brandPath || "<none>"}); pass --brand`,
      measurements: { brandPath },
    });
    log(`T1 coverage: ERROR (brand CSS not found: ${brandPath})`);
    return;
  }
  const brandCss = readFileSync(brandPath, "utf8");
  const brand = definedTokens(brandCss);
  const cand = definedTokens(candidateCss);
  const missing = [...brand].filter((t) => !cand.has(t)).sort();
  const extra = [...cand].filter((t) => !brand.has(t)).sort();
  const pass = missing.length === 0;
  push({
    challenge: "T1-coverage",
    verdict: pass ? "PASS" : "FAIL",
    rationale: pass
      ? `all ${brand.size} brand-defined --od-* tokens are present in the candidate`
      : `${missing.length} brand-defined token(s) missing from the candidate`,
    measurements: {
      brand: basename(brandPath), brandDefined: brand.size, candidateDefined: cand.size,
      missing, extraInCandidate: extra,
    },
  });
  log(`T1 coverage: ${pass ? "PASS" : "FAIL"} (brand defines ${brand.size}, candidate defines ${cand.size}; ${missing.length} missing)`);
  for (const t of missing) log(`   - MISSING ${t}`);
}

// ============================================================================
// T2 — In-browser resolution (headless chromium): the sample tokens resolve to
// NON-EMPTY computed values, and --od-fs-base resolves to a real >0px font-size.
// ============================================================================
const T2_SAMPLE = ["--od-accent-700", "--od-bg", "--od-fs-base", "--od-text"];
async function runT2() {
  if (args.skipBrowser) {
    push({
      challenge: "T2-in-browser-resolution", verdict: "ERROR",
      rationale: "browser check skipped via --skip-browser (never counts as PASS)",
      measurements: { skipped: true },
    });
    log("T2 in-browser: ERROR (skipped via --skip-browser)");
    return;
  }
  let chromium;
  try {
    // Playwright is not resolvable from qa/ via ordinary node_modules walk-up
    // (it lives in the repo's _tests/ workspace). Resolve it explicitly against
    // _tests/package.json — the repo's real Playwright + chromium install.
    const requireFromTests = createRequire(resolve(REPO_ROOT, "_tests/package.json"));
    ({ chromium } = requireFromTests("@playwright/test"));
  } catch (e) {
    push({
      challenge: "T2-in-browser-resolution", verdict: "ERROR",
      rationale: `Playwright not importable from qa/: ${e.message}`,
      measurements: { hint: "npm --prefix _tests install; npx --prefix _tests playwright install chromium" },
    });
    log(`T2 in-browser: ERROR (Playwright not importable: ${e.message})`);
    return;
  }
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    // Load the candidate CSS exactly as authored; no data-theme => plain :root.
    await page.setContent(
      `<!doctype html><html><head><style>${candidateCss}</style></head>` +
      `<body><div id="probe">x</div></body></html>`,
      { waitUntil: "load" }
    );
    const resolved = await page.evaluate((sample) => {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      const out = {};
      for (const name of sample) out[name] = cs.getPropertyValue(name).trim();
      // Extra teeth: prove --od-fs-base resolves to a real, positive px size when
      // actually consumed by a real property (not just present as a string).
      const probe = document.getElementById("probe");
      probe.style.fontSize = "var(--od-fs-base)";
      const fsPx = parseFloat(getComputedStyle(probe).fontSize);
      return { out, fsBasePx: fsPx };
    }, T2_SAMPLE);
    const emptied = T2_SAMPLE.filter((n) => !resolved.out[n]);
    const fsOk = Number.isFinite(resolved.fsBasePx) && resolved.fsBasePx > 0;
    const pass = emptied.length === 0 && fsOk;
    push({
      challenge: "T2-in-browser-resolution",
      verdict: pass ? "PASS" : "FAIL",
      rationale: pass
        ? `all ${T2_SAMPLE.length} sample tokens resolve to non-empty computed values in chromium; --od-fs-base -> ${resolved.fsBasePx}px`
        : `${emptied.length} sample token(s) resolved EMPTY${fsOk ? "" : "; --od-fs-base did not resolve to a positive px size"} (dropped :root / invalid rule — brace-balance would not catch this)`,
      measurements: {
        engine: "headless chromium via @playwright/test (resolved from _tests/)",
        resolved: resolved.out, fsBasePx: resolved.fsBasePx, emptyTokens: emptied,
      },
    });
    log(`T2 in-browser: ${pass ? "PASS" : "FAIL"} (chromium; ${T2_SAMPLE.length - emptied.length}/${T2_SAMPLE.length} sample tokens non-empty; fs-base ${resolved.fsBasePx}px)`);
    for (const n of T2_SAMPLE) log(`   - ${n} = ${JSON.stringify(resolved.out[n])}${resolved.out[n] ? "" : "  <-- EMPTY (dropped)"}`);
  } catch (e) {
    push({
      challenge: "T2-in-browser-resolution", verdict: "ERROR",
      rationale: `browser run failed: ${e.message}`,
      measurements: { error: e.message },
    });
    log(`T2 in-browser: ERROR (${e.message})`);
  } finally {
    if (browser) await browser.close();
  }
}

// ============================================================================
// T3 — Determinism: gen-tokens -> dtcg-to-od twice for a seed is byte-identical
// (and, when the candidate carries provenance, reproduces the on-disk candidate).
// ============================================================================
function pipeline(seed, adjectives) {
  const genArgs = ["--seed", seed, "--stdout"];
  if (adjectives && adjectives.length) genArgs.splice(2, 0, "--adjectives", adjectives.join(","));
  const dtcg = execFileSync("node", [GEN_TOKENS, ...genArgs], { cwd: GEN_DIR, encoding: "utf8" });
  return execFileSync("node", [DTCG_TO_OD, "--stdin", "--stdout"], { cwd: GEN_DIR, input: dtcg, encoding: "utf8" });
}
function runT3() {
  const prov = parseProvenance(candidateCss);
  const seed = args.seed || prov.seed || "vasic-digital";
  const adjectives = prov.seed && !args.seed ? prov.adjectives : [];
  let css1, css2, err;
  try {
    css1 = pipeline(seed, adjectives);
    css2 = pipeline(seed, adjectives);
  } catch (e) { err = e; }
  if (err) {
    push({
      challenge: "T3-determinism", verdict: "ERROR",
      rationale: `pipeline invocation failed: ${err.message}`,
      measurements: { seed, adjectives },
    });
    log(`T3 determinism: ERROR (${err.message})`);
    return;
  }
  // GATING assertion (the task's T3): two pipeline runs for the same seed are
  // byte-identical. Whether the run reproduces the on-disk candidate is REPORTED
  // as an informational signal (a mismatch means the committed candidate is stale
  // vs the current generator) but does NOT gate T3 — determinism is about the
  // generator being a pure function of the seed, not about disk freshness.
  const identical = css1 === css2;
  const reproChecked = !!prov.seed && !args.seed;
  const reproducesCandidate = reproChecked ? css1 === candidateCss : undefined;
  const pass = identical;
  push({
    challenge: "T3-determinism",
    verdict: pass ? "PASS" : "FAIL",
    rationale: pass
      ? `two pipeline runs for seed "${seed}" are byte-identical (${css1.length} bytes)`
      : `two pipeline runs for seed "${seed}" DIFFER (non-deterministic)`,
    measurements: {
      seed, adjectives, bytesRun1: css1.length, bytesRun2: css2.length,
      byteIdenticalAcrossRuns: identical,
      reproducesOnDiskCandidate: reproducesCandidate, // informational, non-gating
    },
  });
  log(`T3 determinism: ${pass ? "PASS" : "FAIL"} (seed "${seed}"; run1==run2 ${identical}${reproChecked ? `; reproduces on-disk candidate ${reproducesCandidate} [informational]` : ""})`);
}

// ============================================================================
// T4 — Contrast (WCAG 2.1): --od-text/--od-bg and --od-on-accent/--od-accent,
// light + dark, all >= min-contrast. var()-into-ramp resolved before measuring.
// ============================================================================
function runT4() {
  const light = blockDeclarations(candidateCss, /:root(?![\w[])/); // ":root" not ":root["
  const darkOverrides = blockDeclarations(candidateCss, /:root\[data-theme="dark"\]/);
  // dark scheme = light base overridden by the dark block (as the cascade would).
  const dark = new Map(light);
  for (const [k, v] of darkOverrides) dark.set(k, v);

  const PAIRS = [
    { fg: "--od-text", bg: "--od-bg", role: "body text" },
    { fg: "--od-on-accent", bg: "--od-accent", role: "label on accent fill" },
  ];
  const rows = [];
  for (const [mode, map] of [["light", light], ["dark", dark]]) {
    for (const { fg, bg, role } of PAIRS) {
      const fgHex = resolveValue(map, fg);
      const bgHex = resolveValue(map, bg);
      const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
      if (!fgHex || !bgHex || !hexRe.test(fgHex) || !hexRe.test(bgHex)) {
        rows.push({ mode, pair: `${fg}/${bg}`, role, fg: fgHex, bg: bgHex, ratio: null, pass: false, reason: "unresolvable to a hex color" });
        continue;
      }
      const ratio = Math.round(contrastRatio(fgHex, bgHex) * 100) / 100;
      rows.push({ mode, pair: `${fg}/${bg}`, role, fg: fgHex, bg: bgHex, ratio, pass: ratio >= args.minContrast });
    }
  }
  const fails = rows.filter((r) => !r.pass);
  const measurable = rows.filter((r) => r.ratio != null);
  const minRatio = measurable.length ? Math.min(...measurable.map((r) => r.ratio)) : null;
  const pass = fails.length === 0;
  push({
    challenge: "T4-contrast-wcag21",
    verdict: pass ? "PASS" : "FAIL",
    rationale: pass
      ? `all ${rows.length} text/accent pairs clear ${args.minContrast}:1 in both modes (min ${minRatio}:1)`
      : `${fails.length} pair(s) below ${args.minContrast}:1 (or unresolvable)`,
    measurements: { metric: "WCAG 2.1 relative-luminance contrast (colorjs.io)", threshold: args.minContrast, minRatio, rows },
  });
  log(`T4 contrast: ${pass ? "PASS" : "FAIL"} (${rows.length} pairs; min ${minRatio}:1; threshold ${args.minContrast}:1)`);
  for (const r of rows) log(`   - ${r.pass ? "PASS" : "FAIL"} ${r.mode} ${r.pair} ${r.fg}/${r.bg} = ${r.ratio == null ? r.reason : r.ratio + ":1"}`);
}

// ============================================================================
// T5 — Uniqueness: two DIFFERENT seeds -> accent primaries separated by a min hue
// delta AND min ΔE00; same seed -> identical accent (determinism corollary).
// ============================================================================
function accent700(css) {
  const light = blockDeclarations(css, /:root(?![\w[])/);
  return resolveValue(light, "--od-accent-700");
}
function runT5() {
  const prov = parseProvenance(candidateCss);
  const seedA = args.seed || prov.seed || "vasic-digital";
  // pick a distinct second seed
  let seedB = args.seedB;
  if (!seedB) seedB = seedA === "milosvasic" ? "vasic-digital" : "milosvasic";
  let cssA, cssA2, cssB, err;
  try {
    // adjectives only carried through for the candidate's own seed
    const adjA = prov.seed === seedA && !args.seed ? prov.adjectives : [];
    cssA = pipeline(seedA, adjA);
    cssA2 = pipeline(seedA, adjA);
    cssB = pipeline(seedB, []);
  } catch (e) { err = e; }
  if (err) {
    push({ challenge: "T5-uniqueness", verdict: "ERROR", rationale: `pipeline failed: ${err.message}`, measurements: { seedA, seedB } });
    log(`T5 uniqueness: ERROR (${err.message})`);
    return;
  }
  const aHex = accent700(cssA), bHex = accent700(cssB), a2Hex = accent700(cssA2);
  const sameSeedIdentical = aHex === a2Hex;
  const hueA = Math.round(oklchHue(aHex) * 100) / 100;
  const hueB = Math.round(oklchHue(bHex) * 100) / 100;
  const dHue = Math.round(hueDelta(oklchHue(aHex), oklchHue(bHex)) * 100) / 100;
  const dE = Math.round(deltaE00(aHex, bHex) * 100) / 100;
  const distinctPass = dHue >= args.hueThreshold && dE >= args.de00Threshold;
  const pass = sameSeedIdentical && distinctPass && aHex !== bHex;
  push({
    challenge: "T5-uniqueness",
    verdict: pass ? "PASS" : "FAIL",
    rationale: pass
      ? `seeds "${seedA}"/"${seedB}" yield accent-700 separated by hue ${dHue}deg (>=${args.hueThreshold}) and ΔE00 ${dE} (>=${args.de00Threshold}); same seed identical`
      : !sameSeedIdentical
        ? `same seed "${seedA}" produced DIFFERENT accent-700 across runs (${aHex} vs ${a2Hex}) — non-deterministic`
        : `seeds too close: hue delta ${dHue}deg (>=${args.hueThreshold}?), ΔE00 ${dE} (>=${args.de00Threshold}?)`,
    measurements: {
      seedA, seedB, accentA: aHex, accentB: bHex, sameSeedAccent: a2Hex,
      oklchHueA: hueA, oklchHueB: hueB, hueDelta: dHue, hueThreshold: args.hueThreshold,
      deltaE00: dE, de00Threshold: args.de00Threshold, sameSeedIdentical,
    },
  });
  log(`T5 uniqueness: ${pass ? "PASS" : "FAIL"} (${seedA} ${aHex} vs ${seedB} ${bHex}; hue Δ ${dHue}deg, ΔE00 ${dE}; same-seed identical ${sameSeedIdentical})`);
}

// ---- run all ---------------------------------------------------------------
runT1();
await runT2();
runT3();
runT4();
runT5();

const failing = dimensions.filter((d) => d.verdict !== "PASS");
const overall = failing.length === 0 ? "PASS" : "FAIL";
const verdict = {
  feature_class: "design_token_candidate_qa",
  candidate: args.candidate,
  brand: brandPath ? basename(brandPath) : undefined,
  overall,
  failingChallenges: failing.map((d) => d.challenge),
  challenges: dimensions,
};
process.stdout.write(JSON.stringify(verdict, null, 2) + "\n");
log(`\nOVERALL: ${overall}${failing.length ? ` (failing: ${failing.map((d) => `${d.challenge}=${d.verdict}`).join(", ")})` : ""}`);
process.exit(overall === "PASS" ? 0 : 1);
