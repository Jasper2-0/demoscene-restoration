#!/usr/bin/env python3
"""Find the FIRST opcode in a program whose float surface diverges from the JS.

    python3 texbisect.py flat/ dataset/ p1_15

A whole-program diff says "this texture is wrong by three subpixels" and leaves
the search to guesswork over a dozen composed opcodes. This runs every prefix of
the program — one opcode, then two, then three — through the original and writes
each surface as float32, so the JS side can compare prefix by prefix and name the
first one that differs. Floats rather than bytes, because a difference that has
not yet crossed a rounding boundary is invisible in the texture and still wrong.

Writes <out>/<name>_<k>.json for each prefix; texbisect.mjs reads them back.
"""
import json
import os
import struct
import sys

import ppcrun as H
import texfloat
import texopref
from texopsuite import decode


def prefix_blob(ops, k):
    body = b''.join(bytes([op]) + bytes(operands) for op, operands in ops[:k])
    return struct.pack('>H', len(body)) + body


def main():
    flat, dataset, name = sys.argv[1], sys.argv[2], sys.argv[3]
    out = sys.argv[4] if len(sys.argv) > 4 else 'texbisect'
    os.makedirs(out, exist_ok=True)
    progs = {f"{p['part']}_{p['index']}": p
             for p in json.load(open(f'{dataset}/tex_programs.json'))['programs']}
    ops = decode(bytes.fromhex(progs[name]['hex']))

    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    H.preload_tables(d0)
    addr = texfloat.surface_ptr(d0, 'current')
    index = []
    for k in range(1, len(ops) + 1):
        H.PRELOAD[texopref.PROG_AT] = prefix_blob(ops, k)
        raw, err = H.run(flat, H.sym(flat)['_generate'],
                         {3: texopref.PROG_AT, 4: H.DEST},
                         out_addr=addr, out_len=128 * 128 * 16)
        if len(raw) != 128 * 128 * 16:
            raise SystemExit(f'texbisect: prefix {k}: {err[:200]}')
        vals = struct.unpack('>65536f', raw)
        json.dump({'floats': list(vals)}, open(f'{out}/{name}_{k}.json', 'w'))
        op, operands = ops[k - 1]
        index.append({'k': k, 'op': op, 'operands': operands,
                      'file': f'{name}_{k}.json'})
        print(f'{k:2}  op{op if op < 20 else hex(op)}  {len(operands)} operands')

    json.dump({'program': name,
               'ops': [{'op': o, 'operands': v} for o, v in ops],
               'prefixes': index}, open(f'{out}/{name}.json', 'w'), indent=2)
    print(f'\nwrote {len(index)} prefixes to {out}/')


if __name__ == '__main__':
    main()
