#!/usr/bin/env python3
"""What do `fres` and `frsqrte` actually return under this harness?

    python3 fpest.py flat/

The texture VM leans on both: `0x1000080c` is `fres(b - a)` and `0x1000093c`
computes a square root as `fres(frsqrte(x))`. On real hardware these are
low-precision estimates — the 601/604 guarantee about 1/4096 relative accuracy
and the exact bits are implementation-defined, so the intro's own output is
machine-dependent at that level. Under qemu they are deterministic, and the
references this port is diffed against came from qemu.

The remaining delta-1 residue in `op1`, `op2` and four convolution kernels could
be explained either by "the estimate is single-precision and JS is computing in
double" or by "something else entirely". That is decidable rather than
guessable: run the instructions on known inputs and read the result bits back.

This uploads a tiny hand-assembled routine that, for each input float, computes
`fres(x)`, `frsqrte(x)` and `fres(frsqrte(x))` and stores all three as f64, then
prints them beside what double-precision and single-rounded arithmetic give.

ONE HARNESS QUIRK, OBSERVED AND NOT EXPLAINED. Code preloaded into BSS runs, but
it must not come back with `blr`: an identical routine ending in `blr` spins on
its own entry address forever, while the same routine ending in `write`/`exit`
returns its bytes immediately. `mflr` at entry reads the correct return address
(`0x20000028`, the instruction after the stub's `bctrl`), so LR is right and the
branch still does not take it. So this probe does its own two syscalls and never
returns. Anything else that preloads code into BSS needs the same shape.
"""
import struct
import sys

import ppcrun as H

CODE_AT = 0x1005a000          # the same free BSS gap texopref.py uses
IN_AT = 0x1005a800
OUT_AT = 0x1005b000

INPUTS = [1.0, 2.0, 3.0, 0.5, 255.0, 1.5, 100.0, 16384.0,
          0.007843137718737125, 1e-3, 12345.0, 3.14159265]


def asm():
    """for i in 0..n-1: load f1 = in[i]; store fres, frsqrte, fres(frsqrte)."""
    def w(x):
        return struct.pack('>I', x)

    def lfs(d, a, o):    return (48 << 26) | (d << 21) | (a << 16) | (o & 0xFFFF)
    def stfd(s, a, o):   return (54 << 26) | (s << 21) | (a << 16) | (o & 0xFFFF)
    def fres(d, b):      return (59 << 26) | (d << 21) | (b << 11) | (24 << 1)
    def frsqrte(d, b):   return (63 << 26) | (d << 21) | (b << 11) | (26 << 1)
    def addi(d, a, v):   return (14 << 26) | (d << 21) | (a << 16) | (v & 0xFFFF)
    def cmpwi(a, v):     return (11 << 26) | (a << 16) | (v & 0xFFFF)
    def blt(off):        return (16 << 26) | (12 << 21) | (0 << 16) | (off & 0xFFFC)

    head = H.load32(3, IN_AT) + H.load32(4, OUT_AT) + [H.li(5, 0)]
    # r3 walks the inputs, r4 the outputs, r5 counts. f1 = x, f2 = fres(x),
    # f3 = frsqrte(x), f4 = fres(frsqrte(x)) — the chain 0x1000093c uses.
    loop = [lfs(1, 3, 0),
            fres(2, 1),
            frsqrte(3, 1),
            fres(4, 3),
            stfd(2, 4, 0), stfd(3, 4, 8), stfd(4, 4, 16),
            addi(3, 3, 4), addi(4, 4, 24), addi(5, 5, 1),
            cmpwi(5, len(INPUTS))]
    # The branch is the instruction after `loop`, so it sits len(loop) words past
    # the top and jumps back by exactly that many plus itself.
    loop.append(blt(-len(loop) * 4))
    # write(1, OUT_AT, 24 * n) then exit(0) — see the docstring on why this
    # cannot simply `blr` back into the harness stub.
    tail = (H.load32(4, OUT_AT) + H.load32(5, 24 * len(INPUTS))
            + [H.li(0, 4), H.li(3, 1), H.sc()]
            + [H.li(0, 1), H.li(3, 0), H.sc()])
    return b''.join(w(x) for x in head + loop + tail)


def main():
    flat = sys.argv[1]
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    H.preload_tables(d0)
    H.PRELOAD[CODE_AT] = asm()
    H.PRELOAD[IN_AT] = b''.join(struct.pack('>f', v) for v in INPUTS)
    out, err = H.run(flat, CODE_AT, {}, out_addr=OUT_AT, out_len=24 * len(INPUTS),
                     timeout=30)
    if len(out) != 24 * len(INPUTS):
        raise SystemExit(f'fpest: got {len(out)} bytes: {err[:300]}')

    import math
    print(f'{"x":>14}  {"instruction":<10} {"qemu result":>24}  verdict')
    for i, x in enumerate(INPUTS):
        xf = struct.unpack('>f', struct.pack('>f', x))[0]
        got = struct.unpack_from('>3d', out, i * 24)
        want = [1.0 / xf, 1.0 / math.sqrt(xf), math.sqrt(xf)]
        names = ['fres', 'frsqrte', 'fres(frsqrte)']
        for name, g, wv in zip(names, got, want):
            single = struct.unpack('>f', struct.pack('>f', wv))[0]
            tag = ('exact double' if g == wv else
                   'single-rounded' if g == single else
                   f'neither (rel {abs(g - wv) / abs(wv):.3e})')
            print(f'{xf:14.6g}  {name:<13} {g:>24.17g}  {tag}')
        print()


if __name__ == '__main__':
    main()
