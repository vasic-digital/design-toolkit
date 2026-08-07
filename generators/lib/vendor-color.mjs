// Barrel re-exporting the vendored color-science deps that the qa/lib metrics
// need but cannot resolve on their own. qa/ deliberately has no node_modules of
// its own; generators/ owns the pinned, license-verified color deps. Because
// this file lives under generators/lib, Node resolves its imports against
// generators/node_modules — so qa/lib/*.mjs can reach CAM16 (and the APCA
// reference used only by the self-test) through a single, stable relative path
// instead of a brittle deep ../../generators/node_modules/... path.
//
// - @material/material-color-utilities (Apache-2.0, DIRECT pinned dep):
//   Cam16 reference implementation (Li et al. 2017) → CAM16-UCS J*a*b* for U2.
// - apca-w3 (W3C-CG/MIT): the reference APCA implementation, imported LAZILY and
//   ONLY by qa/lib/apca.mjs's self-test to cross-validate our independent
//   implementation. It is NOT used at runtime by any gate.

export { Cam16, argbFromHex } from "@material/material-color-utilities";

/** Lazy accessor for the reference APCA impl (self-test cross-check only). */
export async function loadApcaReference() {
  const { calcAPCA } = await import("apca-w3");
  return { calcAPCA };
}
