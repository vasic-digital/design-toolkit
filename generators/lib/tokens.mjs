// The parametric-uniqueness engine core: seed -> design-DNA vector -> DTCG token
// document. Deterministic (see prng.mjs). Pure library — CLI wrapper lives in
// ../gen-tokens.mjs; QA and tests import from here so there is one source of
// truth for how a seed becomes a theme.
//
// References: agents/theming-designer.md (parameter vector, procedure),
// knowledge/material3.md (roles, variants), knowledge/color.md (HCT->scheme),
// knowledge/typography.md (Utopia fluid scales), knowledge/dtcg-tokens.md (shape).

import {
  Hct,
  MaterialDynamicColors,
  hexFromArgb,
  SchemeTonalSpot,
  SchemeVibrant,
  SchemeExpressive,
  SchemeNeutral,
  SchemeMonochrome,
  SchemeFidelity,
  SchemeContent,
  SchemeRainbow,
  SchemeFruitSalad,
} from "@material/material-color-utilities";
import { calculateTypeScale, calculateSpaceScale } from "utopia-core";
import { SeededRandom } from "./prng.mjs";

/** Bumped when the derivation logic changes; part of the determinism contract. */
export const GENERATOR_VERSION = "1.0.0";

// ---- design-DNA option spaces (theming-designer.md "parameter vector") -------

const MCU_VARIANTS = {
  TonalSpot: SchemeTonalSpot,
  Vibrant: SchemeVibrant,
  Expressive: SchemeExpressive,
  Neutral: SchemeNeutral,
  Monochrome: SchemeMonochrome,
  Fidelity: SchemeFidelity,
  Content: SchemeContent,
  Rainbow: SchemeRainbow,
  FruitSalad: SchemeFruitSalad,
};
const VARIANT_NAMES = Object.keys(MCU_VARIANTS);
const HARMONY_RULES = ["complementary", "analogous", "triadic", "split-complementary", "mono"];
const TYPE_RATIOS = [1.2, 1.25, 1.333, 1.5];
const SPACE_MULTIPLIERS = [0.85, 1.0, 1.25];
const RADIUS_BASES = [0, 4, 8, 12, 999];
const CONTRAST_MODES = ["standard", "high", "premium-dark"];

// A small OSS/SIL-OFL font-pair matrix (typography.md §4). Self-hosted at emit;
// never a runtime CDN request.
const FONT_PAIRS = [
  { id: "geometric-modern", display: "Space Grotesk", body: "Inter", mono: "JetBrains Mono", adjectives: ["modern", "minimal", "clean"] },
  { id: "editorial-serif", display: "Fraunces", body: "Inter", mono: "JetBrains Mono", adjectives: ["editorial", "trustworthy"] },
  { id: "humanist-warm", display: "Instrument Sans", body: "Instrument Sans", mono: "JetBrains Mono", adjectives: ["warm", "approachable", "playful"] },
  { id: "grotesque-enterprise", display: "Inter", body: "Inter", mono: "JetBrains Mono", adjectives: ["enterprise", "trustworthy"] },
  { id: "technical-mono", display: "Space Grotesk", body: "Inter", mono: "JetBrains Mono", adjectives: ["technical", "developer"] },
];

// contrastMode -> MCU contrast level (-1..1). standard=0, high/premium bump it.
const CONTRAST_LEVEL = { standard: 0.0, high: 0.5, "premium-dark": 0.3 };

// kebab DTCG token name -> MaterialDynamicColors accessor key (camelCase).
const ROLE_MAP = {
  primary: "primary", "on-primary": "onPrimary",
  "primary-container": "primaryContainer", "on-primary-container": "onPrimaryContainer",
  secondary: "secondary", "on-secondary": "onSecondary",
  "secondary-container": "secondaryContainer", "on-secondary-container": "onSecondaryContainer",
  tertiary: "tertiary", "on-tertiary": "onTertiary",
  "tertiary-container": "tertiaryContainer", "on-tertiary-container": "onTertiaryContainer",
  error: "error", "on-error": "onError",
  "error-container": "errorContainer", "on-error-container": "onErrorContainer",
  background: "background", "on-background": "onBackground",
  surface: "surface", "on-surface": "onSurface",
  "surface-variant": "surfaceVariant", "on-surface-variant": "onSurfaceVariant",
  "surface-container-lowest": "surfaceContainerLowest",
  "surface-container-low": "surfaceContainerLow",
  "surface-container": "surfaceContainer",
  "surface-container-high": "surfaceContainerHigh",
  "surface-container-highest": "surfaceContainerHighest",
  "inverse-surface": "inverseSurface", "inverse-on-surface": "inverseOnSurface",
  "inverse-primary": "inversePrimary",
  outline: "outline", "outline-variant": "outlineVariant",
  scrim: "scrim", shadow: "shadow", "surface-tint": "surfaceTint",
};

// MD3 type-scale role -> Utopia step index (0 = base body). Higher = larger.
const TYPE_ROLE_STEPS = {
  "display-large": 6, "display-medium": 5, "display-small": 4,
  "headline-large": 4, "headline-medium": 3, "headline-small": 3,
  "title-large": 2, "title-medium": 1, "title-small": 0,
  "body-large": 0, "body-medium": 0, "body-small": -1,
  "label-large": 0, "label-medium": -1, "label-small": -1,
};

// Named space steps mapped onto Utopia's scale positions.
const SPACE_STEPS = ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl"];

// Radius scale (M3 shape scale) derived from radiusBase.
function radiusScale(radiusBase) {
  if (radiusBase >= 999) {
    return { none: 0, xs: 8, sm: 16, md: 24, lg: 32, xl: 48, full: 9999 };
  }
  const b = radiusBase;
  return {
    none: 0,
    xs: Math.max(2, Math.round(b * 0.5)),
    sm: Math.max(4, b),
    md: Math.max(6, Math.round(b * 1.5)),
    lg: Math.max(8, b * 2),
    xl: Math.max(12, Math.round(b * 3.5)),
    full: 9999,
  };
}

/**
 * Resolve a seed (and optional brand adjectives) to the full design-DNA vector.
 * Deterministic: identical inputs -> identical vector.
 * @param {string|number} seed
 * @param {{ adjectives?: string[] }} [opts]
 */
export function deriveVector(seed, opts = {}) {
  const rng = new SeededRandom(seed);
  const adjectives = (opts.adjectives || []).map((a) => a.toLowerCase());

  // Base hue from the first hash word for a stable, well-spread identity color.
  let seedHue = rng.words[0] % 360;
  let mcuVariant = VARIANT_NAMES[rng.words[1] % VARIANT_NAMES.length];
  let harmonyRule = rng.pick(HARMONY_RULES);
  let typeRatio = rng.pick(TYPE_RATIOS);
  let spaceMultiplier = rng.pick(SPACE_MULTIPLIERS);
  let radiusBase = rng.pick(RADIUS_BASES);
  let contrastMode = rng.pick(CONTRAST_MODES);
  let fontPair = rng.pick(FONT_PAIRS);

  // Adjective nudges (theming-designer.md heuristics) — deterministic overrides.
  const has = (w) => adjectives.includes(w);
  if (has("modern") || has("minimal")) { mcuVariant = "Neutral"; radiusBase = 8; typeRatio = 1.25; }
  if (has("enterprise") || has("trustworthy")) { mcuVariant = "TonalSpot"; radiusBase = 4; typeRatio = 1.25; }
  if (has("playful")) { mcuVariant = "Expressive"; radiusBase = 999; typeRatio = 1.333; }
  if (has("editorial")) { mcuVariant = "Fidelity"; typeRatio = 1.5; }
  if (has("technical") || has("developer")) { mcuVariant = "Monochrome"; radiusBase = 0; contrastMode = "high"; }
  const matched = FONT_PAIRS.find((p) => p.adjectives.some((a) => adjectives.includes(a)));
  if (matched) fontPair = matched;

  return {
    seed: String(seed),
    adjectives,
    seedHue,
    mcuVariant,
    harmonyRule,
    typeRatio,
    spaceMultiplier,
    radiusBase,
    contrastMode,
    fontPairId: fontPair.id,
    fontPair,
    generatorVersion: GENERATOR_VERSION,
  };
}

/**
 * Build a { kebabTokenName: hex } scheme map for one mode from an MCU scheme.
 * @param {object} scheme MCU DynamicScheme instance
 */
function schemeToHexMap(scheme) {
  const out = {};
  for (const [token, mdcKey] of Object.entries(ROLE_MAP)) {
    out[token] = hexFromArgb(MaterialDynamicColors[mdcKey].getArgb(scheme));
  }
  return out;
}

/**
 * Extract both light and dark hex schemes for a resolved vector.
 * Also returned separately so QA/tests can run the contrast gate without
 * re-parsing the DTCG document.
 * @param {ReturnType<typeof deriveVector>} vector
 * @returns {{ light: Record<string,string>, dark: Record<string,string> }}
 */
export function buildSchemes(vector) {
  const SchemeClass = MCU_VARIANTS[vector.mcuVariant];
  const level = CONTRAST_LEVEL[vector.contrastMode] ?? 0.0;
  // Moderate source chroma/tone; the variant recomputes the tonal palettes.
  const source = Hct.from(vector.seedHue, 40, 40);
  return {
    light: schemeToHexMap(new SchemeClass(source, false, level)),
    dark: schemeToHexMap(new SchemeClass(source, true, level)),
  };
}

function buildTypeScale(vector) {
  const steps = calculateTypeScale({
    minWidth: 320,
    maxWidth: 1240,
    minFontSize: 16,
    maxFontSize: 18,
    minTypeScale: Math.min(vector.typeRatio, 1.2),
    maxTypeScale: vector.typeRatio,
    positiveSteps: 6,
    negativeSteps: 2,
  });
  const byStep = new Map(steps.map((s) => [s.step, s]));
  const roles = {};
  for (const [role, step] of Object.entries(TYPE_ROLE_STEPS)) {
    const s = byStep.get(step) || byStep.get(0);
    roles[role] = {
      $value: { value: Math.round(s.maxFontSize * 1000) / 1000, unit: "px" },
      $type: "dimension",
      // Fluid formula preserved as a non-standard extension so OpenDesign can
      // emit clamp() while the $value stays DTCG-valid.
      $extensions: { "digital.vasic.fluid": s.clamp },
    };
  }
  return roles;
}

function buildSpaceScale(vector) {
  const m = vector.spaceMultiplier;
  const scale = calculateSpaceScale({
    minWidth: 320,
    maxWidth: 1240,
    minSize: 16 * m,
    maxSize: 18 * m,
    positiveSteps: [1.5, 2, 3, 4],
    negativeSteps: [0.75, 0.5, 0.25],
  });
  // Utopia returns ordered sizes small->large; align to our named steps.
  const sizes = scale.sizes;
  const tokens = {};
  const n = Math.min(SPACE_STEPS.length, sizes.length);
  for (let i = 0; i < n; i++) {
    const s = sizes[i];
    tokens[SPACE_STEPS[i]] = {
      $value: { value: Math.round(s.maxSize * 1000) / 1000, unit: "px" },
      $type: "dimension",
      $extensions: { "digital.vasic.fluid": s.clamp },
    };
  }
  return tokens;
}

function colorGroup(schemes) {
  const toTokens = (map) => {
    const g = {};
    for (const [name, hex] of Object.entries(map)) g[name] = { $value: hex };
    return g;
  };
  return { $type: "color", light: toTokens(schemes.light), dark: toTokens(schemes.dark) };
}

function dimensionTokens(map) {
  const g = { $type: "dimension" };
  for (const [k, v] of Object.entries(map)) g[k] = { $value: { value: v, unit: "px" } };
  return g;
}

/**
 * Full generation: seed -> DTCG token document + the raw schemes/vector.
 * @param {string|number} seed
 * @param {{ adjectives?: string[] }} [opts]
 * @returns {{ vector: object, schemes: {light:Record<string,string>,dark:Record<string,string>}, document: object }}
 */
export function generateTokens(seed, opts = {}) {
  const vector = deriveVector(seed, opts);
  const schemes = buildSchemes(vector);

  const document = {
    $description:
      `Generated by @vasic-digital/design-toolkit-generators v${GENERATOR_VERSION} ` +
      `from seed="${vector.seed}" variant=${vector.mcuVariant} hue=${vector.seedHue} ` +
      `harmony=${vector.harmonyRule} typeRatio=${vector.typeRatio} ` +
      `space=${vector.spaceMultiplier} radius=${vector.radiusBase} ` +
      `contrast=${vector.contrastMode} fontPair=${vector.fontPairId}. ` +
      `Deterministic: same seed+options+version => identical output.`,
    $extensions: {
      "digital.vasic.provenance": {
        seed: vector.seed,
        adjectives: vector.adjectives,
        vector: {
          seedHue: vector.seedHue,
          mcuVariant: vector.mcuVariant,
          harmonyRule: vector.harmonyRule,
          typeRatio: vector.typeRatio,
          spaceMultiplier: vector.spaceMultiplier,
          radiusBase: vector.radiusBase,
          contrastMode: vector.contrastMode,
          fontPairId: vector.fontPairId,
        },
        generatorVersion: GENERATOR_VERSION,
      },
    },
    color: colorGroup(schemes),
    dimension: {
      space: { $type: "dimension", ...buildSpaceScale(vector) },
      radius: dimensionTokens(radiusScale(vector.radiusBase)),
    },
    typography: {
      "font-family": {
        $type: "fontFamily",
        display: { $value: [vector.fontPair.display, "system-ui", "sans-serif"] },
        body: { $value: [vector.fontPair.body, "system-ui", "sans-serif"] },
        mono: { $value: [vector.fontPair.mono, "ui-monospace", "monospace"] },
      },
      "type-scale": { $type: "dimension", ...buildTypeScale(vector) },
    },
  };

  return { vector, schemes, document };
}
