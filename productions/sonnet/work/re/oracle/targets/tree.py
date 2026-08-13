#!/usr/bin/env python3
"""Milestone 3 — the ORIGINAL L-system tree, cold-called.

Replicates the impostor bake's call site (sonnet.c:8838, inside FUN_0040abed):

    node = FUN_004052a5(alloc(0x134))          ; __fastcall ctor, scene node
    tree = FUN_00408d5f(alloc(0x28))           ; __fastcall ctor, tree host
    FUN_00409d45(tree | ECX, node, NULL,       ; __thiscall, ret 0x34
                 pos = 0,0,0, bend = 0,0,0,    ; the BSS spill globals, zero
                 meshScale = 1.0f bits,
                 radius = [0x418e5c], taper = [0x418eb0],
                 leavesVisible = 1, leafSize = [0x418200])

Validation is the strongest available: Codex's independently derived (and
port-reproduced) chain — `srand(0xb9583054)` before the call must leave the
LCG at exactly 0x35f508ed after it.  An LCG advanced N steps has no
near-misses, so a state match is proof the emulated build made the SAME draws
in the SAME order as both the original's design and the port.

Fixture: both mesh vertex buffers (branches @tree+0x10, leaves @tree+0x14;
count @mesh+0xac, buffer @mesh+0xb0, stride 0x2c) + the RNG boundary states.
"""

import pathlib
import struct
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from emu import (SonnetEmu, write_fixture, read_archive, texprog_size,
                 INIT_VA, TEXGEN_VA)  # noqa: E402

NODE_CTOR = 0x4052a5     # __fastcall(this) — scene node, 0x134 bytes
TREE_CTOR = 0x408d5f     # __fastcall(this) — tree host, 0x28 bytes
BUILD_TREE = 0x409d45    # __thiscall, 13 stack args, ret 0x34

SEED_IN = 0xb9583054     # the bake-entry state (TREE_IMPOSTOR.md, Codex-verified)
SEED_OUT = 0x35f508ed    # post-state of the TREE'S OWN draws (Codex/port-proven)
SEED_PREPASS = 0xa661ec3b  # post-state INCLUDING the inline bark+leaf texgen
                           # (= the port's verified "state entering the per-pass
                           # yaws"; prog 1 ends in an op33 srand, so this is
                           # deterministic whatever the entry state)

# The original's buildTree generates texgen programs 0 (bark) and 1 (leaf)
# INLINE at 0x40a035/0x40a087 — after the tree's own draws, before returning.
# That gives two independent validations against two separately proven
# constants:  pre-cache both programs (FUN_00416036 caches per id) and the
# call's draws are the tree's alone -> SEED_OUT; run cold and the chain
# includes both programs -> SEED_PREPASS.


def f32bits(emu, va):
    return emu.u32(va)


def read_mesh(emu, mesh_va):
    count = emu.u32(mesh_va + 0xac)
    buf = emu.u32(mesh_va + 0xb0)
    verts = emu.read(buf, count * 0x2c)
    return count, verts


def run_case(precache):
    emu = SonnetEmu(heap_mb=256)
    import d3d8fake
    d3d8fake.install(emu)      # buildTree's tail creates its D3D textures
    radius, taper, leafsize = (f32bits(emu, v) for v in (0x418e5c, 0x418eb0, 0x418200))
    emu.call(INIT_VA)
    if precache:
        blocks = read_archive(emu)
        for pid in (0, 1):
            w, h = texprog_size(blocks, pid)
            emu.call(TEXGEN_VA, pid, w, h, emu.alloc(w * h * 4), timeout_s=300)

    node = emu.alloc(0x134)
    emu.call(NODE_CTOR, this=node)
    tree = emu.alloc(0x28)
    emu.call(TREE_CTOR, this=tree)

    emu.seed = SEED_IN
    emu.call(BUILD_TREE, node, 0,
             0, 0, 0, 0, 0, 0,            # pos, bend (zero, as the BSS spills)
             0x3f800000,                   # meshScale 1.0f
             radius, taper, 1, leafsize,
             this=tree, timeout_s=600)
    return emu, tree, (radius, taper, leafsize)


def main():
    fl = lambda b: struct.unpack('<f', struct.pack('<I', b))[0]

    # Case A: bark+leaf pre-cached -> the call's draws are the tree's own PLUS
    # the per-leaf record tail (0x409f21-0x409fc5, 32 draws/leaf), which the
    # ORIGINAL keeps inside FUN_00409d45 and the port keeps in the array-E
    # caller (SCENE2_TODO.md "THE FIND").  So the expectation is the port's
    # proven post-state 0x35f508ed advanced by exactly 32 x leafCount steps —
    # verified: 0x35f508ed + 1329*32 = 0xdedf2c8d, which is also one of the
    # project's independently recorded pin states.
    emu, tree, (radius, taper, leafsize) = run_case(precache=True)
    print(f'constants: radius {fl(radius)}, taper {fl(taper)}, leafSize {fl(leafsize)}')
    seed_after = emu.seed
    n_leaves = emu.u32(emu.u32(tree + 0x14) + 0xac) // 8
    expect_a = SEED_OUT
    for _ in range(n_leaves * 32):
        expect_a = (expect_a * 214013 + 2531011) & 0xffffffff
    ok = seed_after == expect_a
    print(('PASS' if ok else 'FAIL') +
          f'  [precached] tree draws + {n_leaves}x32 leaf-record tail: '
          f'{SEED_IN:#010x} -> {seed_after:#010x} '
          f'(expected {SEED_OUT:#010x} + {n_leaves * 32} steps = {expect_a:#010x})')

    # Case B: cold — the inline bark+leaf generation joins the chain.
    emu_b, _tree_b, _ = run_case(precache=False)
    ok_b = emu_b.seed == SEED_PREPASS
    print(('PASS' if ok_b else 'FAIL') +
          f'  [cold] tree + inline texgen 0,1: -> {emu_b.seed:#010x}'
          f' (expected pre-pass state {SEED_PREPASS:#010x})')

    branches_va, leaves_va = emu.u32(tree + 0x10), emu.u32(tree + 0x14)
    bn, bverts = read_mesh(emu, branches_va)
    ln, lverts = read_mesh(emu, leaves_va)
    print(f'branches mesh: {bn} verts   leaf mesh: {ln} verts '
          f'({ln // 8} leaves @ 8 verts)   total {bn + ln}')

    # bbox over both meshes' positions (vert+0x00, 3 x f32) for the report
    lo = [float('inf')] * 3
    hi = [float('-inf')] * 3
    for verts, n in ((bverts, bn), (lverts, ln)):
        for i in range(n):
            x, y, z = struct.unpack_from('<3f', verts, i * 0x2c)
            for j, v in enumerate((x, y, z)):
                if v == v:                      # NaN normals live at +0x04; positions
                    lo[j] = min(lo[j], v)       # can be trusted, but guard anyway
                    hi[j] = max(hi[j], v)
    print('bbox: ' + '  '.join(f'{a}: {l:.3f}..{h:.3f}'
                               for a, l, h in zip('xyz', lo, hi)))

    write_fixture('tree', 'impostor_set0', fn_va=BUILD_TREE,
                  call={'convention': 'thiscall',
                        'args': ['node', 0, 0, 0, 0, 0, 0, 0,
                                 hex(0x3f800000), hex(radius), hex(taper), 1,
                                 hex(leafsize)]},
                  emu=emu,
                  dumps=[('branches', bverts), ('leaves', lverts)],
                  seed_before=SEED_IN, seed_after=seed_after,
                  extra={'branchVerts': bn, 'leafVerts': ln,
                         'bbox': {'lo': lo, 'hi': hi},
                         'stride': 0x2c,
                         'expected_seed_after': hex(SEED_OUT),
                         'seed_check': 'PASS' if ok else 'FAIL',
                         'cold_chain_seed_after': hex(emu_b.seed),
                         'cold_chain_expected': hex(SEED_PREPASS),
                         'cold_chain_check': 'PASS' if ok_b else 'FAIL'})
    return 0 if ok and ok_b else 1


if __name__ == '__main__':
    sys.exit(main())
