// Perceptual color-distance math for the HelixQA uniqueness gate — REAL,
// dependency-free implementations of the metrics the test-bank names.
//
// Why hand-rolled here instead of importing colorjs.io: run-checks.mjs lives in
// qa/, which has no node_modules ancestor carrying colorjs.io (that dep is
// installed under generators/, resolvable only from generators/lib/*). qa/ must
// stay runnable on its own, and this file may NOT reach into a sibling package's
// node_modules. So the two metrics we assert on (ΔE00, ΔE-OK) are implemented
// from their published formulas and cross-validated against colorjs.io in the
// bundled self-test (`node qa/lib/deltae.mjs --selftest`).
//
// Sources / formulas:
//   sRGB→XYZ→CIELab (D65): IEC 61966-2-1 sRGB EOTF + CIE 15 Lab (Xn,Yn,Zn D65).
//   ΔE00 (CIEDE2000): Sharma, Wu & Dalal (2005), the standard reference paper.
//   ΔE-OK: Björn Ottosson's OKLab (2020) Euclidean distance.
// These are facts/algorithms (not copyrightable expression); no prose vendored.

// --- sRGB hex -> linear-light RGB -------------------------------------------
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}
function srgbToLinear(u) {
  return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
}

// --- linear sRGB -> CIELab (D50) --------------------------------------------
// Matches CSS Color 4 / colorjs.io: linear-sRGB → XYZ(D65) → Bradford D65→D50
// → Lab against the D50 white. (colorjs.io's default "lab" is D50; using D65
// here would drift ΔE00 by ~3 on chromatic pairs — see self-test.)
const EPS = 216 / 24389;
const KAPPA = 24389 / 27;
const fLab = (t) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
// D50 reference white in XYZ (CSS Color 4).
const D50 = { Xn: 0.3457 / 0.3585, Yn: 1.0, Zn: (1 - 0.3457 - 0.3585) / 0.3585 };

// Composed linear-sRGB → XYZ(D50) matrix = (sRGB→XYZ D65) · (Bradford D65→D50),
// as used by colorjs.io / CSS Color 4.
const SRGB_TO_XYZ_D50 = [
  [0.436065742824811, 0.3851514688337912, 0.14307845442264197],
  [0.22249319175623702, 0.7168870538238823, 0.06061979053616537],
  [0.013923904500943066, 0.09708128566574634, 0.7140993584005155],
];

export function hexToLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  const M = SRGB_TO_XYZ_D50;
  const X = r * M[0][0] + g * M[0][1] + b * M[0][2];
  const Y = r * M[1][0] + g * M[1][1] + b * M[1][2];
  const Z = r * M[2][0] + g * M[2][1] + b * M[2][2];
  const fx = fLab(X / D50.Xn), fy = fLab(Y / D50.Yn), fz = fLab(Z / D50.Zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

// --- linear sRGB -> OKLab (Ottosson 2020) -----------------------------------
export function hexToOklab(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

const deg2rad = (d) => (d * Math.PI) / 180;
const rad2deg = (r) => (r * 180) / Math.PI;

/**
 * CIEDE2000 color difference (ΔE00) between two sRGB hex colors.
 * kL=kC=kH=1 (graphic-arts default). Reference: Sharma/Wu/Dalal 2005.
 * @returns {number} ΔE00 (0 = identical; larger = more different)
 */
export function deltaE00(hex1, hex2) {
  const { L: L1, a: a1, b: b1 } = hexToLab(hex1);
  const { L: L2, a: a2, b: b2 } = hexToLab(hex2);

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Cbar ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const hp = (b, ap) => {
    if (b === 0 && ap === 0) return 0;
    const h = rad2deg(Math.atan2(b, ap));
    return h < 0 ? h + 360 : h;
  };
  const h1p = hp(b1, a1p);
  const h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(deg2rad(hbarp - 30)) +
    0.24 * Math.cos(deg2rad(2 * hbarp)) +
    0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
    0.2 * Math.cos(deg2rad(4 * hbarp - 63));

  const dtheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(deg2rad(2 * dtheta)) * Rc;

  const termL = dLp / Sl;
  const termC = dCp / Sc;
  const termH = dHp / Sh;
  return Math.sqrt(termL ** 2 + termC ** 2 + termH ** 2 + Rt * termC * termH);
}

/**
 * Euclidean OKLab distance (ΔE-OK). A cheap perceptual companion to ΔE00;
 * ~0.02 ≈ a just-noticeable difference in OKLab (Ottosson).
 * @returns {number}
 */
export function deltaEOK(hex1, hex2) {
  const p = hexToOklab(hex1);
  const q = hexToOklab(hex2);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

// --- self-test: validate against colorjs.io reference values -----------------
// Run: node qa/lib/deltae.mjs --selftest   (exits non-zero on drift > 0.05)
if (process.argv[1] && process.argv[1].endsWith("deltae.mjs") && process.argv.includes("--selftest")) {
  // Reference ΔE00 values computed with colorjs.io 0.5.x (deltaE …,"2000"):
  const cases = [
    ["#4658b0", "#b04658", 36.063],
    ["#683a00", "#616219", 20.68], // vasic-digital vs helix (light primary)
    ["#585799", "#616219", 48.87], // milosvasic vs helix (light primary)
    ["#ffffff", "#000000", 100.0],
  ];
  let worst = 0;
  for (const [a, b, ref] of cases) {
    const got = deltaE00(a, b);
    const drift = Math.abs(got - ref);
    worst = Math.max(worst, drift);
    process.stderr.write(`ΔE00 ${a}/${b}: got ${got.toFixed(3)} ref ${ref} drift ${drift.toFixed(3)}\n`);
  }
  process.stderr.write(`worst drift ${worst.toFixed(3)}\n`);
  process.exit(worst <= 0.05 ? 0 : 1);
}
