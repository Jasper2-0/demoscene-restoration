#!/usr/bin/env python3
"""Render every texture program in the intro to a PNG, via the qemu-ppc harness.

    python3 rendertex.py flat/ tex/
    python3 rendertex.py flat/ tex/ --raw out/    # + tex_p1.bin, tex_p3.bin

Both parts' texture tables are walked (48 programs for part one, 21 for part
three) and each is executed as a pure function: program in, 128x128 ARGB out.
Writes one PNG per texture plus a contact sheet.

The 128x128 size and the pixel format are not guesses. `_calculate_txt` builds a
Warp3D `W3D_AllocTexObj` tag list before each call — tags 0x80201000..0x80201003
carrying image pointer, format 6, width 128, height 128 — and hands `_generate`
the buffer that follows it.
"""
import struct, os, sys, zlib
import ppcrun as H

TS = 128


def png(path, w, h, argb):
    rows = b''
    for y in range(h):
        r = argb[y * w * 4:(y + 1) * w * 4]
        rows += b'\0' + bytes(b for i in range(0, len(r), 4)
                              for b in (r[i + 1], r[i + 2], r[i + 3]))
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n'
                           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(rows, 9))
                           + chunk(b'IEND', b''))


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    out = sys.argv[2] if len(sys.argv) > 2 else 'tex'
    os.makedirs(out, exist_ok=True)
    base = H.read_layout(flat)[0][0]
    r2 = base + H.R2_BIAS
    d0 = open(os.path.join(flat, next(f for f in os.listdir(flat)
                                      if f.startswith('seg0_'))), 'rb').read()
    gen = H.sym(flat)['_generate']

    def table(disp, n):
        return [struct.unpack_from('>I', d0, r2 + disp - base + i * 4)[0]
                for i in range(n)]

    # `--raw DIR` also writes the ARGB straight out, one blob per part on a
    # fixed 64 KB stride. The PNG drops the first channel, and that is the very
    # byte the geometry's displacement map reads — see `0x10003868` — so the
    # picture is not a substitute for the pixels.
    raw_dir = None
    if '--raw' in sys.argv:
        raw_dir = sys.argv[sys.argv.index('--raw') + 1]
        os.makedirs(raw_dir, exist_ok=True)

    jobs = [('p1', 0x2642, 48), ('p3', 0x27a6, 21)]
    images, ok = [], 0
    raws = {}
    for part, disp, n in jobs:
        blob = bytearray(n * TS * TS * 4)
        for i, prog in enumerate(table(disp, n)):
            data, err = H.run(flat, gen, {3: prog, 4: H.DEST}, out_len=TS * TS * 4)
            if len(data) != TS * TS * 4:
                print(f'  {part}[{i:02}] {prog:#x} FAILED {err.strip()[:80]}')
                continue
            png(f'{out}/{part}_{i:02d}.png', TS, TS, data)
            blob[i * TS * TS * 4:(i + 1) * TS * TS * 4] = data
            images.append(data)
            ok += 1
        raws[part] = bytes(blob)
        if raw_dir:
            open(f'{raw_dir}/tex_{part}.bin', 'wb').write(raws[part])
            print(f'  {part}: {n} textures, {len(raws[part])} bytes '
                  f'-> {raw_dir}/tex_{part}.bin')
    print(f'rendered {ok}/{sum(n for _, _, n in jobs)} textures into {out}/')

    COLS, GAP = 10, 2
    rows_n = (len(images) + COLS - 1) // COLS
    W, Hh = COLS * (TS + GAP) + GAP, rows_n * (TS + GAP) + GAP
    buf = bytearray(W * Hh * 3)
    for idx, data in enumerate(images):
        cx, cy = GAP + (idx % COLS) * (TS + GAP), GAP + (idx // COLS) * (TS + GAP)
        for y in range(TS):
            o = (cy + y) * W * 3 + cx * 3
            r = data[y * TS * 4:(y + 1) * TS * 4]
            buf[o:o + TS * 3] = bytes(b for i in range(0, len(r), 4)
                                      for b in (r[i + 1], r[i + 2], r[i + 3]))
    raw = b''.join(b'\0' + bytes(buf[y * W * 3:(y + 1) * W * 3]) for y in range(Hh))
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    open(f'{out}/contact.png', 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', W, Hh, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    print(f'contact sheet {W}x{Hh} -> {out}/contact.png')


if __name__ == '__main__':
    main()
