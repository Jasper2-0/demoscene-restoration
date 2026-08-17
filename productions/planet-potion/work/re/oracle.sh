#!/bin/sh
# oracle.sh — fetch and build libdigibooster3, the reference DBM replayer.
#
#   ./oracle.sh          # build into oracle/ if it is not there already
#   ./oracle.sh --force  # fetch and build again from scratch
#
# WHY IT IS NEEDED. Everything else here checks the music structurally: every
# byte claimed, every row on the right tick. None of that notices when the
# notes are three octaves sharp or a key off plays as a bass note, both of
# which shipped and were caught by ear. dbmdiff.mjs compares our render against
# this one and prints a correlation, per second, so the next thing to fix is a
# number rather than an impression.
#
# WHERE IT COMES FROM. libdigibooster3 is by Grzegorz Kraszewski, the author of
# the DBM format itself, BSD-2 licensed. **The upstream repository is gone** —
# github.com/grzegorz-kraszewski is a 404, the whole account, and the download
# link on digibooster.de points at it. digibooster.de's mirror at amigafuture.de
# answers 403. What survives is Software Heritage's archive of the repository,
# which is what this fetches: snapshot f8565730, master 9f4640bb, 2022-12-24.
#
# That is worth stating plainly rather than hiding behind a URL: the oracle for
# this production's audio exists because an archive crawled a repository that
# has since disappeared. If Software Heritage ever loses it too, the vendored
# copy in whatever container ran this last is the only one left.
#
# THE ONE BUILD FIX. player.c defines msynth_echo_off_for_track as a bare
# `inline`, which under GCC's gnu89 rules emits an external symbol and under
# C99 — clang's default — does not, so the link fails on one undefined symbol.
# -fgnu89-inline restores the semantics the code was written against. Nothing
# else is patched; this is the author's code as archived.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
OUT="$HERE/oracle"
SRC="$OUT/src"
DIR_ID=92ca84398155acd08dd3dc3c3210e22b5ad7fae4    # master, 2022-12-24
API=https://archive.softwareheritage.org/api/1

if [ "${1:-}" = "--force" ]; then rm -rf "$OUT"; fi
if [ -x "$OUT/dbm2wav" ] && [ -x "$OUT/dbminfo" ]; then
  echo "oracle: already built at $OUT"
  exit 0
fi

command -v python3 >/dev/null 2>&1 || { echo "oracle: needs python3" >&2; exit 77; }
command -v cc >/dev/null 2>&1 || { echo "oracle: needs a C compiler" >&2; exit 77; }

mkdir -p "$SRC"
echo "oracle: fetching libdigibooster3 from Software Heritage ..."
python3 - "$DIR_ID" "$SRC" "$API" <<'PY'
import json, os, sys, time, urllib.request
dir_id, dest, api = sys.argv[1], sys.argv[2], sys.argv[3]

def get(url, raw=False):
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return r.read() if raw else json.load(r)
        except Exception as e:
            if getattr(e, 'code', None) == 429:      # archive rate limit
                time.sleep(10 + attempt * 10); continue
            if attempt == 5: raise
            time.sleep(3)

def walk(did, out):
    os.makedirs(out, exist_ok=True)
    for e in get(f'{api}/directory/{did}/'):
        p = os.path.join(out, e['name'])
        if e['type'] == 'dir':
            walk(e['target'], p)
        elif e['type'] == 'file':
            open(p, 'wb').write(get(f'{api}/content/sha1_git:{e["target"]}/raw/', raw=True))

walk(dir_id, dest)
PY

echo "oracle: building ..."
CFLAGS="-W -O2 -fno-strict-aliasing -fgnu89-inline -Wno-parentheses -Wno-pointer-sign -L./ -DTARGET_LINUX"
( cd "$SRC" && make linux CC="${CC:-cc}" CFLAGS="$CFLAGS" >/dev/null 2>&1 )
cp "$SRC/dbm2wav" "$SRC/dbminfo" "$OUT/"
echo "oracle: built $OUT/dbm2wav and $OUT/dbminfo"
