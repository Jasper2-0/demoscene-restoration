#!/usr/bin/env python3
"""Every structure the scene builder builds, for all 29 scenes.

    ./ppcbox.sh python3 arenadump.py flat/ out/arena.json

WHY THIS EXISTS. Three separate stages are blocked on the same missing thing:
there is no export of the BUILT STRUCTURES, only of their type lists and their
final pixels.

  * `scenes.json` carries the ordered render-type list per scene and nothing
    else — no positions, colours, textures, string contents, camera or resource
    indices.
  * `meshes.json` carries geometry opcode 4's vertex arrays only: 112 vertices
    across 24 of the 142 nodes. The 86 nodes that opcodes 0 and 3 build have no
    recorded geometry at all.
  * `anim.json` is the one scene-graph-shaped export that exists, and it covers
    one scene at three times as a check fixture.

So the geometry builder has no oracle, the scene builder has no target, and the
animation passes have no input. One tool answers all three, which is why it is
worth writing before any of them.

WHAT IT CAPTURES, AND WHEN. `runscene.run` builds a scene and stops — the arena
as the scene VM leaves it, BEFORE `_calc_matrix` has evaluated anything and
before the renderer has projected anything. That is the right moment for all
three consumers: it is what the geometry builder produced, what the scene
builder must reproduce, and what the animation passes read on their first tick.

It is also a different moment from `animdump.py`'s, which snapshots per frame
DURING playback and is therefore the oracle for the animation OUTPUT. The two
are complements, not duplicates.

THE NODE LIST IS WALKED FROM ITS HEAD, not seeded from the draw log. That is the
other thing animdump could not do: the graph head is not inside the arena
snapshot `drawlog` takes, so animdump seeds from the addresses in the draw
records and therefore only ever sees nodes that DREW. `runscene.run` returns the
head as its first word, so this walks the real list and captures nodes that draw
nothing — cameras, and anything gated off on the frame that was sampled.

STRUCTURES, read out of the handlers rather than assumed:

    render node                     mesh object / face (they share a record)
      +0x00 anim object               +0x00 vertex count
      +0x08 type * 4                  +0x04 vertex pointer array
      +0x0c draw gate                 +0x10 shading mode
      +0x0e clip flag                 +0x12 cull flag
      +0x0f built-already             +0x2c alpha
      +0x10 next node                 +0x30/34/38 r, g, b
      +0x14/18/1c cx, cy, scale       +0x50 face intensity
      +0x20 sub-object count          +0x54 texture
      +0x24 mesh object head          +0x58 (read, unnamed)
      +0x28 point-sprite head         +0x5c next FACE
      +0x74 sub-object chain          +0x60 next OBJECT

THE OBJECT IS ITS OWN FIRST FACE. `0x100061c4` is `mr r17, r16` — the face
cursor starts at the object address rather than at a pointer inside it — so a
walk that expects a separate face-list pointer finds nothing. Objects advance on
`+0x60`, faces on `+0x5c`, and the first face of each object is the object.

`node+0x28` is a SECOND chain and not part of that one: point sprites, walked on
`+0x10`, each with a vertex pointer at `+0x00` and a half-extent at `+0x04`. The
handler turns texturing off for them (`W3D_SetState 0x1000` and `0x800`) and
sizes each quad through `fres` on the vertex's own z. For text nodes the same
offset is the string pointer instead, per PORT_SPEC section 4a, so it is
reported raw as well as walked.
"""
import json
import os
import struct
import sys

import animdump
import ppcrun as H
import runscene

NIL = 0xFFFFFFFF
NODE_BYTES = 0x80          # dumped raw as well as decoded — see `raw` below
MAX_NODES = 256
MAX_OBJECTS = 256
MAX_FACES = 512
MAX_VERTS = 64             # per face; the array is inline from +0x04
MAX_VERTLIST = 8192        # per node, walking node+0x20 on +0x68
MAX_SPRITES = 512

# The same 29 streams `export_scenes` runs, in the same order, so `scenes.json`
# and this file index the same scenes.
JOBS = [
    ('p1', [0x25d2, 0x25aa, 0x25ba, 0x25ce, 0x25ae, 0x25b2, 0x25b6, 0x25ca,
            0x25be, 0x25c2, 0x25c6, 0x25da, 0x25d6, 0x25de, 0x25e2, 0x25ea,
            0x25e6, 0x25ee], 0x2642, 0x2706),
    ('p3', [0x277a + i * 4 for i in range(11)], 0x27a6, 0x27fe),
]


class Arena:
    """The dumped arena, with bounds-checked readers."""

    def __init__(self, data, base):
        self.d, self.base = data, base

    def has(self, addr, n):
        o = addr - self.base
        return 0 <= o and o + n <= len(self.d)

    def u8(self, a, o=0):
        return self.d[a - self.base + o]

    def u16(self, a, o=0):
        return struct.unpack_from('>H', self.d, a - self.base + o)[0]

    def u32(self, a, o=0):
        return struct.unpack_from('>I', self.d, a - self.base + o)[0]

    def f32(self, a, o=0):
        return struct.unpack_from('>f', self.d, a - self.base + o)[0]

    def vec3(self, a, o=0):
        return list(struct.unpack_from('>3f', self.d, a - self.base + o))

    def raw(self, a, n):
        return self.d[a - self.base:a - self.base + n].hex()


def _fin(v):
    """JSON has no NaN or Infinity, and an uninitialised arena word is often
    both. Writing them bare produces a file no browser will parse."""
    return v if -1e30 < v < 1e30 else None


def _clean(o):
    """Sweep the whole document for non-finite floats before writing it.

    `_fin` guards the fields this file reads, and that is not enough: the
    animation object and its keyframe tracks come from `animdump`, which returns
    raw floats, and an arena that has not been evaluated yet is full of
    uninitialised words. `json.dump` writes those as bare `NaN` and `Infinity`,
    which Python reads back happily and no JavaScript parser will touch — so
    the file looked fine from the tool that wrote it and failed in the checker.
    Doing it here rather than at each call site means anything added later is
    covered by construction.
    """
    if isinstance(o, float):
        return _fin(o)
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_clean(v) for v in o]
    return o


def read_vertex(A, addr):
    """A vertex, SOURCE fields first.

    THE BUILT GEOMETRY IS AT +0x24, NOT AT +0x00. The animation pass
    (`0x100055b0`) reads `+0x24/28/2c`, multiplies by the node's 3x3 and adds
    its translation, and STORES THE RESULT AT +0x00/04/08 — which is where the
    renderer then reads it. So before `_calc_matrix` has run, +0x00 is zero and
    +0x24 holds what the geometry builder produced. Dumping +0x00 out of a
    freshly built arena, as the first version of this did, records 4,658
    vertices of nothing.

    The same split runs through the whole record: source colour at +0x30 becomes
    scaled colour at +0x40, source normal at +0x50 becomes transformed normal at
    +0x5c. Both sides are kept, because the source is the geometry oracle and
    the destination is the animation oracle.

        +0x00/04/08  transformed position     +0x24/28/2c  SOURCE position
        +0x40..4c    scaled colour            +0x30..3c    SOURCE colour, rgba
        +0x5c/60/64  transformed normal       +0x50/54/58  SOURCE normal
        +0x68        next vertex
    """
    if not A.has(addr, 0x6c):
        return None
    return {
        'addr': hex(addr),
        'p': [_fin(x) for x in A.vec3(addr, 0x24)],
        'rgba': [_fin(A.f32(addr, 0x30 + 4 * i)) for i in range(4)],
        'n': [_fin(x) for x in A.vec3(addr, 0x50)],
        'out': {
            'p': [_fin(x) for x in A.vec3(addr)],
            'rgba': [_fin(A.f32(addr, 0x40 + 4 * i)) for i in range(4)],
            'n': [_fin(x) for x in A.vec3(addr, 0x5c)],
        },
        'next': hex(A.u32(addr, 0x68)),
    }


def read_vertex_list(A, head, verts):
    """`node+0x20`, chained on `+0x68` — the authoritative enumeration.

    The face records point at vertices too, but only at the ones they use; this
    is the list the animation pass walks, so it is the one that says which
    vertices the builder made.
    """
    out, addr, seen = [], head, set()
    while addr and addr != NIL and addr not in seen and len(out) < MAX_VERTLIST:
        v = read_vertex(A, addr)
        if not v:
            break
        seen.add(addr)
        verts[addr] = v
        out.append(hex(addr))
        addr = A.u32(addr, 0x68)
    return out


def read_faces(A, obj, verts):
    """One object's face chain, on `+0x5c`, starting AT the object."""
    out, addr, seen = [], obj, set()
    while addr and addr != NIL and addr not in seen and len(out) < MAX_FACES:
        if not A.has(addr, 0x64):
            break
        seen.add(addr)
        n = A.u32(addr)
        vs = []
        if 0 < n <= MAX_VERTS and A.has(addr, 4 + 4 * n):
            for i in range(n):
                p = A.u32(addr, 4 + 4 * i)
                vs.append(hex(p))
                if p not in verts:
                    v = read_vertex(A, p)
                    if v:
                        verts[p] = v
        out.append({
            'addr': hex(addr), 'vertexCount': n, 'vertices': vs,
            # BYTES. `lbz r3, 0x10(r17)` and `lbz r3, 0x12(r17)` — read as
            # halfwords they come out as 256, 512, 1024 and read as modes they
            # are 1, 2, 4, which is the difference between matching §4c and not.
            'shading': A.u8(addr, 0x10), 'cull': A.u8(addr, 0x12),
            'alpha': _fin(A.f32(addr, 0x2c)),
            'rgb': [_fin(x) for x in A.vec3(addr, 0x30)],
            'intensity': _fin(A.f32(addr, 0x50)),
            'texture': A.u32(addr, 0x54),
            'at58': A.u32(addr, 0x58),
        })
        addr = A.u32(addr, 0x5c)
    return out


def read_objects(A, head, verts):
    """The object chain on `+0x60`; each object is also its own first face."""
    out, addr, seen = [], head, set()
    while addr and addr != NIL and addr not in seen and len(out) < MAX_OBJECTS:
        if not A.has(addr, 0x64):
            break
        seen.add(addr)
        out.append({'addr': hex(addr), 'faces': read_faces(A, addr, verts)})
        addr = A.u32(addr, 0x60)
    return out


def read_sprites(A, head, verts):
    """`node+0x28`: point sprites, chained on `+0x10`."""
    out, addr, seen = [], head, set()
    while addr and addr != NIL and addr not in seen and len(out) < MAX_SPRITES:
        if not A.has(addr, 0x14):
            break
        seen.add(addr)
        p = A.u32(addr)
        if p not in verts:
            v = read_vertex(A, p)
            if v:
                verts[p] = v
        out.append({'addr': hex(addr), 'vertex': hex(p),
                    'halfExtent': _fin(A.f32(addr, 4))})
        addr = A.u32(addr, 0x10)
    return out


def read_node(A, addr, verts):
    """Every field of a render node, decoded where it is understood and dumped
    raw where it is not — 0x80 bytes covers every offset any handler reads."""
    anim_at = A.u32(addr)
    mesh_at = A.u32(addr, 0x24)
    sprite_at = A.u32(addr, 0x28)
    anim = (animdump.read_anim(A.d, anim_at, A.base)
            if anim_at not in (0, NIL) and A.has(anim_at, 0x74) else None)
    n = {
        'addr': hex(addr),
        'type': A.u16(addr, 8) // 4,
        'animAt': hex(anim_at),
        'at04': A.u32(addr, 4),
        'drawGate': A.u8(addr, 0x0c),
        'at0d': A.u8(addr, 0x0d),
        'clip': A.u8(addr, 0x0e),
        'built': A.u8(addr, 0x0f),
        'next': hex(A.u32(addr, 0x10)),
        'cx': _fin(A.f32(addr, 0x14)),
        'cy': _fin(A.f32(addr, 0x18)),
        'scale': _fin(A.f32(addr, 0x1c)),
        # OVERLOADED BY TYPE: the vertex list head for meshes (walked by
        # 0x100055b0 on +0x68), a sub-object count for the text builder
        # (PORT_SPEC §4a). Reported raw, and walked when it resolves.
        'at20': A.u32(addr, 0x20),
        'meshAt': hex(mesh_at),
        'spriteAt': hex(sprite_at),
        'at2c': _fin(A.f32(addr, 0x2c)),
        'at30': _fin(A.f32(addr, 0x30)),
        'cameraGate': A.u32(addr, 0x34),
        'at68': A.u32(addr, 0x68),
        'subObject': hex(A.u32(addr, 0x74)),
        'raw': A.raw(addr, NODE_BYTES),
        'anim': anim,
        'track': (animdump.read_track(A.d, anim['track'], A.base)
                  if anim and anim['track'] not in (0, NIL) else []),
        'vertexList': (read_vertex_list(A, A.u32(addr, 0x20), verts)
                       if A.u32(addr, 0x20) not in (0, NIL)
                       and A.has(A.u32(addr, 0x20), 0x6c) else []),
        'objects': read_objects(A, mesh_at, verts) if mesh_at not in (0, NIL) else [],
        'sprites': read_sprites(A, sprite_at, verts) if sprite_at not in (0, NIL) else [],
    }
    return n


def dump_scene(part, order, disp, stream, txt, obj):
    try:
        dat, err = runscene.run(stream, txt_tab=txt, obj_tab=obj)
    except Exception as e:                                   # noqa: BLE001
        return {'part': part, 'order': order, 'slot': hex(disp),
                'stream': hex(stream), 'note': f'raised: {e}'}
    if len(dat) < 8:
        return {'part': part, 'order': order, 'slot': hex(disp),
                'stream': hex(stream), 'note': 'did not decode'}
    head = struct.unpack('>I', dat[:4])[0]
    A = Arena(dat[4:], runscene.ARENA)

    verts, nodes, addr, seen = {}, [], head, set()
    while addr and addr != NIL and addr not in seen and len(nodes) < MAX_NODES:
        if not A.has(addr, NODE_BYTES):
            break
        seen.add(addr)
        nodes.append(read_node(A, addr, verts))
        addr = A.u32(addr, 0x10)

    return {'part': part, 'order': order, 'slot': hex(disp),
            'stream': hex(stream), 'head': hex(head),
            'nodes': nodes,
            'vertices': {hex(k): v for k, v in sorted(verts.items())}}


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    dest = sys.argv[2] if len(sys.argv) > 2 else 'out/arena.json'
    runscene.setflat(flat) if hasattr(runscene, 'setflat') else None
    runscene.FLAT = H.FLAT = flat
    seg0 = next(f for f in os.listdir(flat) if f.startswith('seg0_'))
    d0 = open(os.path.join(flat, seg0), 'rb').read()
    # export.py's two prerequisites, and this needs both for the same reasons:
    # without the glyph-scan patch the two text scenes spin forever, and without
    # the tables seg5 is zero and everything built on them collapses.
    H.fix_glyph_scan(d0)
    H.preload_tables(d0)
    r2 = H.read_layout(flat)[0][0] + H.R2_BIAS

    scenes, fails = [], 0
    for part, disps, txt, obj in JOBS:
        for order, disp in enumerate(disps):
            stream = struct.unpack_from('>I', d0, r2 + disp - 0x10000000)[0]
            s = dump_scene(part, order, disp, stream, txt, obj)
            if 'nodes' not in s:
                fails += 1
            scenes.append(s)
            nn = len(s.get('nodes') or [])
            nf = sum(len(o['faces']) for n in s.get('nodes') or []
                     for o in n['objects'])
            nv = len(s.get('vertices') or {})
            ns = sum(len(n['sprites']) for n in s.get('nodes') or [])
            print(f'{part} {order:2} {hex(disp)}  {nn:3} nodes  {nf:4} faces  '
                  f'{nv:5} vertices  {ns:4} sprites'
                  + ('' if nn else f'   {s.get("note", "")}'))

    doc = {'note': 'the arena as the scene VM leaves it, before _calc_matrix. '
                   'See arenadump.py for the structures and where they were read.',
           'arena': hex(runscene.ARENA), 'nodeBytes': NODE_BYTES,
           'scenes': scenes}
    with open(dest, 'w') as f:
        json.dump(_clean(doc), f, allow_nan=False)
    tot = sum(len(s.get('nodes') or []) for s in scenes)
    print(f'\nwrote {dest} — {len(scenes)} scenes, {tot} nodes, {fails} failed')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
