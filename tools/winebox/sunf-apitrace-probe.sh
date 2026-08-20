#!/bin/sh
# sunf-apitrace-probe.sh <order> <outdir> [seconds]
#
# Record a Sunflower demo with the module order pinned by the FSOUND stub AND the
# geometry captured by apitrace, then summarise the primitives WITH their vertex
# positions.
#
# The +opengl recorder cannot answer the question this exists for. Wonder submits
# 84% of its vertices through glVertex3fv, and Wine logs only the pointer, so
# "same positions with some absent" and "different positions" look identical in
# that log. apitrace serialises the pointed-at data, which is the whole point.
#
# THE QUESTION: at order 11 the original draws one mesh four times as 2496 / 2421 /
# 2346 / 2298 vertices while the port draws 3468 four times. Either the original
# REJECTS triangles (same positions, fewer of them) or it MORPHS the mesh
# (different positions). Those are different bugs and the fix for one is wrong for
# the other, so the positions decide it.
set -eu
ORDER=$1; OUT=$2; SECS=${3:-60}
rm -rf /tmp/w; cp -r /demo /tmp/w; chmod -R u+w /tmp/w
cp /work/fsoundstub/FSOUND.DLL /tmp/w/FSOUND.DLL
mkdir -p "$OUT"

export WINEPREFIX=/wine LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe
export MESA_GL_VERSION_OVERRIDE=2.1 WINEDEBUG=-all
export SUNF_ORDER="$ORDER" SUNF_ORDER_STEP=0
export SUNF_QPC="${SUNF_QPC:-0}" SUNF_QPC_STEP=0 SUNF_QPC_FREQ=1000000

Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >/dev/null 2>&1 & XP=$!
export DISPLAY=:0; sleep 3
cd /tmp/w
apitrace trace --api gl -o "$OUT/trace.trace" wine wONDEr.exe \
  >"$OUT/stdout.log" 2>"$OUT/stderr.log" & WP=$!
( sleep 10; for i in 1 2 3; do
    xdotool search --onlyvisible --name '.' 2>/dev/null | while read -r w; do
      xdotool windowactivate "$w" 2>/dev/null || true
      xdotool key --window "$w" Return 2>/dev/null || true; done
    sleep 3; done ) >/dev/null 2>&1 &
sleep "$SECS"
kill $WP 2>/dev/null || true; sleep 3; kill -9 $WP 2>/dev/null || true
pkill -9 wine 2>/dev/null || true; sleep 1; kill $XP 2>/dev/null || true

T=$(find "$OUT" /tmp/w -maxdepth 1 -name '*.trace' -size +0 2>/dev/null | head -1)
[ -n "$T" ] || { echo "no trace produced" >&2; tail -3 "$OUT/stderr.log" >&2; exit 1; }
[ "$T" = "$OUT/trace.trace" ] || mv "$T" "$OUT/trace.trace"
ls -la "$OUT/trace.trace"

# Stream the dump rather than materialising it: 4.4M calls of text is ~0.5 GB.
apitrace dump "$OUT/trace.trace" 2>/dev/null | python3 /work/extract-prims.py > "$OUT/prims.json"
echo "wrote $OUT/prims.json"
python3 - "$OUT/prims.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
print(f"  {len(d)} primitives with >=100 vertices")
for p in d[:12]:
    print(f"    frame {p['frame']:>3}  {p['mode']:<10} {p['n']:>6} verts  first={p['first']}")
PY
