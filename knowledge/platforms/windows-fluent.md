# Windows — Fluent 2 Cheat-Sheet

> **Canonical source:** Fluent 2 Design System, https://fluent2.microsoft.design/ · **License:**
> copyrighted, free-to-read — **paraphrase into checklists, never copy prose**.

## 1. Design language
- **Fluent 2** — Microsoft's cross-platform system (Windows, Web, iOS, Android, macOS). Emphasis on
  depth, light/material, motion, and coherent tokens across platforms.
- **Typeface: Segoe UI Variable** (variable font; optical size axis — Small/Text/Display grades).

## 2. Key metrics
- **Base minimum target: 40 × 40 epx** (effective pixels).
- **Touch target: 44 × 44 epx with ≥ 4 epx spacing** between adjacent targets.
- **Corner radius scale:** **8 / 4 / 0** (large / small / none) — 8 for cards/dialogs/flyouts, 4 for
  controls, 0 for edge-to-edge.
- **Elevation:** discrete shadow levels (resting → raised → flyout/dialog) — use the token levels,
  not ad-hoc shadows.

## 3. Materials
- **Mica** — opaque, desktop-window background material tinted by the wallpaper (app backdrops).
- **Acrylic** — translucent, blurred material for transient/light-dismiss surfaces (flyouts, menus).
- **Smoke** — dimming scrim behind modal dialogs.
- Source: https://fluent2.microsoft.design/ (Materials).

## 4. Accessibility
- Integrate with **UI Automation** (accessible name/role/value/patterns) for screen readers
  (Narrator).
- Support **Windows high-contrast** themes — use system color keywords / theme resources so contrast
  modes remap correctly; never hard-code colors that ignore contrast themes.
- Keyboard-navigable, visible focus rects, respect reduced-motion system setting.
- Source: https://fluent2.microsoft.design/ (Accessibility).
