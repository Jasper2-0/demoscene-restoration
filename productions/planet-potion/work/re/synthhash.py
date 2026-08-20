#!/usr/bin/env python3
"""Pin the softsynth's output, so a reimplementation has something to fail against.

    python3 synthhash.py flat/ [out/audio.json]

The two generators are the largest unread subsystem — 32 primitives over about
11 KB of PowerPC — and a port has to reimplement them, because the modules they
build are 8.3 MB and shipping that is not an option for a web page.

What makes that tractable is the test: `_generate_samples_part1` and `_part3` are
pure functions of the binary, so their output is fixed, and a JS generator either
produces the same bytes or does not. This records the sizes and SHA-256s, plus
the chunk table and the per-chunk digests — because "the module differs" is not a
useful failure and "the SMPL chunk differs from byte 41,000" is.

Slow: each part builds megabytes under qemu. A few minutes per module.
"""
import hashlib
import json
import struct
import sys

import dbmpatt
import ppcrun as H
import runsynth

# From the length prefix each generator writes. Part one's is confirmed three
# ways: the immediate 0x513e5a that _generate_samples_part1 loads in its first
# two instructions, the chunk walk (44 + 10 + 80 + 2800 + 274 + 28 + 14574 +
# 5306496, plus an 8-byte header and eight 8-byte chunk headers), and the prefix
# itself. 0x513e5a is 5,324,378 — an earlier note in this repo had 5,324,890,
# which is simply the hex converted wrong, and it got reintroduced here once.
SIZES = {'p1': 5_324_378, 'p3': 3_015_404}


# Same convention as speccheck.py: 77 means the original is not unpacked here,
# which is not the same news as a generator that produced the wrong bytes.
ABSENT = 77


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    dest = sys.argv[2] if len(sys.argv) > 2 else None
    H.FLAT = flat
    try:
        d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    except FileNotFoundError:
        print(f'synthhash: no segment dump at {flat}/seg0_CODE_10000000.bin — '
              'see speccheck.py for the rehydration steps.', file=sys.stderr)
        sys.exit(ABSENT)
    H.preload_tables(d0)
    runsynth.setflat(flat)

    out = {}
    bad = []
    for part, size in SIZES.items():
        raw = runsynth.module(part, n=size + 8)
        if not raw:
            print(f'{part}: generator produced nothing')
            bad.append(f'{part}: no output')
            continue
        declared = struct.unpack_from('>I', raw, 0)[0]
        mod = raw[4:4 + declared]
        ver, cs = dbmpatt.chunks(raw)
        chunks = {c: {'bytes': n, 'sha256': hashlib.sha256(raw[o:o + n]).hexdigest()}
                  for c, o, n in cs}
        out[part] = {
            'declaredSize': declared, 'expectedSize': size,
            'sizeMatches': declared == size,
            'sha256': hashlib.sha256(mod).hexdigest(),
            'version': f'{ver >> 8:x}.{ver & 0xff:02x}',
            'chunks': chunks,
        }
        print(f'{part}: {declared} bytes (expected {size}, '
              f'{"match" if declared == size else "MISMATCH"})')
        if declared != size:
            bad.append(f'{part}: declared {declared}, expected {size}')
        print(f'    sha256 {out[part]["sha256"]}')
        for c, v in chunks.items():
            print(f'      {c}  {v["bytes"]:9}  {v["sha256"][:16]}…')

    if dest:
        json.dump({'note': 'byte-exact targets for a reimplemented softsynth. The '
                           'generators are pure functions of the binary, so a JS '
                           'port either reproduces these digests or does not. '
                           'Per-chunk digests localise a failure.',
                   'parts': out}, open(dest, 'w'), indent=2)
        print(f'wrote {dest}')

    # A SIZE MISMATCH HAS TO BE A NON-ZERO EXIT, and this is not hypothetical.
    # This script printed "MISMATCH", wrote the JSON anyway and exited 0 — and a
    # dataset exported that way is exactly what shipped in web/data/audio.json,
    # carrying `sizeMatches: false` against a generator that was correct. The
    # constant here was wrong at the time, so the artifact recorded a red flag
    # nobody had to act on because nothing failed.
    #
    # The JSON is still written on a mismatch, deliberately: the per-chunk
    # digests are how a failure gets localised, and throwing them away to punish
    # the failure would be the wrong trade. What changes is that a pipeline
    # calling this stops.
    if bad:
        print('\nSIZE MISMATCH — the JSON was written for diagnosis, but this is '
              'a failure:', file=sys.stderr)
        for b in bad:
            print(f'  {b}', file=sys.stderr)
        print('  Check SIZES against the binary first: speccheck.py re-derives '
              'part one\'s 5,324,378 from the lis/ori pair at r2+0x6b88.',
              file=sys.stderr)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
