// Barrel re-exporting the vendored color-science deps that the qa/lib metrics
// need but cannot resolve on their own. qa/ deliberately has no node_modules of
// its own; generators/ owns the pinned, license-verified color deps. Because
// this file lives under generators/lib, Node resolves its imports against
// generators/node_modules — so qa/lib/*.mjs can reach CAM16 through a single, stable relative path
// instead of a brittle deep ../../generators/node_modules/... path.
//
// - @material/material-color-utilities (Apache-2.0, DIRECT pinned dep):
//   Cam16 reference implementation (Li et al. 2017) → CAM16-UCS J*a*b* for U2.
// - apca-w3 / APCA: REMOVED 2026-11-24. Its licence ("Limited W3 License": web-content use
//   only, no-alteration, terminology restrictions) does not clearly permit reuse, and its
//   optional chain pulled colorparsley (AGPL-3.0). Contrast is WCAG 2.x only.

// - colorjs.io (MIT, DIRECT pinned dep): OKLCH/HSL conversions for the
//   chromatic-range gate (qa/check-chromatic-range.mjs), which needs the Color
//   CLASS rather than the fixed measurements generators/lib/color.mjs exposes.

export { Cam16, argbFromHex } from "@material/material-color-utilities";
export { default as Color } from "colorjs.io";
