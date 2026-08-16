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


# --- running a PATCHED copy, which is a different claim than running the program
#
# Nothing here rewrites the original file. PATCHES is applied to the in-memory
# segment image the harness maps, so a run either uses it or does not, and which
# one produced a result is a property of the run rather than of the archive.
# Anything recorded from a patched run has to say so.
PATCHES = {}                       # virtual address -> replacement instruction

GLYPH_SCAN = 0x10002e78            # cmpwi rA, 0xff — see NOTES.md


def fix_glyph_scan(d0, base=0x10000000):
    """The one bug in the original that stops the harness cold.

    Scene handler [4]'s glyph lookup reads a table entry into r10, compares it
    against the sought character in r26 — and then tests **r26** against the
    table's 0xFF sentinel for its loop exit. So a character outside the shipped
    40 scans forever. Swapping the compare's rA field from r26 to r10 is a
    one-word change and makes the loop terminate as it was meant to.

    It never bites in the demo, whose text stays inside the 40 glyphs. It bites
    the harness because the harness runs scenes out of their normal order.
    """
    w = struct.unpack_from('>I', d0, GLYPH_SCAN - base)[0]
    PATCHES[GLYPH_SCAN] = (w & ~(31 << 16)) | (10 << 16)
    return PATCHES[GLYPH_SCAN]


# --- the four lookup tables, which the 68K bootstrap builds and we do not run
#
# seg 5 is BSS, so it maps as zeros — and nothing in the PowerPC code writes it.
# The 68K stub fills it with the FPU before handing over (`fsin`, `fatan`,
# `ftwotox`, `fetox`), which is why a PowerPC-only harness silently runs with
# sin = cos = 0 and any rotating node collapses to a point.
#
# The formulas are read from the bootstrap, not assumed, down to the exact
# single-precision constants it loads. The four sizes add to 505,056 bytes
# against seg 5's 513,248, and _mexp ends at 0x100cd4e0 which is seg 5's last
# byte — so this IS what that segment is for.
PRELOAD = {}                       # virtual address -> bytes, laid into BSS

F32 = {'pi': 0x40490FDA, 'e-4': 0x38D1B717, 'e-3': 0x3A83126E}


def _f32(bits):
    return struct.unpack('>f', struct.pack('>I', bits))[0]


def build_tables(d0, base=0x10000000):
    """-> {va: bytes} for _sinus, _atan, _power, _mexp.

    _sinus is 10,240 entries stepping by float32(pi)/4096 — 8,192 for a full
    turn plus 2,048 more, which is exactly why cosine can be the same table read
    0x2000 bytes along.
    """
    import math
    r2 = base + R2_BIAS

    def ptr(disp):
        return struct.unpack_from('>I', d0, r2 + disp - base)[0]

    def ramp(start, step, n, fn):
        out, x = bytearray(), start
        for _ in range(n):
            out += struct.pack('>f', fn(x))
            x += step
        return bytes(out)

    return {
        ptr(0x2382): ramp(0.0, _f32(F32['pi']) / 4096.0, 10240, math.sin),
        ptr(0x2386): b''.join(struct.pack('>f', math.atan(i / 1024.0))
                              for i in range(1024)),
        ptr(0x238a): ramp(-1.0, _f32(F32['e-4']), 100000, lambda x: 2.0 ** x),
        ptr(0x238e): ramp(0.0, _f32(F32['e-3']), 15000, math.exp),
    }


def preload_tables(d0, base=0x10000000):
    PRELOAD.update(build_tables(d0, base))
    return {hex(a): len(b) for a, b in PRELOAD.items()}


def load_seg(flat, fn, va):
    """Read a segment image, applying any PATCHES that land inside it."""
    d = bytearray(open(os.path.join(flat, fn), 'rb').read())
    for a, w in PATCHES.items():
        if va <= a < va + len(d) - 3:
            struct.pack_into('>I', d, a - va, w)
    return bytes(d)


def segments(flat):
    """-> [(va, file image or None, memsz)] with PATCHES and PRELOAD applied.

    A BSS segment normally has no file image. If PRELOAD puts anything inside
    one, it gets an image long enough to carry it and the rest stays zero-fill.
    """
    out = []
    for va, size, fn in read_layout(flat):
        if fn is not None:
            out.append((va, load_seg(flat, fn, va), size))
            continue
        inside = {a: b for a, b in PRELOAD.items() if va <= a < va + size}
        if not inside:
            out.append((va, None, size))
            continue
        need = max(a + len(b) for a, b in inside.items()) - va
        img = bytearray(need)
        for a, b in inside.items():
            img[a - va:a - va + len(b)] = b
        out.append((va, bytes(img), size))
    return out


# The shared "the original is not unpacked here" exit, so every tool that reads
# the layout reports it the same way instead of raising from inside a helper.
ABSENT = 77


def read_layout(flat):
    segs = []
    try:
        lines = open(os.path.join(flat, 'layout.txt')).readlines()
    except FileNotFoundError:
        print(f'{os.path.basename(sys.argv[0]) or "ppcrun"}: no layout.txt under '
              f'{flat!r} — see speccheck.py for the rehydration steps.',
              file=sys.stderr)
        raise SystemExit(ABSENT)
    for line in lines:
        name, kind, base, size = line.strip().split(',')
        fn = None
        if kind != 'BSS':
            fn = next(f for f in os.listdir(flat) if f.startswith(name + '_'))
        segs.append((int(base, 16), int(size, 16), fn))
    return segs


def build(flat, target, regs, out_addr, out_len, path):
    segs = segments(flat)
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

    pieces = list(segs)
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
    # read_layout carries the shared message, so ask it first rather than
    # letting os.listdir raise on the directory itself.
    read_layout(flat)
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
