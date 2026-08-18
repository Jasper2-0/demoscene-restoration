#!/bin/sh
# checkall.sh — run every Planet Potion verification suite.
#
#   ./checkall.sh <flat-dir> <dataset-dir> [modules-dir] [anim.json] [opsuite-dir] [warp3d-dir]
#
# Thirty-three checks accumulated over the work and there is no point in
# remembering thirty-three invocations. Each passes or names what drifted; none of them
# reports a percentage, because a percentage cannot fail.
#
# scenegram.py used to be the one check expected to FAIL, at 0/29. It passes
# now: 27/27 streams and every node field. What unstuck it was scenewalk.py,
# which measures where each opcode really is by patching the stream's own u16
# length and watching the node count step, rather than arguing about widths.
#
# HALF OF THESE NEED THE ORIGINAL BINARY AND HALF DO NOT, which matters more
# than it sounds: `flat/` is gitignored, so a fresh clone — or a recycled cloud
# container — has the committed dataset under web/data but no segment dumps.
# The tools that read the binary exit 77 in that case, and 77 is reported as
# SKIP rather than counted as a failure. A suite that cannot run is not a suite
# that found something.
#
# Rebuilding what those need, from nothing:
#
#   node ../../../../tools/fetch/originals.mjs planet-potion
#   bsdtar -xf ../../../../originals/potion/potionplanet_potion.lha -C ../unpacked
#   python3 hunkload.py ../unpacked/planet-potion_dcr.exe flat/
#   ./ppcbox.sh python3 synthdump.py flat/ mods/
#   ./ppcbox.sh python3 export.py flat/ out/ mods/part1_full.dbm mods/part3.dbm
#   ./ppcbox.sh python3 texopsuite.py flat/ out/tex_programs.json out/opsuite/
#   ./ppcbox.sh python3 animdump.py flat/ 0x100320b1 out/anim.json 92 200 400
#   ./ppcbox.sh python3 arenadump.py flat/ out/arena.json
#   ./ppcbox.sh python3 geodump.py flat/ out/geo.json
#   python3 synthref.py flat/ mods/ out/synthref/
#   mkdir -p ../../web/data && cp -r out/* ../../web/data/
#
# That last copy is not optional for rendercheck and soundcheck: both drive a
# real browser against web/, so the data has to be where the PAGE loads it
# from, and an unpopulated web/data/ fails as 404s rather than as a missing
# input. The modules do NOT go with it any more: the softsynth is ported, so the
# page builds both from out/seg0.bin and out/seg4.bin at load time. mods/ is
# still built because dbmcheck, dbmtime, dbmdiff and synthref all compare
# against a reference module.
#
# Modules first: without them export.py rebuilds both under emulation to get
# the show timeline, which is the slowest step in the whole pipeline.
#
# animdump's "92 200 400" are not decoration either. animcheck reads its node
# list from frames[0], and at t=0 the scene has not drawn, so the default times
# hand it an empty frame and every assertion is silently skipped.
#
# The ppcbox lines go through a container because those tools generate their
# data by RUNNING the original under qemu-user, which does not exist on macOS.
# See NOTES.md, "Where the oracle runs, and where it does not". The checks
# below are all portable — they read flat/ or the dataset, never run PowerPC.
#
# dbmsuite needs no module of its own: it GENERATES one per behaviour and
# compares each against the reference, which is how a wrong effect is found
# without eighteen tracks of real music on top of it. It needs oracle.sh, and
# skips at 77 without it.
#
# lvocheck needs the two Warp3D archives, which are copyrighted redistributables
# and are NOT in this repository (hashes in NOTES.md). Give their directory as
# the sixth argument, or leave it out and that one check skips.
set -u

FLAT=${1:?usage: checkall.sh flat/ dataset/ [modules/] [anim.json] [opsuite/]}
DATA=${2:?}
MODS=${3:-}
ANIM=${4:-}
SUITE=${5:-}
W3D=${6:-}
HERE=$(dirname "$0")
rc=0
skipped=0

run() {
  printf '\n=== %s\n' "$1"
  shift
  "$@"
  case $? in
    0)  ;;
    77) skipped=$((skipped + 1)) ;;
    *)  rc=1 ;;
  esac
}

run "fpcheck — the two floating-point primitives, against exact arithmetic" \
  node "$HERE/fpcheck.mjs"
run "speccheck — spec numbers re-derived from the binary" \
  python3 "$HERE/speccheck.py" "$FLAT"
run "periodcheck — the pitch table, against the shipped dbplayer.library" \
  node "$HERE/periodcheck.mjs" "$FLAT" ${MODS:+"$MODS/part1_full.dbm" "$MODS/part3.dbm"}
run "texvmdiff — 69 texture programs against the original's own output" \
  node "$HERE/texvmdiff.mjs" "$DATA"
run "texbuildcheck — the layer the browser calls, reorder included" \
  node "$HERE/texbuildcheck.mjs" "$DATA"
run "projcheck — the emitter, over every recorded vertex" \
  node "$HERE/projcheck.mjs" "$DATA/draws.json"
run "rendercheck — the player in a real browser, pixels read back" \
  node "$HERE/rendercheck.mjs" "$DATA"
run "soundcheck — the page's own button, and the samples it queues" \
  node "$HERE/soundcheck.mjs"
run "dbmsuite — one generated module per replayer behaviour" \
  node "$HERE/dbmsuite.mjs"

[ -n "$SUITE" ] && run "texopdiff — each opcode in isolation" \
  node "$HERE/texopdiff.mjs" "$SUITE" "$DATA/tex_kernels.json"

# The softsynth, primitive by primitive, against per-sample targets sliced out
# of the modules the original built. --min is a RATCHET: the count of samples
# that must come out byte-exact, raised as each primitive lands. Needs
# `python3 synthref.py flat/ mods/ out/synthref/` first; 77 = skip without it.
run "synthdiff — each softsynth primitive against its own sample" \
  node "$HERE/synthdiff.mjs" "$FLAT" "$HERE/out/synthref" --min 94

if [ -n "$MODS" ]; then
  run "dbmcheck — the DigiBooster reader accounts for every byte" \
    node "$HERE/dbmcheck.mjs" "$MODS/part1_full.dbm" "$MODS/part3.dbm" \
    --audio "$DATA/audio.json"
  run "dbmtime — the sequencer reproduces the show timeline" \
    node "$HERE/dbmtime.mjs" "$MODS/part1_full.dbm" "$MODS/part3.dbm" \
    --showorder "$DATA/showorder.json"
  # A RATCHET, not a target: the number is the best measured so far and the
  # check fails if a change makes it worse. It will not reach 1.0, and that is
  # understood rather than outstanding — the reference disagrees with
  # dbplayer.library about the note base by two octaves and slides pitch in a
  # different domain, so dbmdiff cancels the octaves and the portamento
  # passages stay different by construction. See dbmplayer.js and NOTES.md.
  # ./oracle.sh builds what this compares against; without it, 77 = skip.
  # THE REAL MEASURE OF THE PORT, with the echo parameters aligned. The
  # reference ignores a module's DSPE for its "old" echo type and plays every
  # DBM at delay 0x40 / feedback 0x80; these modules say 430 ms / 120 and have
  # echo on 12 of 18 tracks, so that one divergence — which is the reference's,
  # not ours — is the whole of the remaining difference.
  run "dbmdiff p1 — against libdigibooster3, echo aligned" \
    node "$HERE/dbmdiff.mjs" "$MODS/part1_full.dbm" --ref-echo --min 0.99 --min-wave 0.98
  run "dbmdiff p3 — against libdigibooster3, echo aligned" \
    node "$HERE/dbmdiff.mjs" "$MODS/part3.dbm" --ref-echo --min 0.99 --min-wave 0.97
  # And as the page actually plays it, honouring the module's own echo.
  run "dbmdiff p1 — as played, with the module's own echo" \
    node "$HERE/dbmdiff.mjs" "$MODS/part1_full.dbm" --min 0.96 --min-wave 0.90
  run "dbmdiff p3 — as played" \
    node "$HERE/dbmdiff.mjs" "$MODS/part3.dbm" --min 0.96 --min-wave 0.89
  # The only check here with a clock that is not ours. dbmtime and dbmdiff both
  # compare against implementations of the same tick arithmetic, so neither can
  # see a tempo error; this one measured part three at 2,640 ppm fast. Needs the
  # capture, which is gitignored — 77 = skip without it.
  run "capalign — our soundtrack against the reference capture's own clock" \
    node "$HERE/capalign.mjs" "$HERE/../reference/planet-potion_ref.mkv" \
    "$MODS/part1_full.dbm" "$MODS/part3.dbm"
elif [ -f "$DATA/audio.json" ]; then
  # No modules, but audio.json alone is worth checking: its chunk table has to
  # account for the size the generator declared, and that is what catches a
  # stale export carrying the old 5,324,890.
  run "dbmcheck — audio.json only, no modules here" \
    node "$HERE/dbmcheck.mjs" --audio "$DATA/audio.json"
fi

[ -n "$ANIM" ] && run "animcheck — the keyframe evaluator against real motion" \
  node "$HERE/animcheck.mjs" "$ANIM"

# The structural export: every node, face, vertex, sprite and keyframe track in
# all 29 scenes, as the scene VM leaves them. Cross-checked against scenes.json,
# which a different tool produced by a different walk. 77 = skip without it.
run "arenacheck — the structural export, and scenes.json agreeing with it" \
  node "$HERE/arenacheck.mjs" "$HERE/out/arena.json" "$DATA/scenes.json"

# The per-stage recorded/computed switch: that it resolves, that it REFUSES a
# side that does not exist rather than substituting one, and that it reaches the
# page. Needs no dataset argument — it drives web/ itself.
run "stagecheck — the pipeline switch, and the adapter reporting it" \
  node "$HERE/stagecheck.mjs"

# PORT_SPEC §1: the glyph atlas, the glyph table, the clipper's scratch
# geometry and the per-scene fog. The first two are checkable byte-for-byte
# today and would be much harder to isolate once Stage 3b consumes them.
run "initcheck — the atlas, the glyph table and the fog schedule" \
  node "$HERE/initcheck.mjs" "$FLAT" "$HERE/out"

# _calc_matrix's first pass over every scene: the loop-mode walk, all fifteen
# coefficient blocks, the matrix builders and both concatenations, against the
# channels the running program left in the arena. Needs
# `./ppcbox.sh python3 animdump.py --all flat/ out/anim_all.json`; 77 = skip.
run "pass1check — the animation evaluator, all 29 scenes" \
  node "$HERE/pass1check.mjs" "$HERE/out/anim_all.json"

# Passes 1 and 2 together, which is the only way to assert on a node that has a
# parent: pass 2 rewrites its channels, so pass1check has to skip all 180 of
# them. Kept separate from pass1check so a compose regression cannot be
# mistaken for an evaluator one.
run "pass2check — the compose pass, every node of every scene" \
  node "$HERE/pass2check.mjs" "$HERE/out/anim_all.json"

# The publish pass: the gate byte, cx/cy/scale against what the emitter used,
# and every mesh vertex's transformed position, colour and normal. The text tail
# is not ported and the camera tail is not dumped; both are reported by number
# rather than passed over.
run "pass3check — the publish pass and the mesh vertex transform" \
  node "$HERE/pass3check.mjs" "$HERE/out/anim_all.json"

# The geometry program's stream grammar, against what the interpreter built.
# NOTES.md recorded these operand widths as unmodellable after three failed
# attempts; this decodes all 39 programs statically and lands on exactly the
# stream's own length every time. It reads the segments straight out of flat/
# because seg3 is not part of the exported dataset.
run "geocheck — the geometry stream decodes without running the program" \
  node "$HERE/geocheck.mjs" "$FLAT" "$HERE/out/geo.json"

# And the other half: where each vertex actually IS. Only op0's box and plane
# generator is ported; op3's clone and op4's spline sweep are named by vertex
# count in the output rather than skipped quietly.
run "geovertcheck — op0's generator, vertex positions bit for bit" \
  node "$HERE/geovertcheck.mjs" "$FLAT" "$HERE/out/geo.json"

# The seam between the two largest data structures: a scene's mesh node against
# the geometry program it names. Nothing else asserts that geo.json and
# arena.json describe the same thing.
run "joincheck — the geometry programs wired to the scenes that use them" \
  node "$HERE/joincheck.mjs" "$FLAT" "$HERE/out/geo.json" "$HERE/out/arena.json"

# Every Warp3D name in PORT_SPEC rests on this ordering, and it was measured
# once and written up as prose. Re-derives it from the shipped libraries.
[ -n "$W3D" ] && run "lvocheck — the LVO table, re-derived from the real libraries" \
  python3 "$HERE/lvocheck.py" "$W3D"

# The scene stream, decoded statically and checked field by field against the
# node list the original built. This is the check that reported 0/29 for most of
# the project's life.
run "scenegram — every scene stream decodes to the nodes the original built" \
  python3 "$HERE/scenegram.py" "$FLAT" "$HERE/out/arena.json"

# And the JavaScript twin, which is the one the page will use. Both walk the
# same grammar against the same oracle, so a divergence between them shows up
# as a divergence from the original rather than going unnoticed.
run "scenecheck — the scene decoder the page uses" \
  node "$HERE/scenecheck.mjs" "$FLAT" "$HERE/out/arena.json" \
  "$HERE/out/anim_all.json"

# The animation, on every scene rather than the one fixture: all 1,118 node
# channel blocks and the 186 composed matrices the cameras hand the renderer.
run "chancheck — every node's channels, in every scene, at every tick" \
  node "$HERE/chancheck.mjs" "$FLAT" "$HERE/out/anim_all.json"

# The emitter, checked on its own before the clipper and node walk that feed it
# exist: the recorded stream is 144,727 vertices of its output, and the
# projection inverts exactly, so the round trip is a real test of the
# arithmetic.
run "emitcheck — the emitter reproduces the recorded projection" \
  node "$HERE/emitcheck.mjs" "$DATA/draws.json"

if [ $rc -eq 0 ]; then
  printf '\nall suites that could run passed'
else
  printf '\nSOMETHING FAILED'
fi
[ $skipped -gt 0 ] && printf ' (%d skipped — no original binary here)' "$skipped"
printf '\n'
exit $rc
