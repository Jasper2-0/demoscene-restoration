#!/usr/bin/env python3
"""Scene-texture oracle — every texture the ORIGINAL uploads while building
a scene, plus the array-B curtain mesh when there is one.

  .venv/bin/python targets/curtain.py [sceneIdx]      # default 4 (beach)

The fake D3D layer keeps each texture's uploaded bytes, so this reads the
original's OWN baked ground texture / strand texture rather than reasoning
about the generator that produced it.

Original note (scene 4):

Scene 4's grass curtain is the demo's oldest ranked defect: the reference is
inside a frame-filling wall of strands, ours is sparse enough to see the
horizon through it.  The geometry was proved correct long ago (an opaque
render fills the frame); the TEXTURE's coverage was called "an unresolved
dead end" because it was only ever reasoned about.  The fake D3D layer keeps
every texture's uploaded bytes, so the original's own strand texture can just
be read out.

Builds scenes 0..4 in order (the texture is drawn from the shared stream, so
stream position matters), then dumps every texture created DURING scene 4's
build plus the curtain mesh's vertex colours.

  .venv/bin/python targets/curtain.py
"""

import json
import pathlib
import struct
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from emu import SonnetEmu, INIT_VA, fixture_dir  # noqa: E402
import d3d8fake  # noqa: E402

CTOR_VA, BUILD_VA = 0x408d72, 0x4082a9
SHADOW_DRAWS = 2 * 65536 * 16
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 4


def main():
    emu = SonnetEmu(heap_mb=1536)
    d3d = d3d8fake.install(emu)
    emu.call(INIT_VA)

    from unicorn import UC_HOOK_CODE
    from unicorn.x86_const import UC_X86_REG_ECX
    emu.write(0x40e923, b'\xc2\x0c\x00')

    def on_bake(uc, address, size, user):
        this = uc.reg_read(UC_X86_REG_ECX)
        buf = emu.u32(this + 0x24)
        if buf:
            emu.write(buf, b'\xff' * 0x10000)
        s = emu.seed
        for _ in range(SHADOW_DRAWS):
            s = (s * 214013 + 2531011) & 0xffffffff
        emu.seed = s
    emu.uc.hook_add(UC_HOOK_CODE, on_bake, begin=0x40e923, end=0x40e923)

    vt = emu.alloc(0x10)
    emu.set_u32(vt + 0, emu.u32(0x418e68))
    emu.set_u32(vt + 4, emu.add_stub('render.SKIP', 4, None))
    emu.set_u32(vt + 8, emu.u32(0x418e68 + 8))
    emu.set_u32(vt + 0xc, emu.u32(0x418e68 + 12))

    before = None
    this = None
    for idx in range(TARGET + 1):
        this = emu.alloc(0x2000)
        emu.set_u32(this, vt)
        emu.call(CTOR_VA, this=this)
        if idx == TARGET:
            before = set(d3d.textures.keys())
        print(f'scene {idx}: build …', flush=True)
        emu.call(BUILD_VA, idx, this=this, timeout_s=3600)
        print(f'scene {idx}: seed {emu.seed:#010x}', flush=True)

    made = [t for t in d3d.textures if t not in before]
    print(f'\n{len(made)} textures created during scene {TARGET}:')
    out = fixture_dir('curtain', f'scene{TARGET}')
    manifest = {'scene': TARGET, 'image_sha256': emu.image_sha256, 'textures': []}
    for tva in made:
        t = d3d.textures[tva]
        px = d3d.texture_level_bytes(tva, 0)
        # coverage: fraction of texels with alpha over a few thresholds
        n = len(px) // 4
        a = [px[i * 4 + 3] for i in range(n)]
        cov = {th: sum(1 for v in a if v > th) / n for th in (0, 8, 128, 240)}
        nonzero = sum(1 for v in a if v)
        print(f'  {t["w"]}x{t["h"]}  alpha>0 {cov[0]*100:5.1f}%  >128 {cov[128]*100:5.1f}%'
              f'  (nonzero {nonzero})')
        import hashlib as _h
        digest = _h.sha256(px).hexdigest()[:12]
        print(f'      sha {digest}')
        name = f'tex_{t["w"]}x{t["h"]}_{tva:x}'
        (out / f'{name}.bin').write_bytes(px)
        manifest['textures'].append({'file': f'{name}.bin', 'w': t['w'], 'h': t['h'],
                                     'coverage': {str(k): v for k, v in cov.items()}})

    # array-B lives at Landscape+300 (0x12c) — `*(this+300) = alloc(desc[6]*0x14)`
    # in FUN_004082a9's `desc[0x4f] & 4` block; records are 0x14 bytes and the
    # mesh pointer is the first field.
    arr = emu.u32(this + 300)
    manifest['arrayB_va'] = hex(arr)
    if arr:
        print(f'\narray-B @ {arr:#x}')
        # the record's MESH pointer is at +0x0c (`mov [esi+0xc],eax`
        # @0x40C211, right after mesh_new), NOT at +0.
        for rec in range(3):
            mesh = emu.u32(arr + rec * 0x14 + 0x0c)
            if not mesh:
                continue
            nvv = emu.u32(mesh + 0xac)
            print(f'  record {rec}: mesh {mesh:#x}  {nvv} verts')
        mesh = emu.u32(arr + 0x0c)
        if mesh:
            nv = emu.u32(mesh + 0xac)
            vb = emu.u32(mesh + 0xb0)
            verts = emu.read(vb, nv * 0x2c)
            cols = {}
            for i in range(nv):
                c = struct.unpack_from('<I', verts, i * 0x2c + 0x18)[0]
                cols[c] = cols.get(c, 0) + 1
            print(f'\ncurtain mesh 0: {nv} verts, {len(cols)} distinct colours')
            for c, k in sorted(cols.items(), key=lambda kv: -kv[1])[:6]:
                print(f'  {c:#010x} a={c >> 24:3d} x{k}')
            (out / 'curtain_verts.bin').write_bytes(verts)
            manifest['curtainVerts'] = nv
            manifest['curtainColours'] = {hex(c): k for c, k in
                                          sorted(cols.items(), key=lambda kv: -kv[1])[:16]}
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print(f'wrote {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
