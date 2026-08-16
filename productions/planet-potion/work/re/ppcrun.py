#!/usr/bin/env python3
"""Run Planet Potion's pure PowerPC subsystems under qemu-ppc, with no Amiga.

THE POINT OF THIS FILE.  Taking each subsystem's transitive call closure and
asking whether it touches a library base or `_run68k`:

    textures  (_generate)          23 functions, no libraries   -> pure
    scenes    (_generate_scene)    13 functions, no libraries   -> pure
    audio     (_generate_samples_*) 38 functions, no libraries  -> pure
    geometry  (_generate_obj)      26 functions, _Warp3DBase x16
    renderer  (_show_scene)        14 functions, _Warp3DBase x1

Three of the five are pure functions over memory. They need no Kickstart, no
AmigaOS, no CyberStorm PPC ROM, no Warp3D and no emulator acquisition of any
kind — only a PowerPC CPU. So we hand-build a static big-endian PPC Linux ELF
that maps the seven hunks at their linked addresses, sets r2 to the small-data
base, calls one function through CTR, and writes its output buffer to stdout
with write(2).

Hand-building the ELF avoids needing a PPC cross-toolchain: the whole thing is
an ELF header, eight program headers, and a twenty-instruction stub encoded by
hand below.

    python3 ppcrun.py flat/            # renders texture program 0 as a smoke test

Requires: qemu-user-static (provides /usr/bin/qemu-ppc-static).
"""
import struct, os, subprocess, sys

R2_BIAS = 0x7FFE          # the 68K stub's LEA $7FFE,A4 — see NOTES.md
SCRATCH, SCRATCH_SZ = 0x20000000, 0x00400000
STACK, DEST = 0x20200000, 0x20300000
QEMU = '/usr/bin/qemu-ppc-static'

# --- the handful of PPC forms the stub needs
def lis(d, v):      return (15 << 26) | (d << 21) | (v & 0xFFFF)
def ori(a, s, v):   return (24 << 26) | (s << 21) | (a << 16) | (v & 0xFFFF)
def li(d, v):       return (14 << 26) | (d << 21) | (v & 0xFFFF)
def sc():           return (17 << 26) | 2
def mtctr(s):       return (31 << 26) | (s << 21) | (9 << 16) | (467 << 1)
def bctrl():        return (19 << 26) | (20 << 21) | (528 << 1) | 1
def load32(r, v):   return [lis(r, v >> 16), ori(r, r, v & 0xFFFF)]
# A relative bl reaches only +-32 MB; the hunks are at 0x10000000 and the stub at
# 0x20000000, so calls have to go through CTR.
def call32(r, t):   return load32(r, t) + [mtctr(r), bctrl()]


def read_layout(flat):
    segs = []
    for line in open(os.path.join(flat, 'layout.txt')):
        name, kind, base, size = line.strip().split(',')
        fn = None
        if kind != 'BSS':
            fn = next(f for f in os.listdir(flat) if f.startswith(name + '_'))
        segs.append((int(base, 16), int(size, 16), fn))
    return segs


def build(flat, target, regs, out_addr, out_len, path):
    segs = read_layout(flat)
    r2 = segs[0][0] + R2_BIAS
    code = []
    code += load32(1, STACK)
    code += load32(2, r2)
    code += load32(13, STACK - 0x1000)
    for r, v in sorted(regs.items()):
        code += load32(r, v)
    code += call32(12, target)
    code += load32(4, out_addr)
    code += load32(5, out_len)
    code += [li(0, 4), li(3, 1), sc()]        # write(1, out, len)
    code += [li(0, 1), li(3, 0), sc()]        # exit(0)
    stub = b''.join(struct.pack('>I', w) for w in code)

    pieces = [(va, (None if fn is None else open(os.path.join(flat, fn), 'rb').read()), sz)
              for va, sz, fn in segs]
    pieces.append((SCRATCH, stub, SCRATCH_SZ))

    EH, PH, ALIGN = 52, 32, 0x1000
    blob, loads = b'', []
    cur = EH + PH * len(pieces)
    for va, data, msz in pieces:
        if data is None:                       # BSS: memsz only, no file image
            loads.append((va, 0, msz, 0, 6))
            continue
        # p_offset must be congruent to p_vaddr modulo p_align
        blob += b'\0' * ((-(cur + len(blob))) % ALIGN)
        loads.append((va, len(data), max(msz, len(data)), cur + len(blob), 7))
        blob += data
    eh = (b'\x7fELF' + bytes([1, 2, 1, 0]) + b'\0' * 8 +
          struct.pack('>HHIIIIIHHHHHH', 2, 20, 1, SCRATCH, EH, 0, 0,
                      EH, PH, len(pieces), 0, 0, 0))
    phs = b''.join(struct.pack('>IIIIIIII', 1, off, va, va, fsz, msz, fl, ALIGN)
                   for va, fsz, msz, off, fl in loads)
    open(path, 'wb').write(eh + phs + blob)
    os.chmod(path, 0o755)


def run(flat, target, regs, out_addr=DEST, out_len=128 * 128 * 4,
        tmp='/tmp/pp-harness.elf', timeout=120):
    """Call `target` with `regs` preloaded; return (stdout bytes, stderr text)."""
    build(flat, target, regs, out_addr, out_len, tmp)
    p = subprocess.run([QEMU, tmp], capture_output=True, timeout=timeout)
    return p.stdout, p.stderr.decode('utf8', 'replace')


def sym(flat):
    return {n: int(a, 16) for a, n in
            (l.strip().split(',') for l in open(os.path.join(flat, 'symbols.csv')))}


if __name__ == '__main__':
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    d0 = open(os.path.join(flat, next(f for f in os.listdir(flat)
                                      if f.startswith('seg0_'))), 'rb').read()
    base = read_layout(flat)[0][0]
    r2 = base + R2_BIAS
    prog = struct.unpack_from('>I', d0, r2 + 0x2642 - base)[0]   # texture table[0]
    out, err = run(flat, sym(flat)['_generate'], {3: prog, 4: DEST})
    print(f'texture program {prog:#010x} -> {len(out)} bytes')
    if err.strip():
        print('stderr:', err.strip()[:400])
    if out:
        print('first pixels (ARGB):', ' '.join(out[i:i+4].hex() for i in range(0, 16, 4)))
