#!/usr/bin/env bash
# prove-three-valued-exits.sh — the §1.1 paired mutation proof for this module's
# three gates.
#
# WHAT IT PROVES, and why the proof had to exist. Every gate here is required to
# be three-valued — 0 clean, 1 a real finding, 2 COULD NOT DETERMINE — and a 2 is
# never a pass. That contract is worthless unless something drives all three
# states and watches the exit code. Until this file existed, nothing did: the two
# Node gates collapsed an infrastructure fault into exit 1 (a content verdict
# about the tokens) and nobody noticed, and the shell gate's three rc paths had
# no proof at all.
#
# EVERY MUTATION IS DATA. Not one of them edits a gate's source. They are
# command-line arguments, input files, a fixture that already ships
# (qa/fixtures/golden-bad-tokens.css), a scratch git repository built from
# scratch, and a dependency-free copy of this working tree. A proof that edits
# the code it proves is testing a program that will never ship, so none of that
# is done here.
#
# The dependency-absent mutation (M1) copies the WORKING TREE — not `git archive
# HEAD` — precisely so it proves the code as it stands rather than as it was last
# committed. An earlier draft used `git archive` and reported a false rc, because
# it was measuring the committed gate, not the edited one.
#
# Exit:
#   0 = every mutation produced its expected exit code
#   1 = at least one mutation did NOT — a gate's three-valued contract is broken
#   2 = COULD NOT DETERMINE — this proof's own prerequisites are missing
#       (node, git, or the generators' pinned dependencies). NEVER a pass.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
RUN_CHECKS="$HERE/run-checks.mjs"
CHECK_TOKENS="$HERE/check-tokens.mjs"
UPSTREAMS_CHECK="$HERE/upstreams-recipe-origin-check.sh"
GOLDEN_BAD="$HERE/fixtures/golden-bad-tokens.css"
CANDIDATE="$ROOT/proposed/vasic-digital.od-tokens.css"

PASS=0; FAIL=0; UNDET=0
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "=== prove-three-valued-exits ==="
echo

undetermined() {
  echo "COULD NOT DETERMINE: $*" >&2
  echo "  This proof asserted nothing. That is not a pass." >&2
  exit 2
}

# ---- prerequisites, each measured rather than assumed ------------------------
command -v node >/dev/null 2>&1 || undetermined "node is not on PATH."
command -v git  >/dev/null 2>&1 || undetermined "git is not on PATH."
for f in "$RUN_CHECKS" "$CHECK_TOKENS" "$UPSTREAMS_CHECK" "$GOLDEN_BAD" "$CANDIDATE"; do
  [[ -f "$f" ]] || undetermined "missing input for this proof: $f"
done
if [[ ! -d "$ROOT/generators/node_modules" ]]; then
  undetermined "generators/node_modules is absent, so the rc-0 and rc-1 controls
  cannot be driven and only the rc-2 row would be exercised. A proof that can
  only reach one of three states proves nothing about the other two.
  Run: npm --prefix '$ROOT/generators' install"
fi

# One mutation: name, expected rc, then the command.
mutate() {
  local name="$1" expected="$2"; shift 2
  local rc
  "$@" >"$TMP/out" 2>"$TMP/err"
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
# qa/run-checks.mjs
# =============================================================================
echo "--- qa/run-checks.mjs ---"

# M1 COULD-NOT-DETERMINE: the pinned color-science dependencies are absent.
# Mutation is a dependency-free COPY of this working tree; the gate's source is
# byte-identical to the one under test. Before the fix this returned Node's
# uncaught-exception rc 1, i.e. "your tokens FAIL" for a machine that had never
# run npm install.
WT="$TMP/wt"
mkdir -p "$WT"
if ! tar -c --exclude=node_modules --exclude=.git -f - -C "$ROOT" . 2>/dev/null | tar -x -C "$WT" 2>/dev/null; then
  undetermined "could not build the dependency-free working-tree copy for M1."
fi
[[ -f "$WT/qa/run-checks.mjs" ]] || undetermined "the M1 working-tree copy is incomplete."
[[ -d "$WT/generators/node_modules" ]] && undetermined "the M1 copy still carries node_modules; the mutation would not bite."
mutate "M1 run-checks: dependencies absent  -> UNDETERMINED" 2 node "$WT/qa/run-checks.mjs"

# M2 COULD-NOT-DETERMINE: --tokens names a file that does not exist.
mutate "M2 run-checks: --tokens absent file -> UNDETERMINED" 2 \
  node "$RUN_CHECKS" --tokens "$TMP/does-not-exist.json"

# M3 COULD-NOT-DETERMINE: --tokens names a file that is not JSON.
printf '{ this is not json' > "$TMP/malformed.json"
mutate "M3 run-checks: --tokens malformed   -> UNDETERMINED" 2 \
  node "$RUN_CHECKS" --tokens "$TMP/malformed.json"

# M4 CONFIRMED FINDING: one seed cannot exhibit cross-seed variance, so D7/D8/U2
# have nothing to separate. This is the control that matters most: it proves the
# rc-2 paths did NOT swallow real findings into "undetermined".
mutate "M4 run-checks: single seed          -> FAIL"          1 \
  node "$RUN_CHECKS" --seeds "only-one-seed"

# M5 POSITIVE CONTROL: unmutated, the gate returns 0. Without this row every
# assertion above would also be satisfied by a gate that is permanently non-zero.
mutate "M5 run-checks: unmutated            -> PASS"          0 node "$RUN_CHECKS"

# =============================================================================
# qa/check-tokens.mjs
# =============================================================================
echo
echo "--- qa/check-tokens.mjs ---"

# M6 PRECEDENCE: a real FAIL alongside an undetermined challenge must exit 1, not
# 2 — a broken environment must never mask a finding. The candidate is the
# golden-BAD fixture that already ships; --brand points at the fixture itself so
# T1 coverage is a self-comparison and T4's planted contrast defect is what bites.
# This row is also the first thing in this repository to EXECUTE that fixture:
# before it, golden-bad-tokens.css was referenced only by prose.
mutate "M6 check-tokens: golden-BAD + no browser -> FAIL outranks UNDETERMINED" 1 \
  node "$CHECK_TOKENS" --candidate "$GOLDEN_BAD" --brand "$GOLDEN_BAD" --skip-browser

# M7 COULD-NOT-DETERMINE: nothing is wrong with the candidate, but one challenge
# could not run. Before the fix this returned 1 and read as a broken candidate.
mutate "M7 check-tokens: browser unavailable     -> UNDETERMINED"              2 \
  node "$CHECK_TOKENS" --candidate "$CANDIDATE" --brand "$CANDIDATE" --skip-browser

# M8 POSITIVE CONTROL: the same invocation with the browser available returns 0.
# Playwright/chromium is an environment fact, so its absence is reported as this
# proof's own undetermined row rather than counted as a failure of the gate.
if node -e '
  const { createRequire } = require("node:module");
  const r = createRequire(process.argv[1] + "/_tests/package.json");
  r.resolve("@playwright/test");
' "$(cd "$ROOT/.." && pwd)" >/dev/null 2>&1; then
  mutate "M8 check-tokens: unmutated              -> PASS"                     0 \
    node "$CHECK_TOKENS" --candidate "$CANDIDATE" --brand "$CANDIDATE"
else
  echo "UNDET M8 check-tokens: unmutated -> PASS — Playwright/chromium not resolvable;" >&2
  echo "      the rc-0 control for this gate was NOT driven. Not a pass." >&2
  UNDET=$((UNDET + 1))
fi

# =============================================================================
# Vacuous-pass controls — the subject set is EMPTY, so an absence-assertion over
# it is trivially satisfied. Both of these gates used to answer PASS here.
# =============================================================================
echo
echo "--- vacuous-pass controls (empty subject sets) ---"

# M13 T1 asserts "no brand token is missing from the candidate". Against a brand
# file that defines NOTHING, that was `PASS (brand defines 0 ... 0 missing)` — a
# PASS whose evidence supports no claim about coverage.
: > "$TMP/empty-brand.css"
mutate "M13 check-tokens: EMPTY brand file      -> UNDETERMINED"  2 \
  node "$CHECK_TOKENS" --candidate "$CANDIDATE" --brand "$TMP/empty-brand.css" --skip-browser

# M14 D2 (and every C-PLAT contrast floor) asserts "no semantic pair is below its
# threshold". Against a structurally valid token document with its colour group
# removed there are zero pairs, and the whole run used to exit 0 — a token set
# with no colours at all certified WCAG-clean. The mutation is a DERIVED INPUT
# FILE, not an edit to the gate.
if node -e '
  const fs = require("fs");
  const src = process.argv[1], out = process.argv[2];
  const d = JSON.parse(fs.readFileSync(src, "utf8"));
  if (!d.color) { process.exit(3); }          // fixture no longer has a colour group
  delete d.color;
  fs.writeFileSync(out, JSON.stringify(d, null, 2));
' "$ROOT/evidence/tokens/vasic-digital.tokens.json" "$TMP/nocolor.json" 2>/dev/null; then
  mutate "M14 run-checks: colourless token doc   -> UNDETERMINED"  2 \
    node "$RUN_CHECKS" --tokens "$TMP/nocolor.json"
else
  echo "UNDET M14 — could not derive the colourless token document from" >&2
  echo "      evidence/tokens/vasic-digital.tokens.json (no 'color' group?)." >&2
  UNDET=$((UNDET + 1))
fi

# =============================================================================
# qa/upstreams-recipe-origin-check.sh — three rc paths, none previously proven
# =============================================================================
echo
echo "--- qa/upstreams-recipe-origin-check.sh ---"

# Builds a throwaway git repository whose origin and recipe are supplied as DATA.
scratch_repo() { # $1 origin url, $2 recipe url ("" = omit upstreams/), $3 dir
  local origin="$1" recipe="$2" dir="$3"
  mkdir -p "$dir" || return 1
  git -C "$dir" init -q                       >/dev/null 2>&1 || return 1
  git -C "$dir" remote add origin "$origin"   >/dev/null 2>&1 || return 1
  if [[ -n "$recipe" ]]; then
    mkdir -p "$dir/upstreams"
    printf '#!/usr/bin/env bash\nexport UPSTREAMABLE_REPOSITORY="%s"\n' "$recipe" \
      > "$dir/upstreams/github.sh"
    chmod +x "$dir/upstreams/github.sh"
  fi
  cp "$UPSTREAMS_CHECK" "$dir/check.sh" || return 1
  chmod +x "$dir/check.sh"
}

# M9 CONFIRMED FINDING: the recipe names a DIFFERENT organisation than origin —
# the exact wrong-account push the gate exists to catch.
if scratch_repo "git@github.com:vasic-digital/design-toolkit.git" \
                "git@github.com:someone-else/design-toolkit.git" "$TMP/wrong-org"; then
  mutate "M9  upstreams: recipe names another org -> FAIL"          1 bash "$TMP/wrong-org/check.sh"
else
  echo "UNDET M9 — could not build the scratch repository." >&2; UNDET=$((UNDET + 1))
fi

# M10 COULD-NOT-DETERMINE: a repository with no upstreams/ recipes at all. There
# is nothing to compare, so the only honest verdict is 2.
if scratch_repo "git@github.com:vasic-digital/design-toolkit.git" "" "$TMP/no-recipes"; then
  mutate "M10 upstreams: no upstreams/ directory  -> UNDETERMINED"  2 bash "$TMP/no-recipes/check.sh"
else
  echo "UNDET M10 — could not build the scratch repository." >&2; UNDET=$((UNDET + 1))
fi

# M11 COULD-NOT-DETERMINE: recipes exist but the repository has no origin to
# compare them against.
if scratch_repo "git@github.com:vasic-digital/design-toolkit.git" \
                "git@github.com:vasic-digital/design-toolkit.git" "$TMP/no-origin"; then
  git -C "$TMP/no-origin" remote remove origin >/dev/null 2>&1
  mutate "M11 upstreams: no origin remote        -> UNDETERMINED"   2 bash "$TMP/no-origin/check.sh"
else
  echo "UNDET M11 — could not build the scratch repository." >&2; UNDET=$((UNDET + 1))
fi

# M12 POSITIVE CONTROL: origin and recipe agree -> 0. Without it, M9/M10/M11 are
# equally satisfied by a gate that never returns 0.
if scratch_repo "git@github.com:vasic-digital/design-toolkit.git" \
                "git@github.com:vasic-digital/design-toolkit.git" "$TMP/matching"; then
  mutate "M12 upstreams: recipe matches origin   -> PASS"           0 bash "$TMP/matching/check.sh"
else
  echo "UNDET M12 — could not build the scratch repository." >&2; UNDET=$((UNDET + 1))
fi

echo
echo "=== summary: $PASS passed, $FAIL failed, $UNDET undetermined, of $((PASS + FAIL + UNDET)) mutations ==="
if [[ $FAIL -gt 0 ]]; then exit 1; fi
if [[ $UNDET -gt 0 ]]; then
  echo "At least one mutation could not be driven — the contract is NOT fully proven." >&2
  exit 2
fi
exit 0
