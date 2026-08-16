#!/usr/bin/env python3
"""Recover and verify the texture VM's 3x3 convolution family.

    python3 texconv.py flat/ [out/kernels.json]

Opcodes `0x50..0x78` all reach one handler at `0x10000f58`, which indexes a
runtime-built table by `opcode - 0x50` with stride 0x24 — nine floats, a 3x3
kernel. This tool dumps that table, decodes it, and then **checks the decoding by
running each opcode** and reproducing its output from the input surface.

The check is the point. Weights are stored with a signed-byte wrap (255.0 is -1),
the kernel is normalised by its sum with 0 meaning 1, addressing wraps on both
axes, the result is clamped to [0, 255], and alpha is not convolved. Get any of
those wrong and the reproduction fails loudly rather than approximately — running
it with source and destination swapped gives errors above 57.
"""
import json
import os
import struct
import subprocess
import sys

import ppcrun as H

BASE = 0x10000000
R2 = BASE + 0x7FFE
GENERATE, PROG = 0x10000404, 0x20340000
G_KERNELS, G_SRC, G_DST = 0x2462, 0x246a, 0x2466
LO, HI, INVERT = 0x50, 0x78, 0x55      # 0x55 is special-cased: max(255 - x, 0)
N = 128 * 128 * 4
STEP = 3                               # sample every 3rd pixel; 5,376 per opcode
NOISE = bytes([9]) + bytes([0x40]) * 12


def stw(s, a, d):
    return (36 << 26) | (s << 21) | (a << 16) | (d & 0xFFFF)


def run(flat, payload, dumps, timeout=90):
    """Render `payload` and dump each (addr, len) in order.

    Returns None if the run does not finish: some operand values send a texture
    opcode into a loop that does not terminate, and a caller probing the operand
    space needs that as an answer rather than an exception.
    """
    body = struct.pack('>H', len(payload)) + payload
    c = H.load32(1, H.STACK) + H.load32(2, R2) + H.load32(13, H.STACK - 0x1000)
    for i in range(0, len(body), 4):
        w = int.from_bytes(body[i:i + 4].ljust(4, b'\0'), 'big')
        c += H.load32(5, w) + H.load32(6, PROG + i) + [stw(5, 6, 0)]
    c += H.load32(3, PROG) + H.load32(4, H.DEST) + H.call32(12, GENERATE)
    for addr, n in dumps:
        c += H.load32(4, addr) + H.load32(5, n) + [H.li(0, 4), H.li(3, 1), H.sc()]
    c += [H.li(0, 1), H.li(3, 0), H.sc()]
    stub = b''.join(struct.pack('>I', w) for w in c)

    pieces = H.segments(flat)
    pieces.append((H.SCRATCH, stub, H.SCRATCH_SZ))
    EH, PH, AL = 52, 32, 0x1000
    blob, loads = b'', []
    cur = EH + PH * len(pieces)
    for va, data, msz in pieces:
        if data is None:
            loads.append((va, 0, msz, 0, 6)); continue
        blob += b'\0' * ((-(cur + len(blob))) % AL)
        loads.append((va, len(data), max(msz, len(data)), cur + len(blob), 7))
        blob += data
    eh = (b'\x7fELF' + bytes([1, 2, 1, 0]) + b'\0' * 8 +
          struct.pack('>HHIIIIIHHHHHH', 2, 20, 1, H.SCRATCH, EH, 0, 0, EH, PH,
                      len(pieces), 0, 0, 0))
    phs = b''.join(struct.pack('>IIIIIIII', 1, off, va, va, f, m, fl, AL)
                   for va, f, m, off, fl in loads)
    open('/tmp/pp-texconv.elf', 'wb').write(eh + phs + blob)
    os.chmod('/tmp/pp-texconv.elf', 0o755)
    try:
        out = subprocess.run([H.QEMU, '/tmp/pp-texconv.elf'],
                             capture_output=True, timeout=timeout).stdout
    except subprocess.TimeoutExpired:
        return None
    res, o = [], 0
    for _, n in dumps:
        res.append(out[o:o + n]); o += n
    return res


def decode(raw):
    """The nine stored floats, with the signed-byte wrap undone."""
    return [w - 256.0 if w >= 128.0 else w for w in struct.unpack('>9f', raw)]


def convolve(src, k):
    s = sum(k) or 1.0
    taps = [(dy, dx, k[i]) for i, (dy, dx) in
            enumerate((dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1))]
    out = {}
    for y in range(0, 128, STEP):
        for x in range(0, 128, STEP):
            for ch in (1, 2, 3):
                a = sum(w * src[(((y + dy) & 127) * 128 + ((x + dx) & 127)) * 4 + ch]
                        for dy, dx, w in taps if w)
                out[(y, x, ch)] = min(255.0, max(0.0, a / s))
    return out


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    dest = sys.argv[2] if len(sys.argv) > 2 else None
    H.FLAT = flat
    d0 = open(os.path.join(flat, 'seg0_CODE_10000000.bin'), 'rb').read()
    H.preload_tables(d0)

    def g(disp):
        return struct.unpack_from('>I', d0, R2 + disp - BASE)[0]

    ktab, src_a, dst_a = g(G_KERNELS), g(G_SRC), g(G_DST)
    ops = [o for o in range(LO, HI + 1) if o != INVERT]
    print(f'kernels at {ktab:#010x}, source {src_a:#010x}, destination {dst_a:#010x}')
    print(f'{len(ops)} convolution opcodes ({INVERT:#04x} is invert, not a kernel)\n')

    tab, base_src = run(flat, NOISE, [(ktab, len(ops) * 36), (src_a, N * 4)])
    src = struct.unpack(f'>{N}f', base_src)
    kernels, ok, bad = {}, 0, []
    for i, op in enumerate(ops):
        k = decode(tab[i * 36:(i + 1) * 36])
        kernels[hex(op)] = {'kernel': k, 'sum': sum(k)}
        want = convolve(src, k)
        got = struct.unpack(f'>{N}f', run(flat, NOISE + bytes([op]), [(dst_a, N * 4)])[0])
        worst = max(abs(v - got[(y * 128 + x) * 4 + ch])
                    for (y, x, ch), v in want.items())
        kernels[hex(op)]['maxError'] = round(worst, 6)
        if worst < 0.01:
            ok += 1
        else:
            bad.append((op, worst))
        print(f'  {op:#04x} sum {sum(k):6.1f}  {[int(w) for w in k]}  '
              f'max err {worst:.5f}{"" if worst < 0.01 else "   <-- MISMATCH"}')

    print(f'\n{ok}/{len(ops)} reproduced exactly'
          + (f'; mismatched: {[hex(o) for o, _ in bad]}' if bad else ''))
    if dest:
        json.dump({'note': '3x3 kernels for texture opcodes 0x50..0x78; 0x55 is '
                           'invert, max(255-x,0). Normalise by sum (0 means 1), '
                           'wrap both axes, clamp [0,255], leave alpha alone.',
                   'verified': f'{ok}/{len(ops)} reproduced from the source surface',
                   'kernels': kernels}, open(dest, 'w'), indent=2)
        print(f'wrote {dest}')


if __name__ == '__main__':
    main()
