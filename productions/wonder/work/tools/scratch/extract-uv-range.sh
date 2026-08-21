#!/bin/sh
# PURPOSE / INVOCATION
#   docker run --rm --platform linux/386 -v <traceDir>:/out \
#     -v $PWD/productions/wonder/work/tools/scratch:/s haujobb-winebox:latest \
#     sh /s/extract-uv-range.sh <firstCall> <lastCall> <expectedVertices>
#
# MODE:       EXTRACT  (with a coverage CHECK that can fail)
# OBSERVABLE: the min/max of the texture coordinates the executable actually
#             submitted for one draw, per texture unit -- the EFFECTIVE UV, which is
#             the observable the port can be compared against. Handles both
#             glTexCoord2f and glMultiTexCoord2fARB; a two-unit draw uses the latter
#             and a filter written for the former silently reports zero coordinates.
# UNITS:      texture units are GL_TEXTUREn. Ranges are raw submitted values, which
#             for Wonder include whole-tile scroll offsets (s ~ 15, ~26) -- they are
#             NOT normalised into [0,1].
#
# PAIRING AND COVERAGE
#   <expectedVertices> is REQUIRED and is checked. A draw of N vertices is roughly
#   3N calls; if you guess the start of the range you will silently scan part of it.
#
# FALSE FINDING PREVENTED
#   Exactly that. Scanning calls 2664600-2668523 of a 1944-vertex draw covered every
#   U value but only the last two thirds of the V values, and reported V spanning
#   6.66 against the port's 9.99 -- a clean 1.5x one-axis scale error, on the one part
#   that really does have a scale component, with U matching to the last digit. It was
#   the scan, not the port: the full range 2662000-2668523 gives V [-8.9950..0.9950],
#   identical to the port. This script refuses to report a range it did not fully see.
#
# LIMITATIONS
#   Ranges only. Two different UV distributions can share a range -- to settle a
#   disagreement, compare per-vertex values, matching vertices by a coordinate the
#   transform leaves untouched.
set -eu
[ $# -eq 3 ] || { echo "usage: extract-uv-range.sh <firstCall> <lastCall> <expectedVertices>" >&2; exit 2; }
FIRST=$1; LAST=$2; WANT=$3
OUT=${OUT:-/out}
[ -f "$OUT/t.trace" ] || { echo "no trace at $OUT/t.trace" >&2; exit 2; }

apitrace dump --calls="$FIRST-$LAST" "$OUT/t.trace" 2>/dev/null | awk -v want="$WANT" '
function note(u, s, t) {
  if (!(u in n)) { smin[u]=smax[u]=s; tmin[u]=tmax[u]=t }
  if (s<smin[u]) smin[u]=s; if (s>smax[u]) smax[u]=s
  if (t<tmin[u]) tmin[u]=t; if (t>tmax[u]) tmax[u]=t
  n[u]++
}
/glMultiTexCoord2f/ {
  u="?"; if (match($0,/GL_TEXTURE[0-9]/)) u=substr($0,RSTART+10,1)
  s=t=""
  if (match($0,/s = [-0-9.e]+/)) s=substr($0,RSTART+4,RLENGTH-4)+0
  if (match($0,/t = [-0-9.e]+/)) t=substr($0,RSTART+4,RLENGTH-4)+0
  if (s!="") note(u,s,t); next
}
/glTexCoord2f\(/ {
  if (match($0,/s = [-0-9.e]+/)) s=substr($0,RSTART+4,RLENGTH-4)+0
  if (match($0,/t = [-0-9.e]+/)) t=substr($0,RSTART+4,RLENGTH-4)+0
  note("0",s,t); next
}
/glVertex[234]f/ { nv++ }
END {
  printf "vertices seen: %d (expected %d)\n", nv, want
  for (u in n)
    printf "  unit%s: %d coords  s [%.4f .. %.4f] span %.4f   t [%.4f .. %.4f] span %.4f\n",
      u, n[u], smin[u], smax[u], smax[u]-smin[u], tmin[u], tmax[u], tmax[u]-tmin[u]
  if (nv != want) {
    printf "INCOMPLETE SCAN -- saw %d of %d vertices. Ranges above are NOT the draw.\n", nv, want
    exit 1
  }
  print "coverage OK -- the whole primitive was scanned"
}'
