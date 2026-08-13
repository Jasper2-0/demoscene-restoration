#!/usr/bin/env bash
# Assemble the PUBLIC build of ixalance-js into dist/ixalance.
#
#   ./build-ixalance.sh [path-to-ixalance-js]
#   (default: $IXALANCE_SRC, else ~/Developer/xx-sandbox/ixalance-js — external
#   until the planned subtree import brings ixalance-js into this repo)
#
# The public build differs from a local working copy in three ways:
#
#   1. Boost is not included at all. No .ixa, no selector entry, no mention in
#      the build notes.
#   2. Square is included but unlisted — typing its name on the page reveals it.
#      SQUARE_PORT_ANALYSIS.md is therefore left out too; it would give the
#      egg away and advertise it in the file listing.
#   3. The three original TBL containers ARE shipped, so the page runs on open.
#      A browser cannot fetch them from the upstream archive at runtime: that
#      host sends no Access-Control-Allow-Origin. See LICENSING.md for the terms.
#
# Built from the SOURCE tree, not from the local deploy/ directory, so the
# result is reproducible rather than inheriting whatever deploy/ last held.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$PWD/dist/ixalance-js"
SRC="${1:-${IXALANCE_SRC:-$HOME/Developer/xx-sandbox/ixalance-js}}"

[ -f "$SRC/index.html" ] || { echo "error: no ixalance-js checkout at $SRC" >&2; exit 1; }
for f in data/jizz.ixa data/stash.ixa data/astral.ixa \
         sdk/ixalance-sdk/ports/square/square.ixa; do
  [ -f "$SRC/$f" ] || { echo "error: missing $f — run 'npm run data' in $SRC first" >&2; exit 1; }
done

rm -rf "$OUT"; mkdir -p "$OUT/data" "$OUT/sdk/ixalance-sdk/ports/square"

# runtime
cp "$SRC"/audio.js "$SRC"/worker.js "$OUT"/
cp -R "$SRC"/lib "$OUT"/lib
# data: the three originals, plus the unlisted port
cp "$SRC"/data/jizz.ixa "$SRC"/data/stash.ixa "$SRC"/data/astral.ixa "$OUT"/data/
cp "$SRC"/data/README.md "$OUT"/data/ 2>/dev/null || true
cp "$SRC"/sdk/ixalance-sdk/ports/square/square.ixa "$OUT"/sdk/ixalance-sdk/ports/square/
# licences and the docs that are about the runtime rather than about the ports
cp "$SRC"/LICENSE "$OUT"/
cp -R "$SRC"/LICENSES "$OUT"/LICENSES
for d in FT2_COMPATIBILITY_AUDIT.md JIZZ_OPTIMIZATION_NOTES.md STASH_OPTIMIZATION_NOTES.md; do
  cp "$SRC/$d" "$OUT/$d"
done

node "$PWD/tools/ixalance-public.mjs" "$SRC" "$OUT"

# Manifest over exactly what ships, so the page's provenance is checkable.
( cd "$OUT" && find . -type f -not -name MANIFEST.sha256 | sort \
    | xargs shasum -a 256 > MANIFEST.sha256 )

printf '.DS_Store\n' > "$OUT/.gitignore"
touch "$OUT/.nojekyll"

echo "built $OUT  ($(du -sh "$OUT" | cut -f1))"
echo "boost present: $(find "$OUT" -iname '*boost*' | wc -l | tr -d ' ') files (must be 0)"
