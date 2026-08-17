#!/usr/bin/env python3
"""Export everything recovered from the binary as one consumable dataset.

    python3 export.py flat/ out/ [part1.dbm part3.dbm]

Runs the three pure subsystems under the qemu harness and writes:

    out/textures/p{1,3}_NN.png     69 textures, 128x128, from the texture VM
    out/meshes.json                per geometry program: opcodes + vertices
    out/scenes.json                per scene: ordered typed draw-node list
    out/font.json                  40 glyphs, (code, x, y, w, h)
    out/font_atlas.png             the 128x128 glyph bitmap those index into
    out/tex_kernels.json           the 40 3x3 convolution kernels, each verified
    out/tex_operands.json          per-operand sensitivity for all 20 opcodes
    out/render_state.json          the Warp3D configuration and fog presets
    out/draws.json                 the recorded Warp3D draw stream, per frame
    out/tex_programs.json          the 69 texture programs, as bytecode
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
import texconv
import texprobe
import rungeo
import runscene

BASE = 0x10000000
PATCH_NOTE = ['glyph scan at 0x10002e78: compare rA r26 -> r10, so the lookup '
              'terminates on the table sentinel rather than the search key. '
              'Scenes that decode without it are byte-identical with it.',
              'seg5 preloaded with the four lookup tables the 68K bootstrap '
              'builds (sin, atan, 2^x, e^x), rebuilt from its own constants.']


# The four fog presets, in the order export_render_state writes them, so a
# scene's `fog` field indexes that array directly.
FOG_PRESETS = (0x25f2, 0x2606, 0x261a, 0x262e)


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


INIT_TXTGEN, FONT_DEST = 0x1000139c, 0x100d0000


def export_font_atlas(flat, out):
    """The glyph bitmap, expanded the way `_init_txtgen` expands it.

    seg 2 is 2,048 bytes = 128x128 bits: the font mask, 1bpp. The expander turns
    each set bit into 0x00FFFFFF and leaves cleared bits zero, giving a 128x128
    image the glyph rectangles in font.json index into. Without this a port has
    the letter positions but not the letters.
    """
    img, _ = H.run(flat, INIT_TXTGEN, {}, out_addr=FONT_DEST, out_len=128 * 128 * 4)
    if len(img) != 128 * 128 * 4:
        return 0
    rendertex.png(f'{out}/font_atlas.png', 128, 128, img)
    return sum(1 for i in range(0, len(img), 4) if img[i:i + 4] != b'\0' * 4)


def export_render_state(d0, r2, out):
    fog = []
    for disp in FOG_PRESETS:
        a = r2 + disp - BASE
        v = struct.unpack_from('>fffff', d0, a)
        fog.append({'disp': hex(disp), 'start': v[0], 'end': v[1],
                    'color': [v[2], v[3], v[4]]})
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
        'framebuffer': {'width': 640, 'height': 480, 'depth': 16,
                        'bitmapHeight': 960,
                        'note': 'double-height bitmap, swapped by RyOffset + '
                                'ScrollVPort; W3D_CC_DOUBLEHEIGHT is set. A '
                                '16-bit target means the Permedia 2 dithers, so '
                                'the original bands where an 8-bit-per-channel '
                                'port will not.'},
        'notes': ['no SetTexEnv, no SetWrapMode — both at defaults',
                  'W3D_ReadZPixel used once, for an occlusion-tested element; '
                  'it is a synchronous stall and needs an occlusion query in WebGL2'],
    }, open(f'{out}/render_state.json', 'w'), indent=2)
    return len(fog)


def export_programs(flat, d0, r2, out):
    """The texture bytecode itself, so a reimplemented VM has an input.

    Every program in every language is `u16 length` then the opcode stream (bit
    15 of the length is a flag). The 69 rendered PNGs are the oracle; these are
    what a JS texture VM has to consume to produce them.
    """
    segs = {va: open(os.path.join(flat, fn), 'rb').read()
            for va, sz, fn in H.read_layout(flat) if fn}

    def fetch(addr):
        for va, data in segs.items():
            if va <= addr < va + len(data):
                o = addr - va
                n = struct.unpack_from('>H', data, o)[0] & 0x7FFF
                return data[o:o + 2 + n], n
        return None, 0

    # Operand widths, read from the VM's own fetch loop at 0x100004b0:
    #   count = byte[r2+0x2502 + opcode], with 0x7f meaning 1
    # EXCEPT 0x50..0x78, which branch before that and set the count to ZERO —
    # a convolution is a single byte with no operands at all.
    counts = [d0[0xa500 + i] for i in range(20)]

    def width(op):
        if 0x50 <= op <= 0x78:
            return 0
        return None if op >= 20 else (1 if counts[op] == 0x7f else counts[op])

    res, undecoded = [], 0
    for part, disp, n in (('p1', 0x2642, 48), ('p3', 0x27a6, 21)):
        for i, prog in enumerate(table(d0, r2, disp, n)):
            blob, ln = fetch(prog)
            ops, j, end, exact = [], 2, 2 + ln, False
            while blob and j <= end - 1:
                op = blob[j]; k = width(op); j += 1
                if k is None:
                    break
                ops.append(op); j += k
            else:
                exact = (j == end)
            if not exact:
                undecoded += 1
            res.append({'part': part, 'index': i, 'at': hex(prog), 'bytes': ln,
                        'ops': ops, 'decodes': exact,
                        'hex': blob.hex() if blob else None})
    json.dump({'note': 'u16 length (bit 15 is a flag) then the opcode stream. '
                       'Operand widths come from the table at r2+0x2502 (0x7f '
                       'means 1); opcodes 0x50..0x78 are the 3x3 convolution '
                       'family and take NO operands, which the fetch loop sets '
                       'explicitly rather than reading from the table.',
               'programs': res}, open(f'{out}/tex_programs.json', 'w'), indent=2)
    return len(res), undecoded


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
                            'note': 'did not decode'})
                continue
            head = struct.unpack('>I', dat[:4])[0]; arena = dat[4:]
            nodes, node, guard = [], head, 0
            while node and A <= node < A + len(arena) - 64 and guard < 64:
                nodes.append(struct.unpack_from('>H', arena, node - A + 8)[0] // 4)
                node = struct.unpack_from('>I', arena, node - A + 0x10)[0]; guard += 1
            res.append({'part': part, 'order': order, 'slot': hex(disp),
                        'stream': hex(strm), 'nodes': nodes})
    json.dump({'patches': PATCH_NOTE, 'scenes': res},
              open(f'{out}/scenes.json', 'w'), indent=2)
    return len(res), fails


P1_OVERLAY = 0x25d2                       # _init_synchro's, drawn over every scene
NSAMPLES = 5                              # per scene, spread inside its own span


def spans(sched):
    """A scene graph stays on screen across the `new_camera` / `dalej` calls that
    follow it, so its span runs to the next call that builds a new one.

    Yields the r2 DISPLACEMENT, not the stream pointer — the caller resolves it
    through the small-data base — and the fog preset in effect.

    FOG IS RESOLVED HERE RATHER THAN LEFT STICKY, and that is not tidiness. The
    original sets a preset once and it persists until the next change, which is
    fine for a program that plays start to finish; the page renders scenes out
    of order (`?scene=N` draws exactly one) and cannot carry state it never ran
    through. Attaching each scene's EFFECTIVE fog makes every scene
    self-contained, which is the same property the rest of the dataset has.
    """
    out, fog = [], None
    for i, c in enumerate(sched):
        if c.get('fog') is not None:
            fog = FOG_PRESETS.index(int(c['fog'], 16))
        if not c['slot']:
            continue
        j = next((k for k in range(i + 1, len(sched)) if sched[k]['slot']), None)
        end = sched[j]['startTick'] if j is not None else \
            sched[-1]['startTick'] + sched[-1]['durTicks']
        # Both halves: the last preset staged, and whether fogging is switched
        # on at this call. A preset with fogging disabled renders clear.
        out.append((int(c['slot'], 16), c['startTick'], end - c['startTick'],
                    fog if c.get('fogOn') else None))
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
        for order, (disp, start, dur, fog) in enumerate(spans(sch[part]['schedule'])):
            samples = tuple(round(dur * (k + 0.5) / NSAMPLES) for k in range(NSAMPLES))
            strm = g(d0, r2, disp)
            o, _ = drawlog.run(strm, frames=samples, txt_tab=txt, obj_tab=obj,
                               overlay=g(d0, r2, over) if over else None)
            frames = drawlog.parse(o)
            if not frames:
                fails += 1
                res.append({'part': part, 'order': order, 'stream': hex(strm),
                            'slot': hex(disp), 'startTick': start, 'durTicks': dur,
                            'fog': fog, 'frames': None,
                            'note': 'did not decode'})
                continue
            res.append({'part': part, 'order': order, 'stream': hex(strm),
                        'slot': hex(disp), 'startTick': start, 'durTicks': dur,
                        'fog': fog,
                        'overlay': hex(over) if over else None,
                        'frames': [{'t': f['time'], 'draws': [
                            {'prim': d['prim'], 'texture': d['texture'],
                             # the node's own screen placement and focal length,
                             # which make the projection invertible
                             'cx': round(d['cx'], 4), 'cy': round(d['cy'], 4),
                             'scale': round(d['scale'], 4), 'clip': d['clip'],
                             # flat per-vertex records: x y z w u v r g b a
                             #
                             # ROUNDING IS PER FIELD, because `w` is a
                             # reciprocal. Five decimals is ample for a screen
                             # coordinate and ruinous for `w`: the eye depth a
                             # consumer recovers as `1/w` degrades quadratically
                             # with distance, and at five places it is worth
                             # about 5 units at an eye depth of 1,000 and 12,500
                             # beyond 10,000 — measured over the whole stream by
                             # projcheck.mjs. So `w`, and the depth `4w` derived
                             # from it, keep their full float32 precision and
                             # everything else stays readable.
                             'v': [c if k in (2, 3) else round(c, 5)
                                   for vx in d['vertices']
                                   for k, c in enumerate(
                                       (vx['x'], vx['y'], vx['z'], vx['w'],
                                        vx['u'], vx['v'], *vx['rgba']))]}
                            for d in f['draws']]} for f in frames]})

    # FAIL LOUDLY ON A BAD RUN. `json.dump` writes bare NaN and Infinity, which
    # no other JSON parser accepts — a browser reading the result gets a syntax
    # error a long way from here, and a Python consumer gets a float that
    # silently poisons every comparison it touches. A re-export that recorded a
    # quarter of the usual draws produced exactly that, so check before writing
    # rather than after someone else's parser complains.
    nonfinite = sum(1 for s in res for f in (s.get('frames') or [])
                    for d in f['draws'] for c in d['v'] if c != c or c in (float('inf'), float('-inf')))
    if nonfinite:
        raise SystemExit(f'export: {nonfinite} non-finite vertex coordinates — '
                         'the recording is bad, not the encoding. Re-run rather '
                         'than writing invalid JSON.')
    json.dump({'screen': [640, 480], 'tick_hz': 50,
               'vertex_fields': ['x', 'y', 'z', 'w', 'u', 'v', 'r', 'g', 'b', 'a'],
               # NOTE THE TWO z's. The `z` FIELD in a vertex record is the
               # depth value the emitter writes, 4/z_eye. Eye-space depth is
               # 1/w. See PORT_SPEC section 4e.
               'projection': 'sx = x*scale/z_eye + cx, sy = y*scale/z_eye + cy; '
                             'the z field is 4/z_eye and w is 1/z_eye; '
                             'invert with x = (sx-cx)/(scale*w), z_eye = 1/w',
               'uv_space': 'texels (0..128), wrapped — not normalised',
               'z': '4/z as a W3D_Double; w = 1/z; both from a PPC fres estimate',
               'tick': 'frame index at 50Hz, local to the scene',
               'patches': PATCH_NOTE,
               'scenes': res}, open(f'{out}/draws.json', 'w'))
    return len(res), fails


def export_segments(flat, out):
    """Copy seg0 and seg4 out verbatim — the softsynth's whole input.

    web/js/synth.js generates both DigiBooster modules at load time from these
    two segments and nothing else: seg0 holds the generator scripts, the float
    pool and the 42 parameter blocks, seg4 the header blobs and the tapes. That
    is 99 KB in place of the 8.3 MB of .dbm the page used to download, and the
    modules that come out are byte-identical — work/re/synthdiff.mjs checks both
    digests against audio.json.

    A copy rather than a slice. Trimming to the ranges the synth actually reads
    is Stage 5's job, where the 64k budget makes it worth deriving the bounds
    from the code that reads them; doing it here would only be a guess that
    breaks quietly when another subsystem is ported.
    """
    n = 0
    for pre in ('seg0_', 'seg4_'):
        src = next(f for f in os.listdir(flat) if f.startswith(pre))
        data = open(os.path.join(flat, src), 'rb').read()
        open(f'{out}/{pre[:4]}.bin', 'wb').write(data)
        n += len(data)
    return n


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

    # Run a PATCHED copy: one word, the glyph-scan terminator. Without it the
    # two text scenes spin forever; with it they decode, and every scene that
    # already worked comes out byte-identical. See ppcrun.fix_glyph_scan.
    print(f'patch       ... glyph scan {H.GLYPH_SCAN:#010x} -> '
          f'{H.fix_glyph_scan(d0):#010x}')
    # seg 5 is BSS and the 68K bootstrap fills it. Without this the harness runs
    # with sin = cos = 0 and rotating geometry collapses to a point.
    print('tables      ...', ', '.join(f'{a}:{n}' for a, n in
                                       H.preload_tables(d0).items()))
    print('segments    ...', end=' ', flush=True); nb = export_segments(flat, out); print(f'{nb} bytes for the softsynth')
    print('font        ...', end=' ', flush=True); ng = export_font(d0, out); print(f'{ng} glyphs')
    print('render state...', end=' ', flush=True); nf = export_render_state(d0, r2, out); print(f'{nf} fog presets')
    print('font atlas  ...', end=' ', flush=True); na = export_font_atlas(flat, out); print(f'{na} set pixels')
    print('tex kernels ...', flush=True)
    sys.argv = ['x', flat, f'{out}/tex_kernels.json']; texconv.main()
    print('tex operands...', flush=True)
    sys.argv = ['x', flat, f'{out}/tex_operands.json']; texprobe.main()
    print('tex programs...', end=' ', flush=True); npg, pgf = export_programs(flat, d0, r2, out); print(f'{npg} programs, {pgf} unreadable')
    print('textures    ...', end=' ', flush=True)
    sys.argv = ['x', flat, f'{out}/textures']; rendertex.main()
    print('meshes      ...', end=' ', flush=True); nm, mf = export_meshes(flat, d0, r2, out); print(f'{nm} programs, {mf} failed')
    print('scenes      ...', end=' ', flush=True); ns, sf = export_scenes(flat, d0, r2, out); print(f'{ns} scenes, {sf} failed')
    print('draw stream ...', flush=True); nd, df = export_draws(flat, d0, r2, out, sys.argv[3:5]); print(f'  {nd} scenes x {NSAMPLES} frames, {df} failed')

    json.dump({'production': 'planet-potion',
               'source': 'planet-potion_dcr.exe, see prod.json for hashes',
               'synth_segment_bytes': nb,
               'font_glyphs': ng, 'font_atlas_pixels': na, 'fog_presets': nf,
               'mesh_programs': nm, 'mesh_failures': mf,
               'scenes': ns, 'scene_failures': sf,
               'tex_programs': npg, 'tex_program_failures': pgf,
               'draw_scenes': nd, 'draw_failures': df, 'draw_samples_per_scene': NSAMPLES,
               'regenerate': 'python3 export.py flat/ out/'},
              open(f'{out}/manifest.json', 'w'), indent=2)
    print(f'\nwrote {out}/  — regenerable, not committed')


if __name__ == '__main__':
    main()
