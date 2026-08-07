// Per-platform machine-checkable metric floors — C-PLAT (platform conformance).
//
// Extracted FAITHFULLY from ../knowledge/platforms/*.md. Every value cites its
// source file + section and carries the knowledge file's own verification tag
// VERBATIM. Tags:
//   [E]            explicit, first-party / normative number (gateable)
//   [E]-secondhand explicit but Google-indexed secondhand (apple.md header
//                  caveat: "confirmed via indexed page text, not a live SPA
//                  render … re-verify on-device where load-bearing") — NOT gated
//   [H]            heuristic / convention, not a standard (not gated)
//   [UNVERIFIED]   the knowledge file could not confirm the number — NOT gated
//
// Two honesty flags decide whether a floor becomes a real assertion:
//   `checkable` — is the floor derivable from the token set THIS generator
//                 emits? The generator emits color, type-scale, spacing, radius,
//                 motion, elevation. It emits NO interactive/target-size token
//                 and NO safe-area token, so target-size / safe-area floors are
//                 `checkable:false` (rendered / component concern = AUDITOR).
//   `gate`      — may this floor fail the build? Only clean first-party [E]
//                 numbers gate. [E]-secondhand / [H] / [UNVERIFIED] are measured
//                 (where checkable) and REPORTED, but SKIP — never gate.
//
// A floor gates iff (checkable && gate). Otherwise the runner emits SKIP with the
// reason carried here — the measured value is still reported when it is knowable,
// so nothing is hidden, but no unverifiable/absent number is presented as a pass.
//
// `null` for a slot means the knowledge file states no such floor for that
// platform (do not invent one — anti-bluff).

export const PLATFORM_METRICS = {
  // -------------------------------------------------------------- WEB (gates) --
  // web.md is fully specified against WCAG 2.2 (W3C normative) — the reference
  // gate-grade platform.
  web: {
    label: "Web (WCAG 2.2 / MDN)",
    source: "knowledge/platforms/web.md",
    contrast: {
      text: 4.5, large: 3.0, ui: 3.0, unit: "ratio",
      tag: "[E]", gate: true, checkable: true,
      source: "web.md §3 (WCAG 2.2 SC 1.4.3 text 4.5:1 / large 3:1; SC 1.4.11 non-text 3:1)",
    },
    // WCAG 2.2 SC 2.5.8 AA = 24 CSS px (44 is AAA SC 2.5.5). Real [E] number,
    // but the generator emits no target-size token so it cannot be asserted here.
    targetSizePx: {
      min: 24, unit: "CSS px",
      tag: "[E]", gate: true, checkable: false,
      source: "web.md §3 (WCAG 2.2 SC 2.5.8 AA; 44 = AAA SC 2.5.5)",
      reason: "generator emits no interactive/target-size token — rendered/component concern (C-PLAT P1 = AUDITOR)",
    },
    // web.md states no normative body-size minimum (WCAG has no fixed px floor).
    bodyFontMin: null,
  },

  // ---------------------------------------------------------- ANDROID (gates) --
  // android-material3.md sources m3.material.io (Apache-2.0 / CC-BY-4.0,
  // first-party & vendorable). Body type + contrast are clean [E].
  android: {
    label: "Android (Material 3)",
    source: "knowledge/platforms/android-material3.md",
    contrast: {
      text: 4.5, large: 3.0, ui: 3.0, unit: "ratio",
      tag: "[E]", gate: true, checkable: true,
      source: "android-material3.md §1 (text/icons 4.5:1, large & UI/graphics 3:1)",
    },
    // M3 Body scale = 16/14/12 sp. The [UNVERIFIED] flags in §3 sit on the
    // Headline/Title rows only; Body 16sp is the clean [E] body floor. sp≈px at
    // font-scale 1.0, so the emitted body-large px is a faithful proxy.
    bodyFontMin: {
      min: 16, unit: "sp (≈px @ font-scale 1.0)",
      tag: "[E]", gate: true, checkable: true,
      source: "android-material3.md §3 (Body 16/14/12 L/M/S) + m3 type-scale-tokens",
    },
    targetSizePx: {
      min: 48, unit: "dp",
      tag: "[E]", gate: true, checkable: false,
      source: "android-material3.md §1 (minimum touch target 48×48 dp)",
      reason: "generator emits no interactive/target-size token — rendered/component concern (AUDITOR)",
    },
  },

  // -------------------------------------------------------- APPLE (secondhand) --
  // apple.md header: all numbers are Google-indexed secondhand, "re-verify
  // on-device where load-bearing". A CI gate is load-bearing, so Apple floors are
  // measured-and-reported but NOT gated (gate:false) — honest per the caveat.
  ios: {
    label: "iOS / iPadOS (HIG)",
    source: "knowledge/platforms/apple.md",
    contrast: null, // apple.md §7 lists no numeric contrast ratio — do not invent
    bodyFontMin: {
      min: 17, unit: "pt",
      tag: "[E]-secondhand", gate: false, checkable: true,
      source: "apple.md §2 (Body text 17pt Dynamic Type default)",
      reason: "Apple HIG numbers are Google-indexed secondhand (apple.md header caveat) — measured & reported, not gated; re-verify on-device (AUDITOR)",
    },
    targetSizePx: {
      min: 44, unit: "pt",
      tag: "[E]-secondhand", gate: false, checkable: false,
      source: "apple.md §2 (minimum touch target 44×44 pt)",
      reason: "no target-size token emitted AND Apple values secondhand — AUDITOR / on-device",
    },
  },
  watchos: {
    label: "watchOS (HIG)",
    source: "knowledge/platforms/apple.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: {
      min: 44, unit: "pt",
      tag: "[E]-secondhand", gate: false, checkable: false,
      source: "apple.md §3 (minimum tap target 44 pt)",
      reason: "no target-size token emitted AND Apple values secondhand — AUDITOR / on-device",
    },
  },
  tvos: {
    label: "tvOS (HIG)",
    source: "knowledge/platforms/apple.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: null, // tvOS floor is overscan safe-area (90/60pt), not a target size
    safeArea: {
      tag: "[E]-secondhand", gate: false, checkable: false,
      source: "apple.md §4 (overscan safe margins 90pt horizontal / 60pt vertical)",
      reason: "safe-area/overscan is a rendered layout concern; no safe-area token emitted (AUDITOR)",
    },
  },
  visionos: {
    label: "visionOS (HIG)",
    source: "knowledge/platforms/apple.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: {
      min: 60, unit: "pt (angular ≈2.5° visual angle)",
      tag: "[E]-secondhand", gate: false, checkable: false,
      source: "apple.md §5 (minimum target 60pt, angular)",
      reason: "angular target size, no target-size token emitted AND Apple values secondhand — AUDITOR / on-device",
    },
  },
  macos: {
    label: "macOS (HIG)",
    source: "knowledge/platforms/apple.md",
    contrast: null,
    bodyFontMin: null,
    // apple.md §6: "NO published numeric minimum touch/click target size.
    // [UNVERIFIED] — do not invent one."
    targetSizePx: {
      min: null, unit: "pt",
      tag: "[UNVERIFIED]", gate: false, checkable: false,
      source: "apple.md §6 (no published numeric minimum — [UNVERIFIED])",
      reason: "apple.md §6 states no published minimum ([UNVERIFIED]) — nothing to assert; use system control sizes (AUDITOR)",
    },
  },

  // ----------------------------------------------------------- WINDOWS FLUENT --
  // windows-fluent.md gives explicit target/spacing [E] numbers but no body-size
  // and no contrast ratio; targets aren't emitted as tokens → all SKIP.
  windows: {
    label: "Windows (Fluent 2)",
    source: "knowledge/platforms/windows-fluent.md",
    contrast: null, // §4 requires high-contrast theme support but states no ratio
    bodyFontMin: null,
    targetSizePx: {
      min: 40, touchMin: 44, tapSpacingMin: 4, unit: "epx",
      tag: "[E]", gate: true, checkable: false,
      source: "windows-fluent.md §2 (base 40×40 epx; touch 44×44 epx + ≥4 epx spacing)",
      reason: "generator emits no interactive/target-size token — rendered/component concern (AUDITOR)",
    },
  },

  // --------------------------------------------------------------- LINUX DESKTOP --
  // linux-desktop.md: GNOME/KDE size via style classes / grid units, target
  // minimums explicitly [UNVERIFIED].
  gnome: {
    label: "GNOME (Adwaita / libadwaita / GTK4)",
    source: "knowledge/platforms/linux-desktop.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: {
      min: null, unit: "px",
      tag: "[UNVERIFIED]", gate: false, checkable: false,
      source: "linux-desktop.md §1 (no published numeric minimum touch target — [UNVERIFIED])",
      reason: "GNOME sizes via style classes, no published target minimum ([UNVERIFIED]) — nothing to assert (AUDITOR)",
    },
  },
  kde: {
    label: "KDE (Breeze / Kirigami)",
    source: "knowledge/platforms/linux-desktop.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: {
      min: null, unit: "px (Kirigami.Units.gridUnit = 18px)",
      tag: "[UNVERIFIED]", gate: false, checkable: false,
      source: "linux-desktop.md §2 (no published numeric minimum touch target — [UNVERIFIED]; gridUnit 18px)",
      reason: "KDE scales targets from gridUnit, no published target minimum ([UNVERIFIED]) — nothing to assert (AUDITOR)",
    },
  },

  // ------------------------------------------------------ ANDROID SUB-SURFACES --
  wear: {
    label: "Wear OS",
    source: "knowledge/platforms/android-material3.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: {
      min: 40, recommended: 48, unit: "dp",
      tag: "[UNVERIFIED]", gate: false, checkable: false,
      source: "android-material3.md §4 (48dp recommended / 40dp minimum [UNVERIFIED])",
      reason: "minimum flagged [UNVERIFIED] AND no target-size token emitted — AUDITOR / on-device",
    },
  },
  androidtv: {
    label: "Android TV",
    source: "knowledge/platforms/android-material3.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: null,
    safeArea: {
      tag: "[UNVERIFIED]", gate: false, checkable: false,
      source: "android-material3.md §5 (overscan 58dp horizontal / 28dp vertical [UNVERIFIED])",
      reason: "overscan values [UNVERIFIED] AND safe-area is a rendered concern — AUDITOR",
    },
  },
  auto: {
    label: "Android Auto / AAOS (driving-optimized)",
    source: "knowledge/platforms/android-material3.md",
    contrast: null,
    // AAOS driving floor: font ≥ 24sp. This IS a clean [E] number and IS
    // checkable against the emitted body-large. A generic (non-driving) token set
    // will honestly FAIL this — that is correct, not a bug. Not in the default
    // platform set; run `--platforms auto` to assert it.
    bodyFontMin: {
      min: 24, unit: "sp",
      tag: "[E]", gate: true, checkable: true,
      source: "android-material3.md §6 (driving-optimized font ≥ 24 sp)",
    },
    targetSizePx: {
      min: 64, tapSpacingMin: 24, unit: "dp",
      tag: "[E]", gate: true, checkable: false,
      source: "android-material3.md §6 (driving-optimized targets ≥ 64 dp, spacing ≥ 24 dp)",
      reason: "generator emits no interactive/target-size token — rendered/component concern (AUDITOR)",
    },
  },

  // ------------------------------------------------------- CROSS-PLATFORM FW --
  flutter: {
    label: "Flutter",
    source: "knowledge/platforms/cross-platform.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: {
      min: 48, unit: "logical px",
      tag: "[E]", gate: true, checkable: false,
      source: "cross-platform.md §1 (targets ≥ 48 logical px, follows Material 48dp)",
      reason: "generator emits no interactive/target-size token — rendered/component concern (AUDITOR)",
    },
  },
  "react-native": {
    label: "React Native",
    source: "knowledge/platforms/cross-platform.md",
    contrast: null,
    bodyFontMin: null,
    targetSizePx: {
      min: null, unit: "pt/dp",
      tag: "[UNVERIFIED]", gate: false, checkable: false,
      source: "cross-platform.md §2 (no minimum touch-target size stated — [UNVERIFIED]; enforce target platform's)",
      reason: "RN docs state no minimum ([UNVERIFIED]) — enforce the target platform's floor instead (AUDITOR)",
    },
  },
};

/** Platforms whose knowledge yields at least one clean, gateable, token-checkable
 *  floor today. These are the only ones that can turn C-PLAT red. */
export const GATEABLE_PLATFORMS = Object.entries(PLATFORM_METRICS)
  .filter(([, spec]) =>
    [spec.contrast, spec.bodyFontMin, spec.targetSizePx].some(
      (m) => m && m.gate === true && m.checkable === true,
    ),
  )
  .map(([name]) => name);
