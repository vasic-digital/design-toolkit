#!/usr/bin/env bash

# The PRIVATE mirror of this repository. ACTIVE since 2026-09-08: this file ends
# in `.sh`, so it matches the glob that `install_upstreams.sh` and `push_all.sh`
# iterate, and every push from here now reaches the mirror as well as GitHub.
#
# Enabled on operator decision #15, 2026-09-07 (recorded in the umbrella at
# docs/OPERATOR-DECISIONS-2026-09-07.md). The recommendation was to leave it
# disabled; the operator overruled it. The direction was VERIFIED before acting,
# because it is the whole safety argument: `origin` (GitHub) is PUBLIC and this
# mirror is PRIVATE, so this is a public -> private flow and every commit the
# mirror lacks is already published. The reverse direction would carry real
# disclosure risk and is NOT what this recipe does.
#
# Read upstreams/README.md before changing this file.
export UPSTREAMABLE_REPOSITORY="git@gitlab.com:vasic-digital/design-toolkit.git"
