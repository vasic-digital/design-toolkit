# GEMINI.md — design-toolkit

## INHERITED FROM constitution/GEMINI.md

**The inheritance below is conditional. Both cases are stated; neither is
assumed.**

When this module is consumed inside a project that includes the Helix
Constitution submodule, the rules in `constitution/GEMINI.md` — and in the
`constitution/Constitution.md` it references — are authoritative for every
topic not covered here. The module-local rules below extend them; they never
weaken or override them.

When this module is consumed standalone — cloned on its own, with no
constitution reachable in any parent — there is nothing to inherit, and **only
the module-local rules below apply**.

### Locating the base file: a resolver, never a path

`constitution/GEMINI.md` in the heading above is the **canonical name of the base
file**, written exactly as the constitution's own examples write it. It is not
a filesystem path relative to this module, and it must not be rewritten into
one:

- a consuming project may mount the constitution under more than one layout,
  and this module cannot know which one it got;
- the same commit of this module can be checked out at two different depths at
  the same time, so no single relative path is correct for both;
- a standalone clone has no constitution anywhere, so any hardcoded path would
  simply dangle.

Resolve it at run time with the constitution's own parent-walk resolver,
**`find_constitution.sh`**. It walks up the parent chain trying each layout the
constitution supports, follows
`git rev-parse --show-superproject-working-tree` out of nested submodules so it
works from any nested depth, and exits non-zero with an explicit error when no
constitution is reachable — which is precisely the standalone case above.

This file therefore hardcodes **no** parent-project path and **no**
depth-dependent path, keeping the module project-not-aware, decoupled and
reusable per §11.4.28(B). Agent tooling with a native file-import syntax must
not turn the heading into one: an `@constitution/GEMINI.md` import resolves
relative to *this* file, so inside a module it points at a path that does not
exist and silently resolves to nothing.

Canonical reference:
<https://github.com/HelixDevelopment/HelixConstitution>

## Module-local notes

This carrier is read by Gemini CLI.

See [`README.md`](README.md) for what this module is and how it is used.
Module-specific rules go below this line; they extend the inherited base rules
and never weaken them.
