// C-PLAT — platform-conformance runner (the executable slice of
// qa/uniqueness-and-platform-conformance.md §4).
//
// Given a generated DTCG token set + a target platform, it asserts the emitted
// scale/contrast tokens against that platform's machine-checkable metric floors
// (qa/platform-metrics.mjs, extracted faithfully from knowledge/platforms/*.md).
//
// HONESTY CONTRACT (anti-bluff §11.4.5/§11.4.170):
//   - A floor is ASSERTED (PASS/FAIL, gating) only when it is both `gate:true`
//     (clean first-party [E] number) AND `checkable:true` (derivable from the
//     tokens this generator actually emits).
//   - Otherwise it is SKIP with the reason carried from the data file. The
//     measured value is still reported where knowable ([E]-secondhand body size,
//     for example) so nothing is hidden — but no unverifiable or absent number is
//     ever presented as a pass.
//   - Target-size and safe-area floors are never checkable here: the generator
//     emits no interactive-size or safe-area token (those are rendered/component
//     = AUDITOR). They SKIP with that reason on every platform.
//
// A platform's overall verdict:
//   FAIL if any asserted floor fails; PASS if ≥1 floor was asserted and none
//   failed; SKIP if the platform has no assertable floor today (advisory —
//   it never gates the build).

import { extractSchemes } from "../../generators/lib/dtcg.mjs";
import { contrastRatio, SEMANTIC_PAIRS } from "../../generators/lib/color.mjs";
import { PLATFORM_METRICS } from "../platform-metrics.mjs";

/** Emitted body running-text size (px) — typography.type-scale.body-large. */
export function bodyLargePx(doc) {
  const t = doc?.typography?.["type-scale"]?.["body-large"]?.$value;
  return t && typeof t.value === "number" ? t.value : null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function contrastCheck(doc, c) {
  const { light, dark } = extractSchemes(doc);
  const rows = [];
  for (const [mode, scheme] of [["light", light], ["dark", dark]]) {
    for (const p of SEMANTIC_PAIRS) {
      const fg = scheme[p.fg], bg = scheme[p.bg];
      if (fg == null || bg == null) continue;
      const ratio = round2(contrastRatio(fg, bg));
      const floor = p.kind === "ui" ? c.ui : p.kind === "largeText" ? c.large : c.text;
      rows.push({ mode, pair: `${p.fg}/${p.bg}`, kind: p.kind, ratio, floor, pass: ratio >= floor });
    }
  }
  const fails = rows.filter((r) => !r.pass);
  const textRows = rows.filter((r) => r.kind === "text");
  const uiRows = rows.filter((r) => r.kind === "ui");
  return {
    metric: "contrast",
    status: fails.length === 0 ? "PASS" : "FAIL",
    op: ">=",
    tag: c.tag,
    source: c.source,
    floor: { text: c.text, large: c.large, ui: c.ui, unit: c.unit },
    measured: {
      pairsChecked: rows.length,
      minText: textRows.length ? Math.min(...textRows.map((r) => r.ratio)) : null,
      minUi: uiRows.length ? Math.min(...uiRows.map((r) => r.ratio)) : null,
      fails: fails.map((r) => ({ mode: r.mode, pair: r.pair, ratio: r.ratio, floor: r.floor })),
    },
  };
}

/**
 * Assess one token document against one platform's floors.
 * @param {object} doc  generated DTCG token document
 * @param {string} platform  key in PLATFORM_METRICS
 * @returns {{platform,label,known,gating,verdict,checks}}
 */
export function checkPlatformConformance(doc, platform) {
  const spec = PLATFORM_METRICS[platform];
  if (!spec) {
    return {
      platform, label: platform, known: false, gating: false, verdict: "SKIP",
      checks: [{ metric: "*", status: "SKIP", reason: `no metric spec for platform "${platform}" in qa/platform-metrics.mjs` }],
    };
  }

  const checks = [];

  // --- contrast (from color tokens) ---
  if (spec.contrast) {
    const c = spec.contrast;
    if (c.gate && c.checkable) {
      checks.push(contrastCheck(doc, c));
    } else {
      checks.push({
        metric: "contrast", status: "SKIP", tag: c.tag, source: c.source,
        floor: { text: c.text, large: c.large, ui: c.ui, unit: c.unit },
        reason: c.reason || "not gated (tag not clean [E] / first-party)",
      });
    }
  }

  // --- body running-text size (from type-scale tokens) ---
  if (spec.bodyFontMin) {
    const b = spec.bodyFontMin;
    const measured = bodyLargePx(doc);
    if (b.gate && b.checkable) {
      const pass = measured != null && measured >= b.min;
      checks.push({
        metric: "bodyFontMin", status: pass ? "PASS" : "FAIL", op: ">=",
        tag: b.tag, source: b.source,
        floor: { min: b.min, unit: b.unit },
        measured: { bodyLargePx: measured },
      });
    } else {
      checks.push({
        metric: "bodyFontMin", status: "SKIP", tag: b.tag, source: b.source,
        floor: { min: b.min, unit: b.unit },
        measured: { bodyLargePx: measured },
        reason: b.reason || "not gated (measured value reported for information)",
      });
    }
  }

  // --- target size (never emitted as a token → always SKIP) ---
  if (spec.targetSizePx) {
    const t = spec.targetSizePx;
    checks.push({
      metric: "targetSizePx", status: "SKIP", tag: t.tag, source: t.source,
      floor: { min: t.min, touchMin: t.touchMin, tapSpacingMin: t.tapSpacingMin, unit: t.unit },
      reason: t.reason,
    });
  }

  // --- safe area / overscan (never emitted as a token → always SKIP) ---
  if (spec.safeArea) {
    const s = spec.safeArea;
    checks.push({ metric: "safeArea", status: "SKIP", tag: s.tag, source: s.source, reason: s.reason });
  }

  const asserted = checks.filter((c) => c.status === "PASS" || c.status === "FAIL");
  const gating = asserted.length > 0;
  const verdict = asserted.some((c) => c.status === "FAIL")
    ? "FAIL"
    : gating ? "PASS" : "SKIP";

  return { platform, label: spec.label, known: true, gating, verdict, checks };
}
