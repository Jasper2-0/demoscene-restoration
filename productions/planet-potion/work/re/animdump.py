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
        # THE SUB-OBJECT ON +0x74, which nothing exported before. `_restore_time`
        # walks this chain to rebase a scene's clock, and the publish pass's text
        # tail steps to it for the glyph scale: `lwz r22, 0x74(r22)` then reads
        # its channels at +0x30/+0x34. Without them a text node cannot be
        # checked at all — the width and height of every glyph come from here.
        'subAt': _at(snap, o + 0x74, '>I')[0],
        'sub': _sub_channels(snap, _at(snap, o + 0x74, '>I')[0], arena),
    }


def _sub_channels(snap, addr, arena):
    """Just the 24 channels of an anim object, for the +0x74 sub-object."""
    o = addr - arena
    if addr in (0, NIL) or not 0 <= o < len(snap) - 0x6c:
        return None
    return list(_at(snap, o + 0x0c, '>24f'))


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


def _clean(o):
    """Non-finite floats out before writing, as arenadump does.

    Python's json.dump emits bare NaN and Infinity; Python reads them back and
    no JavaScript parser will. animdump never needed this while it dumped only
    keyframe coefficients — the vertex arrays it now walks include records that
    have never been written, and those are full of them.
    """
    if isinstance(o, float):
        return o if -1e30 < o < 1e30 else None
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_clean(v) for v in o]
    return o


MAX_VERTS = 48      # per node — the transform is uniform, so a sample proves it


def read_vertices(snap, arena, head, limit=MAX_VERTS):
    """The mesh vertex list at `node+0x20`, chained on `+0x68`.

    BOTH SIDES of every field, because pass 3's whole job is the split: source
    position at +0x24 becomes +0x00, source colour at +0x30 becomes +0x40,
    source normal at +0x50 becomes +0x5c. A dump of one side cannot check a
    transform.

    Capped per node: the transform is one matrix applied uniformly, so 48
    vertices establish it as well as 4,000 and the file stays readable.
    """
    out, addr, seen = [], head, set()
    while addr and addr != NIL and addr not in seen and len(out) < limit:
        o = addr - arena
        if not 0 <= o < len(snap) - 0x6c:
            break
        seen.add(addr)
        src = struct.unpack_from('>3f', snap, o + 0x24)
        dst = struct.unpack_from('>3f', snap, o)
        out.append({
            'addr': hex(addr),
            'p': list(src), 'out_p': list(dst),
            'rgba': list(struct.unpack_from('>4f', snap, o + 0x30)),
            'out_rgba': list(struct.unpack_from('>4f', snap, o + 0x40)),
            'n': list(struct.unpack_from('>3f', snap, o + 0x50)),
            'out_n': list(struct.unpack_from('>3f', snap, o + 0x5c)),
        })
        addr = struct.unpack_from('>I', snap, o + 0x68)[0]
    return out


def read_cameras(snap, arena, addr, limit=64):
    """A type-6 node's sub-structure chain on `+0x2c`. `0x1000555c`.

    Each link holds a POINTER at +0x00 and its own 24-float channel block at
    +0x04 — the publish pass copies the camera's whole block in there with a
    `lwzu`/`stwu` pair and then concatenates it with the channels of the object
    that pointer leads to, two dereferences away: sub -> node -> animation
    object, +0xc. The chain continues on +0x64.

    Nothing exported this before, so the camera tail ran on 48 node-frames
    without anything able to judge it.
    """
    def u32(o):
        return struct.unpack_from('>I', snap, o)[0]

    out, a, seen = [], addr, set()
    while a not in (0, NIL) and a not in seen and len(out) < limit:
        o = a - arena
        if not 0 <= o < len(snap) - 0x68:
            break
        seen.add(a)
        target = None
        p = u32(o)
        if p not in (0, NIL) and 0 <= p - arena < len(snap) - 4:
            q = u32(p - arena)
            if q not in (0, NIL) and 0 <= q - arena < len(snap) - 0x6c:
                target = list(_at(snap, q - arena + 0x0c, '>24f'))
        out.append({'addr': hex(a), 'targetAt': hex(p), 'target': target,
                    'channels': list(_at(snap, o + 4, '>24f'))})
        a = u32(o + 0x64)
    return out


def read_glyphs(snap, arena, addr, limit=256):
    """A type-4 node's glyph array and the four vertices each one writes.

    `0x10005788` sets the cursor to `node+0x30` and reads with `lwzu r24, 4(...)`,
    which PRE-increments — so the array starts at node+0x34 and node+0x30 is the
    string's total advance width, which scene op 4 stored there. Getting that
    one wrong shifts the whole array by an entry.

    A pointer of -1 is a SPACE: the quad is skipped but the pen still advances.

    Each glyph carries four vertex pointers at +0x18..+0x24 and the tail writes
    nine floats to each — the quad's corners. Those nine are the oracle for the
    text tail, and nothing else in this dump reaches them.
    """
    def u32(o):
        return struct.unpack_from('>I', snap, o)[0]

    def f32(o):
        return struct.unpack_from('>f', snap, o)[0]

    base = addr - arena
    if not 0 <= base < len(snap) - 0x40:
        return None
    count = u32(base + 0x28)
    if count > limit:
        return None
    out = {'count': count,
           'at2c': f32(base + 0x2c), 'advance': f32(base + 0x30),
           'glyphs': []}
    for i in range(count):
        p = u32(base + 0x34 + 4 * i)
        if p == 0xFFFFFFFF:
            out['glyphs'].append({'space': True})
            continue
        g = p - arena
        if not 0 <= g < len(snap) - 0x28:
            out['glyphs'].append({'bad': hex(p)})
            continue
        quad = []
        for k in range(4):
            vp = u32(g + 0x18 + 4 * k)
            v = vp - arena
            quad.append([f32(v + 4 * j) for j in range(9)]
                        if 0 <= v < len(snap) - 0x24 else None)
        out['glyphs'].append({
            'addr': hex(p), 'mode': u32(g),
            'rect': [f32(g + 4 + 4 * j) for j in range(4)],
            'quad': quad,
        })
    return out


def read_objects(snap, arena, head, limit=64):
    """The object chain at `node+0x24` on `+0x60`, and the one vector pass 3
    transforms on it: `+0x3c` into `+0x48`, whose z is §4c's face intensity."""
    out, addr, seen = [], head, set()
    while addr and addr != NIL and addr not in seen and len(out) < limit:
        o = addr - arena
        if not 0 <= o < len(snap) - 0x64:
            break
        seen.add(addr)
        out.append({'addr': hex(addr),
                    'n': list(struct.unpack_from('>3f', snap, o + 0x3c)),
                    'out_n': list(struct.unpack_from('>3f', snap, o + 0x48))})
        addr = struct.unpack_from('>I', snap, o + 0x60)[0]
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
                # Only meshes have a vertex list at +0x20; for other types that
                # field is a count, and walking it as a pointer reads rubbish.
                'vertices': (read_vertices(snap, arena,
                                           struct.unpack_from('>I', snap, addr - arena + 0x20)[0])
                             if n['type'] == 5 else []),
                'objects': (read_objects(snap, arena,
                                         struct.unpack_from('>I', snap, addr - arena + 0x24)[0])
                            if n['type'] == 5 else []),
                'glyphs': (read_glyphs(snap, arena, addr)
                           if n['type'] == 4 else None),
                'cameras': (read_cameras(snap, arena,
                                         struct.unpack_from('>I', snap, addr - arena + 0x2c)[0])
                            if n['type'] == 6 else None),
                'built': snap[addr - arena + 0x0f],
                'drawGate': snap[addr - arena + 0x0c],
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
        json.dump(_clean(dump_all(flat, times)), open(dest, 'w'), allow_nan=False)
        print(f'wrote {dest}')
        return
    flat, stream, dest = sys.argv[1], int(sys.argv[2], 16), sys.argv[3]
    times = [int(x) for x in sys.argv[4:]] or [0, 50, 100, 200]
    doc = dump(flat, stream, times)
    json.dump(_clean(doc), open(dest, 'w'), allow_nan=False)
    for f in doc['frames']:
        withTrack = sum(1 for n in f['nodes'] if n['track'])
        print(f"t={f['t']:5}  {len(f['nodes']):3} nodes, {withTrack} with a keyframe track")
    print(f'wrote {dest}')


if __name__ == '__main__':
    main()
