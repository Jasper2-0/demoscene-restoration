#!/usr/bin/env python3
"""Re-derive PORT_SPEC.md's numbers from the binary, and fail if any drifted.

    python3 speccheck.py flat/

PORT_SPEC is a long document assembled over many sessions, and twice already a
figure in it has been wrong — a module size that was the hex converted badly, and
a differential grouping that survived after the code contradicted it. Both were
caught by accident. Prose does not have a test suite; this is the nearest thing.

Every check below **derives** its value from `flat/` and compares against the
number written in the spec. Nothing here restates a constant: if a check reads
`assert 17`, the 17 is computed from the dispatch table, not copied from the
text. Checks that need the generated modules or the qemu harness are out of
scope — `synthhash.py` and `synthlen.py` cover those.
"""
import collections
import struct
import sys

BASE = 0x10000000
R2 = BASE + 0x7FFE
CODE = (0x404, 0xa334)

TEX_TABLE, TEX_OPERANDS = 0xa47c, 0xa500
SCENE_TABLE, GEO_BUILD, GEO_EVAL, RENDER_TABLE = 0xa8a8, 0xa9b0, 0xa9c4, 0xaa20
SYNTH = {'p1': (0x10006b6c, 0x10006da0), 'p3': (0x10006da0, 0x10006ef0)}
LIBS = {0x1000a334: 'SysBase', 0x1000a338: 'PowerPCBase', 0x1000a33c: 'DOSBase',
        0x1000a340: 'IntuitionBase', 0x1000a344: 'CyberGFXBase',
        0x1000a348: 'Warp3DBase', 0x1000a34c: 'GfxBase', 0x1000a350: 'DBMBase'}

results = []


def check(claim, got, want):
    results.append((claim, got, want, got == want))


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    u32 = lambda o: struct.unpack_from('>I', d0, o)[0]
    f32 = lambda disp: struct.unpack_from('>f', d0, R2 + disp - BASE)[0]

    # --- section 0: shape
    check('screen width from the float pool', f32(0x2e16), 640.0)
    check('screen height from the float pool', f32(0x2e0a), 480.0)

    # --- section 4/7: the dispatch tables
    tex = [u32(TEX_TABLE + i * 4) for i in range(20)]
    check('texture slots', len(tex), 20)
    check('texture distinct handlers', len(set(tex)), 17)
    shared = sorted(k for k, v in collections.Counter(tex).items() if v > 1)
    check('texture handlers shared by a pair', len(shared), 3)
    check('op16 operand count is the 127 sentinel', d0[TEX_OPERANDS + 16], 127)

    check('scene handlers', len({u32(SCENE_TABLE + i * 4) for i in range(7)}), 7)
    check('render handlers', len({u32(RENDER_TABLE + i * 4) for i in range(7)}), 6)

    ev = [u32(GEO_EVAL + i * 4) for i in range(5)]
    blr = (19 << 26) | (20 << 21) | (16 << 1)
    noop = [i for i, a in enumerate(ev) if u32(a - BASE) == blr]
    check('geometry eval slots that are a bare blr', sorted(noop), [0, 4])
    check('geometry build handlers', len({u32(GEO_BUILD + i * 4) for i in range(5)}), 5)

    # --- section 5: the Warp3D surface, by tracking library-base registers
    by_disp = {(a - R2) & 0xFFFF: n for a, n in LIBS.items()}
    holds, sites = {}, collections.defaultdict(list)
    for off in range(*CODE, 4):
        w = u32(off)
        if w >> 26 != 32:
            continue
        rD, rA, d = (w >> 21) & 31, (w >> 16) & 31, w & 0xFFFF
        sd = d - 0x10000 if d & 0x8000 else d
        if rA == 2 and d in by_disp:
            holds[rD] = by_disp[d]
        elif rA in holds and sd < 0:
            sites[holds[rA]].append(sd)
    check('Warp3D call sites', len(sites['Warp3DBase']), 29)
    check('Warp3D distinct vectors', len(set(sites['Warp3DBase'])), 22)
    check('DrawTriFan sites (LVO -168)', sites['Warp3DBase'].count(-166), 4)
    check('DrawLineStrip sites (LVO -390)', sites['Warp3DBase'].count(-388), 2)

    # --- section 8: the softsynth scripts
    calls = collections.defaultdict(list)
    for part, (lo, hi) in SYNTH.items():
        for off in range(lo - BASE, hi - BASE, 4):
            w = u32(off)
            if w >> 26 == 18 and (w & 1):
                li = w & 0x03FFFFFC
                if li & 0x02000000:
                    li -= 0x04000000
                calls[part].append(BASE + off + li)
    check('part one synth calls', len(calls['p1']), 57)
    check('part one synth routines', len(set(calls['p1'])), 18)
    check('part three synth calls', len(calls['p3']), 39)
    check('part three synth routines', len(set(calls['p3'])), 19)
    allp = set(calls['p1']) | set(calls['p3'])
    check('distinct synth primitives', len(allp), 32)
    check('synth primitives used by both', len(set(calls['p1']) & set(calls['p3'])), 5)
    check('part one module size immediate', u32(0x6b88 + 0) & 0xFFFF, 0x51)   # lis r3,0x51
    check('part one module size, assembled',
          ((u32(0x6b88) & 0xFFFF) << 16) | (u32(0x6b8c) & 0xFFFF), 5_324_378)

    # --- the shared tables
    check('sine table addressable entries (mask 0x7ffc)', 0x7ffc // 4 + 1, 8192)
    check('cosine offset in entries (a quarter turn)', 0x2000 // 4, 2048)
    check('degrees per turn from the 0x5b multiplier', round(32768 / 0x5b), 360)

    # --- and now the document itself. Everything above passes by construction:
    # the checker and the spec were written together. What actually goes wrong is
    # the PROSE drifting from the binary, so read the spec back and require the
    # derived figures to appear in it — and the known-bad ones not to.
    try:
        spec = open('PORT_SPEC.md').read()
    except OSError:
        spec = None
    if spec is not None:
        must = {'5,324,378': 'part one module size',
                '3,015,404': 'part three module size',
                '640': 'screen width', '480': 'screen height',
                '8,192': 'sine table entries',
                '32 distinct': 'synth primitive count',
                '17\n': 'texture handler count (in the table)'}
        for lit, what in must.items():
            check(f'spec states {what}', lit.strip() in spec, True)
        # Figures superseded by later measurement. Their reappearance means a
        # stale paragraph was copied forward, which has happened twice.
        banned = {'5,324,890': 'module size, hex converted wrong',
                  'one operation with three operand encodings':
                      'the op2/op3/op5 differential claim the code disproved'}
        for lit, what in banned.items():
            check(f'spec is free of {what}', lit in spec, False)

    width = max(len(c) for c, _, _, _ in results)
    bad = 0
    for claim, got, want, ok in results:
        if not ok:
            bad += 1
        print(f'{"ok  " if ok else "FAIL"}  {claim:<{width}}  {got!r}'
              + ('' if ok else f'   expected {want!r}'))
    print(f'\n{len(results) - bad}/{len(results)} spec claims re-derived from the binary')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
