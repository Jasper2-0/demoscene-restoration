#!/bin/sh
# checkall.sh — run every Planet Potion verification suite.
#
#   ./checkall.sh <flat-dir> <dataset-dir> [modules-dir] [anim.json] [opsuite-dir]
#
# Eight checks accumulated over the work and there is no point in remembering
# eight invocations. Each either passes or names what drifted; none of them
# reports a percentage, because a percentage cannot fail.
#
# scenegram.py is expected to report 0/29. It encodes a scene-stream grammar
# that does NOT work, deliberately kept as a failing check with the measured
# facts in PORT_SPEC section 4a beside it — see the note it prints. Treat a
# non-zero score there as news, not as success.
set -u

FLAT=${1:?usage: checkall.sh flat/ dataset/ [modules/] [anim.json] [opsuite/]}
DATA=${2:?}
MODS=${3:-}
ANIM=${4:-}
SUITE=${5:-}
HERE=$(dirname "$0")
rc=0

run() {
  printf '\n=== %s\n' "$1"
  shift
  "$@" || rc=1
}

run "speccheck — spec numbers re-derived from the binary" \
  python3 "$HERE/speccheck.py" "$FLAT"
run "texvmdiff — 69 texture programs against the original's own output" \
  node "$HERE/texvmdiff.mjs" "$DATA"
run "projcheck — the emitter, over every recorded vertex" \
  node "$HERE/projcheck.mjs" "$DATA/draws.json"

[ -n "$SUITE" ] && run "texopdiff — each opcode in isolation" \
  node "$HERE/texopdiff.mjs" "$SUITE" "$DATA/tex_kernels.json"

if [ -n "$MODS" ]; then
  run "dbmcheck — the DigiBooster reader accounts for every byte" \
    node "$HERE/dbmcheck.mjs" "$MODS/part1_full.dbm" "$MODS/part3.dbm" \
    --audio "$DATA/audio.json"
  run "dbmtime — the sequencer reproduces the show timeline" \
    node "$HERE/dbmtime.mjs" "$MODS/part1_full.dbm" "$MODS/part3.dbm" \
    --showorder "$DATA/showorder.json"
fi

[ -n "$ANIM" ] && run "animcheck — the keyframe evaluator against real motion" \
  node "$HERE/animcheck.mjs" "$ANIM"

printf '\n=== scenegram — EXPECTED TO FAIL 0/29, see PORT_SPEC section 4a\n'
python3 "$HERE/scenegram.py" "$FLAT" "$DATA/scenes.json" | grep 'streams produce'

printf '\n%s\n' "$([ $rc -eq 0 ] && echo 'all suites passed' || echo 'SOMETHING FAILED')"
exit $rc
