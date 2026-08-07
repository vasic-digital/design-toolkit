// Weighted design-DNA distance (U3) and Poisson-disk capacity report (U5) for
// the HelixQA uniqueness gate — REAL, executable math over the engine's own
// resolved design-DNA vectors.
//
// U3 — combined DNA distance (uniqueness-engine.md §4 "weighted DNA distance",
// §6 threshold table). Each axis is normalized to a sub-distance d̂ᵢ ∈ [0,1] and
// combined as the weighted Euclidean norm:
//
//     D(A,B) = sqrt( Σ wᵢ · d̂ᵢ² )
//
// with the spec weights (color dominates identity):
//     color 0.40 · type 0.25 · shape 0.12 · layout 0.10 · motion 0.08 · depth 0.05
//
// Per-axis sub-distance, all from the engine's ACTUAL output:
//   color  — ΔE00 (worse of light/dark) between primaries, normalized by a
//            strong-separation anchor (COLOR_ANCHOR ΔE00). [E] metric, [H] anchor.
//   type   — normalized type-pair distance (qa/lib/typedna.mjs, U4). [H]
//   shape  — ordinal distance over RADIUS_BASES (M3 shape scale). [H]
//   layout — ordinal distance over SPACE_MULTIPLIERS (grid/space density). [H]
//   motion — ordinal distance over MOTION_INTENSITIES (speed dial). [H]
//   depth  — ordinal distance over DEPTH_LEVELS (elevation/texture). [H]
//
// The color axis additionally has its OWN floor asserted by the caller (ΔE00 ≥
// U1 threshold): a design may not be declared "unique" via non-color tweaks
// while colliding perceptually — colorDeltaE is returned so run-checks can gate it.
//
// U5 — Poisson-disk capacity (uniqueness-engine.md §4 "blue-noise / Poisson-disk
// separation", Bridson 2007, WITH the capacity-limit caveat). Reported as a
// METRIC, never a pass/fail gate: given the accepted seed set and r = D_min (the
// achieved min pairwise DNA distance), estimate how many more min-distance-r
// designs the bounded DNA space can still hold before r must shrink (graceful
// degradation) or saturation must be reported. This is an upper-bound packing
// estimate — loose in high dimension (curse of dimensionality); it is a report,
// not physics.

import { deltaE00 } from "./deltae.mjs";
import { typePairDistance } from "./typedna.mjs";
import { RADIUS_BASES, SPACE_MULTIPLIERS, MOTION_INTENSITIES, DEPTH_LEVELS } from "../../generators/lib/tokens.mjs";

/** Spec weights (uniqueness-engine §4/§6). Sum = 1.00. */
export const DNA_WEIGHTS = { color: 0.40, type: 0.25, shape: 0.12, layout: 0.10, motion: 0.08, depth: 0.05 };
export const DNA_AXES = Object.keys(DNA_WEIGHTS);

// ΔE00 anchor for the color sub-distance: a strong, clearly-distinct brand-color
// separation. ΔE00 ≥ this maps to d̂_color = 1. Heuristic [H], recorded here.
export const COLOR_ANCHOR = 40;

/** Ordinal sub-distance: |index(a) − index(b)| / (levels − 1), clamped [0,1]. */
function ordinal(levels, a, b) {
  const ia = levels.indexOf(a);
  const ib = levels.indexOf(b);
  if (ia < 0 || ib < 0) return 1; // unknown value → treat as maximally distinct (loud, not silent 0)
  return levels.length > 1 ? Math.abs(ia - ib) / (levels.length - 1) : 0;
}

/**
 * Per-axis normalized sub-distances between two resolved design-DNA vectors.
 * The color axis uses the supplied worst-mode ΔE00 (measured on primaries by the
 * caller, who has both light+dark schemes).
 * @param {object} vecA resolved vector (deriveVector output)
 * @param {object} vecB
 * @param {number} colorDeltaE00 worse-of-modes ΔE00 between the two primaries
 * @returns {{color:number,type:number,shape:number,layout:number,motion:number,depth:number}}
 */
export function axisSubDistances(vecA, vecB, colorDeltaE00) {
  return {
    color: Math.min(1, colorDeltaE00 / COLOR_ANCHOR),
    type: typePairDistance(vecA.fontPair, vecB.fontPair),
    shape: ordinal(RADIUS_BASES, vecA.radiusBase, vecB.radiusBase),
    layout: ordinal(SPACE_MULTIPLIERS, vecA.spaceMultiplier, vecB.spaceMultiplier),
    motion: ordinal(MOTION_INTENSITIES, vecA.motionIntensity, vecB.motionIntensity),
    depth: ordinal(DEPTH_LEVELS, vecA.depthLevel, vecB.depthLevel),
  };
}

/**
 * Weighted DNA distance D(A,B) = sqrt(Σ wᵢ·d̂ᵢ²) over the sub-distances.
 * @param {{color:number,type:number,shape:number,layout:number,motion:number,depth:number}} sub
 * @returns {number} D ∈ [0,1]
 */
export function dnaDistance(sub) {
  let acc = 0;
  for (const axis of DNA_AXES) acc += DNA_WEIGHTS[axis] * sub[axis] ** 2;
  return Math.sqrt(acc);
}

/**
 * Convenience: full DNA distance between two vectors given their worst-mode ΔE00.
 * @returns {{ distance:number, sub:object }}
 */
export function dnaDistanceBetween(vecA, vecB, colorDeltaE00) {
  const sub = axisSubDistances(vecA, vecB, colorDeltaE00);
  return { distance: dnaDistance(sub), sub };
}

/** Volume of a d-dimensional ball of the given radius (for the packing bound). */
function ballVolume(d, radius) {
  // V_d(r) = π^(d/2) / Γ(d/2 + 1) · r^d.
  return Math.pow(Math.PI, d / 2) / gamma(d / 2 + 1) * Math.pow(radius, d);
}

/** Lanczos Γ(x) — enough precision for the small half-integers we use here. */
function gamma(x) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

/**
 * U5 — Poisson-disk capacity report for the accepted DNA set at r = D_min.
 * The weighted metric D = sqrt(Σ wᵢ·d̂ᵢ²) is Euclidean in transformed coords
 * yᵢ = sqrt(wᵢ)·d̂ᵢ, so the bounded DNA box maps to a box of side sqrt(wᵢ) per
 * axis (volume Π sqrt(wᵢ)). A min-distance-r packing holds at most
 * V_box / V_ball(d, r/2) points (non-overlapping r/2-balls). Remaining capacity
 * = that bound − current count. Upper bound only (loose in high-d) — a REPORT.
 * @param {number} minPairwiseDistance achieved D_min over the accepted set (= r)
 * @param {number} count number of accepted designs
 * @returns {object} capacity report
 */
export function poissonCapacityReport(minPairwiseDistance, count) {
  const d = DNA_AXES.length;
  const r = minPairwiseDistance;
  const boxVolume = DNA_AXES.reduce((v, axis) => v * Math.sqrt(DNA_WEIGHTS[axis]), 1);
  let maxPoints = Infinity;
  let remaining = Infinity;
  let saturated = false;
  if (r > 0) {
    const packingBound = boxVolume / ballVolume(d, r / 2);
    maxPoints = Math.max(count, Math.floor(packingBound));
    remaining = Math.max(0, maxPoints - count);
    saturated = remaining <= 0;
  }
  return {
    metric: "Poisson-disk packing upper-bound (Bridson 2007) in weighted DNA space",
    dimensions: d,
    radius_r_eq_Dmin: Math.round(r * 10000) / 10000,
    acceptedCount: count,
    boxVolume: Math.round(boxVolume * 1e6) / 1e6,
    estimatedMaxPoints: Number.isFinite(maxPoints) ? maxPoints : null,
    estimatedRemainingCapacity: Number.isFinite(remaining) ? remaining : null,
    saturated,
    gracefulDegradationPolicy:
      "if remaining ≤ 0 the engine MUST shrink r (graceful degradation) or report saturation — never loop forever (uniqueness-engine §4, Bridson 2007)",
    caveat:
      "upper-bound packing estimate; loose in high dimension (curse of dimensionality). REPORT-only, never a pass/fail gate.",
  };
}

// --- self-test: identity → 0, monotonic in an axis, capacity sane -------------
// Run: node qa/lib/dnadist.mjs --selftest
if (process.argv[1] && process.argv[1].endsWith("dnadist.mjs") && process.argv.includes("--selftest")) {
  let ok = true;
  const base = { fontPair: { display: "Inter", body: "Inter" }, radiusBase: 4, spaceMultiplier: 1.0, motionIntensity: 1.0, depthLevel: 1 };
  const same = dnaDistanceBetween(base, base, 0).distance;
  if (same !== 0) { ok = false; process.stderr.write(`FAIL: identical vectors D=${same} != 0\n`); }
  // color-only difference is monotonic in ΔE00
  const dLo = dnaDistanceBetween(base, base, 10).distance;
  const dHi = dnaDistanceBetween(base, base, 40).distance;
  if (!(dHi > dLo && dLo > 0)) { ok = false; process.stderr.write(`FAIL: color monotonicity dLo=${dLo} dHi=${dHi}\n`); }
  process.stderr.write(`D(color ΔE00=10 only)=${dLo.toFixed(4)}  D(color ΔE00=40 only)=${dHi.toFixed(4)}\n`);
  const cap = poissonCapacityReport(0.35, 3);
  if (!(cap.estimatedRemainingCapacity >= 0)) { ok = false; process.stderr.write("FAIL: capacity negative\n"); }
  process.stderr.write(`capacity @ r=0.35, n=3: max≈${cap.estimatedMaxPoints}, remaining≈${cap.estimatedRemainingCapacity}, saturated=${cap.saturated}\n`);
  process.stderr.write(ok ? "dnadist self-test PASS\n" : "dnadist self-test FAIL\n");
  process.exit(ok ? 0 : 1);
}
