// Gate: the dependency lockfile must not contain copyleft (AGPL/GPL/LGPL/SSPL) or
// use-restricted ("Limited W3 License") packages, and nothing may reach apca-w3 / colorparsley.
// Operator decision 2026-11-24: the AGPL path is removed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const lock = JSON.parse(readFileSync(join(here, "..", "package-lock.json"), "utf8"));
const pkgs = Object.entries(lock.packages).filter(([k]) => k);
const BAD_LICENCE = /(^|[^A-Za-z])(A?GPL|LGPL|SSPL|Limited W3)/i;
const BAD_NAMES = new Set(["apca-w3", "colorparsley"]);
const nameOf = (k) => k.replace(/^.*node_modules\//, "");

test("lockfile has no copyleft or use-restricted licence", () => {
  const hits = pkgs.filter(([, v]) => BAD_LICENCE.test(String(v.license ?? ""))).map(([k, v]) => `${nameOf(k)}@${v.version}: ${v.license}`);
  assert.deepEqual(hits, []);
});

test("lockfile does not contain apca-w3 or colorparsley", () => {
  const hits = pkgs.map(([k]) => nameOf(k)).filter((n) => BAD_NAMES.has(n));
  assert.deepEqual(hits, []);
});

test("no tracked source imports apca-w3 or ships a port of its constants", () => {
  assert.equal(existsSync(join(here, "..", "..", "qa", "lib", "apca.mjs")), false);
});
