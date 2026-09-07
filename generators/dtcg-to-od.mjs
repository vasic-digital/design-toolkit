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
import { TonalPalette, Hct, argbFromHex, hexFromArgb, Blend } from "@material/material-color-utilities";

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

// =============================================================================
// THE COUNTERPOINT PALETTE — the fix for a palette that was measurably monotone.
//
// THE MEASUREMENT THAT MOTIVATED IT, taken before the change with
// qa/check-chromatic-range.mjs --report on the two shipped candidates:
//
//   vasic-digital  light: 3/12 hue bins [0-30 30-60 120-150], span 120deg
//   milosvasic     light: 3/12 hue bins [0-30 30-60 120-150], span 120deg
//
// The two brands occupied the IDENTICAL three bins, in both themes. That is not
// a coincidence and it is the whole diagnosis: every chromatic token this file
// emitted came from exactly three sources — the M3 primary, the semantic success
// green, and a FROZEN amber literal. The seed moved the accent's hue; it moved
// nothing else. A generator whose premise is "different seeds, measurably
// different brands" was shipping every brand the same three-family structure.
//
// WHAT THIS ADDS. A second chromatic family, derived — like everything else here
// — from the DTCG document, and placed by an axis the design-DNA ALREADY carried
// and this file ALREADY printed into its own header but never used for anything:
// `vector.harmonyRule`. Measured before the change: `grep -rn harmonyRule` over
// the generators found it derived in tokens.mjs, echoed into two strings, and
// consumed by NO derivation. A free axis was being spent on a comment.
//
// THE ROTATION TABLE, and the honest part. The classical colour-wheel angles for
// two of these rules are 0deg (mono) and ~30deg (analogous). Both were tried and
// both were REJECTED BY MEASUREMENT, not by taste: at those angles the
// counterpoint lands inside the accent's own 30deg hue bin, so the emitted
// palette still measured 3 bins and a 120deg span — i.e. the change would have
// added a token and fixed nothing. Both shipped seeds resolve to `mono`, so the
// classical table would have left the two live candidates exactly as monotone as
// they started.
//
// So the axis is REPURPOSED, and the cost is stated rather than hidden: these
// five names no longer denote their literal colour-wheel angles. What they still
// do is select five DISTINCT positions on the far arc (120..180deg), which keeps
// harmonyRule a real five-way DNA axis separating seeds. A rule meaning "no
// second hue at all" is precisely the state this module is leaving, so no member
// of the table is below 120deg.
const HARMONY_ROTATION = {
  triadic: 120,
  analogous: 135,
  "split-complementary": 150,
  mono: 165,
  complementary: 180,
};
const DEFAULT_ROTATION = 150; // an unrecognised rule still gets a real counterpoint

// The semantic WARNING hue anchor. This replaces the frozen literals `#d97706`
// (light) and `#f59e0b` (dark) that this file used to emit.
//
// WHY THE LITERAL HAD TO GO, beyond it being hand-painted in a module whose whole
// premise is derivation: `#d97706` sits in the warm-clay/terracotta cluster that
// is the single commonest signature of generated design. Emitting it from a
// BRAND GENERATOR meant every project this toolkit ever produced would carry that
// signature no matter what its seed asked for.
//
// It is harmonized toward the brand primary by the same <=15deg Blend.harmonize
// mechanism the success family already uses, so a warm brand's amber is warmed
// and a cool brand's cooled while amber stays amber.
//
// HONEST BOUNDARY (§11.4.6): for a seed whose accent is ITSELF amber this
// harmonization pulls warning INTO the accent's hue bin rather than widening
// anything — measured on `vasic-digital`, whose primary HCT hue is 62.7 against
// the anchor's 58.0. That is the semantic constraint doing its job (a warning
// must read as a warning), and it is exactly why the counterpoint above, not the
// warning, is what carries the hue widening. Do not credit this token with the
// bin count.
const WARNING_HUE_ANCHOR = "#b45309";
// Tones of the harmonized warning palette per theme. Chosen to sit at the
// lightness the outgoing literals occupied (#d97706 ~ tone 60, #f59e0b ~ tone
// 75) so the change is a re-derivation of an existing value and not a new
// opinion about how bright a warning should be. Both are measured against the
// theme-INVARIANT --od-status-fg-dark in T4, in both themes.
const WARNING_TONES = { light: 60, dark: 75 };
// Tones of the counterpoint palette. panel2 mirrors the scaffold tones it
// replaces (94/28) so the only thing that changed is the HUE, which keeps the
// T4 adjacencies comparable to their pre-change measurements. focus sits mid-ramp
// where a ring must be visible against both a light and a dark surface.
const COUNTER_TONES = { panel2Light: 94, panel2Dark: 28, focusLight: 50, focusDark: 70 };
// FLOOR on the counterpoint's chroma, in HCT chroma units.
//
// MEASURED, not chosen. A 20-seed sweep of the first draft — which took the
// counterpoint's chroma from the primary unconditionally — split into two
// populations: 15 seeds reaching 4-7 hue bins over a 150-270deg span, and 5
// (beta, gamma, epsilon, xi, rho) still stuck at 3 bins / 120deg. All five
// resolve to the `Monochrome` MCU variant, whose primary is greyscale by
// design. The counterpoint inherited that near-zero chroma, so the second hue
// was derived, emitted, and INVISIBLE — the change would have been a no-op for
// a quarter of the seed space, and for every seed carrying the `technical` or
// `developer` adjective, which forces Monochrome outright.
//
// The floor is justified by FUNCTION rather than by the metric it happens to
// move: --od-focus is one of the two consumers, and a focus ring at zero chroma
// is a grey ring around a grey control — the worst available outcome for the one
// token whose entire job is to be findable by a keyboard user. A monochrome
// brand keeping a single restrained accent for secondary structure is also how
// monochrome design systems are actually built; the greyscale ACCENT, which is
// what carries that brand's identity, is untouched.
const MIN_COUNTER_CHROMA = 24;

// Smallest angular distance between two hues, degrees (0..180). Pure.
function hueGap(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}
// Below this HCT chroma the emitted primary carries no usable hue (see the
// Monochrome finding in derivedPalettes).
const PRIMARY_HUE_CHROMA_MIN = 5;
// The counterpoint must stay at least this far (degrees) from EVERY semantic
// hue. See the placement search in derivedPalettes for why one flat clearance
// against a set of hues beats a per-collision patch.
const SEMANTIC_CLEARANCE = 30;

/** Build the derived palettes from a DTCG light scheme + DNA vector. Pure. */
function derivedPalettes(lightScheme, vector) {
  const hexOf = (name) => val(lightScheme[name]);
  const primaryArgb = argbFromHex(hexOf("primary"));
  const primaryHct = Hct.fromInt(primaryArgb);
  const goodArgb = Blend.harmonize(argbFromHex(SUCCESS_HUE_ANCHOR), primaryArgb);
  const warnArgb = Blend.harmonize(argbFromHex(WARNING_HUE_ANCHOR), primaryArgb);

  // BASE HUE — the hue the counterpoint is measured FROM, and the subject of a
  // defect found by the 25-seed sweep rather than by reading the code.
  //
  // Taking it from the emitted primary is correct only while the primary HAS a
  // hue. For the `Monochrome` MCU variant it does not: seeds `beta` (seedHue 8),
  // `gamma` (121) and `epsilon` (170) all emit the IDENTICAL greyscale
  // `--od-accent-700: #5e5e5e`, whose HCT hue is 0 for every one of them. The
  // counterpoint was therefore being derived from a value carrying no seed
  // information at all, so every Monochrome brand in the entire seed space got
  // the SAME second hue — a uniqueness defect, not merely a dull palette.
  //
  // `vector.seedHue` is the seed's identity hue and is always present, so it is
  // the honest fallback: a greyscale brand's one chromatic family should express
  // the seed's own identity, since nothing else in that brand does.
  const baseHue = primaryHct.chroma >= PRIMARY_HUE_CHROMA_MIN
    ? primaryHct.hue
    : (vector && Number.isFinite(vector.seedHue) ? vector.seedHue : primaryHct.hue);

  const rotation = HARMONY_ROTATION[vector && vector.harmonyRule] ?? DEFAULT_ROTATION;
  const achromaticAccent = primaryHct.chroma < PRIMARY_HUE_CHROMA_MIN;

  // ---- PLACING THE COUNTERPOINT -------------------------------------------
  //
  // A harmony rotation is defined RELATIVE TO A HUE THAT EXISTS. When the accent
  // is achromatic there is nothing to be a counterpoint TO, so rotating away
  // from it is meaningless — and measurably harmful: seed `rho` (seedHue 252,
  // `mono`) rotated its counterpoint to 57deg, straight onto the semantic
  // warning amber, while the seed's own identity hue at 252deg — the one hue a
  // greyscale brand expresses nowhere else — sat unused across the wheel. So for
  // an achromatic accent the FIRST candidate is the seed hue itself.
  //
  // SEMANTIC CLEARANCE. The counterpoint carries SECONDARY STRUCTURE: the dashed
  // diagram plate and the focus ring. Landing it on a semantic hue costs the
  // interface a signal — a dashed plate and a "this succeeded" plate become the
  // same green, and the reader has to recover the difference from shape alone.
  // So candidates are tried in order and the first one clearing EVERY semantic
  // hue by SEMANTIC_CLEARANCE wins.
  //
  // Two collisions were found by the 25-seed sweep, not by reading the code, and
  // they collided with DIFFERENT semantics — `beta` at 143deg against success
  // ~140, `rho` at 57deg against warning ~57. That is why this is one search
  // over a set of semantic hues rather than a special case per collision: fixing
  // the success collision alone left the warning collision standing.
  const semanticHues = [goodArgb, warnArgb, argbFromHex(hexOf("error"))]
    .map((a) => Hct.fromInt(a).hue)
    .filter((h) => Number.isFinite(h));
  const clears = (h) => semanticHues.every((sh) => hueGap(h, sh) >= SEMANTIC_CLEARANCE);
  const norm = (h) => ((h % 360) + 360) % 360;

  // Ordered candidates. The first is the intended placement; the rest are
  // fallbacks in decreasing fidelity to the harmony rule, all deterministic.
  const offsets = achromaticAccent
    ? [0, 120, -120, 60, -60]
    : [rotation, -rotation, rotation + 45, -(rotation + 45)];
  const candidates = offsets.map((o) => ({ offset: o, hue: norm(baseHue + o) }));
  const chosen = candidates.find((c) => clears(c.hue)) || candidates[0];
  const counterHue = chosen.hue;

  return {
    scaffold: TonalPalette.fromInt(argbFromHex(hexOf("surface-variant"))),
    tint: TonalPalette.fromInt(primaryArgb),
    // The counterpoint carries the ACCENT'S OWN CHROMA, not a fixed one: a
    // Monochrome-variant seed has a low-chroma primary and gets a restrained
    // counterpoint, a Vibrant seed gets a vivid one. The second hue therefore
    // inherits the brand's intensity instead of imposing a new one.
    counter: TonalPalette.fromHueAndChroma(counterHue, Math.max(primaryHct.chroma, MIN_COUNTER_CHROMA)),
    good: TonalPalette.fromInt(goodArgb),
    warn: TonalPalette.fromInt(warnArgb),
    neutral: TonalPalette.fromInt(argbFromHex(hexOf("background"))),
    counterRotation: Math.round(chosen.offset * 100) / 100,
    counterHue: Math.round(counterHue * 100) / 100,
    // True when the intended harmony placement collided with a semantic hue and
    // a fallback candidate was taken instead.
    counterReflected: chosen.offset !== offsets[0],
    counterAchromaticAccent: achromaticAccent,
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
    // The DASHED/secondary plate is the counterpoint's first consumer, and it was
    // chosen because it is PAINTED: design-system/diagrams/ has 33 SVGs whose
    // .dash rule fills with this token. Deriving it from the counterpoint palette
    // instead of the scaffold puts a genuine second hue into rendered output
    // rather than into a token nothing references — a new unconsumed ramp would
    // have moved the chromatic-range metric while changing no pixel, which is
    // gaming the gate rather than fixing the design.
    "panel2": toneHex(pal.counter, mode === "light" ? COUNTER_TONES.panel2Light : COUNTER_TONES.panel2Dark),
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
//   --od-danger      <- error
//   --od-accent(-hover/-active) -> var() into the accent ramp (light: 700/800/900;
//                       dark: 300/200/100 — lighter steps for a dark surface)
// DNA-DERIVED, not an M3 role (see the DIAGRAM SCAFFOLD block above):
//   --od-diagram-*   <- HCT tonal palettes of neutral-variant / primary /
//                       COUNTERPOINT / harmonized-success, at measured tones
//   --od-focus       <- COUNTERPOINT tone 50/70 @ 0.6 alpha (a ring in the
//                       accent's own hue is the hardest ring to see)
//   --od-warning     <- warning-amber hue harmonized <=15deg toward primary,
//                       tone 60/75 (was the frozen #d97706 / #f59e0b)
//   --od-status-fg-* <- neutral palette tone 99 / 12 (theme-invariant)
//   --od-success / --od-badge-success-bg <- harmonized-success tone 40 / 36
//                       (theme-invariant; see the AA finding recorded on emit)
// SYNTHESIZED (not seed-derived; sensible fixed values matching the live CSS):
//   --od-logo-plate  = #ffffff (intentional constant white plate, both themes)
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
  const pal = derivedPalettes(L, doc.$extensions["digital.vasic.provenance"].vector);
  const diagram = { light: diagramFamily(pal, "light"), dark: diagramFamily(pal, "dark") };
  const statusFg = {
    light: toneHex(pal.neutral, STATUS_FG_TONES.light),
    dark: toneHex(pal.neutral, STATUS_FG_TONES.dark),
  };
  const successFill = {
    success: toneHex(pal.good, SUCCESS_FILL_TONES.success),
    badge: toneHex(pal.good, SUCCESS_FILL_TONES.badge),
  };
  // Semantic warning, DERIVED (replaces the frozen #d97706 / #f59e0b literals).
  const warning = {
    light: toneHex(pal.warn, WARNING_TONES.light),
    dark: toneHex(pal.warn, WARNING_TONES.dark),
  };
  // Focus ring, DERIVED from the counterpoint rather than from the accent. A
  // ring in the SAME hue as the control it surrounds is the hardest ring to
  // see; the second hue is what makes keyboard focus locatable, so this is the
  // counterpoint's second real consumer rather than decoration.
  const focus = {
    light: toneHex(pal.counter, COUNTER_TONES.focusLight),
    dark: toneHex(pal.counter, COUNTER_TONES.focusDark),
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

  return { ramp, fs, space, radius, ffam, motion, cl, L, D, durMs, doc, diagram, statusFg, successFill, warning, focus, pal };
}

// ---- CSS emission (deterministic, fixed key order) -------------------------
function emitCss(model, meta) {
  const { ramp, fs, space, radius, ffam, cl, L, D, durMs, diagram, statusFg, successFill, warning, focus, pal } = model;
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
  p(" *   --od-on-accent<-on-primary  --od-danger<-error");
  p(" *   --od-accent-{50..900} <- HCT TonalPalette of primary (700==primary tone 40)");
  p(" *   --od-accent/-hover/-active -> ramp 700/800/900 (light), 300/200/100 (dark)");
  p(" * DNA-derived (HCT tonal palettes, not M3 roles — see dtcg-to-od.mjs):");
  p(" *   --od-diagram-{ink,muted,line,panel} <- neutral-VARIANT palette");
  p(" *     (light tones 20/40/55/98, dark 90/80/62/22)");
  p(" *   --od-diagram-tint <- primary palette (light 92, dark 22)");
  p(` *   COUNTERPOINT palette: hue ${Math.round(pal.counterHue)}deg`);
  p(` *     (= accent hue ${pal.counterRotation >= 0 ? "+" : "-"} ${Math.abs(pal.counterRotation)}deg, placed by vector.harmonyRule` +
    `${pal.counterAchromaticAccent ? " from the SEED hue — the accent is achromatic" : ""}` +
    `${pal.counterReflected ? "; moved to clear a semantic hue" : ""}), at the`);
  p(" *     accent's own chroma (floored at 24). Consumers: --od-diagram-panel2");
  p(" *     (light 94, dark 28) and --od-focus (light 50, dark 70 @ 0.6 alpha).");
  p(" *   --od-warning <- warning-amber harmonized <=15deg toward primary,");
  p(" *     tone 60 light / 75 dark (replaces the frozen #d97706 / #f59e0b)");
  p(" *   --od-diagram-good{,-line,-ink} <- success hue harmonized <=15deg toward");
  p(" *     primary (light tones 92/45/25, dark 18/70/88)");
  p(" *   --od-status-fg-{light,dark} <- neutral palette tone 99/12, theme-INVARIANT");
  p(" *   --od-success/--od-badge-success-bg <- harmonized success tone 40/36,");
  p(" *     theme-INVARIANT (a fill that flipped under a fixed foreground measured");
  p(" *     4.26:1 in dark — below WCAG AA; see the T4 status pairs)");
  p(" * Synthesized constants: --od-logo-plate(#fff), shadow recipes,");
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
  p(`  --od-focus: ${rgba(focus.light, 0.6)};`);
  p("");
  p("  /* Status (danger<-M3 error; warning + success both DNA-derived). */");
  p("  /* --od-success and --od-badge-success-bg are the semantic success FILLS a");
  p("     status pill paints behind --od-status-fg-light. They are deliberately NOT");
  p("     re-declared in the dark blocks: a fixed foreground over a fill that flips");
  p("     with the theme cannot clear AA in both themes, and the flipping fill this");
  p("     generator used to emit (#2b8a3e) measured 4.26:1 under ANY light");
  p("     foreground — below WCAG AA 4.5:1. Tone 40/36 of the harmonized success");
  p("     palette clears it in both themes with the derived --od-status-fg-light. */");
  p(`  --od-success: ${successFill.success};`);
  p(`  --od-warning: ${warning.light};`);
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
    `  --od-focus: ${rgba(focus.dark, 0.6)};`,
    // --od-success / --od-badge-success-bg are INTENTIONALLY absent here: they
    // sit under the theme-invariant --od-status-fg-light, so flipping them
    // breaks AA in one theme by construction. See the :root block.
    `  --od-warning: ${warning.dark};`,
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
