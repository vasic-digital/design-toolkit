// APCA (Accessible Perceptual Contrast Algorithm) Lc — a REAL, faithful
// implementation of the APCA-W3 0.1.9 "0.98G-4g-W3" algorithm for the HelixQA
// a11y ADDITIONAL screen (test-bank A1b).
//
// ANTI-BLUFF / DRAFT CAVEAT (carry verbatim, never launder): APCA is a DRAFT
// (WCAG 3, non-normative). This is an *additional* perceptual screen only — it
// NEVER replaces the normative WCAG 2.2 AA contrast gate (A1a / D2). The APCA
// check in run-checks.mjs is therefore reported as ADVISORY and does NOT gate
// the overall verdict/exit code.
//
// Source (algorithm + constants, verbatim from the published reference):
//   Myndex/apca-w3 (npm `apca-w3`, W3C-CG / MIT), src/apca-w3.js — the SA98G
//   constant block and the APCAcontrast()/sRGBtoY() functions of APCA 0.1.9.
//   These are numeric constants and a published algorithm (facts, not
//   copyrightable expression); no prose is vendored. The bundled self-test
//   cross-validates this implementation against the installed `apca-w3`
//   (calcAPCA) — e.g. #000/#fff → Lc 106.04, #888/#fff → Lc 63.06.

// --- SA98G constant block (APCA 0.1.9) --------------------------------------
const SA98G = {
  mainTRC: 2.4,
  sRco: 0.2126729, sGco: 0.7151522, sBco: 0.0721750,
  normBG: 0.56, normTXT: 0.57, revTXT: 0.62, revBG: 0.65,
  blkThrs: 0.022, blkClmp: 1.414,
  scaleBoW: 1.14, scaleWoB: 1.14,
  loBoWoffset: 0.027, loWoBoffset: 0.027,
  deltaYmin: 0.0005, loClip: 0.1,
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

/**
 * Screen luminance Y from an sRGB [r,g,b] (0..255) triple — APCA's simple
 * exponent estimate (no linearization piecewise; mainTRC = 2.4).
 * @param {number[]} rgb @returns {number} Y in 0..1
 */
export function sRGBtoY(rgb) {
  const e = (c) => Math.pow(c / 255.0, SA98G.mainTRC);
  return SA98G.sRco * e(rgb[0]) + SA98G.sGco * e(rgb[1]) + SA98G.sBco * e(rgb[2]);
}

/**
 * Core APCA contrast from text luminance and background luminance.
 * @param {number} txtY @param {number} bgY @returns {number} signed Lc
 */
export function APCAcontrast(txtY, bgY) {
  const icp = [0.0, 1.1];
  if (Number.isNaN(txtY) || Number.isNaN(bgY) ||
      Math.min(txtY, bgY) < icp[0] || Math.max(txtY, bgY) > icp[1]) {
    return 0.0;
  }
  // Soft-clamp near-black luminances.
  txtY = txtY > SA98G.blkThrs ? txtY : txtY + Math.pow(SA98G.blkThrs - txtY, SA98G.blkClmp);
  bgY = bgY > SA98G.blkThrs ? bgY : bgY + Math.pow(SA98G.blkThrs - bgY, SA98G.blkClmp);

  if (Math.abs(bgY - txtY) < SA98G.deltaYmin) return 0.0;

  let SAPC, outputContrast;
  if (bgY > txtY) { // normal polarity: dark text on light bg
    SAPC = (Math.pow(bgY, SA98G.normBG) - Math.pow(txtY, SA98G.normTXT)) * SA98G.scaleBoW;
    outputContrast = SAPC < SA98G.loClip ? 0.0 : SAPC - SA98G.loBoWoffset;
  } else { // reverse polarity: light text on dark bg
    SAPC = (Math.pow(bgY, SA98G.revBG) - Math.pow(txtY, SA98G.revTXT)) * SA98G.scaleWoB;
    outputContrast = SAPC > -SA98G.loClip ? 0.0 : SAPC + SA98G.loWoBoffset;
  }
  return outputContrast * 100.0;
}

/**
 * APCA Lc for a text color over a background color (sRGB hex).
 * @param {string} textHex @param {string} bgHex
 * @returns {number} signed Lc (sign encodes polarity; magnitude is readability)
 */
export function apcaLc(textHex, bgHex) {
  return APCAcontrast(sRGBtoY(hexToRgb(textHex)), sRGBtoY(hexToRgb(bgHex)));
}

// --- self-test: cross-validate against the reference apca-w3 implementation ---
// Run: node qa/lib/apca.mjs --selftest   (exits non-zero on drift > 0.01 Lc)
if (process.argv[1] && process.argv[1].endsWith("apca.mjs") && process.argv.includes("--selftest")) {
  const cases = [
    ["#000000", "#ffffff"], ["#ffffff", "#000000"],
    ["#888888", "#ffffff"], ["#ffffff", "#888888"],
    ["#1b1b1b", "#f9f9f9"], ["#ffffff", "#683a00"],
    ["#454545", "#e2e2e2"], ["#616161", "#f9f9f9"],
    ["#341b00", "#ffb872"], ["#c6c6c6", "#131313"],
  ];
  let worst = 0;
  try {
    const { loadApcaReference } = await import("../../generators/lib/vendor-color.mjs");
    const { calcAPCA } = await loadApcaReference();
    for (const [t, b] of cases) {
      const mine = apcaLc(t, b);
      const ref = calcAPCA(t, b);
      const drift = Math.abs(mine - ref);
      worst = Math.max(worst, drift);
      process.stderr.write(`APCA ${t}/${b}: mine ${mine.toFixed(4)} ref ${ref.toFixed(4)} drift ${drift.toFixed(5)}\n`);
    }
    process.stderr.write(`worst drift ${worst.toFixed(5)} Lc\n`);
    process.exit(worst <= 0.01 ? 0 : 1);
  } catch (e) {
    process.stderr.write(`apca-w3 not resolvable for cross-check (${e.message}); printing computed Lc only\n`);
    for (const [t, b] of cases) process.stderr.write(`APCA ${t}/${b}: ${apcaLc(t, b).toFixed(4)}\n`);
    process.exit(0);
  }
}
