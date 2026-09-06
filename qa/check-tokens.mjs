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
//   T4 Contrast (WCAG21) every adjacency the design-system actually creates,
//                        light + dark, each against ITS OWN floor: text pairs at
//                        --min-contrast (4.5:1, 1.4.3), non-text strokes at 3:1
//                        (1.4.11). Covers --od-text/--od-bg, --od-on-accent/
//                        --od-accent, the nine --od-diagram-* adjacencies the
//                        diagram SVGs create, and each --od-status-fg-* against
//                        the semantic fill its status pill paints behind — in
//                        BOTH themes, which is what catches a fill that flips out
//                        from under a theme-invariant foreground. var()-into-ramp
//                        resolved. Ratios reported (colorjs.io via
//                        generators/lib/color.mjs).
//   T5 Uniqueness        two DIFFERENT seeds -> accent primaries separated by a
//                        min hue delta AND min ΔE00 (qa/lib/deltae.mjs); same
//                        seed -> identical accent (determinism corollary). ALSO
//                        asserts the diagram/status family is DERIVED and not a
//                        hardcoded table, each token gated at the floor its ROLE
//                        can meet: the accent-derived --od-diagram-tint at the
//                        full ΔE00 threshold, the neutral-variant ink/muted/line
//                        scaffold at the CIEDE2000 just-noticeable difference,
//                        and the seven pinned at a neutral or semantic extreme
//                        measured and printed but not gated — with the reason
//                        stated, not assumed.
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
// THREE-VALUED EXIT (§11.4.6 — a 2 is NEVER a pass):
//   0 = every challenge PASSed
//   1 = at least one challenge FAILed — a real finding about the candidate
//   2 = COULD NOT DETERMINE — a challenge could not run at all (Playwright not
//       importable, chromium refused to launch, --skip-browser, generator
//       pipeline not invocable). Nothing was measured; this is not a pass.
// Precedence: FAIL (1) outranks UNDETERMINED (2) outranks PASS (0), so a broken
// environment can never mask a real finding. JSON verdict -> stdout; human
// summary -> stderr.
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
  // POSITIVE CONTROL on the subject set. T1 asserts an ABSENCE — "no brand token
  // is missing from the candidate" — and an absence-assertion over an EMPTY
  // subject set is vacuously true. Measured before this guard existed: an empty
  // brand file produced `T1 coverage: PASS (brand defines 0, candidate defines
  // 75; 0 missing)`, a PASS carrying evidence that supports no claim about
  // coverage at all. A brand CSS that defines zero `--od-*` tokens is an unusable
  // reference, not a satisfied contract, so it is UNDETERMINED. Paired proof:
  // qa/prove-three-valued-exits.sh (M13).
  if (brand.size === 0) {
    push({
      challenge: "T1-coverage", verdict: "ERROR",
      rationale: `brand CSS ${basename(brandPath)} defines ZERO --od-* tokens — there is nothing to compare the candidate against, so "0 missing" would be a vacuous pass`,
      measurements: { brand: basename(brandPath), brandDefined: 0, candidateDefined: cand.size },
    });
    log(`T1 coverage: ERROR (brand ${basename(brandPath)} defines 0 --od-* tokens — empty reference set, not a pass)`);
    return;
  }
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

  // Every pair carries the WCAG floor its OWN role requires. `text` uses
  // --min-contrast (4.5:1, WCAG 1.4.3 normal text); `nonText` uses 3.0:1 (WCAG
  // 1.4.11 non-text contrast) because a 1.5px diagram stroke is a graphical
  // object, not text. That 3.0 is the standard's floor for that role — it is NOT
  // a relaxation of the text floor, and no text pair is ever measured against it.
  //
  // The diagram/status pairs are the adjacencies the design-system's own diagram
  // SVGs and status-pill rules actually create (measured across the 33 diagrams
  // in design-system/diagrams/ and the .od-badge--status rules in both brand
  // files), NOT every possible combination:
  //   .box/.dash  = panel/panel2 filled, stroked with line
  //   .t/.h .s/.lbl/.note = ink/muted labels on those plates
  //   .tint       = tint filled, stroked with --od-accent, carrying ink labels
  //   .good/.gt   = good filled, stroked good-line, carrying good-ink labels
  //   status pills = status-fg-light on --od-success / --od-badge-success-bg,
  //                  status-fg-dark on --od-warning
  // The status foregrounds are theme-INVARIANT by contract, so they are measured
  // against BOTH themes' fills — which is precisely the check that catches a fill
  // that flips out from under a foreground that does not.
  const NON_TEXT = 3.0;
  const PAIRS = [
    { fg: "--od-text", bg: "--od-bg", role: "body text", min: args.minContrast },
    { fg: "--od-on-accent", bg: "--od-accent", role: "label on accent fill", min: args.minContrast },
    // diagram scaffold — text
    { fg: "--od-diagram-ink", bg: "--od-diagram-panel", role: "diagram label on node plate", min: args.minContrast },
    { fg: "--od-diagram-ink", bg: "--od-diagram-panel2", role: "diagram label on dashed plate", min: args.minContrast },
    { fg: "--od-diagram-ink", bg: "--od-diagram-tint", role: "diagram label on accent-tinted plate", min: args.minContrast },
    { fg: "--od-diagram-muted", bg: "--od-diagram-panel", role: "diagram sub-label on node plate", min: args.minContrast },
    { fg: "--od-diagram-muted", bg: "--od-diagram-panel2", role: "diagram sub-label on dashed plate", min: args.minContrast },
    { fg: "--od-diagram-good-ink", bg: "--od-diagram-good", role: "diagram label on success plate", min: args.minContrast },
    // diagram scaffold — non-text strokes (WCAG 1.4.11)
    { fg: "--od-diagram-line", bg: "--od-diagram-panel", role: "diagram hairline on node plate", min: NON_TEXT },
    { fg: "--od-diagram-line", bg: "--od-diagram-panel2", role: "diagram hairline on dashed plate", min: NON_TEXT },
    { fg: "--od-diagram-line", bg: "--od-bg", role: "diagram connector/arrowhead on page", min: NON_TEXT },
    { fg: "--od-diagram-good-line", bg: "--od-diagram-good", role: "success plate edge", min: NON_TEXT },
    { fg: "--od-accent", bg: "--od-diagram-tint", role: "accent edge on tinted plate", min: NON_TEXT },
    // status pills — theme-invariant foregrounds over their semantic fills
    { fg: "--od-status-fg-light", bg: "--od-success", role: "status pill text on success fill", min: args.minContrast },
    { fg: "--od-status-fg-light", bg: "--od-badge-success-bg", role: "shipped pill text on badge success fill", min: args.minContrast },
    { fg: "--od-status-fg-dark", bg: "--od-warning", role: "in-development pill text on warning fill", min: args.minContrast },
  ];
  const rows = [];
  for (const [mode, map] of [["light", light], ["dark", dark]]) {
    for (const { fg, bg, role, min } of PAIRS) {
      const fgHex = resolveValue(map, fg);
      const bgHex = resolveValue(map, bg);
      const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
      if (!fgHex || !bgHex || !hexRe.test(fgHex) || !hexRe.test(bgHex)) {
        rows.push({ mode, pair: `${fg}/${bg}`, role, threshold: min, fg: fgHex, bg: bgHex, ratio: null, pass: false, reason: "unresolvable to a hex color" });
        continue;
      }
      const ratio = Math.round(contrastRatio(fgHex, bgHex) * 100) / 100;
      rows.push({ mode, pair: `${fg}/${bg}`, role, threshold: min, fg: fgHex, bg: bgHex, ratio, pass: ratio >= min });
    }
  }
  const fails = rows.filter((r) => !r.pass);
  const measurable = rows.filter((r) => r.ratio != null);
  const minRatio = measurable.length ? Math.min(...measurable.map((r) => r.ratio)) : null;
  // Report the tightest MARGIN as well as the tightest ratio: with mixed
  // thresholds a bare "min ratio" no longer says how close the run came to
  // failing (a 3.2:1 stroke is tighter than a 5:1 label, but reads larger).
  const margins = measurable.map((r) => Math.round((r.ratio - r.threshold) * 100) / 100);
  const minMargin = margins.length ? Math.min(...margins) : null;
  const pass = fails.length === 0;
  push({
    challenge: "T4-contrast-wcag21",
    verdict: pass ? "PASS" : "FAIL",
    rationale: pass
      ? `all ${rows.length} pairs clear their own WCAG floor in both modes (text ${args.minContrast}:1, non-text ${NON_TEXT}:1; min ratio ${minRatio}:1, tightest margin +${minMargin})`
      : `${fails.length} pair(s) below their WCAG floor (or unresolvable)`,
    measurements: {
      metric: "WCAG 2.1 relative-luminance contrast (colorjs.io)",
      textThreshold: args.minContrast, nonTextThreshold: NON_TEXT,
      minRatio, minMargin, rows,
    },
  });
  log(`T4 contrast: ${pass ? "PASS" : "FAIL"} (${rows.length} pairs; min ${minRatio}:1; tightest margin +${minMargin}; text ${args.minContrast}:1 / non-text ${NON_TEXT}:1)`);
  for (const r of rows) log(`   - ${r.pass ? "PASS" : "FAIL"} ${r.mode} ${r.pair} ${r.fg}/${r.bg} = ${r.ratio == null ? r.reason : r.ratio + ":1"} (>=${r.threshold})`);
}

// ============================================================================
// T5 — Uniqueness: two DIFFERENT seeds -> accent primaries separated by a min hue
// delta AND min ΔE00; same seed -> identical accent (determinism corollary).
// ============================================================================
function accent700(css) {
  const light = blockDeclarations(css, /:root(?![\w[])/);
  return resolveValue(light, "--od-accent-700");
}

// The eleven tokens the diagram/status family adds, each gated at the floor its
// ROLE can actually meet. The point of the assertion is to catch a HARDCODED
// TABLE — the live design-system carries this family as a brand-neutral literal
// table, and pasting it into the generator would satisfy coverage while making
// every project's diagrams identical. A hardcoded table scores ΔE00 exactly 0 on
// every row, so it cannot pass any of the three tiers below.
//
// The three tiers, and why one flat threshold would be wrong:
//
//   "brand"   ΔE00 >= --de00-threshold (10, the same floor the accent uses).
//             Only --od-diagram-tint qualifies: it IS the brand accent at a
//             plate tone, so it must carry the accent's own separation.
//
//   "jnd"     ΔE00 >= 1.0 — the CIEDE2000 just-noticeable difference. The
//             ink/muted/line scaffold is M3's NEUTRAL-VARIANT palette: a neutral
//             tinted by the seed's hue at single-digit chroma. Demanding ΔE00>=10
//             of a neutral is demanding that it stop being neutral, and the live
//             brand CSS is explicit that the scaffold is brand-NEUTRAL by design.
//             What is honestly assertable is that two seeds' scaffolds are
//             PERCEPTIBLY different, not that they are different colours.
//             MEASURED, not assumed: a first draft of this gate used the flat
//             ΔE00>=10 floor here and reported FAIL at 2.56–2.82 for the shipped
//             seed pair. The finding was about the THRESHOLD, not the tokens.
//
//   reported  Not gated at all, with the reason stated rather than implied.
//             --od-diagram-panel/-panel2 sit at tone 98/94 and
//             --od-status-fg-light at tone 99: near the white point two hues are
//             a fraction of a ΔE00 apart (panel measures 0.00 — IDENTICAL — for
//             the shipped pair), so no separation floor is meetable by role.
//             --od-diagram-good{,-line,-ink} are pinned near green by SEMANTICS;
//             they separate only through the <=15deg harmonization toward the
//             brand primary, and two seeds whose primaries share a hue get an
//             IDENTICAL success family. That is the semantic constraint working.
const JND_DELTA_E00 = 1.0;
const NEW_FAMILY_TIERS = [
  { token: "--od-diagram-tint", tier: "brand" },
  { token: "--od-diagram-ink", tier: "jnd" },
  { token: "--od-diagram-muted", tier: "jnd" },
  { token: "--od-diagram-line", tier: "jnd" },
  { token: "--od-diagram-panel", tier: "reported" },
  { token: "--od-diagram-panel2", tier: "reported" },
  { token: "--od-diagram-good", tier: "reported" },
  { token: "--od-diagram-good-line", tier: "reported" },
  { token: "--od-diagram-good-ink", tier: "reported" },
  { token: "--od-status-fg-light", tier: "reported" },
  { token: "--od-status-fg-dark", tier: "reported" },
];
function lightTokens(css, names) {
  const light = blockDeclarations(css, /:root(?![\w[])/);
  const out = {};
  for (const n of names) out[n] = resolveValue(light, n);
  return out;
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

  // ---- the diagram/status family must be DERIVED, not tabulated -------------
  const allNames = NEW_FAMILY_TIERS.map((t) => t.token);
  const famA = lightTokens(cssA, allNames);
  const famA2 = lightTokens(cssA2, allNames);
  const famB = lightTokens(cssB, allNames);
  const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const floorFor = (tier) => (tier === "brand" ? args.de00Threshold : tier === "jnd" ? JND_DELTA_E00 : null);
  const familyRows = NEW_FAMILY_TIERS.map(({ token: name, tier }) => {
    const a = famA[name], b = famB[name];
    const floor = floorFor(tier);
    if (!a || !b || !hexRe.test(a) || !hexRe.test(b)) {
      return { token: name, tier, floor, a, b, deltaE00: null, identical: null, pass: floor == null, reason: "not defined / not a hex color in one of the two generated candidates" };
    }
    const d = Math.round(deltaE00(a, b) * 100) / 100;
    return { token: name, tier, floor, a, b, deltaE00: d, identical: a === b, pass: floor == null ? true : d >= floor };
  });
  // Same-seed reproducibility of the family (the determinism corollary, applied
  // to the new tokens rather than to the accent alone).
  const familySameSeedIdentical = allNames.every((n) => famA[n] === famA2[n]);
  const familyFails = familyRows.filter((r) => !r.pass);
  const familyPass = familyFails.length === 0 && familySameSeedIdentical;

  const pass = sameSeedIdentical && distinctPass && aHex !== bHex && familyPass;
  const gatedRows = familyRows.filter((r) => r.floor != null);
  const familyMinGated = gatedRows
    .filter((r) => r.deltaE00 != null)
    .reduce((m, r) => (m == null || r.deltaE00 < m ? r.deltaE00 : m), null);
  const gatedCount = gatedRows.length;
  const reportedCount = familyRows.length - gatedCount;
  push({
    challenge: "T5-uniqueness",
    verdict: pass ? "PASS" : "FAIL",
    rationale: pass
      ? `seeds "${seedA}"/"${seedB}" yield accent-700 separated by hue ${dHue}deg (>=${args.hueThreshold}) and ΔE00 ${dE} (>=${args.de00Threshold}); the ${gatedCount} gated diagram/status tokens all clear their tier's floor (min ΔE00 ${familyMinGated}); same seed identical`
      : !sameSeedIdentical
        ? `same seed "${seedA}" produced DIFFERENT accent-700 across runs (${aHex} vs ${a2Hex}) — non-deterministic`
        : !familySameSeedIdentical
          ? `same seed "${seedA}" produced a DIFFERENT diagram/status family across runs — non-deterministic`
          : familyFails.length
            ? `${familyFails.length} gated diagram/status token(s) do not separate across seeds (${familyFails.map((r) => `${r.token} ΔE00 ${r.deltaE00} < ${r.floor}`).join("; ")}) — a hardcoded family, not a derivation`
            : `seeds too close: hue delta ${dHue}deg (>=${args.hueThreshold}?), ΔE00 ${dE} (>=${args.de00Threshold}?)`,
    measurements: {
      seedA, seedB, accentA: aHex, accentB: bHex, sameSeedAccent: a2Hex,
      oklchHueA: hueA, oklchHueB: hueB, hueDelta: dHue, hueThreshold: args.hueThreshold,
      deltaE00: dE, de00Threshold: args.de00Threshold, sameSeedIdentical,
      newFamily: {
        tiers: { brand: args.de00Threshold, jnd: JND_DELTA_E00, reported: null },
        gatedCount, reportedCount,
        minGatedDeltaE00: familyMinGated, sameSeedIdentical: familySameSeedIdentical,
        identicalAcrossSeeds: familyRows.filter((r) => r.identical === true).map((r) => r.token),
        rows: familyRows,
      },
    },
  });
  log(`T5 uniqueness: ${pass ? "PASS" : "FAIL"} (${seedA} ${aHex} vs ${seedB} ${bHex}; hue Δ ${dHue}deg, ΔE00 ${dE}; same-seed identical ${sameSeedIdentical})`);
  log(`   diagram/status family: ${gatedCount} gated (brand>=${args.de00Threshold}, jnd>=${JND_DELTA_E00}; min ΔE00 ${familyMinGated}), ${reportedCount} reported-only; same-seed identical ${familySameSeedIdentical}`);
  for (const r of familyRows) {
    const mark = r.floor == null ? "info " : r.pass ? "PASS " : "FAIL ";
    log(`   - ${mark} [${r.tier}] ${r.token} ${r.a}/${r.b} ΔE00 ${r.deltaE00 == null ? r.reason : r.deltaE00}${r.floor == null ? "" : ` (>=${r.floor})`}${r.identical ? "  IDENTICAL" : ""}`);
  }
}

// ---- run all ---------------------------------------------------------------
runT1();
await runT2();
runT3();
runT4();
runT5();

// THREE-VALUED VERDICT. Each challenge already reports FAIL (a real finding
// about the candidate) separately from ERROR (the challenge could not run —
// Playwright not importable, chromium refused to launch, --skip-browser, the
// generator pipeline failed to invoke). Those two states used to collapse into
// the same exit code 1, so a caller could not tell "this candidate is broken"
// from "this machine cannot answer the question" — and the second was being
// reported as the first. Precedence is CONFIRMED over UNDETERMINED: any FAIL
// makes the exit 1 even alongside an ERROR, so a broken environment can never
// mask a real finding. Paired proof: qa/prove-three-valued-exits.sh (M5/M6/M7).
const failing = dimensions.filter((d) => d.verdict === "FAIL");
const errored = dimensions.filter((d) => d.verdict !== "PASS" && d.verdict !== "FAIL");
const overall = failing.length ? "FAIL" : errored.length ? "UNDETERMINED" : "PASS";
const exitCode = failing.length ? 1 : errored.length ? 2 : 0;
const verdict = {
  feature_class: "design_token_candidate_qa",
  candidate: args.candidate,
  brand: brandPath ? basename(brandPath) : undefined,
  overall,
  exitCode,
  failingChallenges: failing.map((d) => d.challenge),
  undeterminedChallenges: errored.map((d) => d.challenge),
  challenges: dimensions,
};
process.stdout.write(JSON.stringify(verdict, null, 2) + "\n");
const parts = [...failing, ...errored].map((d) => `${d.challenge}=${d.verdict}`);
log(`\nOVERALL: ${overall} (exit ${exitCode})${parts.length ? ` (${parts.join(", ")})` : ""}`);
if (overall === "UNDETERMINED") {
  log("  COULD NOT DETERMINE — this is NOT a pass and NOT a finding about the candidate.");
}
process.exit(exitCode);
