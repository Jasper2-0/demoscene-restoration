#!/usr/bin/env python3
"""Export a scene's animation objects and keyframe tracks, with the answers.

    python3 animdump.py flat/ 0x100320b1 out/anim.json [t ...]

`_calc_matrix` evaluates keyframe tracks and publishes `cx`, `cy`, `scale` onto
each render node. `web/js/anim.js` implements the polynomial that does the
evaluating, and until now there was nothing to run it on: `scenes.json` exports
node TYPES, and the draw stream exports the result after the emitter has already
projected it.

The scene-graph snapshot `drawlog.run(nodes=True)` takes per frame has both ends
in the same dump — the keyframe coefficients that go in, and the evaluated
channels that come out. So this writes both, and a reimplemented evaluator can be
diffed against the original's own answers at the same instant, with nothing in
between to explain a difference away.

The publish offsets are confirmed rather than assumed: section 3c says
`anim+0x60/0x64/0x68` become `cx`, `cy`, `scale`, which is channels 21, 22 and 23
of the block starting at `+0x0c`, and in every snapshot taken those three equal
the `cx`/`cy`/`scale` the emitter actually used, to the last digit.

Structures are PORT_SPEC section 3a:

    animation object          keyframe (0x104 bytes)
      +0x02 u8  flags           +0x000 u16 tick
      +0x03 u8  flags           +0x002 u16 flags
      +0x04 u32 parent          +0x004 f32 tick again
      +0x08 u32 track head      +0x008 f32 1/span
      +0x0c.. channels          +0x00c.. 16-byte coefficient blocks
      +0x6c f32 time origin     +0x0fc u32 next
      +0x70 u16 music trigger   +0x100 u32 prev
"""
import json
import os
import struct
import sys

import drawlog
import ppcrun as H

NIL = 0xFFFFFFFF
KEYSZ = 0x104
# FIFTEEN, not sixteen, and not the 24 channels the animation object holds.
# The keyframe is 0x104 bytes with `next` at +0xfc, so the coefficient blocks run
# +0x0c..+0xfc — exactly 15 of them at 16 bytes each, with nothing left over.
# The animation object's channel block is +0x0c..+0x6c, which is 24 floats. So
# the blocks do NOT index the channels one for one, and the published
# cx/cy/scale at channels 21..23 are not a straight copy of three evaluated
# blocks: the first pass calls the evaluator in groups of three and then runs
# 0x10005a08, which indexes the SINE table (`lfsx f21, r28, r3`) — it is
# building a rotation, not copying. Reading that is what section 3c still needs.
BLOCKS = 15


def _at(snap, off, fmt):
    return struct.unpack_from(fmt, snap, off)


def read_anim(snap, addr, arena):
    o = addr - arena
    if not 0 <= o < len(snap) - 0x74:
        return None
    return {
        'addr': hex(addr),
        # +0x00 is the RESOLVED byte pass 1 writes and pass 2 reads back — 1 if
        # the node evaluated this frame, 0 if its track had not started. +0x01
        # is the transform mode: 0 translate-then-rotate, 1 translate only,
        # 2 the transposed rotation path. Neither was dumped before, and pass 1
        # cannot be checked without the second.
        'resolved': snap[o + 0], 'mode': snap[o + 1],
        'flags2': snap[o + 2], 'flags3': snap[o + 3],
        'loopMode': (snap[o + 2] & 0xe0) >> 5,
        'dirty': snap[o + 3] & 1,
        'parent': _at(snap, o + 4, '>I')[0],
        'track': _at(snap, o + 8, '>I')[0],
        # The evaluated channels, which is what the polynomial writes into.
        'channels': list(_at(snap, o + 0x0c, '>24f')),
        # A SIGNED INTEGER TICK, not a float and not unsigned. `lwz r3,
        # 0x6c(r22)` then `subf r3, r3, r29` is 32-bit signed arithmetic, and
        # origins really are negative — the overlay scene's is -50, meaning its
        # track started fifty ticks before the scene did. Read unsigned, that
        # node's local time comes out as -4.29 billion, every keyframe compares
        # as still in the future, and the first block evaluates with a colossal
        # u that clamps to 1.0 instead of the 0.0 the original publishes.
        'origin': _at(snap, o + 0x6c, '>i')[0],
        # A BYTE. `lbz r4, 0x70(r22)` — the halfword read pulled in +0x71 too.
        'trigger': snap[o + 0x70],
    }


def read_track(snap, head, arena, limit=512):
    """Walk +0xfc. Returns the keyframes in list order, coefficients included."""
    out, addr, seen = [], head, set()
    while addr and addr != NIL and addr not in seen and len(out) < limit:
        seen.add(addr)
        o = addr - arena
        if not 0 <= o < len(snap) - KEYSZ:
            break
        tick, flags = _at(snap, o, '>HH')
        t0, inv = _at(snap, o + 4, '>ff')
        blocks = [list(_at(snap, o + 0x0c + 16 * k, '>4f')) for k in range(BLOCKS)]
        nxt, prev = _at(snap, o + 0xfc, '>II')
        out.append({'addr': hex(addr), 'tick': tick, 'flags': flags,
                    't0': t0, 'invSpan': inv, 'blocks': blocks,
                    'next': nxt, 'prev': prev})
        addr = nxt
    return out


def walk_nodes(snap, arena, limit=256):
    """Every node in the list, from the head at arena+4.

    THE HEAD IS AT A FIXED OFFSET and this file used not to know it. The comment
    that replaced this said the graph head "is not in the snapshot", so the walk
    seeded from the addresses in the draw records — which meant it only ever saw
    nodes that DREW, and silently omitted cameras, nodes gated off at the sampled
    time, and anything whose track had not started. `arenadump.py` reports the
    head for all 29 scenes and it is arena+4 in every one of them.

    That matters for checking pass 1 rather than for drawing: a node whose track
    has not started is exactly the case the `r26 = 0` path exists for, and it was
    invisible.
    """
    out, addr, seen = [], arena + 4, set()
    while addr and addr != NIL and addr not in seen and len(out) < limit:
        if not 0 <= addr - arena < len(snap) - 0x30:
            break
        seen.add(addr)
        out.append(addr)
        addr = struct.unpack_from('>I', snap, addr - arena + 0x10)[0]
    return out


def dump(flat, stream, times, txt_tab=0x2642, obj_tab=0x2706):
    drawlog.setflat(flat)
    # The same two steps export.py takes before it runs anything, and this file
    # took neither: the documented invocation died on a qemu SIGSEGV rather than
    # writing anything. seg 5 is BSS, so a PowerPC-only harness starts with the
    # four lookup tables all zero — the 68K bootstrap is what fills them — and
    # `_calc_matrix` is entirely built on them. The glyph-scan patch is the
    # original's own bug, which bites a harness that runs scenes out of order.
    seg0 = next(f for f in os.listdir(flat) if f.startswith('seg0_'))
    d0 = open(os.path.join(flat, seg0), 'rb').read()
    H.fix_glyph_scan(d0)
    H.preload_tables(d0)
    out, err = drawlog.run(stream, frames=times, txt_tab=txt_tab,
                           obj_tab=obj_tab, nodes=True)
    if not out:
        raise SystemExit(f'animdump: no output: {err[:200]}')
    snaps = drawlog.snapshots(out, len(times))
    arena = drawlog.ARENA
    # THE GRAPH HEAD IS NOT IN THE SNAPSHOT. It lives in a global the stub
    # writes (`G_HEAD`), and the snapshot covers only the arena, so walking
    # from the arena base finds one node and stops. The draw log already
    # carries the address of the node behind every primitive — the emitter's
    # own `r30` — so seed from those instead, which also guarantees every node
    # exported is one that actually drew.
    perFrame = drawlog.parse(out, nodes=len(times))
    frames = []
    for i, (t, snap) in enumerate(zip(times, snaps)):
        draws = perFrame[i]['draws'] if i < len(perFrame) else []
        # The draw records still supply cx/cy/scale — what the EMITTER used,
        # which is the number a reimplemented publish pass has to produce — but
        # they are no longer what enumerates the nodes.
        used = {}
        for d in draws:
            if d.get('node') and d['node'] not in used:
                used[d['node']] = d
        nodes = []
        for addr in walk_nodes(snap, arena):
            n = drawlog.node(snap, addr)
            if not n:
                continue
            anim = read_anim(snap, n['anim'], arena) if n['anim'] not in (0, NIL) else None
            d = used.get(addr)
            nodes.append({
                'addr': hex(addr), 'type': n['type'], 'texture': n['texture'],
                'clip': n['clip'],
                'drew': d is not None,
                'cx': d['cx'] if d else None,
                'cy': d['cy'] if d else None,
                'scale': d['scale'] if d else None,
                'anim': anim,
                'track': read_track(snap, anim['track'], arena) if anim else [],
            })
        frames.append({'t': t, 'nodes': nodes})
    return {'stream': hex(stream), 'arena': hex(arena),
            'note': 'keyframe coefficients and the cx/cy/scale _calc_matrix '
                    'published from them, in the same snapshot',
            'frames': frames}


# The same 29 streams arenadump and export_scenes use, in the same order.
JOBS = [
    ('p1', [0x25d2, 0x25aa, 0x25ba, 0x25ce, 0x25ae, 0x25b2, 0x25b6, 0x25ca,
            0x25be, 0x25c2, 0x25c6, 0x25da, 0x25d6, 0x25de, 0x25e2, 0x25ea,
            0x25e6, 0x25ee], 0x2642, 0x2706),
    ('p3', [0x277a + i * 4 for i in range(11)], 0x27a6, 0x27fe),
]


def dump_all(flat, times):
    """Every scene, so pass 1 can be checked against more than one loop mode.

    Seven of the eight modes occur across the 29 scenes — only `0x20` restart
    never does — and one scene exercises exactly one of them.
    """
    seg0 = next(f for f in os.listdir(flat) if f.startswith('seg0_'))
    d0 = open(os.path.join(flat, seg0), 'rb').read()
    r2 = H.read_layout(flat)[0][0] + H.R2_BIAS
    out = []
    for part, disps, txt, obj in JOBS:
        for order, disp in enumerate(disps):
            stream = struct.unpack_from('>I', d0, r2 + disp - 0x10000000)[0]
            try:
                doc = dump(flat, stream, times, txt_tab=txt, obj_tab=obj)
            except SystemExit as e:
                print(f'{part} {order:2} {hex(disp)}  {e}')
                continue
            doc.update(part=part, order=order, slot=hex(disp))
            out.append(doc)
            n = len(doc['frames'][0]['nodes']) if doc['frames'] else 0
            tr = sum(1 for f in doc['frames'] for x in f['nodes'] if x['track'])
            print(f'{part} {order:2} {hex(disp)}  {n:3} nodes, {tr} tracks')
    return {'note': 'every scene at the same times, for checking pass 1',
            'times': times, 'scenes': out}


def main():
    if sys.argv[1:2] == ['--all']:
        flat, dest = sys.argv[2], sys.argv[3]
        times = [int(x) for x in sys.argv[4:]] or [92, 200, 400]
        drawlog.setflat(flat)
        seg0 = next(f for f in os.listdir(flat) if f.startswith('seg0_'))
        d0 = open(os.path.join(flat, seg0), 'rb').read()
        H.fix_glyph_scan(d0)
        H.preload_tables(d0)
        json.dump(dump_all(flat, times), open(dest, 'w'))
        print(f'wrote {dest}')
        return
    flat, stream, dest = sys.argv[1], int(sys.argv[2], 16), sys.argv[3]
    times = [int(x) for x in sys.argv[4:]] or [0, 50, 100, 200]
    doc = dump(flat, stream, times)
    json.dump(doc, open(dest, 'w'))
    for f in doc['frames']:
        withTrack = sum(1 for n in f['nodes'] if n['track'])
        print(f"t={f['t']:5}  {len(f['nodes']):3} nodes, {withTrack} with a keyframe track")
    print(f'wrote {dest}')


if __name__ == '__main__':
    main()
