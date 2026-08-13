#!/usr/bin/env python3
"""Scene-build oracle — the ORIGINAL's boot-time RNG trajectory, per scene.

Emulates the Landscape ctor (FUN_00408d72, fastcall) + build (FUN_004082a9,
thiscall(this, sceneIdx)) for scenes IN OBJECT ORDER from the image's initial
seed (1), exactly as the original's timeline init pass does — no port code
involved anywhere.  Boundary hooks record the LCG state at the decisive VAs,
which settles stream-position questions (the 512-draw gap / Codex H3: what IS
the true state entering the first-cluster yaw loop at 0x40b208 in scene 2?)
with proof-grade evidence: an LCG state has no near-misses.

The fake D3D layer makes the impostor bake render into zeroed memory — its
PIXELS are wrong, but its CPU-side stream draws (yaws, greys) are exactly the
original's, which is what this target measures.

  .venv/bin/python targets/scenebuild.py            # scenes 0 1 2
  .venv/bin/python targets/scenebuild.py 0 1 2 3 4  # more
"""

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from emu import SonnetEmu, INIT_VA, fixture_dir  # noqa: E402
import d3d8fake  # noqa: E402

CTOR_VA = 0x408d72     # __fastcall(this)
BUILD_VA = 0x4082a9    # __thiscall(this, sceneIdx)

BOUNDARIES = {
    0x409d45: 'buildTree.entry',
    0x40a183: 'buildTree.ret',        # the `ret 0x34` — seed is final here
    0x40abed: 'impostorBake.entry',
    0x40b0b0: 'buildBillboards.entry',
    0x40b208: 'yawLoop',              # per-instance billboard yaws — the H3 point
    0x40c721: 'buildDandelion.entry',
    0x40cfed: 'propUpdate.entry',
    0x40e923: 'shadowBake.entry',
    0x4078b6: 'scatter.entry',
    0x40c1b2: 'curtain.entry',      # array-B strand builder (2 rand01/column)
    0x40c5a7: 'curtainTex.loop',    # the per-column keep/start draws
}


SHADOW_DRAWS = 2 * 65536 * 16   # PINNED: 2 rand01 sites x 65536 texels x 16
                                # passes, unconditional (0x40ea0b / 0x40ea1c)


def lcg_advance(seed, n):
    for _ in range(n):
        seed = (seed * 214013 + 2531011) & 0xffffffff
    return seed


def main():
    scenes = [int(a) for a in sys.argv[1:]] or [0, 1, 2]
    emu = SonnetEmu(heap_mb=1024)
    d3d = d3d8fake.install(emu)
    emu.call(INIT_VA)

    hits = []
    from unicorn import UC_HOOK_CODE
    from unicorn.x86_const import UC_X86_REG_ECX

    def on_boundary(uc, address, size, user):
        hits.append({'va': hex(address), 'what': BOUNDARIES[address],
                     'seed': hex(emu.seed), 'writes': emu.rand_writes})
    for va in BOUNDARIES:
        emu.uc.hook_add(UC_HOOK_CODE, on_boundary, begin=va, end=va)

    # FAST-FORWARD THE SHADOW BAKE.  Its ~10^9-instruction ray march makes the
    # bake minutes each under TCG, and its only STREAM effect is exactly
    # SHADOW_DRAWS unconditional draws (pinned).  Patch the entry to its own
    # `ret 0xc` and advance the LCG in closed form; fill the shadow buffer
    # (this+0x24) with 0xff = the unshadowed limit, so downstream ground-bake
    # PIXELS are the no-shadow variant (irrelevant to the stream trace).
    # Caveat recorded in the fixture: a draw-count divergence inside the bake
    # would be masked here — the count is disassembly-pinned, and the boundary
    # seeds before/after still reconcile the totals.
    emu.write(0x40e923, b'\xc2\x0c\x00')

    def on_bake(uc, address, size, user):
        this = uc.reg_read(UC_X86_REG_ECX)
        buf = emu.u32(this + 0x24)
        if buf:
            emu.write(buf, b'\xff' * 0x10000)
        emu.seed = lcg_advance(emu.seed, SHADOW_DRAWS)
        hits.append({'va': hex(address), 'what': 'shadowBake.FASTFWD',
                     'seed': hex(emu.seed), 'writes': emu.rand_writes})
    emu.uc.hook_add(UC_HOOK_CODE, on_bake, begin=0x40e923, end=0x40e923)

    out = {'initial_seed': hex(emu.seed), 'scenes': []}
    assert emu.seed == 1

    # The FACTORY installs the vtable (PTR array @0x418e68: reset/render/
    # event/dtor), not the ctor — the build's tail calls vtbl[0]() then
    # vtbl[1](0) (reset + one progress-frame render) through it.  The tail
    # RENDER trips on objects whose materials materialise at first real frame,
    # and it is stream-INERT for scenes 0-2 (no precipitation — the only
    # random draws a render makes), so use a vtable copy whose render slot is
    # a bare `ret 4`.  CAVEAT: for precip scenes (5/7) the tail render DOES
    # draw from the stream and this stub would hide it — revisit then.
    vt = emu.alloc(0x10)
    emu.set_u32(vt + 0x0, emu.u32(0x418e68))          # reset (the ctor fn)
    emu.set_u32(vt + 0x4, emu.add_stub('render.SKIP', 4, None))
    emu.set_u32(vt + 0x8, emu.u32(0x418e68 + 8))      # event
    emu.set_u32(vt + 0xc, emu.u32(0x418e68 + 12))     # dtor

    for idx in scenes:
        this = emu.alloc(0x2000)
        emu.set_u32(this, vt)
        emu.call(CTOR_VA, this=this)
        entry_seed = emu.seed
        n0 = len(hits)
        print(f'scene {idx}: build …', flush=True)
        try:
            emu.call(BUILD_VA, idx, this=this, timeout_s=3600)
        except Exception as e:
            print(f'scene {idx}: FAIL {e}')
            print(f'  unknown D3D method: {d3d.unknown_hit}')
            print(f'  unmapped: {emu.unmapped}')
            print(f'  seed {emu.seed:#010x}  rand_writes {emu.rand_writes}')
            print(f'  api tail: {emu.api_log[-6:]}')
            for h in hits[n0:][-8:]:
                print(f'  boundary: {h}')
            raise
        out['scenes'].append({
            'sceneIdx': idx, 'this': hex(this),
            'seed_entry': hex(entry_seed), 'seed_exit': hex(emu.seed),
            'seconds': round(emu.last_call_seconds, 1),
            'boundaries': hits[n0:],
        })
        print(f'scene {idx}: entry {entry_seed:#010x} exit {emu.seed:#010x} '
              f'({emu.last_call_seconds:.0f} s, {len(hits) - n0} boundary hits)',
              flush=True)

    d = fixture_dir('scenebuild', 'scenes_' + '_'.join(map(str, scenes)))
    (d / 'trace.json').write_text(json.dumps(out, indent=1))
    print(f'wrote {d}/trace.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
