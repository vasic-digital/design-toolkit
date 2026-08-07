// Deterministic seeding primitives for the parametric-uniqueness engine.
//
// Guardrail (theming-designer.md #2): same seed + same options + same generator
// version => byte-identical output. No `Math.random()` anywhere in the pipeline;
// every "random" choice is drawn from a seeded PRNG so themes are reproducible
// and auditable.

/**
 * cyrb128 — hash an arbitrary string into four 32-bit unsigned integers.
 * Public-domain algorithm (bryc, https://stackoverflow.com/a/47593316).
 * Used to expand a human seed ("vasic-digital") into PRNG state.
 * @param {string} str
 * @returns {[number, number, number, number]}
 */
export function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * mulberry32 — small, fast, well-distributed 32-bit PRNG.
 * Public-domain algorithm (bryc). Returns a function yielding floats in [0, 1).
 * @param {number} a  seed state (uint32)
 * @returns {() => number}
 */
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A seeded random source with convenience selectors. Deterministic for a given
 * seed string, regardless of platform.
 */
export class SeededRandom {
  /** @param {string|number} seed */
  constructor(seed) {
    this.seed = String(seed);
    const [a, b, c, d] = cyrb128(this.seed);
    // Fold the four hash words into a single state; keep the words for anyone
    // who wants stable independent draws (e.g. a base hue from `a`).
    this.words = [a, b, c, d];
    this._next = mulberry32((a ^ b ^ c ^ d) >>> 0);
  }

  /** @returns {number} float in [0, 1) */
  float() { return this._next(); }

  /**
   * Integer in [min, max] inclusive.
   * @param {number} min @param {number} max
   */
  int(min, max) { return min + Math.floor(this.float() * (max - min + 1)); }

  /**
   * Pick one element from an array deterministically.
   * @template T @param {T[]} arr @returns {T}
   */
  pick(arr) { return arr[Math.floor(this.float() * arr.length)]; }
}
