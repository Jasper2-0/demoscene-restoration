#!/usr/bin/env python3
"""Export everything recovered from the binary as one consumable dataset.

    python3 export.py flat/ out/

Runs the three pure subsystems under the qemu harness and writes:

    out/textures/p{1,3}_NN.png     69 textures, 128x128, from the texture VM
    out/meshes.json                per geometry program: opcodes + vertices
    out/scenes.json                per scene: ordered typed draw-node list
    out/font.json                  40 glyphs, (code, x, y, w, h)
    out/render_state.json          the Warp3D configuration and fog presets
    out/manifest.json              counts, provenance, what failed

Nothing here is committed to the repository — it is all regenerable from the
original archive by this script, which is the rule the README applies to baked
intermediates. What is committed is the script.
"""
import json, os, struct, sys, zlib
import ppcrun as H
import rendertex
import rungeo
import runscene

BASE = 0x10000000


def g(d0, r2, disp):
    return struct.unpack_from('>I', d0, r2 + disp - BASE)[0]


def table(d0, r2, disp, n):
    return [g(d0, r2, disp + i * 4) for i in range(n)]


def export_font(d0, out):
    p, recs = 0xa8e4, []
    while d0[p] != 0xFF:
        c, x, y, w, h = d0[p:p + 5]
        recs.append({'code': c, 'char': chr(c) if 32 <= c < 127 else None,
                     'x': x, 'y': y, 'w': w, 'h': h})
        p += 5
    json.dump({'glyphs': recs, 'atlas': {'w': max(r['x'] + r['w'] for r in recs),
                                         'h': max(r['y'] + r['h'] for r in recs)},
               'quirks': ["'0' appears twice (indices 0 and 11)",
                          "'v' shares 'w' rectangle (95,76,28,18) — v renders as w",
                          'the renderer glyph scan is unbounded for absent chars']},
              open(f'{out}/font.json', 'w'), indent=2)
    return len(recs)


def export_render_state(d0, r2, out):
    fog = []
    for disp in (0x25f2, 0x2606, 0x261a, 0x262e):
        a = r2 + disp - BASE
        v = struct.unpack_from('>fffff', d0, a)
        fog.append({'start': v[0], 'end': v[1], 'color': [v[2], v[3], v[4]]})
    json.dump({
        'state': {'W3D_TEXMAPPING': True, 'W3D_PERSPECTIVE': True,
                  'W3D_GOURAUD': True, 'W3D_BLENDING': True,
                  'W3D_SYNCHRON': False, 'W3D_ZBUFFER': 'per-frame',
                  'W3D_ZBUFFERUPDATE': 'per-frame', 'W3D_FOGGING': 'per-scene'},
        'blend': ['W3D_SRC_ALPHA', 'W3D_ONE_MINUS_SRC_ALPHA'],
        'zcompare': 'W3D_Z_GEQUAL',
        'depth_convention': 'reversed: 1.0 = front plane, 0.0 = back plane (w-space)',
        'fog_mode': 'W3D_FOG_LINEAR (interpolated per-vertex on Permedia 2)',
        'fog_presets': fog,
        'filter': ['W3D_LINEAR', 'W3D_LINEAR'],
        'texture_format': 'W3D_A8R8G8B8 (format 6), 128x128',
        'primitives': ['W3D_DrawTriFan', 'W3D_DrawLineStrip'],
        'notes': ['no SetTexEnv, no SetWrapMode — both at defaults',
                  'W3D_ReadZPixel used once, for an occlusion-tested element; '
                  'it is a synchronous stall and needs an occlusion query in WebGL2'],
    }, open(f'{out}/render_state.json', 'w'), indent=2)
    return len(fog)


def export_meshes(flat, d0, r2, out):
    res, fails = [], 0
    for part, disp, n in (('p1', 0x2706, 28), ('p3', 0x27fe, 11)):
        for i, prog in enumerate(table(d0, r2, disp, n)):
            try:
                dat, _ = rungeo.run(prog)
            except Exception:
                dat = b''
            if len(dat) < 4:
                fails += 1; continue
            head = struct.unpack('>I', dat[:4])[0]; arena = dat[4:]
            A = rungeo.ARENA
            ops, node, guard = [], head, 0
            while node and A <= node < A + len(arena) - 32 and guard < 64:
                o = node - A
                op = struct.unpack_from('>H', arena, o + 0x10)[0] // 4
                rec = {'op': op}
                if op == 4:
                    cnt = struct.unpack_from('>H', arena, o + 0x1a)[0]
                    vp = struct.unpack_from('>I', arena, o + 0x1c)[0]
                    if A <= vp < A + len(arena) - cnt * 20:
                        q = vp - A
                        rec['vertices'] = [list(struct.unpack_from('>ffff', arena, q + k * 20))
                                           for k in range(min(cnt, 256))]
                ops.append(rec)
                node = struct.unpack_from('>I', arena, o + 0x14)[0]; guard += 1
            res.append({'part': part, 'index': i, 'program': hex(prog), 'nodes': ops})
    json.dump(res, open(f'{out}/meshes.json', 'w'), indent=2)
    return len(res), fails


def export_scenes(flat, d0, r2, out):
    A = runscene.ARENA
    res, fails = [], 0
    jobs = [('p1', [0x25d2, 0x25aa, 0x25ba, 0x25ce, 0x25ae, 0x25b2, 0x25b6, 0x25ca,
                    0x25be, 0x25c2, 0x25c6, 0x25da, 0x25d6, 0x25de, 0x25e2, 0x25ea,
                    0x25e6, 0x25ee], 0x2642, 0x2706),
            ('p3', [0x277a + i * 4 for i in range(11)], 0x27a6, 0x27fe)]
    for part, disps, txt, obj in jobs:
        for order, disp in enumerate(disps):
            strm = g(d0, r2, disp)
            try:
                dat, _ = runscene.run(strm, txt_tab=txt, obj_tab=obj)
            except Exception:
                dat = b''
            if len(dat) < 4:
                fails += 1
                res.append({'part': part, 'order': order, 'slot': hex(disp),
                            'stream': hex(strm), 'nodes': None,
                            'note': 'text scene; harness hits the unbounded glyph scan'})
                continue
            head = struct.unpack('>I', dat[:4])[0]; arena = dat[4:]
            nodes, node, guard = [], head, 0
            while node and A <= node < A + len(arena) - 64 and guard < 64:
                nodes.append(struct.unpack_from('>H', arena, node - A + 8)[0] // 4)
                node = struct.unpack_from('>I', arena, node - A + 0x10)[0]; guard += 1
            res.append({'part': part, 'order': order, 'slot': hex(disp),
                        'stream': hex(strm), 'nodes': nodes})
    json.dump(res, open(f'{out}/scenes.json', 'w'), indent=2)
    return len(res), fails


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    out = sys.argv[2] if len(sys.argv) > 2 else 'out'
    os.makedirs(f'{out}/textures', exist_ok=True)
    H.FLAT = rungeo.FLAT = runscene.FLAT = flat
    base = H.read_layout(flat)[0][0]
    r2 = base + H.R2_BIAS
    d0 = open(os.path.join(flat, next(f for f in os.listdir(flat)
                                      if f.startswith('seg0_'))), 'rb').read()

    print('font        ...', end=' ', flush=True); ng = export_font(d0, out); print(f'{ng} glyphs')
    print('render state...', end=' ', flush=True); nf = export_render_state(d0, r2, out); print(f'{nf} fog presets')
    print('textures    ...', end=' ', flush=True)
    sys.argv = ['x', flat, f'{out}/textures']; rendertex.main()
    print('meshes      ...', end=' ', flush=True); nm, mf = export_meshes(flat, d0, r2, out); print(f'{nm} programs, {mf} failed')
    print('scenes      ...', end=' ', flush=True); ns, sf = export_scenes(flat, d0, r2, out); print(f'{ns} scenes, {sf} failed')

    json.dump({'production': 'planet-potion',
               'source': 'planet-potion_dcr.exe, see prod.json for hashes',
               'font_glyphs': ng, 'fog_presets': nf,
               'mesh_programs': nm, 'mesh_failures': mf,
               'scenes': ns, 'scene_failures': sf,
               'regenerate': 'python3 export.py flat/ out/'},
              open(f'{out}/manifest.json', 'w'), indent=2)
    print(f'\nwrote {out}/  — regenerable, not committed')


if __name__ == '__main__':
    main()
