# Web — Responsive + PWA + WCAG 2.2 + HTML Email Cheat-Sheet

> **Canonical sources:** MDN https://developer.mozilla.org/ (CC-BY-SA) · WCAG 2.2
> https://www.w3.org/TR/WCAG22/ (W3C Document License) · caniemail https://www.caniemail.com/ .

## 1. Responsive layout
- **Content-based breakpoints** — break where the *content* needs it, not at device presets.
- **`clamp(min, preferred, max)`** for fluid type/space (see core `typography.md` / Utopia).
- **Container queries** (`@container`) — size components to their container, not the viewport.
- **Viewport units:** prefer **`svh` / `lvh` / `dvh`** (small/large/dynamic) over `vh` to handle
  mobile browser chrome collapse.
- Source: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries

## 2. PWA
- **Web app manifest** (`manifest.webmanifest`): `name`, `short_name`, `start_url`, `display`,
  `theme_color`, `background_color`, `icons`.
- **Icons: provide 192×192 and 512×512**; include a **`maskable`** icon (`"purpose": "maskable"`) for
  adaptive OS masks.
- **`display` modes:** `fullscreen` / `standalone` / `minimal-ui` / `browser`.
- Source: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest

## 3. WCAG 2.2 (hard gate — see core `a11y-wcag22.md` for full SC list)
- **Contrast:** text **4.5:1** (normal), **3:1** (large ≥18pt/14pt-bold); **AAA 7:1 / 4.5:1**.
- **Non-text contrast: 3:1** (UI components, graphical objects, focus indicators).
- **Reflow:** usable at **320 px equivalent width** (content reflows at **400% zoom**) with no 2-D
  scrolling.
- **Target size:** **24 × 24 CSS px (2.2 AA, SC 2.5.8)**; **44 × 44 (AAA, SC 2.5.5)**.
- **New in WCAG 2.2:** 2.4.11 Focus Not Obscured (Min), 2.4.12 Focus Not Obscured (Enhanced),
  2.4.13 Focus Appearance, 2.5.7 Dragging Movements, 2.5.8 Target Size (Min), 3.2.6 Consistent Help,
  3.3.7 Redundant Entry, 3.3.8 Accessible Authentication (Min), 3.3.9 Accessible Authentication
  (Enhanced).
- **Removed in 2.2:** SC **4.1.1 Parsing** is obsolete/removed.
- Source: https://www.w3.org/TR/WCAG22/

## 4. HTML email
- **Table-based layout** (`<table>` for structure — flexbox/grid unreliable across clients).
- **Inline CSS** (many clients strip `<style>`/`<head>`).
- **~600 px content width** as the safe max.
- **Outlook (Windows) uses the Word rendering engine** — no modern CSS, needs VML/MSO conditionals
  for backgrounds/buttons; test there specifically.
- Verify feature support against **https://www.caniemail.com/**.
