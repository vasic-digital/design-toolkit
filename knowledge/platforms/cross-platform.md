# Cross-Platform Frameworks — Flutter / React Native / .NET MAUI Cheat-Sheet

> **Canonical sources:** Flutter https://docs.flutter.dev/ · React Native https://reactnative.dev/ ·
> .NET MAUI https://learn.microsoft.com/dotnet/maui/ .

## 1. Flutter
- **Material 3 is the default** (`ThemeData(useMaterial3: true)` — default in current SDKs).
- **`.adaptive()` constructors** (e.g. `Switch.adaptive`, `Slider.adaptive`) render the
  platform-appropriate widget (Cupertino on iOS/macOS, Material elsewhere).
- **Targets ≥ 48 logical pixels** (follows Material's 48 dp; `MaterialTapTargetSize`).
- **`VisualDensity`** adjusts control compactness per platform/input (denser on desktop).
- Source: https://docs.flutter.dev/ui/design/material

## 2. React Native
- **NO built-in design system** — RN ships primitives (`View`, `Text`, `Pressable`), not themed
  components; you bring/build the DS.
- **`Platform.select({ ios, android, default })`** and **`Platform.OS`** for per-platform values.
- **Platform-specific file extensions:** `Component.ios.js` / `Component.android.js` (also `.native.js`,
  `.web.js`) are resolved automatically by the bundler.
- **NO minimum touch-target size stated in the docs [UNVERIFIED]** — enforce your own (align to the
  target platform: 44 pt iOS / 48 dp Android).
- Source: https://reactnative.dev/docs/platform-specific-code

## 3. .NET MAUI
- **Single-project** targeting iOS/Android/macOS(Catalyst)/Windows from one project head.
- **`AppThemeBinding`** binds a property to light/dark values (`{AppThemeBinding Light=…, Dark=…}`).
- **Handlers** map cross-platform controls to native views; **customizations are global unless you
  subclass** the control (handler mappers apply app-wide otherwise).
- **DIU (device-independent units)** — MAUI's logical unit; 1 DIU scales to platform density.
- Source: https://learn.microsoft.com/dotnet/maui/user-interface/

## 4. Shared rule
- Emit the toolkit's DTCG tokens once; adapt per platform via the framework's platform hooks above.
  Enforce the *target platform's* accessibility minimums (see `apple.md` / `android-material3.md` /
  `windows-fluent.md`) since the framework docs often omit them.
