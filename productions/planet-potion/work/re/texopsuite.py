#!/usr/bin/env python3
"""Build a per-opcode reference suite: one real operand set per opcode.

    python3 texopsuite.py flat/ out/tex_programs.json out/opsuite/

The whole-program diff cannot isolate an opcode, and worse, it cannot see one at
all when a later opcode overwrites the surface — `op9` was wrong in three ways
while every program using it still matched, because they end in `op17`.

So: pull the first real occurrence of each opcode out of the shipped programs,
run it alone through the intro's own `_generate`, and keep the surface. That
gives every opcode an oracle with operands it is actually used with, rather than
ones invented to be convenient.

Slow — one qemu run per opcode — so it writes a directory and the JS side reads
it back without re-running anything.
"""
import json
import os
import sys

import texopref

WIDTHS = [3, 20, 13, 12, 1, 10, 12, 9, 18, 12, 1, 1, 1, 1, 1, 1, 127, 3, 4, 0]


def decode(blob):
    n = int.from_bytes(blob[:2], 'big') & 0x7FFF
    i, end, out = 2, 2 + n, []
    while i <= end - 1:
        op = blob[i]
        i += 1
        w = 0 if 0x50 <= op <= 0x78 else (1 if WIDTHS[op] == 0x7F else WIDTHS[op])
        out.append((op, list(blob[i:i + w])))
        i += w
    return out


# Running an opcode alone on a zeroed surface makes most of them produce a
# uniform result — 27 of 30 came back with one distinct pixel. So each reference
# is really TWO instructions: op9 with a real operand set to lay down noise, then
# the opcode under test. The JS side runs the same pair, so the comparison stays
# exact while the input is non-trivial.
SEED_OP = 9
SEED_OPERANDS = [0, 0, 0, 0, 255, 255, 255, 255, 0, 63, 85, 19]


def build_pair(seed_op, seed_operands, op, operands):
    body = (bytes([seed_op]) + bytes(seed_operands)
            + bytes([op]) + bytes(operands))
    import struct
    return struct.pack('>H', len(body)) + body


def main():
    flat, progs_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    progs = json.load(open(progs_path))['programs']

    first = {}
    for p in progs:
        if not p.get('hex'):
            continue
        for op, operands in decode(bytes.fromhex(p['hex'])):
            first.setdefault(op, (operands, f"{p['part']}_{p['index']}"))

    index = {}
    for op in sorted(first):
        operands, src = first[op]
        try:
            import ppcrun as H
            d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
            H.preload_tables(d0)
            H.PRELOAD[texopref.PROG_AT] = build_pair(
                SEED_OP, SEED_OPERANDS, op, operands)
            argb, err = H.run(flat, H.sym(flat)['_generate'],
                              {3: texopref.PROG_AT, 4: texopref.DEST},
                              out_addr=texopref.DEST, out_len=128 * 128 * 4)
            if len(argb) != 128 * 128 * 4:
                raise SystemExit(err[:120])
        except SystemExit as e:
            print(f'op{op}: SKIPPED — {e}')
            continue
        name = f'op{op}.json'
        json.dump({'op': op, 'operands': operands, 'from': src,
                   'seed': {'op': SEED_OP, 'operands': SEED_OPERANDS},
                   'argb': list(argb)}, open(f'{out}/{name}', 'w'))
        uniq = len({argb[i:i + 4] for i in range(0, len(argb), 4)})
        index[op] = {'file': name, 'operands': operands, 'from': src,
                     'distinctPixels': uniq}
        print(f'op{op:<3} from {src:<7} {len(operands):2} operands  '
              f'{uniq:5} distinct pixels')

    json.dump({'note': 'one real operand set per opcode, rendered by the '
                       "intro's own _generate under qemu",
               'ops': index}, open(f'{out}/index.json', 'w'), indent=2)
    print(f'\nwrote {len(index)} opcode references to {out}/')


if __name__ == '__main__':
    main()
