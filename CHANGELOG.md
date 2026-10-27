# Changelog

Versioning: semantic versions `vX.Y.Z` (design-toolkit's own series) plus the
constitution hub canon tag `helixconstitution-vNN`. Before this file existed the
history lived only in `git log`; entries below start at v0.2.3 and summarise
`v0.2.2..HEAD` (14 commits, 2026-08-07 .. 2026-09-15).

## [0.2.3] - 2026-10-27

Range `v0.2.2` (1ffcd55) .. `4ddc964`. The hub canon tag `helixconstitution-v70`
already points at the same commit (4ddc964); v0.2.3 is the engine's own semver
stamp of that content. No API removals.

### Added
- `proposed/`: OpenDesign Learning Kit, a reusable decoupled component pack (16e4e76).
- `generators/dtcg-to-od.mjs`: hybrid direction-generator bridge and staged candidates (3621c0e).
- Brand-hue anchoring, HelixQA token bank and hybrid-pipeline guide (520c436).
- Generators: the 11 previously missing tokens are DERIVED from the seed (T1: 0 missing; T4 grew from 4 to 32 contrast pairs) (bcf2625).
- Generators: two "distinct" brands no longer ship the identical colour structure (3 hue bins over 120 degrees, both themes) (ddb9b65).

### Fixed
- QA: a token set with no colours was certified WCAG-clean, and a missing `npm install` was reported as a token failure (a135aa8).
- HelixQA C-PLAT: platform-conformance is genuinely executable (44cbbda).
- Docs: hardcoded macOS dev path removed from the hybrid-pipeline runbook (4ddc964).
- Upstreams: this repository has its own publication recipes and the GitLab recipe is enabled (e7f3815, e721b3c); mirror-lag figure made re-derivable (5467a88, 7d9240e).

### Governance
- Constitution pointer carriers (AGENTS/CLAUDE/QWEN/GEMINI) added (efd2c3f); credential-seam sanitisation cascade (725e456).

### Known limitations / imperfections
- README still carries the "FIRST INCREMENT - local scaffold" status block written before the remote repositories existed; it is historical and not rewritten here.
- No CHANGELOG existed before v0.2.3; v0.2.0 to v0.2.2 are not back-filled.
- `generators/package.json` is still `0.1.0` and `private`; the git tag is the version of record.

## [0.2.2] / [0.2.1] / [0.2.0]
Tags exist (v0.2.2 at 1ffcd55, 2026-08-07); no changelog was kept.
