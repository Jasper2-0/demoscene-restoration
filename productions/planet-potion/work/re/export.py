#!/usr/bin/env python3
"""Export everything recovered from the binary as one consumable dataset.

    python3 export.py flat/ out/ [part1.dbm part3.dbm]

Runs the three pure subsystems under the qemu harness and writes:

    out/textures/p{1,3}_NN.png     69 textures, 128x128, from the texture VM
    out/meshes.json                per geometry program: opcodes + vertices
    out/scenes.json                per scene: ordered typed draw-node list
    out/font.json                  40 glyphs, (code, x, y, w, h)
    out/render_state.json          the Warp3D configuration and fog presets
    out/draws.json                 the recorded Warp3D draw stream, per frame
    out/showorder.json             the show schedule, from the music
    out/manifest.json              counts, provenance, what failed

Nothing here is committed to the repository — it is all regenerable from the
original archive by this script, which is the rule the README applies to baked
intermediates. What is committed is the script.
"""
import json, os, struct, sys, zlib
import drawlog
import ppcrun as H
import showorder
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


P1_OVERLAY = 0x25d2                       # _init_synchro's, drawn over every scene
NSAMPLES = 5                              # per scene, spread inside its own span


def spans(sched):
    """A scene graph stays on screen across the `new_camera` / `dalej` calls that
    follow it, so its span runs to the next call that builds a new one."""
    out = []
    for i, c in enumerate(sched):
        if not c['slot']:
            continue
        j = next((k for k in range(i + 1, len(sched)) if sched[k]['slot']), None)
        end = sched[j]['startTick'] if j is not None else \
            sched[-1]['startTick'] + sched[-1]['durTicks']
        out.append((int(c['slot'], 16), c['startTick'], end - c['startTick']))
    return out


def export_draws(flat, d0, r2, out, mods=()):
    """Record what the renderer actually submits, by running it (see drawlog.py).

    Sampled across each scene's REAL span, which showorder.py recovers from the
    music. Sampling a fixed early window would have measured the fade-in of
    every scene and nothing else — part one's shortest is 214 ticks and its
    longest 1,385.
    """
    sch = showorder.schedule(flat, mods)
    json.dump(sch, open(f'{out}/showorder.json', 'w'), indent=2)
    res, fails = [], 0
    jobs = [('p1', P1_OVERLAY, 0x2642, 0x2706), ('p3', None, 0x27a6, 0x27fe)]
    for part, over, txt, obj in jobs:
        for order, (strm, start, dur) in enumerate(spans(sch[part]['schedule'])):
            samples = tuple(round(dur * (k + 0.5) / NSAMPLES) for k in range(NSAMPLES))
            disp = strm
            o, _ = drawlog.run(strm, frames=samples, txt_tab=txt, obj_tab=obj,
                               overlay=g(d0, r2, over) if over else None)
            frames = drawlog.parse(o)
            if not frames:
                fails += 1
                res.append({'part': part, 'order': order, 'stream': hex(strm),
                            'startTick': start, 'durTicks': dur, 'frames': None,
                            'note': 'text scene; harness hits the unbounded glyph scan'})
                continue
            res.append({'part': part, 'order': order, 'stream': hex(strm),
                        'startTick': start, 'durTicks': dur,
                        'overlay': hex(over) if over else None,
                        'frames': [{'t': f['time'], 'draws': [
                            {'prim': d['prim'], 'texture': d['texture'],
                             # flat per-vertex records: x y z w u v r g b a
                             'v': [round(c, 5) for vx in d['vertices'] for c in
                                   (vx['x'], vx['y'], vx['z'], vx['w'], vx['u'],
                                    vx['v'], *vx['rgba'])]}
                            for d in f['draws']]} for f in frames]})
    json.dump({'screen': [640, 480], 'tick_hz': 50,
               'vertex_fields': ['x', 'y', 'z', 'w', 'u', 'v', 'r', 'g', 'b', 'a'],
               'uv_space': 'texels (0..128), wrapped — not normalised',
               'z': '4/z as a W3D_Double; w = 1/z; both from a PPC fres estimate',
               'tick': 'frame index at 50Hz, local to the scene',
               'scenes': res}, open(f'{out}/draws.json', 'w'))
    return len(res), fails


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    out = sys.argv[2] if len(sys.argv) > 2 else 'out'
    os.makedirs(f'{out}/textures', exist_ok=True)
    H.FLAT = rungeo.FLAT = runscene.FLAT = flat
    drawlog.setflat(flat)
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
    print('draw stream ...', flush=True); nd, df = export_draws(flat, d0, r2, out, sys.argv[3:5]); print(f'  {nd} scenes x {NSAMPLES} frames, {df} failed')

    json.dump({'production': 'planet-potion',
               'source': 'planet-potion_dcr.exe, see prod.json for hashes',
               'font_glyphs': ng, 'fog_presets': nf,
               'mesh_programs': nm, 'mesh_failures': mf,
               'scenes': ns, 'scene_failures': sf,
               'draw_scenes': nd, 'draw_failures': df, 'draw_samples_per_scene': NSAMPLES,
               'regenerate': 'python3 export.py flat/ out/'},
              open(f'{out}/manifest.json', 'w'), indent=2)
    print(f'\nwrote {out}/  — regenerable, not committed')


if __name__ == '__main__':
    main()
