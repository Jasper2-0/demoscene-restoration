#!/usr/bin/env python3
"""Enumerate every shared-library vector the intro fetches, straight from the code.

    python3 vecscan.py flat/

An AmigaOS library call is `lwz rA, disp(rBase)` followed by an indirect branch,
where rBase came from one of the eight library-base globals. Tracking which
register holds which base and collecting the negative displacements gives the
API surface exactly — no guessing which calls "look like" graphics.

Because the globals hold **base + 2** (see NOTES.md), the LVO is `disp - 2` and
the canonical vector index is `|LVO|/6 - 1`. That index is what `lvo.py` reads
out of the shipped Warp3D library's own ROMTag, so the two agree by
construction.
"""
import collections
import struct
import sys

BASE = 0x10000000
R2 = BASE + 0x7FFE
LIBS = {0x1000a334: 'SysBase', 0x1000a338: 'PowerPCBase', 0x1000a33c: 'DOSBase',
        0x1000a340: 'IntuitionBase', 0x1000a344: 'CyberGFXBase',
        0x1000a348: 'Warp3DBase', 0x1000a34c: 'GfxBase', 0x1000a350: 'DBMBase'}
CODE = (0x404, 0xa334)


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    by_disp = {(a - R2) & 0xFFFF: n for a, n in LIBS.items()}
    holds, sites = {}, collections.defaultdict(list)
    for off in range(*CODE, 4):
        w = struct.unpack_from('>I', d0, off)[0]
        if w >> 26 != 32:                                  # lwz only
            continue
        rD, rA, d = (w >> 21) & 31, (w >> 16) & 31, w & 0xFFFF
        sd = d - 0x10000 if d & 0x8000 else d
        if rA == 2 and d in by_disp:
            holds[rD] = by_disp[d]                         # rD now holds a base
        elif rA in holds and sd < 0:
            sites[holds[rA]].append((BASE + off, sd))
    for lib in sorted(sites):
        c = collections.Counter(s[1] for s in sites[lib])
        print(f'{lib}: {len(sites[lib])} call sites, {len(c)} distinct vectors')
        for d, n in sorted(c.items(), reverse=True):
            print(f'   disp {d:6}   LVO {d - 2:6}   index {abs(d - 2) // 6 - 1:3}   x{n}')


if __name__ == '__main__':
    main()
