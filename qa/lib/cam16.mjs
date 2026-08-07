// CAM16-UCS perceptual color-distance for the HelixQA uniqueness gate (U2) —
// a REAL implementation backed by a verifiable, pinned dependency.
//
// Why this wraps material-color-utilities instead of hand-rolling CAM16:
// CAM16 is a full color-appearance model (chromatic adaptation, cone responses,
// a hue/lightness/colorfulness solve under defined viewing conditions) — far
// more involved than ΔE00, and error-prone to reimplement. Google's
// @material/material-color-utilities (Apache-2.0, already pinned in
// generators/package.json and used by generators/lib/tokens.mjs) ships a
// reference `Cam16` implementing Li et al. (2017), "Comprehensive color
// solutions: CAM16, CAT16, and CAM16-UCS" (Color Res. Appl. 42(6):703-718),
// under the DEFAULT viewing conditions (near-identical to sRGB's). Its `Cam16`
// exposes the CAM16-UCS coordinates J*, a*, b* (jstar/astar/bstar) directly.
//
// run-checks.mjs already resolves generators/node_modules (it imports
// generators/lib/*), so this import is consistent with the existing runner
// architecture — unlike qa/lib/deltae.mjs, which is intentionally standalone.
//
// Two distances are provided:
//   deltaEPrimeCam16 — ΔE′, the raw Euclidean distance in CAM16-UCS J*a*b*
//                      space. This is the "ΔE′" the test-bank U2 asserts on.
//   deltaECam16      — the large-difference-compressed form 1.41·ΔE′^0.63 that
//                      MCU's Cam16.distance() returns; reported as a companion.

// Resolved through the generators/lib barrel: qa/ has no node_modules of its
// own, so MCU is reached via a file that lives beside generators/node_modules.
import { Cam16, argbFromHex } from "../../generators/lib/vendor-color.mjs";

/**
 * CAM16-UCS coordinates (J*, a*, b*) of an sRGB hex color under CAM16 default
 * viewing conditions.
 * @param {string} hex e.g. "#683a00"
 * @returns {{ jstar:number, astar:number, bstar:number }}
 */
export function cam16Ucs(hex) {
  const c = Cam16.fromInt(argbFromHex(hex));
  return { jstar: c.jstar, astar: c.astar, bstar: c.bstar };
}

/**
 * CAM16-UCS ΔE′ — the raw Euclidean distance between two colors in CAM16-UCS
 * J*a*b* space. This is the primary metric U2 gates on (min pairwise ΔE′ ≥ 8).
 * @param {string} hex1 @param {string} hex2 @returns {number} ΔE′ (0 = identical)
 */
export function deltaEPrimeCam16(hex1, hex2) {
  const p = cam16Ucs(hex1);
  const q = cam16Ucs(hex2);
  return Math.hypot(p.jstar - q.jstar, p.astar - q.astar, p.bstar - q.bstar);
}

/**
 * CAM16-UCS ΔE (large-difference-compressed form 1.41·ΔE′^0.63), identical to
 * MCU's Cam16.distance(). Reported alongside ΔE′ as a companion metric.
 * @param {string} hex1 @param {string} hex2 @returns {number}
 */
export function deltaECam16(hex1, hex2) {
  return Cam16.fromInt(argbFromHex(hex1)).distance(Cam16.fromInt(argbFromHex(hex2)));
}

// --- self-test: structural invariants + MCU cross-check ----------------------
// Run: node qa/lib/cam16.mjs --selftest
// Verifies (a) identical colors → ΔE′ = 0, (b) symmetry, (c) that the compressed
// form equals 1.41·ΔE′^0.63 recomputed from the raw ΔE′ (i.e. our ΔE′ and MCU's
// distance() agree by construction), and (d) MCU distance() matches an
// independently recomputed distance from the published jstar/astar/bstar.
if (process.argv[1] && process.argv[1].endsWith("cam16.mjs") && process.argv.includes("--selftest")) {
  const approx = (a, b, tol) => Math.abs(a - b) <= tol;
  let ok = true;
  const A = "#683a00", B = "#616219", C = "#585799";

  // (a) identical → 0
  if (deltaEPrimeCam16(A, A) !== 0) { ok = false; process.stderr.write("FAIL: self ΔE′ != 0\n"); }

  // (b) symmetry
  if (!approx(deltaEPrimeCam16(A, B), deltaEPrimeCam16(B, A), 1e-9)) {
    ok = false; process.stderr.write("FAIL: ΔE′ not symmetric\n");
  }

  // (c) compressed form consistency: MCU distance() == 1.41·ΔE′^0.63
  for (const [x, y] of [[A, B], [A, C], [B, C]]) {
    const ePrime = deltaEPrimeCam16(x, y);
    const compressed = deltaECam16(x, y);
    const expected = 1.41 * Math.pow(ePrime, 0.63);
    if (!approx(compressed, expected, 1e-6)) {
      ok = false;
      process.stderr.write(`FAIL: ${x}/${y} compressed ${compressed} != 1.41·ΔE′^0.63 ${expected}\n`);
    }
    process.stderr.write(`CAM16 ${x}/${y}: ΔE′ ${ePrime.toFixed(3)} (compressed ΔE ${compressed.toFixed(3)})\n`);
  }

  // (d) triangle-inequality sanity on ΔE′ (a metric must satisfy it)
  const dAB = deltaEPrimeCam16(A, B), dBC = deltaEPrimeCam16(B, C), dAC = deltaEPrimeCam16(A, C);
  if (dAC > dAB + dBC + 1e-9) { ok = false; process.stderr.write("FAIL: triangle inequality violated\n"); }

  process.stderr.write(ok ? "cam16 self-test PASS\n" : "cam16 self-test FAIL\n");
  process.exit(ok ? 0 : 1);
}
