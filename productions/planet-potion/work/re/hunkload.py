#!/usr/bin/env python3
"""Parse the Planet Potion AmigaOS Hunk executable, lay its segments out at
fixed bases, apply HUNK_RELOC32, and emit a flat image plus a symbol table.

    python3 hunkload.py planet-potion_dcr.exe out/

Why a bespoke loader rather than a stock Hunk importer: this file uses the
0xC0000000 "memory flags follow" encoding in the header size table for all seven
hunks, which amitools' hunktool rejects outright ("Invalid hunk type 141/8d").
It is 120 lines to do it correctly and you get exactly the layout you want to
hand Ghidra.

The decrunched executable still carries its HUNK_SYMBOL table — 327 entries,
38 of them naming functions — which is what makes this production tractable.
"""
import struct, os, sys

HUNK_CODE, HUNK_DATA, HUNK_BSS = 0x3E9, 0x3EA, 0x3EB
HUNK_RELOC32, HUNK_SYMBOL, HUNK_END = 0x3EC, 0x3F0, 0x3F2
HUNK_HEADER, HUNK_DREL32 = 0x3F3, 0x3F7
NAMES = {HUNK_CODE: 'CODE', HUNK_DATA: 'DATA', HUNK_BSS: 'BSS'}

# Segment n is placed at BASE + n * STRIDE, rounded up to STRIDE. Chosen so the
# small-data base (seg0 + 0x7FFE) and every reloc target land somewhere
# memorable, and so nothing collides with the harness scratch at 0x20000000.
BASE, STRIDE = 0x10000000, 0x10000


def load(path):
    D = open(path, 'rb').read()
    p = 0

    def u32():
        nonlocal p
        v = struct.unpack_from('>I', D, p)[0]
        p += 4
        return v

    if u32() != HUNK_HEADER:
        raise SystemExit(f'{path}: not a HUNK_HEADER file')
    while True:                                   # resident library names
        n = u32()
        if n == 0:
            break
        p += n * 4
    table_size, first, last = u32(), u32(), u32()
    sizes = []
    for _ in range(last - first + 1):
        s = u32()
        if (s & 0xC0000000) == 0xC0000000:        # memory flags in the next long
            u32()
        sizes.append(s & 0x3FFFFFFF)

    segs, syms, hi = [], [], 0
    while p < len(D) and hi < len(sizes):
        t = u32() & 0x3FFFFFFF
        if t in (HUNK_CODE, HUNK_DATA):
            n = u32(); data = bytearray(D[p:p + n * 4]); p += n * 4
        elif t == HUNK_BSS:
            n = u32(); data = bytearray(n * 4)
        else:
            raise SystemExit(f'unexpected hunk 0x{t:x} at {p - 4:#x}')
        relocs = []
        while True:
            t2 = u32() & 0x3FFFFFFF
            if t2 == HUNK_END:
                break
            if t2 in (HUNK_RELOC32, HUNK_DREL32):
                while True:
                    cnt = u32()
                    if cnt == 0:
                        break
                    tgt = u32()
                    relocs += [(u32(), tgt) for _ in range(cnt)]
            elif t2 == HUNK_SYMBOL:
                while True:
                    ln = u32()
                    if ln == 0:
                        break
                    nm = D[p:p + ln * 4].rstrip(b'\0').decode('latin1'); p += ln * 4
                    syms.append((hi, u32(), nm))
            else:
                raise SystemExit(f'unhandled sub-hunk 0x{t2:x} at {p - 4:#x}')
        segs.append({'i': hi, 'type': t, 'data': data, 'relocs': relocs})
        hi += 1
    return segs, syms


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    segs, syms = load(src)

    bases, cur = [], BASE
    for s in segs:
        bases.append(cur)
        cur = (cur + max(len(s['data']), 1) + STRIDE - 1) & ~(STRIDE - 1)

    n = 0
    for s in segs:
        for off, tgt in s['relocs']:
            v = struct.unpack_from('>I', s['data'], off)[0]
            struct.pack_into('>I', s['data'], off, (v + bases[tgt]) & 0xFFFFFFFF)
            n += 1

    for s, b in zip(segs, bases):
        kind = NAMES[s['type']]
        print(f"  seg{s['i']} {kind:4} @ {b:#010x} size {len(s['data']):#9x} "
              f"relocs {len(s['relocs']):5d}")
        if s['type'] != HUNK_BSS:
            open(f"{out}/seg{s['i']}_{kind}_{b:08x}.bin", 'wb').write(bytes(s['data']))
    print(f'  applied {n} reloc32 fixups; {len(syms)} symbols')

    with open(f'{out}/symbols.csv', 'w') as f:
        for hi_, off, nm in sorted(syms, key=lambda x: (x[0], x[1])):
            f.write(f'0x{bases[hi_] + off:08x},{nm}\n')
    with open(f'{out}/layout.txt', 'w') as f:
        for s, b in zip(segs, bases):
            f.write(f"seg{s['i']},{NAMES[s['type']]},0x{b:08x},0x{len(s['data']):x}\n")


if __name__ == '__main__':
    main()
