#!/usr/bin/env python3
"""What sample does each softsynth primitive emit, and how long is it?

    python3 synthlen.py flat/ [part1.dbm]

Every voice starts a sample by setting `r19` (frames) and usually `r18` (frames
per step) and calling `0x1000a23c`. Both are immediates, so the length each
routine produces can be read out of all 32 primitives mechanically instead of
one at a time — and then checked against the module the generator actually
builds.

That check is the point. If a routine sets 50,400 and is called eight times, the
module should contain eight samples of 50,400 frames. Where the arithmetic is
ambiguous — two routines emitting the same length — this says so rather than
assigning the count to one of them.
"""
import collections
import struct
import sys

BASE = 0x10000000
START, EMPTY = 0x1000a23c, 0x10006f38
SCRIPTS = {'p1': (0x10006b6c, 0x10006da0), 'p3': (0x10006da0, 0x10006ef0)}
# Sorted primitive addresses bound each routine's extent; the last runs to the
# end of the PowerPC code.
CODE_END = 0xa334
# r19 set by the script instead of the routine — synthscript.py shows these.
CALLER_LENGTHS = (120_000, 150_000)
NO_SAMPLE = {0x10006ef0}                # the header writer emits no sample
COND_R8 = 0x10009510                    # length depends on r8; resolved by position


def imms(d0, lo, hi):
    """Track r18/r19 as immediates; return their values at each 0x1000a23c call.

    A linear scan cannot model a branch, and 0x10009510 has one: it loads 201,600
    then conditionally overwrites it with 100,800 depending on r8. So collect
    EVERY value r19 takes in the routine and report all of them, rather than
    silently keeping whichever the scan saw last.
    """
    regs, hits, seen19, tail = {}, [], [], None
    for off in range(lo - BASE, min(hi - BASE, CODE_END), 4):
        w = struct.unpack_from('>I', d0, off)[0]
        op, rD, rA, imm = w >> 26, (w >> 21) & 31, (w >> 16) & 31, w & 0xFFFF
        if op == 15:                                   # lis
            regs[rD] = imm << 16
        elif op == 24 and rD == rA and rD in regs:     # ori completing a lis
            regs[rD] |= imm
        elif op == 14 and rA == 0:                     # li
            regs[rD] = imm - 0x10000 if imm & 0x8000 else imm
        elif op == 18 and (w & 1):
            li = w & 0x03FFFFFC
            if li & 0x02000000:
                li -= 0x04000000
            if BASE + off + li == START:
                hits.append((BASE + off, regs.get(19), regs.get(18)))
        elif op == 18 and not (w & 1):                 # unconditional b
            li = w & 0x03FFFFFC
            if li & 0x02000000:
                li -= 0x04000000
            tail = BASE + off + li
        if op in (15, 24, 14) and rD == 19 and 19 in regs and regs[19] not in seen19:
            seen19.append(regs[19])
    return hits, seen19, tail, regs


def script_calls(d0):
    """(part, target, r8) per call. r8 persists until the script sets it again —
    0x10009510 reads it and the script only writes it when the mode changes."""
    seq = []
    for part, (lo, hi) in SCRIPTS.items():
        r8 = 0
        for off in range(lo - BASE, hi - BASE, 4):
            w = struct.unpack_from('>I', d0, off)[0]
            op, rD, rA, imm = w >> 26, (w >> 21) & 31, (w >> 16) & 31, w & 0xFFFF
            if op == 14 and rA == 0 and rD == 8:
                r8 = imm - 0x10000 if imm & 0x8000 else imm
            elif op == 18 and (w & 1):
                li = w & 0x03FFFFFC
                if li & 0x02000000:
                    li -= 0x04000000
                seq.append((part, BASE + off + li, r8))
    return seq


def lengths_from_module(path):
    raw = open(path, 'rb').read()
    o = raw.find(b'DBM0')
    p = o + 8
    while p < len(raw) - 8:
        cid, n = raw[p:p + 4], struct.unpack_from('>I', raw, p + 4)[0]
        if cid == b'SMPL':
            break
        p += 8 + n + (n & 1)
    q, end, out = p + 8, p + 8 + n, []
    while q <= end - 8:
        f, ln = struct.unpack_from('>II', raw, q)
        out.append(ln)
        q += 8 + ln * (1 if f == 1 else 0)
    return out


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    mod = sys.argv[2] if len(sys.argv) > 2 else None
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()

    calls = script_calls(d0)
    prims = sorted({t for _, t, _ in calls})
    bounds = {p: (prims[i + 1] if i + 1 < len(prims) else BASE + CODE_END)
              for i, p in enumerate(prims)}
    counts = collections.Counter((p, t) for p, t, _ in calls)

    rows = []
    for p in prims:
        hits, seen19, tail, regs = imms(d0, p, bounds[p])
        # ALTERNATE ENTRY POINTS. 0x10008adc and 0x10009a68 are six instructions
        # that set their own r18/r19 and then branch into the NEXT routine's
        # body, so they have no sample start of their own. Follow the branch,
        # carrying their registers, and the shared body supplies the rest.
        alt = ''
        if not hits and tail and tail > bounds[p]:
            nxt = next((b for b in prims if b > tail), BASE + CODE_END)
            h2, s2, _, _ = imms(d0, tail, nxt)
            if h2:
                hits = [(a, regs.get(19, r19), regs.get(18, r18))
                        for a, r19, r18 in h2]
                seen19 = seen19 or s2
                alt = f'alternate entry into {tail:#010x}; '
            elif regs.get(18):
                hits = [(tail, regs.get(19), regs.get(18))]
                alt = f'alternate entry into {tail:#010x}, length not an immediate; ' 
        n1, n3 = counts.get(('p1', p), 0), counts.get(('p3', p), 0)
        if p == EMPTY:
            rows.append((p, n1, n3, 0, None, 'empty sample (8 zero bytes)'))
            continue
        if not hits:
            rows.append((p, n1, n3, None, None, 'no sample start — length from the caller'))
            continue
        for _, r19, r18 in hits:
            steps = alt + (f'{r19 // r18} steps' if r19 and r18 and r19 % r18 == 0 else '')
            alts = [v for v in seen19 if v != r19 and v]
            if alts:
                steps += (' ' if steps else '') + \
                    'CONDITIONAL, also ' + ', '.join(f'{v:,}' for v in alts)
            rows.append((p, n1, n3, r19, r18, steps))

    print(f'{"primitive":12} {"p1":>3} {"p3":>3} {"frames":>9} {"step":>7}  note')
    for p, n1, n3, r19, r18, note in rows:
        f = '' if r19 is None else f'{r19:,}'
        st = '' if not r18 else f'{r18:,}'
        print(f'{p:#010x}  {n1:>3} {n3:>3} {f:>9} {st:>7}  {note}')

    if mod:
        # POSITIONAL CHECK. Samples are appended to r31 in script order, so the
        # Nth sample-producing call is the Nth sample. That attributes every
        # sample to a routine by name, which counting lengths cannot do: it
        # resolves 0x10009510's r8 branch and pins the routines whose length is
        # not an immediate, both of which the histogram leaves open.
        length_of = {}
        for p_, n1, _, r19, _, _ in rows:
            if r19 is not None:
                length_of.setdefault(p_, r19)
        actual = lengths_from_module(mod)
        seq, ok, bad = [], 0, []
        for part, tgt, r8 in calls:
            if part != 'p1':
                continue
            if tgt in NO_SAMPLE:
                continue
            want = length_of.get(tgt)
            if tgt == COND_R8:                     # 100,800 when r8 set, else 201,600
                want = 100_800 if r8 else 201_600
            seq.append((tgt, want))
        print(f'\npositional check: {len(seq)} sample-producing calls vs '
              f'{len(actual)} samples in the module')
        for i, ((tgt, want), got) in enumerate(zip(seq, actual)):
            if want is None or want == got:
                ok += 1
            else:
                bad.append((i, tgt, want, got))
        print(f'  {ok}/{min(len(seq), len(actual))} positions agree')
        for i, tgt, want, got in bad[:12]:
            print(f'    [{i:2}] {tgt:#010x} expected {want} got {got}')
        for i, (tgt, want) in enumerate(seq):
            if want is None and i < len(actual):
                print(f'  [{i:2}] {tgt:#010x} length was not an immediate '
                      f'-> the module says {actual[i]:,}')

        hist = collections.Counter(lengths_from_module(mod))
        print('\nagainst the module part one actually builds:')
        emitted = collections.defaultdict(int)
        for p, n1, _, r19, _, _ in rows:
            if n1 and r19 is not None:
                emitted[r19] += n1
        # Lengths the SCRIPT supplies rather than the routine: 0x10008c9c takes
        # r19 from its caller, so its two part-one calls are 120,000 and 150,000.
        for v in CALLER_LENGTHS:
            emitted[v] += 1
        for ln in sorted(set(hist) | set(emitted)):
            got, want = hist.get(ln, 0), emitted.get(ln, 0)
            mark = 'exact' if got == want and want else ('unclaimed' if not want else '')
            print(f'  {ln:>9,}  module {got:>3}   from scripts {want:>3}   {mark}')


if __name__ == '__main__':
    main()
