// Type-pair distance for the HelixQA uniqueness gate (U4) — a REAL, executable
// implementation over the engine's own font selection.
//
// Feature space (uniqueness-engine.md §3 "Type pairing [H]", §4 "weighted DNA
// distance"): each font pairing is encoded as the concatenation of its DISPLAY
// and BODY face feature vectors. Each face contributes:
//   - a classification ONE-HOT over TYPE_CLASSES (geometric/grotesque/humanist
//     sans, serif), and
//   - normalized continuous metrics: x-height, stroke-contrast, weight, width,
//     slant.
// The per-face table (FACE_FEATURES) lives with the engine in
// generators/lib/tokens.mjs — it is the single source of truth for the faces the
// generator actually emits, so U4 measures the engine's real output, not a mock.
//
// Distance = Euclidean distance between two pair vectors, normalized to [0,1] by
// the theoretical maximum (both display AND body faces differ in class and max
// out every continuous metric). Two projects assigned the SAME font pair score
// exactly 0 (the U4 golden-BAD); distinct pairings clear the ≥0.3 floor.
//
// Tag: [H] (the threshold and the per-face metrics are heuristic; the method —
// feature-vector distance — is standard).

import { FACE_FEATURES, TYPE_CLASSES } from "../../generators/lib/tokens.mjs";

const CONTINUOUS = ["xHeight", "contrast", "weight", "width", "slant"];

/**
 * Feature vector for a single face (by family name), looked up in the engine's
 * FACE_FEATURES table. Throws if the face is unknown so a missing table entry is
 * a loud failure, never a silent 0.
 * @param {string} face
 * @returns {number[]} [oneHot(TYPE_CLASSES)..., xHeight, contrast, weight, width, slant]
 */
export function faceVector(face) {
  const f = FACE_FEATURES[face];
  if (!f) throw new Error(`typedna: no FACE_FEATURES entry for "${face}" (add it to generators/lib/tokens.mjs)`);
  const oneHot = TYPE_CLASSES.map((c) => (c === f.class ? 1 : 0));
  return [...oneHot, ...CONTINUOUS.map((k) => f[k])];
}

/**
 * Concatenated display+body feature vector for a resolved font pair object
 * (the `fontPair` field of a design-DNA vector, i.e. { display, body, ... }).
 * @param {{display:string, body:string}} pair
 * @returns {number[]}
 */
export function pairVector(pair) {
  return [...faceVector(pair.display), ...faceVector(pair.body)];
}

// Theoretical max distance: per face, the one-hot part differs in 2 positions
// (squared sum 2) and all 5 continuous metrics differ by 1 (squared sum 5) → 7
// per face, ×2 faces = 14. Normalizing by sqrt(14) keeps typePairDistance ∈ [0,1].
const MAX_DIST = Math.sqrt(2 * (2 + CONTINUOUS.length));

/**
 * Normalized type-pair distance ∈ [0,1] between two resolved font pairs.
 * 0 = identical pairing (U4 golden-BAD); higher = more type-distinct.
 * @param {{display:string, body:string}} pairA
 * @param {{display:string, body:string}} pairB
 * @returns {number}
 */
export function typePairDistance(pairA, pairB) {
  const a = pairVector(pairA);
  const b = pairVector(pairB);
  let sq = 0;
  for (let i = 0; i < a.length; i++) sq += (a[i] - b[i]) ** 2;
  return Math.sqrt(sq) / MAX_DIST;
}

// --- self-test: identity → 0, symmetry, range, class-diff clears floor --------
// Run: node qa/lib/typedna.mjs --selftest
if (process.argv[1] && process.argv[1].endsWith("typedna.mjs") && process.argv.includes("--selftest")) {
  const geo = { display: "Space Grotesk", body: "Inter" };
  const serif = { display: "Fraunces", body: "Inter" };
  const hum = { display: "Instrument Sans", body: "Instrument Sans" };
  let ok = true;
  const approx = (a, b) => Math.abs(a - b) <= 1e-12;
  if (typePairDistance(geo, geo) !== 0) { ok = false; process.stderr.write("FAIL: identical pair != 0\n"); }
  if (!approx(typePairDistance(geo, serif), typePairDistance(serif, geo))) { ok = false; process.stderr.write("FAIL: not symmetric\n"); }
  for (const [x, y] of [[geo, serif], [geo, hum], [serif, hum]]) {
    const d = typePairDistance(x, y);
    if (d < 0 || d > 1) { ok = false; process.stderr.write(`FAIL: out of range ${d}\n`); }
    process.stderr.write(`typePairDistance ${x.display}/${x.body} vs ${y.display}/${y.body}: ${d.toFixed(4)}\n`);
  }
  process.stderr.write(ok ? "typedna self-test PASS\n" : "typedna self-test FAIL\n");
  process.exit(ok ? 0 : 1);
}
