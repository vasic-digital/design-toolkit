# Android — Material 3 / Material You / M3 Expressive + Wear / TV / Auto / Foldables

> **Canonical sources:** Material Design 3 https://m3.material.io/ (Apache-2.0 / CC-BY-4.0, vendorable
> with attribution) · Android developer guidance https://developer.android.com/design .
> **Caveat:** m3.material.io and many developer.android.com pages are **JS-rendered**; some numeric
> values below are from indexed/secondhand text — items marked **[UNVERIFIED]** were not confirmed on
> a live render. See also the toolkit's core `material3.md` for the seed→scheme color system.

## 1. M3 / Material You / M3 Expressive
- **M3 Expressive** (announced **May 2025**): more emotive shapes, motion, and color springs layered
  on M3. Same token backbone.
- **Grid:** 8 dp base grid with **4 dp sub-grid** for fine alignment.
- **Minimum touch target: 48×48 dp.**
- **Contrast:** text/icons **4.5:1** (normal), **3:1** (large text / UI components & graphics).
- **Units:** `sp` for type (scales with user font-size preference) vs `dp` for layout/spacing/targets.

## 2. Window size classes (adaptive breakpoints, dp width)
| Class    | Width (dp)   |
|----------|--------------|
| Compact  | 0–599        |
| Medium   | 600–839      |
| Expanded | 840–1199     |
| Large    | 1200–1599    |
| Extra-large | ≥1600     |

Source: https://developer.android.com/develop/ui/compose/layouts/adaptive/window-size-classes

## 3. Type scale (sp)
- **Display:** 57 / 45 / 36 (L/M/S)
- **Headline:** 32 / 28 / 24 (L/M/S) *(reference — [UNVERIFIED] exact values)*
- **Title:** 22 / 16 / 14 (L/M/S) *(reference — [UNVERIFIED])*
- **Body:** 16 / 14 / 12 (L/M/S)
- **Label:** 14 / 12 / 11 (L/M/S)
- Source: https://m3.material.io/styles/typography/type-scale-tokens

## 4. Wear OS
- **Round-first design; 192 dp** reference round layout; **225 dp** breakpoint for larger screens.
- **Targets: 48 dp** (recommended) / **40 dp** (minimum, [UNVERIFIED]).
- Use **percentage-based margins** (round screens crop corners) — no fixed edge insets.
- Source: https://developer.android.com/design/ui/wear

## 5. Android TV
- **Design canvas: 960 × 540 (mdpi) 1× reference.**
- **Overscan safe margins: 58 dp horizontal / 28 dp vertical** ([UNVERIFIED] exact dp).
- **D-pad focus navigation** with focus scale/elevation on the focused item (10-foot UI).
- Source: https://developer.android.com/design/ui/tv

## 6. Android Auto & AAOS (Automotive OS)
- **Content limits while driving:** ≤ **5 steps/levels** deep, list items ≤ **120 characters**.
- **Driving-optimized touch targets ≥ 64 dp**, **spacing ≥ 24 dp**, **font ≥ 24 sp**.
- Respect **`CarUxRestrictions`** — the system signals when the UI must be simplified/locked while
  driving; adapt content dynamically.
- Source: https://developer.android.com/training/cars & https://developers.google.com/cars/design

## 7. Foldables
- Use **`FoldingFeature`** (Jetpack WindowManager) to detect hinge posture (**FLAT / HALF_OPENED**,
  orientation, occlusion) and adapt (tabletop, book, dual-pane) layouts.
- **No fixed hinge dp value** — hinge position/size is device-reported at runtime; never hard-code it.
- Source: https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables

## 8. Accessibility
- TalkBack, contrast 4.5/3, ≥48 dp targets, respect font scale (sp), reduced motion / remove
  animations setting. Source: https://developer.android.com/guide/topics/ui/accessibility
