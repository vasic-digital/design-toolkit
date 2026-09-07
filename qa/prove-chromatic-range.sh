#!/usr/bin/env bash
# prove-chromatic-range.sh — the §1.1 paired mutation proof for the anti-monotone
# gate, qa/check-chromatic-range.mjs.
#
# WHY A GATE LIKE THIS NEEDS ITS PROOF MORE THAN MOST. A floor gate is the
# easiest kind of check to write inoperatively: set every floor below the value
# you already have and it is green forever while asserting nothing. The gate's
# own floors were derived from a 36-seed sweep and each is documented with the
# margin it has, but a documented margin is a claim. This file is the evidence.
#
# THE LOAD-BEARING MUTATION IS M1. It does not synthesise a "bad" palette by
# hand — it takes the ACTUAL COMMITTED CANDIDATES from git HEAD, i.e. the exact
# monotone state this gate was written to catch, and asserts the gate rejects
# them. A gate that cannot fail the artefact that motivated it is decoration.
# (Once the fixed candidates are themselves committed, M1 stops being a
# regression witness and its rows are reported as UNDETERMINED rather than
# silently passing — see the guard below. That is the honest failure mode: the
# proof says it could no longer ask the question, instead of asserting an
# untested pass.)
#
# EVERY MUTATION IS DATA. Not one edits the gate's source. They are CLI
# arguments, files derived from a committed blob, and small synthesized
# stylesheets. A proof that edits the code it proves is testing a program that
# will never ship.
#
# Exit:
#   0 = every mutation produced its expected exit code
#   1 = at least one did NOT — the gate's contract is broken
#   2 = COULD NOT DETERMINE — this proof's own prerequisites are missing.
#       NEVER a pass.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
GATE="$HERE/check-chromatic-range.mjs"

PASS=0; FAIL=0; UNDET=0
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "=== prove-chromatic-range ==="
echo

undetermined() {
  echo "COULD NOT DETERMINE: $*" >&2
  echo "  This proof asserted nothing. That is not a pass." >&2
  exit 2
}
# A single row that could not be driven. Counted separately from PASS/FAIL so a
# partially-answerable proof can never be read as a clean one.
undet_row() {
  echo "UNDET $1 — $2" >&2
  UNDET=$((UNDET + 1))
}

command -v node >/dev/null 2>&1 || undetermined "node is not on PATH."
command -v git  >/dev/null 2>&1 || undetermined "git is not on PATH."
[[ -f "$GATE" ]] || undetermined "the gate under proof is missing: $GATE"
if [[ ! -d "$ROOT/generators/node_modules" ]]; then
  undetermined "generators/node_modules is absent, so colorjs.io cannot be
  reached and EVERY row would return rc 2. A proof that can only reach the
  could-not-determine state proves nothing about the other two.
  Run: npm --prefix '$ROOT/generators' install"
fi

# One mutation: name, expected rc, then the gate arguments.
mutate() {
  local name="$1" expected="$2"; shift 2
  local rc
  node "$GATE" "$@" >"$TMP/out" 2>"$TMP/err"
  rc=$?
  if [[ "$rc" -eq "$expected" ]]; then
    echo "PASS $name — exit $rc (expected $expected)"
    PASS=$((PASS + 1))
  else
    echo "FAIL $name — exit $rc, expected $expected" >&2
    sed -n '1,6p' "$TMP/err" | sed 's/^/       /' >&2
    FAIL=$((FAIL + 1))
  fi
}

# =============================================================================
# M1 — THE REGRESSION WITNESS: the committed (pre-fix) candidates must FAIL.
# =============================================================================
echo "--- M1 the monotone state this gate exists to catch ---"
for brand in vasic-digital milosvasic; do
  blob="proposed/$brand.od-tokens.css"
  if ! git -C "$ROOT" cat-file -e "HEAD:$blob" 2>/dev/null; then
    undet_row "M1 $brand" "no HEAD:$blob to compare against (new file?)"
    continue
  fi
  git -C "$ROOT" show "HEAD:$blob" >"$TMP/head-$brand.css" 2>/dev/null
  # If HEAD already carries the FIXED candidate, this row can no longer witness
  # the regression. Say so; do not quietly count it as a pass.
  if node "$GATE" --candidate "$TMP/head-$brand.css" >/dev/null 2>&1; then
    undet_row "M1 $brand" \
      "HEAD:$blob already PASSES the gate — the fix is committed, so this row can no longer witness the pre-fix state. Re-point it at a preserved monotone fixture to restore the witness."
  else
    mutate "M1 $brand: committed pre-fix candidate -> FAIL" 1 --candidate "$TMP/head-$brand.css"
  fi
done
echo

# =============================================================================
# M2 — synthesized collapses. Each isolates ONE floor.
# =============================================================================
echo "--- M2 synthesized monotone collapses ---"

# M2a fully greyscale: no chromatic token at all. Trips share, bins, spread and
# meanChroma together — the total-collapse case.
cat >"$TMP/grey.css" <<'CSS'
:root {
  --od-bg: #ffffff; --od-surface: #f4f4f4; --od-surface-2: #e8e8e8;
  --od-text: #1a1a1a; --od-text-muted: #5c5c5c; --od-border: #cccccc;
  --od-accent-700: #666666; --od-accent: var(--od-accent-700);
  --od-success: #7a7a7a; --od-warning: #909090; --od-danger: #4d4d4d;
}
CSS
mutate "M2a fully greyscale -> FAIL" 1 --candidate "$TMP/grey.css"

# M2b sepia duotone: strongly chromatic, but every hue inside one 30deg bin.
# This is the case a chroma-only or saturation-only metric would PASS, and it is
# precisely the appearance the brief described. It must trip bins and spread.
cat >"$TMP/sepia.css" <<'CSS'
:root {
  --od-bg: #fff8f0; --od-surface: #f6e7d6; --od-surface-2: #eddcc6;
  --od-text: #3a2413; --od-text-muted: #6b4a2c; --od-border: #d9bd9a;
  --od-accent-700: #a55b16; --od-accent: var(--od-accent-700);
  --od-success: #b06a1e; --od-warning: #c07d28; --od-danger: #8a4a10;
}
CSS
mutate "M2b sepia duotone (chromatic but one hue family) -> FAIL" 1 --candidate "$TMP/sepia.css"

# M2c narrow-but-many: FOUR distinct hues, all inside a 90deg arc. Clears
# MIN_HUE_BINS and must still be rejected by MIN_HUE_SPREAD. This is the row
# that proves the two hue metrics are not redundant — a bins-only gate passes it.
cat >"$TMP/narrow.css" <<'CSS'
:root {
  --od-bg: #ffffff; --od-text: #1a1a1a; --od-border: #cccccc;
  --od-a: #c62828; --od-b: #e65100; --od-c: #f9a825; --od-d: #9e9d24;
  --od-accent-700: #c62828; --od-accent: var(--od-accent-700);
}
CSS
mutate "M2c four hues inside a 90deg arc -> FAIL (spread, not bins)" 1 --candidate "$TMP/narrow.css"
echo

# =============================================================================
# M3 — POSITIVE CONTROLS. A gate that only ever fails is as useless as one that
# only ever passes.
# =============================================================================
echo "--- M3 positive controls ---"
for brand in vasic-digital milosvasic; do
  cand="$ROOT/proposed/$brand.od-tokens.css"
  if [[ -f "$cand" ]]; then
    mutate "M3 $brand: working-tree candidate -> PASS" 0 --candidate "$cand"
  else
    undet_row "M3 $brand" "no working-tree candidate at $cand"
  fi
done

# M3c a deliberately wide palette must pass, so the floors are shown not to be
# unreachable by anything but the two shipped files.
cat >"$TMP/wide.css" <<'CSS'
:root {
  --od-bg: #ffffff; --od-text: #1a1a1a; --od-border: #cccccc;
  --od-a: #b3261e; --od-b: #7d5260; --od-c: #1b6c3a;
  --od-d: #1a4f8b; --od-e: #6750a4;
  --od-accent-700: #b3261e; --od-accent: var(--od-accent-700);
}
CSS
mutate "M3c wide five-hue palette -> PASS" 0 --candidate "$TMP/wide.css"
echo

# =============================================================================
# M4 — the COULD-NOT-DETERMINE arm. Each must be 2, never 1: "I cannot measure
# this" is not "your palette is monotone".
# =============================================================================
echo "--- M4 could-not-determine arm ---"
mutate "M4a missing candidate file -> UNDETERMINED" 2 --candidate "$TMP/does-not-exist.css"

printf '/* no root rule at all */\n.foo { color: red; }\n' >"$TMP/noroot.css"
mutate "M4b no :root block -> UNDETERMINED" 2 --candidate "$TMP/noroot.css"

# A :root that declares only NON-colour tokens. Nothing to measure; the gate must
# not report a monotone finding about a file it could not read a colour from.
printf ':root { --od-fs-base: 1rem; --od-space-1: 4px; --od-z-nav: 1000; }\n' >"$TMP/nocolour.css"
mutate "M4c :root with zero colour values -> UNDETERMINED" 2 --candidate "$TMP/nocolour.css"

# The whole :root hidden inside an unterminated comment — the class of defect the
# sibling token gate's golden-bad fixture exists for. Comment-stripped, nothing
# is left, so this is a 2 and not a 1.
printf '/* oops\n:root { --od-bg: #fff; --od-accent: #b3261e; }\n' >"$TMP/commented.css"
mutate "M4d :root swallowed by an unterminated comment -> UNDETERMINED" 2 --candidate "$TMP/commented.css"

# No --candidate at all.
mutate "M4e no --candidate argument -> UNDETERMINED" 2
echo

# =============================================================================
# M5 — --report must SUPPRESS a finding (exit 0) while still printing it, and
# must NOT suppress a could-not-determine. If --report swallowed rc 2 as well it
# would be a silent-pass switch, which is exactly what §11.4.6 forbids.
# =============================================================================
echo "--- M5 --report semantics ---"
mutate "M5a --report over a FAILING candidate -> 0 (suppressed, still printed)" 0 --candidate "$TMP/sepia.css" --report
mutate "M5b --report does NOT suppress could-not-determine -> 2" 2 --candidate "$TMP/does-not-exist.css" --report

# And prove the suppressed run still REPORTS the finding rather than hiding it.
if node "$GATE" --candidate "$TMP/sepia.css" --report 2>&1 >/dev/null | grep -q 'FAIL'; then
  echo "PASS M5c --report still prints the FAIL rows"
  PASS=$((PASS + 1))
else
  echo "FAIL M5c --report printed no FAIL row — it is hiding the finding, not reporting it" >&2
  FAIL=$((FAIL + 1))
fi
echo

# =============================================================================
echo "=== summary: $PASS passed, $FAIL failed, $UNDET undetermined ==="
if [[ "$FAIL" -gt 0 ]]; then exit 1; fi
if [[ "$UNDET" -gt 0 ]]; then
  echo "  Some rows could not be driven; that is NOT a pass for those rows." >&2
  exit 2
fi
exit 0
