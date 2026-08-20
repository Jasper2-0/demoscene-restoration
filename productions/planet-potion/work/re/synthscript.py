#!/usr/bin/env python3
"""Extract the softsynth's two scripts — the call sequence and its parameters.

    python3 synthscript.py flat/ [out/synth_script.json]

Neither generator is an interpreter. Each is a straight line of `bl`s, and the
instructions between one call and the next set up that call's arguments:

    addi r21, r2, 0x319a        <- parameter block
    li   r8, 1                  <- a mode flag
    bl   0x10009510             <- the primitive

So the script is recoverable without understanding a single primitive, and the
~37 KB of "seed data" is just the blocks those `addi`s point at. This walks both
generators, records each call with the register state established since the
previous one, and reports which primitives are shared between the parts.

What it deliberately does NOT do is guess what any primitive means. That needs
reading them, and this is the map you read them against.
"""
import collections
import json
import struct
import sys

BASE = 0x10000000
R2 = BASE + 0x7FFE
SCRIPTS = {'p1': (0x10006b6c, 0x10006da0), 'p3': (0x10006da0, 0x10006ef0)}


def walk(d0, lo, hi):
    """Yield (address, target, setup) per call; setup is regs set since the last."""
    regs, out = {}, []
    for off in range(lo - BASE, hi - BASE, 4):
        w = struct.unpack_from('>I', d0, off)[0]
        addr, op = BASE + off, w >> 26
        rD, rA, imm = (w >> 21) & 31, (w >> 16) & 31, w & 0xFFFF
        simm = imm - 0x10000 if imm & 0x8000 else imm
        if op == 18 and (w & 1):                       # bl
            li = w & 0x03FFFFFC
            if li & 0x02000000:
                li -= 0x04000000
            out.append((addr, BASE + off + li, dict(regs)))
            regs = {}
        elif op == 14 and rA == 2:                     # addi rD, r2, disp
            regs[f'r{rD}'] = f'r2+{simm:#06x}'
        elif op == 14 and rA == 0:                     # li rD, imm
            regs[f'r{rD}'] = simm
        elif op == 24 and rD == rA:                    # ori rD, rD, imm -> completes lis
            prev = regs.get(f'r{rD}')
            if isinstance(prev, int):
                regs[f'r{rD}'] = prev | imm
        elif op == 15:                                 # lis rD, imm
            regs[f'r{rD}'] = imm << 16
        elif op == 48 and rA == 2:                     # lfs fD, disp(r2)
            regs[f'f{rD}'] = f'r2+{simm:#06x}'
    return out


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    dest = sys.argv[2] if len(sys.argv) > 2 else None
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()

    scripts, seen = {}, collections.Counter()
    for part, (lo, hi) in SCRIPTS.items():
        calls = walk(d0, lo, hi)
        scripts[part] = [{'at': hex(a), 'call': hex(t),
                          'setup': {k: (v if isinstance(v, str) else hex(v))
                                    for k, v in s.items()}}
                         for a, t, s in calls]
        for _, t, _ in calls:
            seen[t] += 1
        print(f'\n=== {part}: {len(calls)} calls')
        for a, t, s in calls:
            args = ' '.join(f'{k}={v if isinstance(v, str) else hex(v)}'
                            for k, v in sorted(s.items()))
            print(f'  {a:#010x}  -> {t:#010x}  {args}')

    shared = {hex(t) for t in seen
              if any(t in {c for _, c, _ in walk(d0, *SCRIPTS[p])} for p in SCRIPTS)
              and all(t in {c for _, c, _ in walk(d0, *SCRIPTS[p])} for p in SCRIPTS)}
    print(f'\n{len(seen)} distinct primitives, {sum(seen.values())} calls, '
          f'{len(shared)} used by both parts')

    # Parameter blocks, in address order — this is the seed data's real shape.
    # Only the r2-relative ones; the rest of `setup` is small integer flags and
    # lengths, which hex() had already turned into strings.
    blocks = sorted({v for p in scripts.values() for c in p
                     for v in c['setup'].values() if v.startswith('r2+')})
    print(f'{len(blocks)} distinct parameter-block pointers: {" ".join(blocks)}')

    if dest:
        json.dump({'note': 'The generators are straight-line scripts; setup is the '
                           'register state established since the previous call. '
                           'r2+NNNN values are parameter-block pointers into the '
                           'seed data, not values.',
                   'scripts': scripts,
                   'shared': sorted(shared),
                   'blocks': blocks}, open(dest, 'w'), indent=2)
        print(f'wrote {dest}')


if __name__ == '__main__':
    main()
