# `upstreams/` — publication recipes for this repository

Each `*.sh` file here exports a single `UPSTREAMABLE_REPOSITORY`. The shared
toolkit's `install_upstreams.sh` turns every such file into a git remote named
after the **file** (lowercased), and `push_all.sh` then runs `git push <name>`
against each one. A recipe therefore does not *describe* a repository — it
**selects** where this tree's commits are published.

## Why this directory exists at all

Until it did, this repository had **no** recipes, and that is not a neutral
absence. `push_all.sh` walks **up** the parent chain looking for an
`upstreams/` directory, so a submodule without one finds its **superproject's**.
Before that walk was guarded, the consequence was concrete: the walk crossed
into the parent repository, added remotes there, pushed **the parent**, and the
child — this repository — was never pushed at all, while the run reported
success.

The walk is guarded now (`push_all.sh` compares
`git rev-parse --show-toplevel` at the invocation point against the one where
the recipes were found, and refuses to act on a different repository). But the
guard's own error message names the real fix:

> This is the expected situation for a SUBMODULE that has no `upstreams/` of
> its own. The fix is to give this repository its own `upstreams/` recipes.

That is what this directory is. The guard turns a silent wrong-repository push
into a refusal; the recipes turn the refusal into a correct push.

## What is here

| File | State | Target |
|---|---|---|
| `github.sh` | **active** | `git@github.com:vasic-digital/design-toolkit.git` |
| `gitlab.sh.disabled` | **inert** | `git@gitlab.com:vasic-digital/design-toolkit.git` |

`gitlab.sh.disabled` does not end in `.sh`, so it does not match the `*.sh`
glob that either script iterates. Nothing reads it, nothing pushes to it.

## The asymmetry between the two surfaces

Both surfaces exist. They are **not** equivalent, and the difference is
deliberate rather than accidental:

- **GitHub is PUBLIC.** It is the canonical surface; `main` advances here, and
  it is the only remote configured in a normal clone (`git remote -v` shows
  `origin` and nothing else).
- **The GitLab mirror is PRIVATE, and it is BEHIND.** Measured 2026-09-01 with
  `git ls-remote` against both surfaces: GitHub `main` at `5467a88`, GitLab
  `main` at `520c436`, with the same three annotated tags (`v0.2.0`, `v0.2.1`,
  `v0.2.2`) at byte-identical tag and peeled SHAs on both.
  `git merge-base --is-ancestor` confirms `520c436` is an ancestor of GitHub's
  `main`, so the mirror is **behind, not diverged**: **5** commits exist only on
  GitHub and **0** exist only on GitLab.

**That count rots by construction.** Every commit to this repository — including
the one that adds this file — advances GitHub and leaves GitLab exactly where it
is, because no active recipe and no push URL targets GitLab. Do not read the
number off this page. Re-derive it:

```bash
git ls-remote --symref origin refs/heads/main
git ls-remote --symref git@gitlab.com:vasic-digital/design-toolkit.git refs/heads/main
# then, with both SHAs in hand:
git merge-base --is-ancestor <gitlab-sha> <github-sha> && echo "behind, not diverged"
git rev-list --count <gitlab-sha>..<github-sha>   # commits only on GitHub
git rev-list --count <github-sha>..<gitlab-sha>   # commits only on GitLab
```

An unauthenticated probe cannot tell a private GitLab project from a
nonexistent one — measured, gitlab.com answers both with a redirect to
`/users/sign_in` from the web and HTTP 404 from the unauthenticated API. Only an
authenticated query separates them, so treat any "no mirror" conclusion drawn
from an anonymous request as **could-not-determine**, never as absence.

## Enabling the mirror is an OPERATOR decision

Renaming `gitlab.sh.disabled` to `gitlab.sh` makes the very next `push_all.sh`
run push this repository's history to the **private** mirror, closing the gap in
one step. That may well be the right thing. It is not this directory's call to
make, for two reasons stated plainly rather than assumed:

1. **Visibility asymmetry.** The two surfaces have different audiences. Syncing
   a public history onto a private mirror is harmless; the reverse is not, and
   an automated push is not the place to be relying on which direction is which.
2. **The manifest already reserves it.** `helix-deps.yaml` in this repository
   records both surfaces and states that syncing the mirror, and changing either
   repository's visibility, are operator decisions. This file does not overrule
   that.

To enable it deliberately:

```bash
git mv upstreams/gitlab.sh.disabled upstreams/gitlab.sh
chmod +x upstreams/gitlab.sh
# then verify what the recipes now point at, BEFORE pushing:
bash qa/upstreams-recipe-origin-check.sh
```

Nothing here changes either repository's visibility, and nothing here pushes to
the mirror.

## The guard on this directory

`qa/upstreams-recipe-origin-check.sh` derives the expected organisation and
repository name from `git remote get-url origin` at run time and asserts that
every active recipe matches. It exists because the failure it catches is
silent: a recipe naming a *different organisation* is one word away from a
correct one, reads as plausible, and publishes this tree to somebody else's
repository. That exact defect was found in a sibling module of this fleet on
2026-09-01 — its `github.sh` named an organisation its `origin` did not, and
both repositories existed with divergent default branches.
