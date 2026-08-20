#!/bin/sh
# Probe: does Script.txt's [mp3] start-offset move the show?
set -eu
OFF=$1; OUT=$2
rm -rf /tmp/g; cp -r /demo /tmp/g; chmod -R u+w /tmp/g
awk -v off="$OFF" 'NR==3{print off; next}{print}' /demo/Script.txt > /tmp/g/Script.txt
mkdir -p "$OUT"
export WINEPREFIX=/wine LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe
Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >/dev/null 2>&1 & XP=$!
export DISPLAY=:0; sleep 3
cd /tmp/g
WINEDEBUG=+opengl wine Genoaux.exe >/dev/null 2>"$OUT/gl.log" & WP=$!
# The MFC setup dialog blocks until something presses Run Demo. Without this the
# program emits ZERO GL calls and the run looks like a rendering failure rather
# than an un-pressed button — which is exactly how the first probe read.
( sleep 10
  for i in 1 2 3; do
    xdotool search --onlyvisible --name '.' 2>/dev/null | while read -r w; do
      xdotool windowactivate "$w" 2>/dev/null || true
      xdotool key --window "$w" Return 2>/dev/null || true
    done
    sleep 3
  done ) >/dev/null 2>&1 &
sleep 75
kill -9 $WP 2>/dev/null || true; kill $XP 2>/dev/null || true
n=$(grep -c 'trace:opengl:' "$OUT/gl.log" || true)
f=$(grep -c 'opengl:glClear ' "$OUT/gl.log" || true)
echo "  off=$OFF  calls=$n  frames=$f"
