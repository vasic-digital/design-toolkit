// Tests for the parametric-uniqueness engine: determinism, the contrast gate,
// and cross-seed uniqueness. Run with `npm test` (node --test).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { generateTokens, deriveVector } from "../lib/tokens.mjs";
import { generateMark } from "../lib/marks.mjs";
import { validateDtcg, extractSchemes } from "../lib/dtcg.mjs";
import { evaluateScheme, oklchHue, hueDelta } from "../lib/color.mjs";

const SEEDS = ["vasic-digital", "milosvasic", "helix"];
const sha = (s) => createHash("sha256").update(s).digest("hex");
const canonical = (doc) => JSON.stringify(doc);

test("determinism: same seed => byte-identical token document", () => {
  for (const seed of SEEDS) {
    const a = canonical(generateTokens(seed).document);
    const b = canonical(generateTokens(seed).document);
    assert.equal(sha(a), sha(b), `seed ${seed} not deterministic`);
  }
});

test("determinism: same seed => identical resolved vector", () => {
  for (const seed of SEEDS) {
    assert.deepEqual(deriveVector(seed), deriveVector(seed));
  }
});

test("determinism: same seed => byte-identical SVG mark", () => {
  for (const seed of SEEDS) {
    const a = generateMark(seed).svg;
    const b = generateMark(seed).svg;
    assert.equal(sha(a), sha(b), `mark for ${seed} not deterministic`);
    assert.ok(a.includes("<svg"), "output is SVG");
  }
});

test("DTCG validity: every generated document is structurally valid", () => {
  for (const seed of SEEDS) {
    const { valid, errors, tokenCount } = validateDtcg(generateTokens(seed).document);
    assert.equal(valid, true, `seed ${seed} invalid DTCG: ${errors.join("; ")}`);
    assert.ok(tokenCount > 40, `expected a full role set, got ${tokenCount} tokens`);
  }
});

test("contrast gate: all semantic pairs clear WCAG threshold in light+dark", () => {
  for (const seed of SEEDS) {
    const { light, dark } = extractSchemes(generateTokens(seed).document);
    const rows = [...evaluateScheme(light, "light"), ...evaluateScheme(dark, "dark")];
    const fails = rows.filter((r) => !r.pass);
    assert.equal(
      fails.length, 0,
      `seed ${seed} contrast fails: ` +
      fails.map((r) => `${r.mode} ${r.fg}/${r.bg}=${r.ratio}<${r.threshold}`).join(", ")
    );
    assert.ok(rows.length >= 20, "both modes evaluated");
  }
});

test("uniqueness: distinct seeds produce distinct primary hues (>=15 deg)", () => {
  const THRESHOLD = 15;
  const hues = SEEDS.map((s) => oklchHue(generateTokens(s).schemes.light.primary));
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      const d = hueDelta(hues[i], hues[j]);
      assert.ok(
        d >= THRESHOLD,
        `seeds ${SEEDS[i]} & ${SEEDS[j]} hues too close: ${d.toFixed(2)} deg`
      );
    }
  }
});

test("uniqueness: different seeds differ in the design-DNA vector", () => {
  const vectors = SEEDS.map((s) => JSON.stringify(deriveVector(s).mcuVariant + deriveVector(s).seedHue));
  assert.ok(new Set(vectors).size >= 2, "expected measurable vector variance across seeds");
});
