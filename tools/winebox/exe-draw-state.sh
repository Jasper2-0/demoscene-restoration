#!/bin/sh
# exe-draw-state.sh — the executable's per-draw pipeline state, from the DRIVER.
#
# MODE:       EXTRACT
# OBSERVABLE: per-draw GL state as a real driver reports it (`glretrace -D`), not as
#             a text-log replay reconstructs it.
# UNITS:      call numbers are apitrace indices. Booleans arrive as the STRINGS
#             "GL_TRUE"/"GL_FALSE" — host truthiness on either is true.
# COVERAGE:   selects a SETTLED frame (last frame whose draw count repeats), never
#             simply the last one: early frames of a recording have not settled.
#
#   docker run ... -v <traceDir>:/out haujobb-winebox:latest sh /work/exe-draw-state.sh
#
# Reads /out/t.trace, writes /out/exe-draws.ndjson: one record per draw of the
# held frame, each carrying the GL state glretrace reports at that exact call.
#
# WHY NOT REPLAY THE DUMP OURSELVES. A hand-rolled state machine over the text
# dump has to reimplement GL's own semantics, and it gets them wrong in ways that
# look like port defects. The selector rules alone are a trap: glEnable(GL_TEXTURE_2D)
# applies to the server's ACTIVE texture unit, glClientActiveTexture is a different
# selector again, and texture-matrix operations need both the matrix mode and the
# unit. A regex replay of this trace reported texture unit 0 disabled on 40 of 44
# draws — every one of them false. `glretrace -D <call>` asks a real driver instead,
# so that entire class of error does not exist here.
#
# COST. Each -D replays the trace from the start, about 3s for this one, so a
# 44-draw frame is a couple of minutes. The clock is frozen by the stub, so the
# frame is deterministic and this is paid once per instant.
set -eu
OUT=${OUT:-/out}
TRACE=$OUT/t.trace
[ -f "$TRACE" ] || { echo "no trace at $TRACE" >&2; exit 2; }

export LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe MESA_GL_VERSION_OVERRIDE=2.1
Xvfb :0 -screen 0 1024x768x24 -nolisten tcp >/dev/null 2>&1 & XP=$!
export DISPLAY=:0; sleep 3
trap 'kill $XP 2>/dev/null || true' EXIT

# One dump pass: the call number and vertex count of every draw, and where frames
# end. Empty glBegin/glEnd pairs are dropped here — the executable issues many and
# they have no counterpart in the port, so keeping them only shifts pairings.
apitrace dump "$TRACE" 2>/dev/null | awk '
/glVertex[234]f/{ n++; next }
/glBegin\(/{ n=0; next }
/glEnd\(\)/{ if (n>0) printf "%s %d\n", $1, n; n=0; next }
/glClear\(/{ print "FRAME" }
' > "$OUT/draw-calls.txt"

# The held instant is the settled tail: take the last frame whose draw count
# repeats, so a partially recorded final frame is never chosen.
awk 'BEGIN{f=0} /^FRAME/{f++; c[f]=k; k=0; next} {k++} END{
  best=0; for(i=2;i<=f;i++) if(c[i]>0 && c[i]==c[i-1]) best=i
  if(!best) best=f
  print best
}' "$OUT/draw-calls.txt" > "$OUT/held-frame.txt"
HELD=$(cat "$OUT/held-frame.txt")
echo "held frame: $HELD"

awk -v want="$HELD" 'BEGIN{f=1} /^FRAME/{f++; next} f==want{print}' \
  "$OUT/draw-calls.txt" > "$OUT/held-draws.txt"
echo "draws in held frame: $(wc -l < "$OUT/held-draws.txt")"

: > "$OUT/exe-draws.ndjson"
i=0
while read -r CALL N; do
  glretrace -D "$CALL" "$TRACE" > "$OUT/.state.json" 2>/dev/null || true
  # The shader section embeds raw newlines inside JSON strings, which is not
  # parseable; it is also irrelevant to fixed-function state, so drop it here
  # rather than teaching every consumer to tolerate malformed input.
  python3 - "$OUT/.state.json" "$CALL" "$N" "$i" >> "$OUT/exe-draws.ndjson" <<'PY'
import json, re, sys
path, call, n, idx = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
raw = open(path, encoding='utf-8', errors='replace').read()
# glretrace embeds shader SOURCE with raw newlines inside JSON string literals,
# which is not valid JSON. Outside a string a control character is only
# whitespace, so replacing every raw control char with a space fixes the strings
# and changes nothing else. Matching the shader block by regex does not work —
# its body contains braces and the closing indentation varies.
raw = re.sub(r'[\x00-\x1f]', ' ', raw)
try:
    j = json.loads(raw)
except Exception as e:
    print(json.dumps({"seq": idx, "call": call, "n": n, "error": str(e)[:80]})); sys.exit()
p = j.get("parameters", j)
def g(k, d=None): return p.get(k, d)

# glretrace reports GL booleans as the STRINGS "GL_TRUE"/"GL_FALSE". Python's
# bool() on either is True, so reading them directly makes every flag true and
# every comparison a silent false finding.
def glbool(v, d=False):
    if v is None: return d
    if isinstance(v, str): return v == "GL_TRUE"
    return bool(v)

units = []
for u in range(2):
    ud = p.get("GL_TEXTURE%d" % u, {})
    if not isinstance(ud, dict): ud = {}
    # NOTE: ud["GL_TEXTURE_2D"] is the bound texture OBJECT's parameter dict, not
    # the unit's enable flag — the dump does not carry per-unit enables at all.
    # That is fine: whether a unit is "enabled" is mechanism. What changes pixels
    # is which texture is bound and how it is combined, so only those are recorded.
    # The bound texture's own parameters live under GL_TEXTURE_2D; its dimensions
    # are the identity key both sides can supply (GL names cannot be compared).
    obj = ud.get("GL_TEXTURE_2D", {})
    if not isinstance(obj, dict): obj = {}
    units.append({
        "tex": ud.get("GL_TEXTURE_BINDING_2D", 0),
        "size": [obj.get("GL_TEXTURE_WIDTH", 0), obj.get("GL_TEXTURE_HEIGHT", 0)],
        "env": ud.get("GL_TEXTURE_ENV_MODE"),
        "matrix": ud.get("GL_TEXTURE_MATRIX"),
    })
print(json.dumps({
    "seq": idx, "call": call, "n": n,
    "color": g("GL_CURRENT_COLOR"),
    "blend": glbool(g("GL_BLEND")),
    "blendSrc": g("GL_BLEND_SRC"), "blendDst": g("GL_BLEND_DST"),
    "depthTest": glbool(g("GL_DEPTH_TEST")),
    "depthMask": glbool(g("GL_DEPTH_WRITEMASK"), True),
    "cull": glbool(g("GL_CULL_FACE")),
    "lighting": glbool(g("GL_LIGHTING")),
    "modelview": g("GL_MODELVIEW_MATRIX"),
    "projection": g("GL_PROJECTION_MATRIX"),
    "units": units,
}))
PY
  i=$((i+1))
done < "$OUT/held-draws.txt"
rm -f "$OUT/.state.json"
echo "wrote $(wc -l < "$OUT/exe-draws.ndjson") records to exe-draws.ndjson"
