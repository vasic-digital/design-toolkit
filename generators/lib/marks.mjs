// Seeded generative SVG marks/backgrounds. Deterministic: same seed => same SVG,
// byte-for-byte. Colors are drawn from the same seed's generated palette so a
// project's mark and its theme are visibly of the same family.
//
// Rendering uses @svgdotjs/svg.js driven by svgdom (its official headless DOM),
// so the exact same drawing API used in a browser runs in Node.

import { createSVGWindow } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";
import { SeededRandom } from "./prng.mjs";
import { generateTokens } from "./tokens.mjs";

/**
 * Generate a deterministic generative SVG mark for a seed.
 * @param {string|number} seed
 * @param {{ size?: number, kind?: "mark"|"background", count?: number }} [opts]
 * @returns {{ svg: string, palette: string[], kind: string, size: number }}
 */
export function generateMark(seed, opts = {}) {
  const size = opts.size ?? 512;
  const kind = opts.kind ?? "mark";
  const rng = new SeededRandom(String(seed) + ":mark");

  // Palette from the theme so mark + tokens share a seed identity.
  const { schemes } = generateTokens(seed);
  const palette = [
    schemes.light.primary,
    schemes.light.secondary,
    schemes.light.tertiary,
    schemes.light["primary-container"],
    schemes.light["tertiary-container"],
  ];
  const bg = schemes.light["surface-container"];
  const ink = schemes.light.primary;

  // Fresh headless DOM per call keeps determinism isolated between invocations.
  const window = createSVGWindow();
  registerWindow(window, window.document);
  const canvas = SVG(window.document.documentElement);
  canvas.size(size, size).viewbox(0, 0, size, size);

  canvas.rect(size, size).fill(bg);

  if (kind === "background") {
    drawBackground(canvas, rng, size, palette);
  } else {
    drawMark(canvas, rng, size, palette, ink);
  }

  return { svg: canvas.svg(), palette, kind, size };
}

// A layered geometric glyph: overlapping translucent shapes on a rotated grid,
// all positions/rotations/colors seeded.
function drawMark(canvas, rng, size, palette, ink) {
  const cx = size / 2, cy = size / 2;
  const layers = 5 + Math.floor(rng.float() * 4); // 5..8
  for (let i = 0; i < layers; i++) {
    const r = size * (0.14 + rng.float() * 0.26);
    const angle = rng.float() * 360;
    const dist = rng.float() * size * 0.16;
    const x = cx + Math.cos((angle * Math.PI) / 180) * dist;
    const y = cy + Math.sin((angle * Math.PI) / 180) * dist;
    const color = palette[Math.floor(rng.float() * palette.length)];
    const shape = rng.float();
    const opacity = 0.45 + rng.float() * 0.4;
    if (shape < 0.34) {
      canvas.circle(r * 2).center(x, y).fill(color).opacity(opacity);
    } else if (shape < 0.67) {
      canvas.rect(r * 1.6, r * 1.6).center(x, y).fill(color).opacity(opacity)
        .transform({ rotate: rng.float() * 90, ox: x, oy: y });
    } else {
      const pts = trianglePoints(x, y, r, rng.float() * 360);
      canvas.polygon(pts).fill(color).opacity(opacity);
    }
  }
  // A crisp central accent for a recognizable focal point.
  canvas.circle(size * 0.12).center(cx, cy).fill(ink);
}

// A calm scattered-shape tiling suitable as a hero/section background.
function drawBackground(canvas, rng, size, palette) {
  const cols = 6, rows = 6;
  const cell = size / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng.float() < 0.35) continue; // sparse
      const x = c * cell + cell / 2;
      const y = r * cell + cell / 2;
      const rad = cell * (0.12 + rng.float() * 0.3);
      const color = palette[Math.floor(rng.float() * palette.length)];
      const opacity = 0.25 + rng.float() * 0.35;
      if (rng.float() < 0.5) {
        canvas.circle(rad * 2).center(x, y).fill(color).opacity(opacity);
      } else {
        canvas.rect(rad * 1.8, rad * 1.8).center(x, y).fill(color).opacity(opacity)
          .transform({ rotate: rng.int(0, 89), ox: x, oy: y });
      }
    }
  }
}

function trianglePoints(x, y, r, rot) {
  const pts = [];
  for (let k = 0; k < 3; k++) {
    const a = ((rot + k * 120) * Math.PI) / 180;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return pts.map((p) => `${Math.round(p[0] * 100) / 100},${Math.round(p[1] * 100) / 100}`).join(" ");
}
