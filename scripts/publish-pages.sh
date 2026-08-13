#!/usr/bin/env bash
# Sync one restoration into its GitHub Pages repo checkout.
#
#   ./scripts/publish-pages.sh lost-vegas    ~/Developer/pages/lost-vegas-webgl
#   ./scripts/publish-pages.sh cookie-thing  ~/Developer/pages/ptct-webgl
#   ./scripts/publish-pages.sh ixalance-js   ~/Developer/pages/ixalance-js
#   ./scripts/publish-pages.sh sonnet        ~/Developer/pages/sonnet-webgl
#   ./scripts/publish-pages.sh wonder        ~/Developer/pages/wonder-webgl
#
# Each production is its own repo on github.com/jasper2-0, served from the
# default branch at the repo root, so the site lands on
# https://jasper2-0.github.io/<repo>/ . Every asset path in both productions is
# relative, which is what makes serving from a subpath work unchanged.
#
# This copies the SITE only. The .zip download is published as a GitHub Release
# asset instead of being committed — see the README section in the repo.
set -euo pipefail
cd "$(dirname "$0")/.."

PROD="${1:-}"; TARGET="${2:-}"
# ixalance is published from its BUILT tree, not from a source dir: it lives in
# another repo entirely and its public build is a transform (Boost removed,
# Square unlisted). Run ./build-ixalance.sh first. METHOD.md is about the two
# restorations, so it does not travel with it.
SHIP_METHOD=1
case "$PROD" in
  lost-vegas)   SRC=productions/lost-vegas/web ;;
  cookie-thing) SRC=productions/ptct/web ;;
  ixalance-js)  SRC=dist/ixalance-js; SHIP_METHOD=0
                [ -f "$SRC/index.html" ] || { echo "error: run ./scripts/build-ixalance.sh first" >&2; exit 1; } ;;
  # sonnet publishes from its BUILT tree too: the working copy keeps generators
  # and data outside web/, so only the assembled dist is self-contained.
  sonnet)       SRC=dist/sonnet-webgl
                [ -f "$SRC/index.html" ] || { echo "error: run ./scripts/build-sonnet.sh first" >&2; exit 1; } ;;
  # wonder publishes from its BUILT tree so the three build gates (asset
  # verify, vendor drift, dist verify) always run before anything ships.
  wonder)       SRC=dist/wonder-webgl; SHIP_METHOD=0
                [ -f "$SRC/index.html" ] || { echo "error: run ./scripts/build-wonder.sh first" >&2; exit 1; } ;;
  *) echo "usage: $0 {lost-vegas|cookie-thing|ixalance-js|sonnet|wonder} <path-to-repo-checkout>" >&2; exit 2 ;;
esac
[ -n "$TARGET" ] || { echo "usage: $0 $PROD <path-to-repo-checkout>" >&2; exit 2; }
[ -d "$TARGET/.git" ] || { echo "error: $TARGET is not a git checkout" >&2; exit 1; }
[ -f "$SRC/index.html" ] || { echo "error: $SRC/index.html missing" >&2; exit 1; }

# tools/ and test/ are authoring and harness code, not runtime — they stay in
# the working repo. --delete keeps the published site from accumulating files
# that no longer exist upstream; .git is protected explicitly.
rsync -a --delete \
  --exclude '.git/' --exclude '.DS_Store' --exclude 'tools/' --exclude 'test/' \
  "$SRC"/ "$TARGET"/

# Without this, Pages runs the tree through Jekyll, which has its own ideas
# about files beginning with _ and about what to do with .md.
touch "$TARGET/.nojekyll"

# The repo is the publication, not just the host: the methodology travels with
# it. Copied at publish time so the monorepo stays the single source of truth.
[ "$SHIP_METHOD" = 1 ] && cp METHOD.md "$TARGET/METHOD.md"
printf '.DS_Store\n' > "$TARGET/.gitignore"

echo "published $SRC -> $TARGET"
echo
git -C "$TARGET" status --short || true
echo
echo "next:  git -C $TARGET add -A && git -C $TARGET commit -m 'update site' && git -C $TARGET push"
