# Layout — Primitives, Container Queries, 8pt Grid

> **Sources:** Every Layout (every-layout.dev — PAID; only the *concepts*/primitive names are
> encoded here, paraphrased, never the prose) · MDN Grid/Flexbox/Container Queries (CC-BY-SA) ·
> Material 3 Layout (open — authoritative free source of the 4/8dp grid) · Apple HIG (free-to-read,
> COPYRIGHTED — rules paraphrased). Distilled rules only.

## 1. Composable layout primitives (build from these)

Paraphrased concepts — implement as small, single-responsibility layout components:

- **Stack** — vertical flow; one gap token between all children (`> * + *` margin, or `gap`).
- **Cluster** — horizontal group that wraps (nav items, tags, button rows); `flex-wrap` + `gap`.
- **Sidebar** — a fixed-ish aside + fluid main that collapses to stacked when the main can't hold its
  ideal min inline-size.
- **Switcher** — N columns above a container threshold, stacked below — driven by **container** size.
- **Cover** — vertically centered focal content with optional header/footer; `min-block-size`.
- **Grid** — intrinsic card grid: `grid-template-columns: repeat(auto-fit, minmax(<min>, 1fr))` — no
  breakpoint counting.
- **Frame / Reel / Imposter / Center** — aspect-ratio box, horizontal scroller, overlay, centered
  measure-limited column.

Prefer **intrinsic sizing** (`min()`, `max()`, `clamp()`, `minmax()`, `auto-fit`) over enumerated
breakpoints. Each primitive maps to an OpenDesign layout token set.

## 2. Container-query-first responsiveness

Components respond to **their own** container, not the viewport:

```css
.card-region { container-type: inline-size; }
@container (min-width: 30rem) { .card { grid-template-columns: 1fr 1fr; } }
```

- Use `cqi`/`cqw` for container-relative sizing.
- **Viewport media queries** are reserved for **page-level regions** (global nav, page gutters), not
  component internals. This makes components portable across contexts.

## 3. The 4/8pt grid (spacing system)

- Base spacing unit **4dp**, primary rhythm **8dp** (Material 3). All spacing tokens are multiples:
  `4, 8, 12, 16, 24, 32, 48, 64…`. `spaceMultiplier` (theming-designer) scales the whole set
  (compact 0.85× / airy 1.25×).
- Layout regions align to the grid; component padding uses the scale, never arbitrary px.

## 4. Radius & density (shape personality)

- Radius scale from `radiusBase`: `0` sharp/technical · `4`/`8` neutral-friendly · `12` friendly ·
  `999` pill/playful. Emit `radius-xs…radius-full` tokens.
- Density = the `spaceMultiplier` applied to padding/gaps.

## 5. Cross-platform adaptation (paraphrased checklists — copyrighted sources)

**Web:** container queries for components; `dvh`/`svh` for mobile viewport height;
`env(safe-area-inset-*)`; logical properties (`margin-inline`, `padding-block`) for RTL; base layout
works with no JS.

**Apple HIG (iOS/iPadOS/macOS — rules only):** respect safe areas / notch / home indicator; touch
targets **≥44pt**; native nav bar / tab bar / large-title patterns; support Dynamic Type; layout
adapts to size classes (compact/regular).

**Material 3 (Android):** touch targets **≥48dp**; window size classes compact/medium/expanded;
adaptive panes (list-detail, supporting-pane) at medium+; edge-to-edge with insets; back-gesture safe.

**Desktop (macOS/Windows/GNOME):** resizable windows with a sensible min size; full keyboard
navigation of every region; pointer + keyboard (+ touch where relevant); platform-native window
chrome conventions.

## 6. Rules the agents enforce
1. Structure follows content + reading order (DOM order = visual/tab order).
2. Container queries for components; viewport queries only for page regions.
3. All spacing/tracks/gutters/radius are tokens on the 4/8pt grid — no magic px.
4. No horizontal scroll for vertical content; usable at 320 CSS px (WCAG 1.4.10).
5. Base renders + is operable with JS disabled; verified by render+click at phone/tablet/desktop.
