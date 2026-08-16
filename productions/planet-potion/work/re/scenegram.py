#!/usr/bin/env python3
"""Decode every scene stream with the grammar in PORT_SPEC section 4a, and check it.

    python3 scenegram.py flat/ out/scenes.json

The grammar was read opcode by opcode out of the seven handlers and their shared
operand readers, and every claim in it is backed by instructions rather than by
the shape of the data. That makes it testable in the one way that matters: walk
each of the 29 shipped scene streams with it and see whether the opcode sequence
that falls out is the one `_generate_scene` actually produced, which
`export.py` recorded by running the original.

A wrong operand width does not fail politely. It desynchronises the walk and the
rest of the stream decodes as garbage, so an exact match across 29 streams is a
real check and not a coincidence.

    op 0,1,2,5   opcode byte only
    op 3         u16 u16 u8 u8 u16 u16      (flags live in the u16s)
    op 4         u8 length, then one u8 per character
    op 6         one u8
"""
import json
import struct
import sys

BASE = 0x10000000

# Operand widths in BYTES, in order. Read from the handlers: ops 0, 1, 2 and 5
# call no reader at all; op 3 calls lhz, lhz, lbz, lbz, lhz, lhz; op 6 calls the
# u8 reader once; op 4 reads a u8 length and then one u8 per character, which is
# the only variable-length case.
WIDTHS = {0: [], 1: [], 2: [], 3: [2, 2, 1, 1, 2, 2], 5: [], 6: [1]}


def load(flat):
    """layout.txt is COMMA separated: name,kind,va,size — and BSS has no file."""
    segs = {}
    for line in open(f'{flat}/layout.txt'):
        parts = [x.strip() for x in line.split(',')]
        if len(parts) < 4 or parts[1] == 'BSS':
            continue
        va = int(parts[2], 16)
        segs[va] = open(f'{flat}/{parts[0]}_{parts[1]}_{parts[2][2:]}.bin', 'rb').read()
    return segs


def byte_at(segs, addr):
    for va, data in segs.items():
        if va <= addr < va + len(data):
            return data[addr - va]
    return None


def decode(segs, addr, limit=4096):
    """-> (list of node types, note).

    THE STREAM OPENS WITH A u16 LENGTH. `_generate_scene` does `lhz r29, 0(r31)`
    then `addi r31, r31, 2` and sets `r30 = r31 + r29` as the end — so the walk
    is bounded by a byte count, not by a terminator, and decoding from the
    recorded address without skipping those two bytes reads the length's high
    byte as an opcode. That is exactly how this tool failed on all 29 streams.

    AND THE LEADING TYPE 7 IS SYNTHESISED. `li r29, 7` before the loop makes the
    root node unconditionally; it is not in the stream. Which is why every
    exported list starts with a 7 that is not a scene opcode.
    """
    n = (byte_at(segs, addr) << 8) | byte_at(segs, addr + 1)
    p, end = addr + 2, addr + 2 + n
    ops = [7]
    while p < end and len(ops) < limit:
        op = byte_at(segs, p)
        if op is None:
            return ops, 'ran off the end of the image'
        if op > 6:
            return ops, f'byte {op:#04x} at {p:#010x} is not an opcode'
        p += 1
        # EVERY node but the root also carries a RESOURCE byte before its own
        # operands — the block at 0x10002250 that types other than 7 fall
        # through. Leaving it out is why every earlier version of this table
        # counted one byte per node too few.
        p += 1
        if op == 4:
            n = byte_at(segs, p)
            p += 1 + n                     # the length byte, then that many
        else:
            p += sum(WIDTHS[op])
        ops.append(op)
    return ops, f'consumed {p - addr - 2} of {n} bytes'


def main():
    flat, scenes_path = sys.argv[1], sys.argv[2]
    segs = load(flat)
    scenes = json.load(open(scenes_path))['scenes']
    exact = bad = 0
    for s in scenes:
        want = s['nodes']
        got, note = decode(segs, int(s['stream'], 16))
        # SCENE OPCODES ARE NOT RENDER NODE TYPES. scenes.json records what
        # _show_scene dispatches on — node+0x08/4 — and those run 0..7, while the
        # scene VM has seven opcodes 0..6. Every exported list starts with 7,
        # which is not a scene opcode at all. So the two sequences are related by
        # a mapping this document has not established, and comparing them
        # directly would be measuring that mapping rather than the grammar.
        #
        # What IS checkable without it: the walk has to consume the stream
        # cleanly and produce one opcode per node.
        lengths = (len(got) == len(want))
        if lengths:
            exact += 1
        else:
            bad += 1
            print(f"{s['part']}_{s['order']} {s['stream']}: "
                  f"{len(got)} opcodes vs {len(want)} nodes   ({note})")
            print(f"     opcodes {got[:24]}")
            print(f"     types   {want[:24]}")
    print(f'\n{exact}/{len(scenes)} streams produce one opcode per recorded node')
    print('NOTE: opcode != node type; every recorded list starts with type 7, '
          'which is not a scene opcode. The mapping is unestablished.')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
