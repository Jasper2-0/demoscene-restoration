#!/bin/sh
# stub-probe.sh <pos_ms> <outdir> [seconds]
# Run the demo with the stub BASS.DLL, clock frozen at <pos_ms>.
set -eu
POS=$1; OUT=$2; SECS=${3:-50}
rm -rf /tmp/g; cp -r /demo /tmp/g; chmod -R u+w /tmp/g
cp /work/bassstub/BASS.DLL /tmp/g/BASS.DLL     # local DLL wins over any system one
mkdir -p "$OUT"
export WINEPREFIX=/wine LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe
export HJB_POS_MS="$POS" HJB_POS_STEP_MS=0 HJB_TRACE=1
export HJB_TICKS="${HJB_TICKS:-$POS}" HJB_TICK_STEP="${HJB_TICK_STEP:-0}"
Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >/dev/null 2>&1 & XP=$!
export DISPLAY=:0; sleep 3
cd /tmp/g
WINEDEBUG=+opengl wine Genoaux.exe >/dev/null 2>"$OUT/gl.log" & WP=$!
( sleep 10; for i in 1 2 3; do
    xdotool search --onlyvisible --name '.' 2>/dev/null | while read -r w; do
      xdotool windowactivate "$w" 2>/dev/null || true
      xdotool key --window "$w" Return 2>/dev/null || true; done; sleep 3; done ) >/dev/null 2>&1 &
sleep "$SECS"
kill -9 $WP 2>/dev/null || true; kill $XP 2>/dev/null || true
grep '\[bassstub\]' "$OUT/gl.log" | head -8 | sed 's/^/  /'
echo "  pos=$POS calls=$(grep -c 'trace:opengl:' "$OUT/gl.log" || true) frames=$(grep -c 'opengl:glClear ' "$OUT/gl.log" || true)"
