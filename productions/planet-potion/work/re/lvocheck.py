#!/usr/bin/env python3
"""Re-derive the Warp3D LVO ordering from the shipped libraries, as a check.

    python3 lvocheck.py Warp3D-4.0.lha Warp3D-4.2a.lha
    python3 lvocheck.py /path/to/Warp3D/Libs/Warp3DPPC.library

Every Warp3D name in PORT_SPEC and NOTES rests on this ordering, and NOTES
records it as confirmed — 88 vectors in all four builds, and a scan for the
tag-list bases hitting exactly the four functions that take TagItem lists. That
was a one-off measurement written up as prose. This runs it again.

WHY IT IS A SEPARATE FILE from lvo.py: lvo.py is a reader, and prints what it
finds. A check has to be able to fail, which means naming what it expects
before it looks.

WHAT IT CHECKS

  * 88 vectors in every library given — the count ReWarp3DPPC's table agrees
    with, and the reason a scrambled or truncated table would show up at all;
  * on the PowerPC builds, exactly four vectors materialise 0x8020 with
    `lis rX, 0x8020` — how PPC builds the TAG_USER+0x20xxxx bases — and they
    are indices 4, 15, 69 and 80: CreateContext, AllocTexObj, RequestMode and
    BestModeID, the only four Warp3D functions that take tags. Four for four,
    from the start, middle and end of the table, with no reference to the
    reimplementation whose naming is the thing being tested.

The 68K libraries get the count check only; the instruction pattern is a
PowerPC one, and the claim it supports is about the PPC library the intro links
against.

BOUNDING THE SCAN IS THE WHOLE TRICK. Scanning each vector until its first
`blr` finds three of the four: RequestMode's `lis` sits past an early return,
so a truncated scan drops it and reports what looks like a refuted finding
rather than an under-read one. Each function is bounded by the next vector
address instead, which is safe here because the table's targets are the
function starts.

The archives are copyrighted redistributables and are not in this repository —
see NOTES.md for their hashes. Absent, this exits 77, the ABSENT code
checkall.sh reports as SKIP.
"""
import hashlib
import io
import contextlib
import os
import subprocess
import sys
import tempfile

import lvo

ABSENT = 77

# NOTES.md pins these. An archive that hashes differently is not the one the
# recorded measurements came from, which is worth saying out loud rather than
# quietly checking a different binary.
ARCHIVES = {
    'a1da7fd863dd69c667f7d1f1bd07a4c80df985f600741acb505732cb30183df7': 'Warp3D-4.0.lha',
    '68a18bc7b20f0b47b1401855c0e0021604e0be18a4cbf9b86780fbf9d692ff77': 'Warp3D-4.2a.lha',
}

VECTORS = 88
# index -> the name ReWarp3DPPC gives that slot. LVO is -(index + 1) * 6.
TAG_TAKERS = {4: 'W3D_CreateContext', 15: 'W3D_AllocTexObj',
              69: 'W3D_RequestMode', 80: 'W3D_BestModeID'}

BLR = 0x4E800020
fails = 0


def ok(cond, label, detail=''):
    global fails
    print(f'{"ok  " if cond else "FAIL"}  {label}{"  " + str(detail) if detail else ""}')
    if not cond:
        fails += 1


def is_lis_8020(w):
    """addis rD, 0, 0x8020 — how PPC materialises the TAG_USER+0x20xxxx base."""
    return (w >> 26) == 15 and ((w >> 16) & 0x1F) == 0 and (w & 0xFFFF) == 0x8020


def vectors_of(path):
    """lvo.main prints its reading; this wants the table it returns."""
    with contextlib.redirect_stdout(io.StringIO()):
        entries = lvo.main(path)
    return entries, lvo.load(path)[0]


def tag_vectors(entries, mem):
    starts = sorted(set(entries))
    hits = []
    for i, tgt in enumerate(entries):
        end = next((b for b in starts if b > tgt), tgt + 4096)
        a = tgt
        while a < end:
            w = lvo.u32(mem, a)
            if w is None:
                break
            if is_lis_8020(w):
                hits.append(i)
                break
            a += 4
    return hits


def check(path):
    name = os.path.basename(path)
    print(f'\n=== {name}')
    entries, mem = vectors_of(path)
    if not entries:
        ok(False, 'a vector table was found at all', path)
        return

    # The archives also ship the hardware DRIVERS — W3D_Permedia2, W3D_Virge,
    # W3D_Avenger and so on — which are a different interface from the Warp3D
    # API the intro calls, and have their own vector counts (75, 69, …). They
    # are reported because the contrast is the point: 88 belongs to the API
    # library specifically, and a driver counted as one would quietly move it.
    if name.lower() not in ('warp3d.library', 'warp3dppc.library'):
        print(f'      hardware driver, not the Warp3D API — {len(entries)} '
              f'vectors, reported not asserted')
        return

    ok(len(entries) == VECTORS, 'the vector table is 88 entries', len(entries))

    if 'PPC' not in name.upper():
        print('      68K build — the lis scan is a PowerPC pattern, count only')
        return
    hits = tag_vectors(entries, mem)
    ok(len(hits) == len(TAG_TAKERS),
       'exactly four vectors materialise the 0x8020 tag base', len(hits))
    ok(hits == sorted(TAG_TAKERS),
       'and they are the four tag-taking functions',
       ', '.join(f'{i}={TAG_TAKERS.get(i, "?")}' for i in hits))
    for i in hits:
        if i in TAG_TAKERS:
            print(f'      idx {i:3}  LVO {-(i + 1) * 6:5}  {entries[i]:#010x}  '
                  f'{TAG_TAKERS[i]}')


def libraries_in(root):
    found = []
    for dirpath, _, files in os.walk(root):
        for f in files:
            if f.lower().endswith('.library'):
                found.append(os.path.join(dirpath, f))
    return sorted(found)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__.strip().splitlines()[0], file=sys.stderr)
        print('lvocheck: no libraries given — the Warp3D archives are not in this '
              'repository.\nlvocheck: usage: python3 lvocheck.py <Warp3D-*.lha | '
              '*.library | dir>', file=sys.stderr)
        return ABSENT

    libs, tmp = [], tempfile.mkdtemp(prefix='lvocheck-')
    for a in args:
        if not os.path.exists(a):
            print(f'lvocheck: {a} does not exist', file=sys.stderr)
            return ABSENT
        if a.lower().endswith('.lha'):
            digest = hashlib.sha256(open(a, 'rb').read()).hexdigest()
            known = ARCHIVES.get(digest)
            print(f'{os.path.basename(a)}  {digest[:12]}…  '
                  f'{"matches the pinned " + known if known else "NOT a pinned archive"}')
            if not known:
                global fails
                fails += 1
            d = os.path.join(tmp, os.path.basename(a))
            os.makedirs(d, exist_ok=True)
            # bsdtar reads LHA and ships with macOS; libarchive-tools on Debian.
            r = subprocess.run(['bsdtar', '-xf', a, '-C', d], capture_output=True)
            if r.returncode:
                print(f'lvocheck: cannot unpack {a} — is bsdtar installed?',
                      file=sys.stderr)
                return ABSENT
            libs += libraries_in(d)
        elif os.path.isdir(a):
            libs += libraries_in(a)
        else:
            libs.append(a)

    if not libs:
        print('lvocheck: no .library files found in the given paths', file=sys.stderr)
        return ABSENT
    for lib in libs:
        check(lib)

    print(f'\n{"all LVO checks passed" if not fails else f"{fails} FAILED"}'
          f'  ({len(libs)} libraries)')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
