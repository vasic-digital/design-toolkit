#!/usr/bin/env node
// =============================================================================
// dtcg-to-od.mjs — the "hybrid direction-generator" bridge (Helix §11.4.162).
//
// Deterministic converter: DTCG design-token document (from gen-tokens.mjs) ->
// the sites' `--od-*` CSS custom-property contract (the token layer that
// design-system/brand-*/*.css defines). Pure function of the input JSON — no
// Date, no random, no network — so identical input => byte-identical CSS.
//
//   node dtcg-to-od.mjs --in tokens.json --out out.css
//   node gen-tokens.mjs --seed s --adjectives a,b --stdout | node dtcg-to-od.mjs --stdin --stdout
//
// The M3 role -> --od-* mapping and every synthesized (not-seed-derived) token
// is documented inline below and echoed into the emitted file's header comment.
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { TonalPalette, argbFromHex, hexFromArgb, Blend } from "@material/material-color-utilities";

// ---- CLI -------------------------------------------------------------------
function parseArgs(argv) {
  const a = { in: undefined, out: undefined, stdin: false, stdout: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--in") a.in = argv[++i];
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--stdin") a.stdin = true;
    else if (t === "--stdout") a.stdout = true;
    else if (t === "--help" || t === "-h") { help(); process.exit(0); }
  }
  return a;
}
function help() {
  process.stdout.write(
    "Usage: node dtcg-to-od.mjs (--in tokens.json | --stdin) (--out out.css | --stdout)\n"
  );
}

// ---- small pure helpers ----------------------------------------------------
const val = (tok) => (tok && tok.$value !== undefined ? tok.$value : undefined);
const fluid = (tok) => tok && tok.$extensions && tok.$extensions["digital.vasic.fluid"];
const px = (tok) => { const v = val(tok); return v && typeof v === "object" ? `${v.value}px` : undefined; };

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
const rgba = (hex, alpha) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${alpha})`; };

// Normalize a clamp()/calc() so a scaled or Utopia-emitted negative slope reads
// as "a - b" instead of the fragile "a + -b" (both parse, but "+ -" trips some
// validators). Pure string transform.
const normClamp = (s) => (typeof s === "string" ? s.replace(/\+\s*-\s*/g, "- ") : s);

// Scale every <number><unit> in a clamp() string by a factor (deterministic,
// used only for the one/few fluid steps the DTCG doc does not itself expose).
function scaleClamp(clampStr, factor) {
  const out = clampStr.replace(/(-?[\d.]+)(rem|vw|px|em)/g, (_, num, unit) => {
    const scaled = Number(num) * factor;
    // trim to 4 decimals, drop trailing zeros
    const s = scaled.toFixed(4).replace(/\.?0+$/, "");
    return `${s}${unit}`;
  });
  return normClamp(out);
}

const fam = (tok) => { const v = val(tok); return Array.isArray(v) ? v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ") : String(v); };

// ---- the 10-step accent ramp (--od-accent-{50..900}) -----------------------
// Derived from the DTCG primary via a material-color-utilities HCT TonalPalette
// (Apache-2.0, the pinned dep). Tones chosen so the 700 slot == M3 primary tone
// (40) => --od-accent-700 reproduces the DTCG primary; 50..900 sweep light->dark.
const RAMP_TONES = [
  ["50", 95], ["100", 90], ["200", 80], ["300", 70], ["400", 60],
  ["500", 50], ["600", 45], ["700", 40], ["800", 30], ["900", 20],
];
function accentRamp(primaryHex) {
  const tp = TonalPalette.fromInt(argbFromHex(primaryHex));
  const out = {};
  for (const [step, tone] of RAMP_TONES) out[step] = hexFromArgb(tp.tone(tone));
  return out;
}

// =============================================================================
// The DIAGRAM SCAFFOLD (--od-diagram-*) and the STATUS FOREGROUNDS
// (--od-status-fg-{light,dark}) — DERIVED, never copied.
//
// WHY THEY ARE DERIVED AND NOT TABULATED. The live design-system/brand-*/*.css
// carries this family as a hand-tuned, brand-NEUTRAL literal table — the same
// nine slate hexes in both brands, by its own comment. Pasting those literals in
// here would satisfy coverage and destroy the premise of this generator: every
// project would inherit vasic.digital's slate diagram palette regardless of its
// seed. The live values are used here ONLY as the evidence for what ROLE each
// token plays; the values below are computed from the design-DNA.
//
// ROLES, established by measuring how design-system/diagrams/*.svg consume them
// (33 diagrams, identical style block; property counts from the SVG CSS):
//   --od-diagram-panel      fill of .box/.accent      — the node plate
//   --od-diagram-panel2     fill of .dash             — the secondary/dashed plate
//   --od-diagram-line       stroke of .box/.dash/.conn and fill of the arrowhead
//                           marker — the neutral hairline (NON-TEXT, 1.4.11 3:1)
//   --od-diagram-ink        fill of .t/.h             — primary label on a plate
//   --od-diagram-muted      fill of .s/.lbl/.note     — secondary label
//   --od-diagram-tint       fill of .tint, stroked with --od-accent — the
//                           ACCENT-tinted plate (the one brand-carrying slot)
//   --od-diagram-good       fill of .good             — success plate
//   --od-diagram-good-line  stroke of .good           — success edge (NON-TEXT)
//   --od-diagram-good-ink   fill of .gt               — label on the success plate
//   --od-status-fg-light    theme-INVARIANT light foreground on the fixed
//                           semantic success fills (.od-badge--status--beta,
//                           --production/--shipped/--active/--stable)
//   --od-status-fg-dark     theme-INVARIANT dark foreground on --od-warning
//                           (.od-badge--status--in-development)
//
// DERIVATION — three HCT tonal palettes, all functions of the DTCG document:
//   scaffold  TonalPalette.fromInt(light `surface-variant`)  = M3's NEUTRAL-VARIANT
//             palette, which carries the seed's own hue and neutral chroma. This
//             is what makes one seed's scaffold warm-tan and another's cool-grey.
//   tint      TonalPalette.fromInt(light `primary`)          = the SAME palette
//             the accent ramp above is built from, so the tinted plate is
//             literally the brand accent at a plate tone.
//   good      TonalPalette.fromInt(Blend.harmonize(SUCCESS_HUE_ANCHOR, primary))
//             A success plate must still read as SUCCESS, so its hue cannot be
//             the seed's. Blend.harmonize rotates the semantic green toward the
//             brand primary by AT MOST 15deg (MCU's own bound) — green stays
//             green, but a warm brand's green is warmed and a cool brand's
//             cooled. HONEST BOUNDARY: two seeds whose primaries share a hue get
//             the SAME good family. That is the semantic constraint doing its
//             job, not a derivation failure, and it is measured in the report.
//   status    TonalPalette.fromInt(light `background`)       = M3's NEUTRAL
//             palette; tone 99/12 are the brand's own near-white / near-black.
//
// TONES were chosen by MEASUREMENT, not taste — every adjacency the SVGs
// actually create is held above its WCAG floor (text 4.5:1, non-text 3:1) across
// every seed probed. The hairline is deliberately DARKER than the live brand
// CSS's, because the live value does not clear its floor: the live
// `--od-diagram-line #94a3b8` on the live `--od-diagram-panel #f8fafc` measures
// **2.45:1** in the light theme, below the 3:1 non-text floor of WCAG 1.4.11.
// (That is a measurement of the live design-system, which this module does not
// own and did not change.) Tone 55 light / 62 dark was picked as the step
// nearest the live one that still clears BOTH plates, not merely the node plate:
// an earlier draft at tone 58 cleared `panel` at 3.20:1 and FAILED `panel2` at
// 2.91:1 — the dashed plate is the tighter of the two and is easy to forget.
// See qa/check-tokens.mjs T4 for the executable assertions.
// =============================================================================
const DIAGRAM_TONES = {
  light: { panel: 98, panel2: 94, ink: 20, muted: 40, line: 55, tint: 92, good: 92, goodLine: 45, goodInk: 25 },
  dark: { panel: 22, panel2: 28, ink: 90, muted: 80, line: 62, tint: 22, good: 18, goodLine: 70, goodInk: 88 },
};
// Tone of the NEUTRAL palette used for each theme-invariant status foreground.
const STATUS_FG_TONES = { light: 99, dark: 12 };
// Tones of the harmonized success palette used for the two semantic success
// FILLS. Both are theme-invariant by design (see emit), which is what the live
// brand CSS says these fills are meant to be.
const SUCCESS_FILL_TONES = { success: 40, badge: 36 };
// The semantic success hue anchor. Same literal this generator already emitted
// for --od-success, kept so the change is a refinement of an existing value
// rather than a new opinion; it is harmonized toward the brand primary before
// any tone is taken from it.
const SUCCESS_HUE_ANCHOR = "#2e7d32";

/** Build the three derived palettes from a DTCG light scheme. Pure. */
function derivedPalettes(lightScheme) {
  const hexOf = (name) => val(lightScheme[name]);
  return {
    scaffold: TonalPalette.fromInt(argbFromHex(hexOf("surface-variant"))),
    tint: TonalPalette.fromInt(argbFromHex(hexOf("primary"))),
    good: TonalPalette.fromInt(
      Blend.harmonize(argbFromHex(SUCCESS_HUE_ANCHOR), argbFromHex(hexOf("primary")))
    ),
    neutral: TonalPalette.fromInt(argbFromHex(hexOf("background"))),
  };
}
const toneHex = (palette, tone) => hexFromArgb(palette.tone(tone));

/** The nine --od-diagram-* values for one theme. Pure. */
function diagramFamily(pal, mode) {
  const t = DIAGRAM_TONES[mode];
  return {
    "ink": toneHex(pal.scaffold, t.ink),
    "muted": toneHex(pal.scaffold, t.muted),
    "line": toneHex(pal.scaffold, t.line),
    "panel": toneHex(pal.scaffold, t.panel),
    "panel2": toneHex(pal.scaffold, t.panel2),
    "tint": toneHex(pal.tint, t.tint),
    "good": toneHex(pal.good, t.good),
    "good-line": toneHex(pal.good, t.goodLine),
    "good-ink": toneHex(pal.good, t.goodInk),
  };
}
const DIAGRAM_ORDER = ["ink", "muted", "line", "panel", "panel2", "tint", "good", "good-line", "good-ink"];

// =============================================================================
// M3 role -> --od-* SEMANTIC MAPPING (documented; see header comment on emit)
//   --od-bg          <- background
//   --od-surface     <- surface-container-low
//   --od-surface-2   <- surface-container
//   --od-text        <- on-background
//   --od-text-muted  <- on-surface-variant
//   --od-border      <- outline-variant
//   --od-on-accent   <- on-primary
//   --od-focus       <- primary @ 0.6 alpha
//   --od-danger      <- error
//   --od-accent(-hover/-active) -> var() into the accent ramp (light: 700/800/900;
//                       dark: 300/200/100 — lighter steps for a dark surface)
// DNA-DERIVED, not an M3 role (see the DIAGRAM SCAFFOLD block above):
//   --od-diagram-*   <- HCT tonal palettes of neutral-variant / primary /
//                       harmonized-success, at measured tones
//   --od-status-fg-* <- neutral palette tone 99 / 12 (theme-invariant)
//   --od-success / --od-badge-success-bg <- harmonized-success tone 40 / 36
//                       (theme-invariant; see the AA finding recorded on emit)
// SYNTHESIZED (not seed-derived; sensible fixed values matching the live CSS):
//   --od-logo-plate  = #ffffff (intentional constant white plate, both themes)
//   --od-warning     = fixed status amber
//   --od-shadow-color = rgba(shadow-role, alpha)
//   named font vars, line-height, tracking, shadow recipes, easing, z, container-max
// =============================================================================

function convert(doc) {
  const L = doc.color && doc.color.light;
  const D = doc.color && doc.color.dark;
  if (!L || !D) throw new Error("input is not a gen-tokens DTCG document (missing color.light/color.dark)");
  const cl = (m, name) => val(m[name]);          // color hex for a role
  const ramp = accentRamp(cl(L, "primary"));

  // --- DNA-derived diagram scaffold + theme-invariant status foregrounds -----
  const pal = derivedPalettes(L);
  const diagram = { light: diagramFamily(pal, "light"), dark: diagramFamily(pal, "dark") };
  const statusFg = {
    light: toneHex(pal.neutral, STATUS_FG_TONES.light),
    dark: toneHex(pal.neutral, STATUS_FG_TONES.dark),
  };
  const successFill = {
    success: toneHex(pal.good, SUCCESS_FILL_TONES.success),
    badge: toneHex(pal.good, SUCCESS_FILL_TONES.badge),
  };

  const ts = doc.typography["type-scale"];
  const sp = doc.dimension.space;
  const rad = doc.dimension.radius;
  const ffam = doc.typography["font-family"];
  const motion = doc.motion || {};

  // --- fluid type scale (clamp()) from DTCG type-scale roles by Utopia step ---
  // fs-base == step 0 (body, ~1rem). The DTCG doc exposes steps -1..6 via roles;
  // fs-xs sits one modular step below the smallest exposed step, so it is
  // synthesized by scaling the step -1 clamp by 1/typeRatio (deterministic).
  const typeRatio = doc.$extensions["digital.vasic.provenance"].vector.typeRatio || 1.25;
  const clampFor = (role) => fluid(ts[role]);
  const fs = {
    sm: clampFor("body-small"),       // step -1
    base: clampFor("body-large"),     // step 0
    lg: clampFor("title-medium"),     // step 1
    xl: clampFor("title-large"),      // step 2
    "2xl": clampFor("headline-medium"), // step 3
    "3xl": clampFor("display-small"), // step 4
  };
  fs.xs = scaleClamp(fs.sm, 1 / typeRatio); // synthesized: one step below sm

  // --- space scale: 8 DTCG steps -> --od-space-1..8; 9..12 scaled from 2xl ----
  const spaceOrder = ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl"];
  const space = {};
  spaceOrder.forEach((k, i) => { if (sp[k]) space[String(i + 1)] = fluid(sp[k]) || px(sp[k]); });
  const top = fluid(sp["2xl"]) || px(sp["2xl"]);
  // synthesized larger steps (documented) — proportional extension of the top step
  [["9", 1.25], ["10", 1.5], ["11", 1.75], ["12", 2.0]].forEach(([k, f]) => {
    space[k] = /clamp\(/.test(top) ? scaleClamp(top, f) : `${(parseFloat(top) * f).toFixed(3)}px`;
  });

  // --- radius: DTCG none/xs/sm/md/lg/xl/full -> sm/md/lg/xl/pill --------------
  const radius = {
    sm: px(rad.sm), md: px(rad.md), lg: px(rad.lg), xl: px(rad.xl), pill: px(rad.full),
  };

  // --- durations derived from the DTCG motion group (ms) ----------------------
  const durMs = (name, fallback) => { const v = val(motion[name]); return v && typeof v === "object" ? `${v.value}ms` : fallback; };

  return { ramp, fs, space, radius, ffam, motion, cl, L, D, durMs, doc, diagram, statusFg, successFill };
}

// ---- CSS emission (deterministic, fixed key order) -------------------------
function emitCss(model, meta) {
  const { ramp, fs, space, radius, ffam, cl, L, D, durMs, diagram, statusFg, successFill } = model;
  const lines = [];
  const p = (s) => lines.push(s);
  // Comment-safe emit: neutralize any "*/" so a comment can never self-close
  // early (a literal like "brand-*/*.css" or interpolated seed/adjectives would
  // otherwise terminate the C-style header comment and break the whole :root rule).
  const pc = (s) => lines.push(String(s).replace(/\*\//g, "* /"));

  // header / provenance comment
  const prov = model.doc.$extensions["digital.vasic.provenance"];
  p("/* =============================================================================");
  p(" * OpenDesign direction-generator candidate — GENERATED, DO NOT EDIT BY HAND.");
  p(" * Produced by design-toolkit/generators/dtcg-to-od.mjs (Helix §11.4.162) from a");
  p(" * deterministic gen-tokens.mjs DTCG document. Staged for review; NOT the live");
  p(" * design-system/brand-<name>/<name>.css.");
  pc(` * seed=\"${prov.seed}\" adjectives=[${(prov.adjectives || []).join(", ")}]`);
  if (prov.anchorHue != null) {
    pc(` * anchor=${prov.anchorColor || prov.anchorHue} (brand-anchored: seedHue = HCT hue ${prov.anchorHue} of anchor)`);
  } else {
    p(" * anchor=(none — free hue derived from seed hash)");
  }
  p(` * vector: variant=${prov.vector.mcuVariant} hue=${prov.vector.seedHue} harmony=${prov.vector.harmonyRule}`);
  p(` *         typeRatio=${prov.vector.typeRatio} space=${prov.vector.spaceMultiplier} radius=${prov.vector.radiusBase}`);
  p(` *         contrast=${prov.vector.contrastMode} fontPair=${prov.vector.fontPairId} generator v${prov.generatorVersion}`);
  p(" *");
  p(" * M3 role -> --od-* mapping:");
  p(" *   --od-bg<-background  --od-surface<-surface-container-low  --od-surface-2<-surface-container");
  p(" *   --od-text<-on-background  --od-text-muted<-on-surface-variant  --od-border<-outline-variant");
  p(" *   --od-on-accent<-on-primary  --od-focus<-primary@0.6  --od-danger<-error");
  p(" *   --od-accent-{50..900} <- HCT TonalPalette of primary (700==primary tone 40)");
  p(" *   --od-accent/-hover/-active -> ramp 700/800/900 (light), 300/200/100 (dark)");
  p(" * DNA-derived (HCT tonal palettes, not M3 roles — see dtcg-to-od.mjs):");
  p(" *   --od-diagram-{ink,muted,line,panel,panel2} <- neutral-VARIANT palette");
  p(" *     (light tones 20/40/55/98/94, dark 90/80/62/22/28)");
  p(" *   --od-diagram-tint <- primary palette (light 92, dark 22)");
  p(" *   --od-diagram-good{,-line,-ink} <- success hue harmonized <=15deg toward");
  p(" *     primary (light tones 92/45/25, dark 18/70/88)");
  p(" *   --od-status-fg-{light,dark} <- neutral palette tone 99/12, theme-INVARIANT");
  p(" *   --od-success/--od-badge-success-bg <- harmonized success tone 40/36,");
  p(" *     theme-INVARIANT (a fill that flipped under a fixed foreground measured");
  p(" *     4.26:1 in dark — below WCAG AA; see the T4 status pairs)");
  p(" * Synthesized constants: --od-logo-plate(#fff), --od-warning, shadow recipes,");
  p(" *   line-height, tracking, easing, z-index, container-max, named font vars.");
  p(" * ========================================================================== */");
  p("");

  // ---- :root (light) --------------------------------------------------------
  p(":root {");
  p("  /* Accent ramp — HCT tonal palette of the DTCG primary. */");
  for (const [step] of RAMP_TONES) p(`  --od-accent-${step}: ${ramp[step]};`);
  p("");
  p("  /* Surfaces & text (M3 light roles). */");
  p(`  --od-bg: ${cl(L, "background")};`);
  p("  --od-logo-plate: #ffffff; /* synthesized: constant white plate (both themes) */");
  p(`  --od-surface: ${cl(L, "surface-container-low")};`);
  p(`  --od-surface-2: ${cl(L, "surface-container")};`);
  p(`  --od-text: ${cl(L, "on-background")};`);
  p(`  --od-text-muted: ${cl(L, "on-surface-variant")};`);
  p(`  --od-border: ${cl(L, "outline-variant")};`);
  p("");
  p("  /* Accent semantics. */");
  p("  --od-accent: var(--od-accent-700);");
  p("  --od-accent-hover: var(--od-accent-800);");
  p("  --od-accent-active: var(--od-accent-900);");
  p(`  --od-on-accent: ${cl(L, "on-primary")};`);
  p(`  --od-focus: ${rgba(cl(L, "primary"), 0.6)};`);
  p("");
  p("  /* Status (danger<-M3 error; warning synthesized; success DNA-derived). */");
  p("  /* --od-success and --od-badge-success-bg are the semantic success FILLS a");
  p("     status pill paints behind --od-status-fg-light. They are deliberately NOT");
  p("     re-declared in the dark blocks: a fixed foreground over a fill that flips");
  p("     with the theme cannot clear AA in both themes, and the flipping fill this");
  p("     generator used to emit (#2b8a3e) measured 4.26:1 under ANY light");
  p("     foreground — below WCAG AA 4.5:1. Tone 40/36 of the harmonized success");
  p("     palette clears it in both themes with the derived --od-status-fg-light. */");
  p(`  --od-success: ${successFill.success};`);
  p("  --od-warning: #d97706;");
  p(`  --od-danger: ${cl(L, "error")};`);
  p(`  --od-badge-success-bg: ${successFill.badge};`);
  p(`  --od-shadow-color: ${rgba(cl(L, "shadow") || "#000000", 0.12)};`);
  p("");
  p("  /* Theme-INVARIANT status-pill foregrounds — neutral palette tone 99/12. */");
  p(`  --od-status-fg-light: ${statusFg.light};`);
  p(`  --od-status-fg-dark: ${statusFg.dark};`);
  p("");
  p("  /* Diagram scaffold (§11.4.162) — DNA-derived, see dtcg-to-od.mjs. */");
  for (const k of DIAGRAM_ORDER) p(`  --od-diagram-${k}: ${diagram.light[k]};`);
  p("");
  p("  /* Fonts (display/body/mono from DTCG; named vars kept for compatibility). */");
  p(`  --od-font-display: ${fam(ffam.display)};`);
  p(`  --od-font-body: ${fam(ffam.body)};`);
  p(`  --od-font-mono: ${fam(ffam.mono)};`);
  p('  --od-font-space-grotesk: "Space Grotesk", sans-serif;');
  p('  --od-font-inter: "Inter", sans-serif;');
  p('  --od-font-jetbrains-mono: "JetBrains Mono", monospace;');
  p("");
  p("  /* Fluid type scale (clamp()) from the DTCG type-scale. */");
  for (const k of ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"]) p(`  --od-fs-${k}: ${normClamp(fs[k])};`);
  p("");
  p("  /* Line-height & tracking (synthesized constants). */");
  p("  --od-lh-tight: 1.2;");
  p("  --od-lh-normal: 1.5;");
  p("  --od-lh-loose: 1.8;");
  p("  --od-tracking-tight: -0.02em;");
  p("  --od-tracking-normal: 0;");
  p("  --od-tracking-wide: 0.08em;");
  p("");
  p("  /* Space scale from the DTCG dimension.space. */");
  for (let i = 1; i <= 12; i++) p(`  --od-space-${i}: ${normClamp(space[String(i)])};`);
  p("");
  p("  /* Radius from the DTCG dimension.radius. */");
  p(`  --od-radius-sm: ${radius.sm};`);
  p(`  --od-radius-md: ${radius.md};`);
  p(`  --od-radius-lg: ${radius.lg};`);
  p(`  --od-radius-xl: ${radius.xl};`);
  p(`  --od-radius-pill: ${radius.pill};`);
  p("");
  p("  /* Shadow recipes (synthesized; use --od-shadow-color/--od-border). */");
  p("  --od-shadow-sm: 0 1px 2px 0 var(--od-shadow-color);");
  p("  --od-shadow-md: 0 4px 6px -1px var(--od-shadow-color), 0 2px 4px -1px var(--od-shadow-color);");
  p("  --od-shadow-lg: 0 10px 15px -3px var(--od-shadow-color), 0 4px 6px -2px var(--od-shadow-color);");
  p("");
  p("  /* Motion durations from the DTCG motion group; easing synthesized. */");
  p(`  --od-dur-fast: ${durMs("quick", "150ms")};`);
  p(`  --od-dur-base: ${durMs("standard", "250ms")};`);
  p(`  --od-dur-slow: ${durMs("emphasized", "350ms")};`);
  p("  --od-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);");
  p("  --od-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);");
  p("");
  p("  /* Z-index & layout (synthesized constants). */");
  p("  --od-z-nav: 1000;");
  p("  --od-z-modal: 1100;");
  p("  --od-z-toast: 1200;");
  p("  --od-container-max: 1200px;");
  p("}");
  p("");

  // ---- dark override block (shared between explicit + media) -----------------
  const darkVars = [
    `  --od-bg: ${cl(D, "background")};`,
    `  --od-surface: ${cl(D, "surface-container-low")};`,
    `  --od-surface-2: ${cl(D, "surface-container")};`,
    `  --od-text: ${cl(D, "on-background")};`,
    `  --od-text-muted: ${cl(D, "on-surface-variant")};`,
    `  --od-border: ${cl(D, "outline-variant")};`,
    "  --od-accent: var(--od-accent-300);",
    "  --od-accent-hover: var(--od-accent-200);",
    "  --od-accent-active: var(--od-accent-100);",
    `  --od-on-accent: ${cl(D, "on-primary")};`,
    `  --od-focus: ${rgba(cl(D, "primary"), 0.6)};`,
    // --od-success / --od-badge-success-bg are INTENTIONALLY absent here: they
    // sit under the theme-invariant --od-status-fg-light, so flipping them
    // breaks AA in one theme by construction. See the :root block.
    "  --od-warning: #f59e0b;",
    `  --od-danger: ${cl(D, "error")};`,
    `  --od-shadow-color: ${rgba(cl(D, "shadow") || "#000000", 0.5)};`,
    ...DIAGRAM_ORDER.map((k) => `  --od-diagram-${k}: ${diagram.dark[k]};`),
  ];
  p(":root[data-theme=\"dark\"] {");
  darkVars.forEach((l) => p(l));
  p("}");
  p("");
  p("@media (prefers-color-scheme: dark) {");
  p("  :root:not([data-theme=\"light\"]) {");
  darkVars.forEach((l) => p("  " + l));
  p("  }");
  p("}");
  p("");

  return lines.join("\n");
}

// ---- main ------------------------------------------------------------------
const args = parseArgs(process.argv);
let raw;
if (args.stdin) raw = readFileSync(0, "utf8");
else if (args.in) raw = readFileSync(args.in, "utf8");
else { process.stderr.write("error: --in <file> or --stdin required\n"); help(); process.exit(2); }

let doc;
try { doc = JSON.parse(raw); }
catch (e) { process.stderr.write(`error: invalid JSON input: ${e.message}\n`); process.exit(2); }

const model = convert(doc);
const css = emitCss(model) + "";

if (args.out) { writeFileSync(args.out, css); process.stderr.write(`wrote ${args.out}\n`); }
else if (args.stdout) { process.stdout.write(css); }
else { process.stderr.write("error: --out <file> or --stdout required\n"); help(); process.exit(2); }
