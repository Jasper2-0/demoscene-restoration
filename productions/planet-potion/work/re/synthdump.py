#!/usr/bin/env python3
"""Write the two modules the softsynth generates, as files on disk.

    ./ppcbox.sh python3 synthdump.py flat/ mods/

checkall.sh takes a modules directory and dbmcheck/dbmtime are the two suites
that need it, but nothing here produced one: the files were made by hand in a
session that had the oracle, and a fresh clone had no way to get them. This is
that step, written down.

The bytes are the same ones synthhash.py digests — `runsynth.module()` returns a
4-byte length prefix followed by the module, and what a DBM reader wants is the
module, so the prefix is stripped and the declared length trusted only after it
is checked against the size the generator's own immediate encodes.

Slow, and unavoidably so: part one builds 5.3 MB of samples under emulation.
Minutes per part. The names match what checkall.sh already looks for.
"""
import os
import struct
import sys

import ppcrun as H
import runsynth
from synthhash import SIZES

NAMES = {'p1': 'part1_full.dbm', 'p3': 'part3.dbm'}


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    dest = sys.argv[2] if len(sys.argv) > 2 else 'mods'
    H.FLAT = flat
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    H.preload_tables(d0)
    runsynth.setflat(flat)
    os.makedirs(dest, exist_ok=True)

    bad = 0
    for part, size in SIZES.items():
        raw = runsynth.module(part, n=size + 8)
        if not raw:
            print(f'{part}: generator produced nothing'); bad = 1; continue
        declared = struct.unpack_from('>I', raw, 0)[0]
        mod = raw[4:4 + declared]
        path = os.path.join(dest, NAMES[part])
        open(path, 'wb').write(mod)
        # A short read looks like a working module until a reader walks off the
        # end of a chunk, so say so here rather than letting dbmcheck find it.
        ok = declared == size and len(mod) == size
        print(f'{part}: wrote {path}  {len(mod)} bytes, declared {declared}, '
              f'expected {size}  {"ok" if ok else "MISMATCH"}')
        if not ok:
            bad = 1
        if mod[:4] != b'DBM0':
            print(f'{part}: magic is {mod[:4]!r}, not DBM0'); bad = 1

    return bad


if __name__ == '__main__':
    sys.exit(main())
