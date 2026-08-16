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
import struct
import sys

import drawlog
import ppcrun as H

NIL = 0xFFFFFFFF
KEYSZ = 0x104
CHANNELS = 16          # coefficient blocks that fit between +0x0c and +0xfc


def _at(snap, off, fmt):
    return struct.unpack_from(fmt, snap, off)


def read_anim(snap, addr, arena):
    o = addr - arena
    if not 0 <= o < len(snap) - 0x74:
        return None
    return {
        'addr': hex(addr),
        'flags2': snap[o + 2], 'flags3': snap[o + 3],
        'loopMode': (snap[o + 2] & 0xe0) >> 5,
        'dirty': snap[o + 3] & 1,
        'parent': _at(snap, o + 4, '>I')[0],
        'track': _at(snap, o + 8, '>I')[0],
        # The evaluated channels, which is what the polynomial writes into.
        'channels': list(_at(snap, o + 0x0c, '>24f')),
        'origin': _at(snap, o + 0x6c, '>f')[0],
        'trigger': _at(snap, o + 0x70, '>H')[0],
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
        blocks = [list(_at(snap, o + 0x0c + 16 * k, '>4f')) for k in range(CHANNELS)]
        nxt, prev = _at(snap, o + 0xfc, '>II')
        out.append({'addr': hex(addr), 'tick': tick, 'flags': flags,
                    't0': t0, 'invSpan': inv, 'blocks': blocks,
                    'next': nxt, 'prev': prev})
        addr = nxt
    return out


def dump(flat, stream, times, txt_tab=0x2642, obj_tab=0x2706):
    drawlog.setflat(flat)
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
        seen, nodes = set(), []
        for d in draws:
            addr = d.get('node')
            if not addr or addr in seen:
                continue
            seen.add(addr)
            n = drawlog.node(snap, addr)
            if not n:
                continue
            anim = read_anim(snap, n['anim'], arena) if n['anim'] not in (0, NIL) else None
            nodes.append({
                'addr': hex(addr), 'type': n['type'], 'texture': n['texture'],
                'clip': n['clip'],
                # WHAT THE EMITTER USED, straight from the draw record rather
                # than from a guessed offset in the node: these are the numbers
                # a reimplemented _calc_matrix has to produce.
                'cx': d['cx'], 'cy': d['cy'], 'scale': d['scale'],
                'anim': anim,
                'track': read_track(snap, anim['track'], arena) if anim else [],
            })
        frames.append({'t': t, 'nodes': nodes})
    return {'stream': hex(stream), 'arena': hex(arena),
            'note': 'keyframe coefficients and the cx/cy/scale _calc_matrix '
                    'published from them, in the same snapshot',
            'frames': frames}


def main():
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
