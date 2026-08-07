// Color measurement helpers — the hard contrast gate (color.md §4) and the
// hue-variance primitive behind the uniqueness engine. All measurements use
// colorjs.io (real WCAG 2.1/2.2 relative-luminance contrast, real OKLCH hue).

import Color from "colorjs.io";

/**
 * WCAG 2.x relative-luminance contrast ratio between two hex colors.
 * @param {string} fgHex @param {string} bgHex @returns {number} ratio (1..21)
 */
export function contrastRatio(fgHex, bgHex) {
  return new Color(fgHex).contrast(new Color(bgHex), "WCAG21");
}

/**
 * OKLCH hue (degrees, 0..360) of a color — the perceptual hue used to measure
 * cross-seed palette distinctness. Achromatic colors report hue NaN in OKLCH;
 * callers guard for that.
 * @param {string} hex @returns {number} hue in degrees, or NaN if achromatic
 */
export function oklchHue(hex) {
  const h = new Color(hex).to("oklch").coords[2];
  return Number.isNaN(h) ? NaN : ((h % 360) + 360) % 360;
}

/**
 * Smallest angular distance between two hues on the 0..360 circle (0..180).
 * @param {number} a @param {number} b @returns {number}
 */
export function hueDelta(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// WCAG thresholds per size/role class (color.md §4).
export const THRESHOLDS = {
  text: 4.5,        // normal text vs background
  largeText: 3.0,   // >=24px / >=18.66px bold
  ui: 3.0,          // 1.4.11 UI component / graphic edge
};

/**
 * Semantic foreground/background pairs the contrast gate must clear, evaluated
 * independently for the light and dark schemes. Names match the emitted DTCG
 * token names (kebab-case M3 roles).
 * @type {{ fg: string, bg: string, kind: keyof typeof THRESHOLDS }[]}
 */
export const SEMANTIC_PAIRS = [
  { fg: "on-primary", bg: "primary", kind: "text" },
  { fg: "on-secondary", bg: "secondary", kind: "text" },
  { fg: "on-tertiary", bg: "tertiary", kind: "text" },
  { fg: "on-error", bg: "error", kind: "text" },
  { fg: "on-primary-container", bg: "primary-container", kind: "text" },
  { fg: "on-secondary-container", bg: "secondary-container", kind: "text" },
  { fg: "on-tertiary-container", bg: "tertiary-container", kind: "text" },
  { fg: "on-error-container", bg: "error-container", kind: "text" },
  { fg: "on-surface", bg: "surface", kind: "text" },
  { fg: "on-surface-variant", bg: "surface-variant", kind: "text" },
  { fg: "on-background", bg: "background", kind: "text" },
  { fg: "inverse-on-surface", bg: "inverse-surface", kind: "text" },
  // UI / graphic edges (1.4.11) — outline must be distinguishable on surfaces.
  { fg: "outline", bg: "surface", kind: "ui" },
  { fg: "outline", bg: "background", kind: "ui" },
];

/**
 * Evaluate every semantic pair in a single scheme (a { tokenName: hex } map).
 * @param {Record<string,string>} scheme
 * @param {string} mode  "light" | "dark" (for reporting)
 * @returns {{ mode:string, fg:string, bg:string, kind:string, ratio:number, threshold:number, pass:boolean }[]}
 */
export function evaluateScheme(scheme, mode) {
  const rows = [];
  for (const { fg, bg, kind } of SEMANTIC_PAIRS) {
    if (scheme[fg] == null || scheme[bg] == null) continue;
    const ratio = contrastRatio(scheme[fg], scheme[bg]);
    const threshold = THRESHOLDS[kind];
    rows.push({
      mode, fg, bg, kind,
      ratio: Math.round(ratio * 100) / 100,
      threshold,
      pass: ratio >= threshold,
    });
  }
  return rows;
}
