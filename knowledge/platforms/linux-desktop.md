# Linux Desktop — GNOME HIG + KDE HIG Cheat-Sheet

> **Canonical sources:** GNOME HIG https://developer.gnome.org/hig/ (**CC-BY-SA — reference-only,
> attribute; do not vendor as our own**) · KDE HIG https://develop.kde.org/hig/ .
> **Caveat:** GNOME/KDE express layout in **style classes / grid units, not fixed pixels**; where a
> numeric target is quoted it is **[UNVERIFIED]** unless noted.

## 1. GNOME (Adwaita / libadwaita / GTK4)
- **Design language:** Adwaita, implemented by **libadwaita** on **GTK4**. Use adaptive widgets
  (`AdwClamp`, `AdwLeaflet`/`AdwNavigationSplitView`, `AdwViewStack`) rather than hand-rolled layout.
- **Minimum window size: 1024 × 600**; **phone/adaptive minimum: 360 × 294** — apps should reflow to
  fit the smallest supported size.
- **Sizing is via style classes, not raw px** (e.g. `.pill`, `.circular`, `.flat`, `.suggested-action`,
  `.compact`) — theme controls their metrics; do not hard-code control dimensions.
- **No published numeric minimum touch target [UNVERIFIED]** — rely on default control sizes.
- **Accessibility:** **AT-SPI** stack + **Orca** screen reader; set accessible roles/labels; respect
  system high-contrast and reduced-motion (`prefers-reduced-motion` analog via GTK settings).
- Source: https://developer.gnome.org/hig/

## 2. KDE (Breeze / Kirigami)
- **Design language:** Breeze, implemented via **Kirigami** (Qt/QML) for convergent (desktop +
  mobile) apps.
- **`Kirigami.Units.gridUnit = 18 px`** — the base metric; size/space in multiples of `gridUnit`,
  not raw px.
- **`smallSpacing = 4 px`**, **`largeSpacing = 8 px`** (Kirigami spacing units).
- **No published numeric minimum touch target [UNVERIFIED]** — Kirigami scales targets from
  `gridUnit`.
- **Accessibility:** AT-SPI + **Orca**; provide accessible names/descriptions via QML `Accessible`.
- Source: https://develop.kde.org/hig/

## 3. Shared rules
- Prefer the toolkit's semantic tokens mapped onto **style classes / grid units**, never absolute px
  hard-coded against a theme.
- Both stacks support light/dark, high-contrast, and reduced-motion — wire fallbacks accordingly.
- GNOME HIG text is **CC-BY-SA**: treat as **reference-only, attributed** — do not copy prose into
  shipped docs/tokens.
