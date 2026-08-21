#!/bin/sh
# PURPOSE / INVOCATION
#   docker run --rm --platform linux/386 -v <traceDir>:/out \
#     -v $PWD/productions/wonder/work/tools/scratch:/s haujobb-winebox:latest \
#     sh /s/extract-exe-texture.sh <callNumber>...
#
#   Writes /out/state_<call>.json per call. Decode with decode-exe-texture.py.
#
# MODE:       EXTRACT
# OBSERVABLE: the TEXTURE IMAGE actually bound at a draw call, per texture unit,
#             as the driver holds it -- not the asset the port believes it bound.
#             `glretrace -D` reports each bound texture under `textures` with
#             __width__/__height__/__format__/__data__, the last a base64 PNG.
# UNITS:      call numbers are apitrace call indices, from held-draws.txt.
#             IMAGE ROW ORDER IS BOTTOM-UP -- see decode-exe-texture.py.
#
# WHY THIS EXISTS. Comparing draw streams proved Wonder's port submits the same
# geometry, matrices, blend state and texture coordinates as the executable while
# still producing a different picture. Texture CONTENT was the one observable left
# and nothing could reach it: texture identity by SIZE is ambiguous here because
# the demo reuses GL names (id 1 is uploaded at both 4x4 and 256x256, id 3 at 4x1
# and 256x256, across 74 uploads), so "same dimensions" says nothing.
#
# COST. Each -D replays the trace from the start. Pass every call you want in one
# invocation; the Xvfb/driver startup is paid once.
set -eu
OUT=${OUT:-/out}
[ -f "$OUT/t.trace" ] || { echo "no trace at $OUT/t.trace" >&2; exit 2; }
[ $# -ge 1 ] || { echo "usage: extract-exe-texture.sh <callNumber>..." >&2; exit 2; }

export LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe MESA_GL_VERSION_OVERRIDE=2.1
Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >/dev/null 2>&1 & XP=$!
export DISPLAY=:0; sleep 3
trap 'kill $XP 2>/dev/null || true' EXIT

for CALL in "$@"; do
  glretrace -D "$CALL" "$OUT/t.trace" > "$OUT/state_$CALL.json" 2>/dev/null || true
  SZ=$(wc -c < "$OUT/state_$CALL.json")
  [ "$SZ" -gt 1000 ] || { echo "call $CALL: state dump is $SZ bytes -- call number wrong?" >&2; exit 1; }
  echo "wrote state_$CALL.json ($SZ bytes)"
done
