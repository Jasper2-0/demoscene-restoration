#!/bin/sh
# record-apitrace.sh — record a Windows demo's GL stream WITH the pointed-at data.
#
#   record-apitrace.sh <exe> [seconds] [outdir]
#
# The sibling recorder, record-gl.sh, uses WINEDEBUG=+opengl. That is free and
# needs no setup, but Wine prints the POINTER for the *v entry points, so anything
# submitted through glVertex3fv / glNormal3fv / glTexCoord2fv is invisible. For the
# Haujobb engines that cost little — they draw through vertex arrays, and the
# glArrayElement index stream is a better check on a reader than positions would
# have been. For the Sunflower engines it is fatal: Wonder submits 84% of its
# vertices as glVertex3fv.
#
# apitrace wraps GLX instead of reading Wine's own log, and serialises the arrays a
# pointer refers to. The cost is a binary trace that has to be dumped, and a
# recorder that is inside the process rather than beside it.
#
# Writes: <outdir>/trace.trace (binary) and, with --dump, trace.txt
set -eu
EXE=${1:?usage: record-apitrace.sh <exe> [seconds] [outdir]}
SECS=${2:-90}
OUT=${3:-/work/apitrace}
mkdir -p "$OUT"
cd "$(dirname "$EXE")"

export WINEPREFIX=${WINEPREFIX:-/wine}
export WINEDLLOVERRIDES="mscoree=d;mshtml=d"
export LIBGL_ALWAYS_SOFTWARE=1
export GALLIUM_DRIVER=llvmpipe
export MESA_GL_VERSION_OVERRIDE=2.1
# Quiet Wine's own logging: apitrace is the recorder here, and +opengl would
# double the work for output nothing reads.
export WINEDEBUG=-all

Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >"$OUT/xvfb.log" 2>&1 &
XPID=$!
export DISPLAY=:0
sleep 3

# `apitrace trace` LD_PRELOADs the GLX wrapper. Wine re-execs through its own
# loader, and the preload survives that, so tracing the `wine` command works —
# but the trace lands under the name of whichever process actually made the calls,
# hence the find below rather than trusting -o.
apitrace trace --api gl -o "$OUT/trace.trace" wine "$(basename "$EXE")" \
  >"$OUT/stdout.log" 2>"$OUT/stderr.log" &
WPID=$!

# Same blocking setup dialog as the other recorder; see record-gl.sh.
( sleep 10
  for i in 1 2 3; do
    xdotool search --onlyvisible --name '.' 2>/dev/null | while read -r w; do
      xdotool windowactivate "$w" 2>/dev/null || true
      xdotool key --window "$w" Return 2>/dev/null || true
    done
    sleep 3
  done ) >"$OUT/dialog.log" 2>&1 &

sleep "$SECS"
kill $WPID 2>/dev/null || true
sleep 3
kill -9 $WPID 2>/dev/null || true
pkill -9 wine 2>/dev/null || true
sleep 1
kill $XPID 2>/dev/null || true

# apitrace may name the file after the traced process rather than -o.
T=$(find "$OUT" "$(dirname "$EXE")" -maxdepth 1 -name '*.trace' -size +0 2>/dev/null | head -1)
if [ -z "$T" ]; then
  echo "record-apitrace: no trace produced — see $OUT/stderr.log" >&2
  tail -5 "$OUT/stderr.log" >&2 2>/dev/null || true
  exit 1
fi
[ "$T" = "$OUT/trace.trace" ] || mv "$T" "$OUT/trace.trace"

echo "--- trace ---"
ls -la "$OUT/trace.trace"
apitrace dump --calls=0-40 "$OUT/trace.trace" 2>/dev/null | head -20
echo "--- call count ---"
apitrace dump "$OUT/trace.trace" 2>/dev/null | grep -cE '^[0-9]+ gl' || true
