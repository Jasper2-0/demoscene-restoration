#!/usr/bin/env bash
# Sync one restoration into its GitHub Pages repo checkout.
#
#   ./scripts/publish-pages.sh lost-vegas    ~/Developer/pages/lost-vegas-webgl
#   ./scripts/publish-pages.sh cookie-thing  ~/Developer/pages/ptct-webgl
#   ./scripts/publish-pages.sh ixalance-js   ~/Developer/pages/ixalance-js
#   ./scripts/publish-pages.sh sonnet        ~/Developer/pages/sonnet-webgl
#   ./scripts/publish-pages.sh wonder        ~/Developer/pages/wonder-webgl
#   ./scripts/publish-pages.sh planet-potion ~/Developer/pages/planet-potion-webgl
#
# Each production is its own repo on github.com/jasper2-0, served from the
# default branch at the repo root, so the site lands on
# https://jasper2-0.github.io/<repo>/ . Every asset path in both productions is
# relative, which is what makes serving from a subpath work unchanged.
#
# PLANET POTION PUBLISHES TWO BUILDS INTO ONE REPO:
#
#   https://jasper2-0.github.io/planet-potion-webgl/        the readable build
#   https://jasper2-0.github.io/planet-potion-webgl/mashi/  the 64k pack
#
# They are the same restoration seen two ways — sixteen ES modules against one
# self-extracting file — and the point of a shared repo is that a visitor gets
# from one to the other by typing, rather than by knowing a second repo exists.
#
# This copies the SITE only. The .zip download is published as a GitHub Release
# asset instead of being committed — see the README section in the repo.
#
# --staging assembles the SAME tree into a plain directory instead of a repo
# checkout, for uploading somewhere to look at before any of it is published.
# It exists so that what gets tested is what gets published: a hand-copied
# staging tree is a second assembly with its own mistakes in it.
#
#   ./scripts/publish-pages.sh planet-potion ~/Developer/pages/planet-potion-webgl --staging
set -euo pipefail
cd "$(dirname "$0")/.."

STAGING=0
ARGS=""
for a in "$@"; do
  if [ "$a" = "--staging" ]; then STAGING=1; else ARGS="$ARGS $a"; fi
done
# shellcheck disable=SC2086
set -- $ARGS

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
  # planet-potion publishes from SOURCE for the readable build — web/ is already
  # the site, unbuilt and unminified, which is the point of it — and from the
  # BUILT tree for the pack, so the 64k gate has always run before anything
  # ships. Both, into one repo. See the header.
  planet-potion) SRC=productions/planet-potion/web
                MASHI=dist/planet-potion-mashi
                [ -f "$MASHI/index.html" ] || { echo "error: run ./scripts/build-planet-potion-mashi.sh first" >&2; exit 1; } ;;
  *) echo "usage: $0 {lost-vegas|cookie-thing|ixalance-js|sonnet|wonder|planet-potion} <path-to-repo-checkout>" >&2; exit 2 ;;
esac
[ -n "$TARGET" ] || { echo "usage: $0 $PROD <path-to-repo-checkout> [--staging]" >&2; exit 2; }
if [ "$STAGING" = 1 ]; then
  # THE .git CHECK IS THE GUARD ON AN rsync --delete, so dropping it needs
  # another one: a staging target must be empty, or must be a directory this
  # script has written before. .nojekyll is the marker because this script is
  # what puts it there.
  if [ -e "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ] \
     && [ ! -f "$TARGET/.nojekyll" ]; then
    echo "error: $TARGET is not empty and was not written by this script" >&2
    echo "       (--staging will rsync --delete into it; refusing)" >&2
    exit 1
  fi
  mkdir -p "$TARGET"
else
  [ -d "$TARGET/.git" ] || { echo "error: $TARGET is not a git checkout" >&2; exit 1; }
fi
[ -f "$SRC/index.html" ] || { echo "error: $SRC/index.html missing" >&2; exit 1; }

# THE SAME RULE APPLIED TO DATA. tools/ and test/ are authoring code and stay in
# the working repo; planet-potion keeps its VERIFICATION FIXTURES beside its
# runtime data, and they are the same kind of thing — 57 MB of oracles that the
# check suites read and the page never fetches. web/ is 85 MB; the site is a
# fraction of it.
#
# A BLOCKLIST RATHER THAN AN ALLOWLIST, deliberately: getting this list wrong
# ships a file nobody asked for, where getting an allowlist wrong takes the site
# down. The published size is printed at the end so a fixture that starts
# shipping is loud rather than silent.
#
# What the runtime actually fetches is ten paths — seg0/2/3/4.bin,
# showorder.json, render_state.json, tex_programs.json, tex_kernels.json,
# draws.json and textures/ — and the last two only under `?oracle=1`,
# `?scene=N` and `textures=recorded`. draws.json alone is 17 MB: drop it here if
# the published site does not need to play the recording back.
EXCLUDE_FILE=""
if [ "$PROD" = planet-potion ]; then
  EXCLUDE_FILE="$(mktemp)"
  trap 'rm -f "$EXCLUDE_FILE"' EXIT
  cat > "$EXCLUDE_FILE" <<'FIXTURES'
/data/anim.json
/data/anim_all.json
/data/arena.json
/data/audio.json
/data/font.json
/data/font_atlas.png
/data/geo.json
/data/manifest.json
/data/meshes.json
/data/opsuite/
/data/scenes.json
/data/synthref/
/data/tex_operands.json
FIXTURES
fi

# tools/ and test/ are authoring and harness code, not runtime — they stay in
# the working repo. --delete keeps the published site from accumulating files
# that no longer exist upstream; .git is protected explicitly.
#
# /mashi/ IS A PUBLISHED SUBDIRECTORY, not a source one: nothing upstream
# contains it, so --delete would remove it on every sync. An excluded path is
# protected from --delete unless --delete-excluded is given, which is exactly
# the behaviour wanted here.
rsync -a --delete \
  --exclude '.git/' --exclude '.DS_Store' --exclude 'tools/' --exclude 'test/' \
  --exclude '/mashi/' \
  ${EXCLUDE_FILE:+--exclude-from="$EXCLUDE_FILE"} \
  "$SRC"/ "$TARGET"/

# The pack, into /mashi/. ONE FILE: it is self-extracting, and intro.js and
# payload.wasm beside it are the build's intermediates rather than anything the
# page loads, so `--include`/`--exclude '*'` ships index.html and nothing else.
#
# WARNING --delete-excluded, AND IT IS NOT OPTIONAL. An excluded path is
# protected from --delete — that is exactly what keeps the main sync above from
# wiping this directory — which means here, where everything but index.html is
# excluded, plain --delete protects every stale file instead of removing it.
# The two rsyncs want opposite halves of the same rule.
if [ -n "${MASHI:-}" ]; then
  mkdir -p "$TARGET/mashi"
  rsync -a --delete --delete-excluded \
    --include '/index.html' --exclude '*' \
    "$MASHI"/ "$TARGET/mashi"/
fi

# Without this, Pages runs the tree through Jekyll, which has its own ideas
# about files beginning with _ and about what to do with .md.
touch "$TARGET/.nojekyll"

# The repo is the publication, not just the host: the methodology travels with
# it. Copied at publish time so the monorepo stays the single source of truth.
[ "$SHIP_METHOD" = 1 ] && cp METHOD.md "$TARGET/METHOD.md"
printf '.DS_Store\n' > "$TARGET/.gitignore"

echo "published $SRC -> $TARGET"
[ -n "${MASHI:-}" ] && echo "published $MASHI/index.html -> $TARGET/mashi/"
# THE SIZE, EVERY TIME. This is a git repo that gets pushed; a fixture that
# starts shipping should be visible on the run that starts shipping it.
echo
echo "published size: $(du -sh "$TARGET" | cut -f1)  (largest files)"
find "$TARGET" -type f -not -path '*/.git/*' -exec du -h {} + | sort -hr | head -5 | sed 's/^/  /'
if [ "$STAGING" = 1 ]; then
  echo "staged only — nothing here is a git checkout and nothing is published."
  echo
  echo "next:  upload the contents of $TARGET to the test environment."
  echo "       to publish afterwards, clone the real Pages repo and run this"
  echo "       script against that checkout without --staging."
else
  git -C "$TARGET" status --short || true
  echo
  echo "next:  git -C $TARGET add -A && git -C $TARGET commit -m 'update site' && git -C $TARGET push"
fi
