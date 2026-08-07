# Apple Platforms — HIG Cheat-Sheet (iOS / iPadOS / macOS / watchOS / tvOS / visionOS)

> **Canonical source:** Apple Human Interface Guidelines,
> https://developer.apple.com/design/human-interface-guidelines/ · **License:** copyrighted,
> free-to-read — **paraphrase into checklists, never copy prose**.
> **Metric caveat:** Apple's numeric values below were confirmed via **Google-indexed page text,
> not a live SPA render** of developer.apple.com (the HIG is a JS-rendered single-page app). Treat
> exact numbers as high-confidence-but-secondhand; re-verify on-device where load-bearing.

## 1. Design language — Liquid Glass (WWDC25)
- **Liquid Glass** is the unified material introduced at WWDC25 across **iOS 26, iPadOS 26, macOS 26,
  watchOS 26, tvOS 26, visionOS 26** — one design language, one version number across the lineup.
- Dynamic, translucent, refractive material that reacts to content/motion; controls float as glass
  layers over content.
- **Concentricity:** nested rounded shapes share a common center — child corner radius = parent
  radius − padding, so curves stay concentric. Design controls/containers to nest concentrically.
- Accessibility fallbacks (respect all three): **Reduce Transparency** (glass → opaque), **Increase
  Contrast** (stronger borders/text separation), **Reduce Motion** (drop the fluid/refractive
  animation). Every Liquid Glass surface MUST degrade gracefully under these.
- Source: https://developer.apple.com/design/human-interface-guidelines/materials and the platform
  "Designing for …" pages.

## 2. iOS / iPadOS
- **Minimum touch target: 44×44 pt.**
- **Default screen margin: 16 pt.**
- **Body text: 17 pt** (Dynamic Type default / Large). Support Dynamic Type scaling.
- Respect **safe areas** (notch, Dynamic Island, home indicator) — never hard-code insets.
- Source: https://developer.apple.com/design/human-interface-guidelines/layout

## 3. watchOS
- **Minimum tap target: 44 pt.**
- Device display references: **41 mm / 45 mm** class dimensions (also 49 mm Ultra).
- Percentage/relative layout; edge-to-edge; corner-aware layout following the case curvature.
- Source: https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos

## 4. tvOS
- **Overscan safe margins: 90 pt horizontal / 60 pt vertical** — keep content inside.
- **Focus model:** no cursor; the **focus engine** moves a highlight via remote/D-pad. Design for
  focusable elements with a clear focused state (scale/lift/parallax on focus).
- 10-foot UI: large type, generous spacing.
- Source: https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos

## 5. visionOS
- **Minimum target: 60 pt** (≈ **2.5° visual angle** ≈ **4.4 cm at 1 m**) — targets are angular.
- **Field of view ≈ 81°.**
- **The point is an angular unit** in visionOS (scales with distance), not a fixed physical size —
  design in degrees of visual angle, not absolute cm.
- Depth, glass, and eye/hand (gaze + pinch) input; place content within comfortable FOV.
- Source: https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos

## 6. macOS
- **NO published numeric minimum touch/click target size. [UNVERIFIED]** — Apple's macOS HIG does not
  state a hard minimum in the indexed text; do not invent one. Use pointer-appropriate hit areas and
  standard AppKit/SwiftUI control sizes.
- Pointer-first (hover states, right-click menus, precise targets), resizable windows, menu bar.
- Source: https://developer.apple.com/design/human-interface-guidelines/designing-for-macos

## 7. Accessibility (all platforms)
- Honor **Dynamic Type**, **Reduce Transparency**, **Increase Contrast**, **Reduce Motion**,
  **VoiceOver**, **Bold Text**, **Differentiate Without Color**.
- Liquid Glass surfaces must have opaque/high-contrast/static fallbacks (see §1).
- Source: https://developer.apple.com/design/human-interface-guidelines/accessibility
