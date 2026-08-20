#!/usr/bin/env python3
"""Render a SYNTHETIC one-opcode texture program with the original's own VM.

    python3 texopref.py flat/ out.json 9 0 0 0 0 255 255 255 255 0 63 85 19

The 69 shipped programs are the honest end-to-end test, but they compose a dozen
opcodes and a wrong answer says only "something in here". This builds a program
containing exactly one opcode with operands you choose, runs `_generate` under
the qemu harness, and writes the resulting 128x128 surface as JSON — a per-opcode
oracle the JS implementation can be diffed against directly.

The program format is the one `_generate` parses: `u16 length` then the opcode
byte followed by its operands (see PORT_SPEC section 7). Nothing here interprets
the opcode; the original does that.
"""
import json
import struct
import sys

import ppcrun as H

# A free gap in seg5 BSS: the four lookup tables occupy 0x10050000..0x1005a000
# and 0x1005c000..0x100cd4a0, leaving 8 KB between them. PRELOAD lays bytes into
# BSS, which is how the tables get there, so the program can ride the same path.
PROG_AT = 0x1005a000
DEST = H.DEST


def build_program(op, operands):
    body = bytes([op]) + bytes(operands)
    return struct.pack('>H', len(body)) + body


def render(flat, op, operands):
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    H.preload_tables(d0)
    blob = build_program(op, operands)
    # Place the program in scratch and point _generate at it: r3 = program,
    # r4 = destination, exactly as _calculate_txt calls it.
    H.PRELOAD[PROG_AT] = blob
    out, err = H.run(flat, H.sym(flat)['_generate'], {3: PROG_AT, 4: DEST},
                     out_addr=DEST, out_len=128 * 128 * 4)
    if len(out) != 128 * 128 * 4:
        raise SystemExit(f'texopref: harness returned {len(out)} bytes: {err[:200]}')
    return out


def main():
    flat, dest = sys.argv[1], sys.argv[2]
    op = int(sys.argv[3])
    operands = [int(x) for x in sys.argv[4:]]
    argb = render(flat, op, operands)
    json.dump({'op': op, 'operands': operands,
               'note': 'ARGB bytes, 128x128, from the intro\'s own _generate',
               'argb': list(argb)}, open(dest, 'w'))
    uniq = len({argb[i:i + 4] for i in range(0, len(argb), 4)})
    print(f'op{op} {operands} -> {dest}  ({uniq} distinct pixels)')


if __name__ == '__main__':
    main()
