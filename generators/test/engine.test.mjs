// Tests for the parametric-uniqueness engine: determinism, the contrast gate,
// and cross-seed uniqueness. Run with `npm test` (node --test).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { generateTokens, deriveVector } from "../lib/tokens.mjs";
import { generateMark } from "../lib/marks.mjs";
import { validateDtcg, extractSchemes } from "../lib/dtcg.mjs";
import { evaluateScheme, oklchHue, hueDelta } from "../lib/color.mjs";
import { typePairDistance } from "../../qa/lib/typedna.mjs";
import { dnaDistanceBetween } from "../../qa/lib/dnadist.mjs";
import { deltaE00 } from "../../qa/lib/deltae.mjs";

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

test("determinism: motion + depth axes are stable per seed", () => {
  for (const seed of SEEDS) {
    const a = deriveVector(seed), b = deriveVector(seed);
    assert.equal(a.motionIntensity, b.motionIntensity);
    assert.equal(a.depthLevel, b.depthLevel);
    assert.equal(a.fontPairId, b.fontPairId);
  }
});

test("U4: distinct seeds produce distinct type pairings (>=0.3), identical seed => 0", () => {
  const vs = SEEDS.map((s) => deriveVector(s));
  for (let i = 0; i < vs.length; i++) {
    for (let j = i + 1; j < vs.length; j++) {
      const d = typePairDistance(vs[i].fontPair, vs[j].fontPair);
      assert.ok(d >= 0.3, `type-pair distance ${SEEDS[i]}/${SEEDS[j]} = ${d.toFixed(4)} < 0.3`);
    }
  }
  // golden-BAD: same seed => same font pair => distance 0
  assert.equal(typePairDistance(vs[0].fontPair, vs[0].fontPair), 0);
});

test("U3: weighted DNA distance >=0.25 across seeds; identical seed => 0", () => {
  const vs = SEEDS.map((s) => ({ v: deriveVector(s), t: generateTokens(s) }));
  for (let i = 0; i < vs.length; i++) {
    for (let j = i + 1; j < vs.length; j++) {
      const cDe00 = Math.min(
        deltaE00(vs[i].t.schemes.light.primary, vs[j].t.schemes.light.primary),
        deltaE00(vs[i].t.schemes.dark.primary, vs[j].t.schemes.dark.primary),
      );
      const { distance } = dnaDistanceBetween(vs[i].v, vs[j].v, cDe00);
      assert.ok(distance >= 0.25, `DNA distance ${SEEDS[i]}/${SEEDS[j]} = ${distance.toFixed(4)} < 0.25`);
    }
  }
  // golden-BAD: identical vector + zero color distance => distance 0
  assert.equal(dnaDistanceBetween(vs[0].v, vs[0].v, 0).distance, 0);
});
