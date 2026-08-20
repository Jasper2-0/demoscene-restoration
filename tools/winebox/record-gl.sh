#!/bin/sh
# record-gl.sh — run a Windows demo under Wine and record the GL call stream.
#
#   record-gl.sh <exe> [seconds] [outdir]
#
# The oracle is Wine's own opengl32 thunk logging (WINEDEBUG=+opengl): every
# call the program makes into GL is printed with its arguments, in call order,
# before Wine forwards it to the host driver. That is the same artifact the
# Planet Potion work got by pointing Warp3D's vectors at a recorder — here the
# interception already exists and is one environment variable away.
#
# Rendering correctness is NOT required. We need the program to run far enough
# to emit calls; llvmpipe drawing them slowly into an Xvfb buffer is fine.
set -eu
EXE=${1:?usage: record-gl.sh <exe> [seconds] [outdir]}
SECS=${2:-20}
OUT=${3:-/work/gltrace}
mkdir -p "$OUT"
cd "$(dirname "$EXE")"

export WINEPREFIX=${WINEPREFIX:-/wine}
export WINEDLLOVERRIDES="mscoree=d;mshtml=d"
export LIBGL_ALWAYS_SOFTWARE=1
export GALLIUM_DRIVER=llvmpipe
export MESA_GL_VERSION_OVERRIDE=2.1

# Xvfb, not xvfb-run: we want the server to outlive a crashing client so the
# log is still flushed, and we want a known display number to drive with
# xdotool from a second process.
Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >"$OUT/xvfb.log" 2>&1 &
XPID=$!
export DISPLAY=:0
i=0; while [ $i -lt 50 ] && ! xdotool search --name . >/dev/null 2>&1; do i=$((i+1)); sleep 0.2; done

WINEDEBUG=+opengl wine "$(basename "$EXE")" >"$OUT/stdout.log" 2>"$OUT/gl.log" &
WPID=$!

# The engine opens an MFC setup dialog first ("Run Demo" / windowed / fullscreen).
# Headless, nothing presses it, so the program sits there forever and emits no
# GL at all. Drive it: wait for a window, then Return. Logged either way, so a
# run that never got past the dialog is visible in the trace rather than
# silently empty.
( sleep 8
  xdotool search --onlyvisible --name '.' 2>/dev/null | while read -r w; do
      xdotool windowactivate "$w" 2>/dev/null || true
      xdotool key --window "$w" Return 2>/dev/null || true
  done ) >"$OUT/dialog.log" 2>&1 &

sleep "$SECS"
kill $WPID 2>/dev/null || true
sleep 2
kill -9 $WPID 2>/dev/null || true
kill $XPID 2>/dev/null || true

echo "--- trace summary ---"
wc -l < "$OUT/gl.log" | tr -d ' ' | sed 's/^/gl.log lines: /'
grep -c 'wglCreateContext\|wglMakeCurrent' "$OUT/gl.log" 2>/dev/null | sed 's/^/wgl context calls: /' || true
grep -oE '\bgl[A-Z][A-Za-z0-9]*' "$OUT/gl.log" 2>/dev/null | sort | uniq -c | sort -rn | head -25
