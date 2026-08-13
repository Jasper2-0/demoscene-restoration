#!/usr/bin/env python3
"""Cloud-sky oracle — the ORIGINAL's cloud-layer geometry and VERTEX COLOURS.

Scene 3 (obj 6) is the cloud sea, and its long-open residual is a contrast
deficit whose every decoded input already matched: SCENE3_CLOUDSEA.md's own
"next attack" was to stop re-checking the composite and look at the 8 layers'
vertex alphas.  That is exactly what this dumps, from the original executing.

Builds scenes 0..idx IN ORDER (the cloud mesh is stochastic, so it must be
built at the right stream position) and dumps the cloud-sky mesh at
`Landscape+0xa8` — `FUN_00408eef`'s own accessor for it (0x408FFF-0x409605
`mov eax,[esi+0xa8] / and byte [eax+0xc8],0xfd`, the hide/show of the sky).

  .venv/bin/python targets/cloudsky.py 3
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


def main():
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    emu = SonnetEmu(heap_mb=1024)
    d3d8fake.install(emu)
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

    this = None
    for idx in range(target + 1):
        this = emu.alloc(0x2000)
        emu.set_u32(this, vt)
        emu.call(CTOR_VA, this=this)
        print(f'scene {idx}: build …', flush=True)
        emu.call(BUILD_VA, idx, this=this, timeout_s=3600)
        print(f'scene {idx}: seed {emu.seed:#010x}', flush=True)

    node = emu.u32(this + 0xa8)
    print(f'cloud node @{node:#x}')
    if not node:
        print('no cloud sky on this scene')
        return 1
    n = emu.u32(node + 0xac)
    buf = emu.u32(node + 0xb0)
    print(f'cloud mesh: {n} verts, buffer {buf:#x}')
    verts = emu.read(buf, n * 0x2c)

    # per-vertex: pos(3f) @0, normal(3f) @0xc, diffuse(u32) @0x18, uv0 @0x1c
    colours = {}
    ys = []
    for i in range(n):
        x, y, z = struct.unpack_from('<3f', verts, i * 0x2c)
        c = struct.unpack_from('<I', verts, i * 0x2c + 0x18)[0]
        colours[c] = colours.get(c, 0) + 1
        ys.append(y)
    print(f'y range {min(ys):.2f} .. {max(ys):.2f}')
    print('distinct vertex colours (top 12, ARGB):')
    for c, k in sorted(colours.items(), key=lambda kv: -kv[1])[:12]:
        print(f'  {c:#010x}  a={c >> 24:3d}  rgb={c & 0xffffff:#08x}  x{k}')

    write = fixture_dir('cloudsky', f'scene{target}')
    (write / 'verts.bin').write_bytes(verts)
    (write / 'manifest.json').write_text(json.dumps({
        'target': 'cloudsky', 'scene': target, 'node_va': hex(node),
        'verts': n, 'stride': 0x2c,
        'colours': {hex(c): k for c, k in sorted(colours.items(), key=lambda kv: -kv[1])},
        'y_range': [min(ys), max(ys)],
        'image_sha256': emu.image_sha256,
    }, indent=1))
    print(f'wrote {write}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
