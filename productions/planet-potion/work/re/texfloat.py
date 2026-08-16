#!/usr/bin/env python3
"""Dump the texture VM's FLOAT surface, not the 8-bit texture it converts to.

    python3 texfloat.py flat/ out.json 1  64 127 0 64  0 0 0 0  0 215 215 215 ...

`texopref.py` returns what `_generate` writes to its ARGB destination, which is
one byte per channel. That is enough to say two implementations disagree and
almost never enough to say why: a port that lands a hundredth of a unit high
looks identical everywhere except where the ideal value falls exactly on `.5`,
and there it is off by one with no way to see the size of the error.

`_generate` keeps the working surfaces at pointers in the small-data area, so
the float values are still in memory when it returns. Point the harness's output
window at `r2+0x2472` (the current surface) instead of the caller's buffer and
the exact float32 the original computed comes back — which turns "off by one at
twelve pixels" into a number that can be compared directly.
"""
import json
import struct
import sys

import ppcrun as H
import texopref

R2 = 0x10000000 + H.R2_BIAS
SURFACES = {'current': 0x2472, 'source': 0x246a, 'work': 0x2466, 'mask': 0x246e}


def surface_ptr(d0, which='current', base=0x10000000):
    return struct.unpack_from('>I', d0, R2 + SURFACES[which] - base)[0]


def render(flat, op, operands, which='current'):
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    H.preload_tables(d0)
    H.PRELOAD[texopref.PROG_AT] = texopref.build_program(op, operands)
    addr = surface_ptr(d0, which)
    n = 128 * 128 * (1 if which == 'mask' else 4)
    out, err = H.run(flat, H.sym(flat)['_generate'],
                     {3: texopref.PROG_AT, 4: H.DEST},
                     out_addr=addr, out_len=n * 4)
    if len(out) != n * 4:
        raise SystemExit(f'texfloat: harness returned {len(out)} bytes: {err[:200]}')
    return struct.unpack(f'>{n}f', out)


def main():
    flat, dest = sys.argv[1], sys.argv[2]
    op = int(sys.argv[3])
    operands = [int(x) for x in sys.argv[4:]]
    vals = render(flat, op, operands)
    json.dump({'op': op, 'operands': operands, 'surface': 'current',
               'note': 'float32 RGBA straight out of the VM, before fctiw',
               'floats': list(vals)}, open(dest, 'w'))
    print(f'op{op} -> {dest}  ({len(set(vals))} distinct floats)')


if __name__ == '__main__':
    main()
