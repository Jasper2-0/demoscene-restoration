#!/usr/bin/env bash
# Fetch and verify the Mashi compressor into tools/bin/.
#
#   ./tools/fetch_mashi.sh          # no-op if the pinned version is present
#   ./tools/fetch_mashi.sh --force  # re-download
#
# The VERSION is pinned, not floating: Mashi is a compressor, so a new release
# can change the packed size — and this project gates on that size. Bumping it
# is a deliberate act with a re-measure, never something a build picks up on its
# own.
#
# The macOS/arm64 digest below was verified by hand against the release's
# published checksum on 2026-08-12 and is pinned here. For other platforms the
# release's own `sha256.sum` is fetched and used — weaker (it comes from the
# same place as the artifact) but better than nothing, and flagged as such.
set -euo pipefail
cd "$(dirname "$0")"

VERSION=v0.1.4
BASE="https://github.com/datatrash/mashi/releases/download/$VERSION"

case "$(uname -s)/$(uname -m)" in
  Darwin/arm64)  ASSET=mashi-aarch64-apple-darwin.tar.xz
                 PINNED=1ea73366506ce6cb8e7097ed2a342d3cade667d8da6babb46112d80b4ac4d390 ;;
  Linux/x86_64)  ASSET=mashi-x86_64-unknown-linux-gnu.tar.xz; PINNED= ;;
  Darwin/x86_64) echo "mashi ships no x86_64 macOS build; use the arm64 host or build from source" >&2
                 exit 1 ;;
  *)             echo "no mashi build for $(uname -s)/$(uname -m) — see https://github.com/datatrash/mashi" >&2
                 exit 1 ;;
esac

DIR="bin/${ASSET%%.tar.xz}"
if [ -x "$DIR/mashi" ] && [ "${1:-}" != "--force" ]; then
  echo "mashi $VERSION already present ($DIR/mashi)"
  exit 0
fi

mkdir -p bin && cd bin
echo "fetching mashi $VERSION for $(uname -s)/$(uname -m)..."
curl -fsSL -o "$ASSET" "$BASE/$ASSET"

if [ -n "$PINNED" ]; then
  GOT=$(shasum -a 256 "$ASSET" | cut -d' ' -f1)
  if [ "$GOT" != "$PINNED" ]; then
    echo "CHECKSUM MISMATCH for $ASSET" >&2
    echo "  expected $PINNED (pinned)" >&2
    echo "  got      $GOT" >&2
    rm -f "$ASSET"; exit 1
  fi
  echo "  sha256 OK (pinned)"
else
  curl -fsSL -o "$ASSET.sha256" "$BASE/$ASSET.sha256"
  WANT=$(cut -d' ' -f1 < "$ASSET.sha256")
  GOT=$(shasum -a 256 "$ASSET" | cut -d' ' -f1)
  if [ "$GOT" != "$WANT" ]; then
    echo "CHECKSUM MISMATCH for $ASSET (release manifest)" >&2
    rm -f "$ASSET"; exit 1
  fi
  echo "  sha256 OK (from the release manifest — NOT independently pinned)"
fi

tar xf "$ASSET"
rm -f "$ASSET" "$ASSET.sha256"
[ -x "${ASSET%%.tar.xz}/mashi" ] || { echo "extracted tree has no mashi binary" >&2; exit 1; }
echo "mashi $VERSION ready: tools/$DIR/mashi"
