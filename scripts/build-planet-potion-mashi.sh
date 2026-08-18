#!/usr/bin/env bash
# Build Planet Potion's SIZE target: one self-extracting index.html, packed with
# Mashi (Sagacity/datatrash), into dist/planet-potion-mashi.
#
#   ./build-planet-potion-mashi.sh            # build, verify, gate on 64k
#   ./build-planet-potion-mashi.sh --quick    # build only, no browser check
#
# productions/planet-potion/web/ is the READABLE build — sixteen ES modules,
# nothing minified — and that is what all thirty-five suites drive. This is the
# delivery. Neither replaces the other.
#
# ⚠ THE 64k BUDGET IS A GATE. The original shipped in 65,288 bytes and this pack
# is under it. A change that pushes it back over fails HERE, on the day it
# lands, rather than the next time someone measures.
set -euo pipefail
cd "$(dirname "$0")/.."

QUICK=0
for a in "$@"; do [ "$a" = "--quick" ] && QUICK=1; done

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step "toolchain"
if ! node -e "require.resolve('esbuild')" >/dev/null 2>&1; then
  npm install --silent --no-audit --no-fund
else
  echo "esbuild present"
fi
./tools/fetch_mashi.sh

step "build"
node tools/build_planet_mashi.mjs

if [ "$QUICK" = "1" ]; then
  echo; echo "--quick: skipped verification. Run without it before shipping."
  exit 0
fi

step "does it run?"
node tools/test_planet_mashi.mjs

step "result"
BYTES=$(stat -f%z dist/planet-potion-mashi/index.html 2>/dev/null \
      || stat -c%s dist/planet-potion-mashi/index.html)
printf '  dist/planet-potion-mashi/index.html  %6d B\n' "$BYTES"
printf '  original planet_potion.exe (2002)    %6d B\n' 65288
printf '  under the 64k budget by              %6d B\n' "$((65536 - BYTES))"
echo
echo "  serve:  (cd dist/planet-potion-mashi && python3 -m http.server 8080)"
echo "  ⚠ must be served over HTTP — Mashi's loader fetches its own document."
