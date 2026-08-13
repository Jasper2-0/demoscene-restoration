#!/usr/bin/env bash
# Build the Sonnet SIZE target: one self-extracting index.html, packed with
# Mashi (Sagacity/datatrash), into dist/sonnet-mashi.
#
#   ./build-sonnet-mashi.sh              # bootstrap, build, verify, gate on 64k
#   ./build-sonnet-mashi.sh --quick      # build only — no browser verification
#   ./build-sonnet-mashi.sh --no-compare # skip the fork-vs-original frame diff
#   ./build-sonnet-mashi.sh --payload=js # A/B the payload channel (see re/MASHI.md)
#
# Everything it needs is fetched and checksum-verified on first run; there is no
# manual setup step.
#
# This is the DELIVERY build.  ./build-sonnet.sh is the readable one — 33 ES
# modules, the whole 541 KB image, nothing minified — and that is what gets
# published and what every harness drives.  Neither replaces the other; see
# productions/sonnet/work/re/MASHI.md.
#
# ⚠ THE 64k BUDGET IS A GATE.  The original shipped in exactly 65,536 bytes and
# this pack is under it.  A change that pushes it back over fails HERE, on the
# day it lands, rather than being found the next time someone measures.
set -euo pipefail
cd "$(dirname "$0")/.."

# NB: bash 3.2 ships on macOS and expands an empty "${a[@]}" to an unbound
# variable error under `set -u`, hence the ${a[@]+"${a[@]}"} guards below.
QUICK=0; COMPARE=1; PASSTHRU=()
for a in "$@"; do
  case "$a" in
    --quick)      QUICK=1 ;;
    --no-compare) COMPARE=0 ;;
    *)            PASSTHRU+=("$a") ;;
  esac
done

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------- toolchain
step "toolchain"
if ! node -e "require.resolve('esbuild')" >/dev/null 2>&1; then
  echo "installing toolchain (npm install at the workspace root)..."
  npm install --silent --no-audit --no-fund
else
  echo "esbuild present"
fi
./tools/fetch_mashi.sh

# ------------------------------------------------------------------- build
# The build itself proves, and fails on, three things before it packs anything:
# that the audio slice reproduces all 24 instruments bit-identically, that the
# 52-entry resource archive decodes byte-identically out of that slice, and that
# the poem decoder reproduces re/text/poem.json field-for-field.
step "build (ship pack)"
node tools/build_mashi.mjs ${PASSTHRU[@]+"${PASSTHRU[@]}"}

if [ "$QUICK" = "1" ]; then
  echo
  echo "--quick: skipped verification.  Run without it before shipping."
  exit 0
fi

# The harness pack is the same fork compiled WITH the single-frame capture hook,
# so the frame checks can drive it.  It is never shipped and is always a little
# larger than the pack that is.
step "build (harness pack, for verification only)"
node tools/build_mashi.mjs --harness ${PASSTHRU[@]+"${PASSTHRU[@]}"} | tail -4

step "does it run?"
node tools/test_mashi.mjs

if [ "$COMPARE" = "1" ]; then
  # The size build is a FORK, so the risk that matters is not "does it run" but
  # "does it still render the same demo".  17 positions across every scene,
  # pixel-for-pixel against the untouched readable build.
  step "does it still render the same demo?"
  node tools/compare_mashi.mjs
fi

step "result"
BYTES=$(stat -f%z dist/sonnet-mashi/index.html 2>/dev/null || stat -c%s dist/sonnet-mashi/index.html)
ORIG=$(stat -f%z productions/sonnet/work/reference/3s-sonnet_extracted/sonnet.exe 2>/dev/null \
     || stat -c%s productions/sonnet/work/reference/3s-sonnet_extracted/sonnet.exe)
printf '  dist/sonnet-mashi/index.html   %6d B\n' "$BYTES"
printf '  original sonnet.exe (ASM 2001) %6d B\n' "$ORIG"
printf '  under the 64k budget by        %6d B\n' "$((65536 - BYTES))"
echo
echo "  serve:  (cd dist/sonnet-mashi && python3 -m http.server 8080)"
echo "  ⚠ must be served over HTTP — Mashi's loader fetches its own document,"
echo "    which file:// blocks without Chrome's --allow-file-access-from-files."
