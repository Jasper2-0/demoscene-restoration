#!/bin/sh
# sunf-probe.sh <order> <outdir> [seconds]
# Run a Sunflower demo with the stub FSOUND.DLL, module order frozen at <order>.
set -eu
ORDER=$1; OUT=$2; SECS=${3:-60}
rm -rf /tmp/w; cp -r /demo /tmp/w; chmod -R u+w /tmp/w
cp /work/fsoundstub/FSOUND.DLL /tmp/w/FSOUND.DLL     # local DLL wins
mkdir -p "$OUT"
export WINEPREFIX=/wine LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe
export SUNF_ORDER="$ORDER" SUNF_ORDER_STEP=0 SUNF_TRACE=1
# Wonder reads QueryPerformanceCounter, not GetTickCount — pin that one.
export SUNF_QPC="${SUNF_QPC:-0}" SUNF_QPC_STEP="${SUNF_QPC_STEP:-0}" SUNF_QPC_FREQ="${SUNF_QPC_FREQ:-1000000}"
Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >/dev/null 2>&1 & XP=$!
export DISPLAY=:0; sleep 3
cd /tmp/w
WINEDEBUG=+opengl wine wONDEr.exe >/dev/null 2>"$OUT/gl.log" & WP=$!
( sleep 8; for i in 1 2 3; do
    xdotool search --onlyvisible --name '.' 2>/dev/null | while read -r w; do
      xdotool windowactivate "$w" 2>/dev/null || true
      xdotool key --window "$w" Return 2>/dev/null || true; done
    sleep 3; done ) >/dev/null 2>&1 &
sleep "$SECS"
kill -9 $WP 2>/dev/null || true; kill $XP 2>/dev/null || true
grep '\[fsoundstub\]' "$OUT/gl.log" | head -6 | sed 's/^/  /'
echo "  order=$ORDER calls=$(grep -c 'trace:opengl:' "$OUT/gl.log" || true) frames=$(grep -c 'opengl:glClear ' "$OUT/gl.log" || true)"
