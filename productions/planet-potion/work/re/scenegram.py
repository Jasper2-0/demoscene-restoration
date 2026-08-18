#!/usr/bin/env python3
"""Decode every scene stream, and check the decode against the running original.

    python3 scenegram.py flat/ out/scenes.json

This file used to hold a grammar read out of the seven scene handlers, and it
scored 0/29 for a long time with the standing instruction not to port a decoder
until it passed. The grammar was not wrong so much as INCOMPLETE, and in a way
worth recording because it is the same mistake twice in this project:

  * IT MISSED A WHOLE STRUCTURE. Every node carries an inline ANIMATION OBJECT,
    read by `0x1000243c` — loop mode, parent, trigger, and a chain of keyframes
    with five independently gated channel groups. That is most of the bytes. The
    old grammar assumed only the seven handlers consumed operands, and they
    account for at most ten bytes of a forty-one byte node;
  * IT MISSED A HEADER BYTE. Every opcode except 7 is followed by a RESOURCE
    byte, whose low seven bits index either the text table or the object table
    depending on the opcode, and whose top bit lands at `node+0x0d`;
  * AND THE BOUND IS `bge`, NOT `bgt`. `0x10002200` stops the walk when the
    cursor REACHES the end rather than passes it, so the last usable opcode sits
    two bytes inside the declared length, not one.

None of that was guessed. `scenewalk.py` measures where every opcode actually
is, by patching the stream's own u16 length and watching the node count step —
and the numbers it produced are what this grammar was written against.
"""
import json
import struct
import sys

BASE = 0x10000000
ABSENT = 77

# Node sizes and handlers, from `r2+0x28ca` and `r2+0x28aa`.
SIZES = {0: 44, 1: 48, 2: 52, 3: 108, 4: 212, 5: 44, 6: 56, 7: 60}
# What each handler reads for itself, AFTER the shared prologue and the node's
# own animation object.
#
# THE SUB-OBJECT COUNT IS THE BIG ONE. Ops 0, 1 and 2 loop 2, 3 and 4 times over
# `0x1000243c` — the SAME routine that read the node's own animation object —
# chaining the results on +0x74, and op 4 does it once. Each of those reads a
# whole animation block out of the stream. That is where the bytes went: a text
# node's own block ends twelve bytes before its length byte, and the twelve are
# a second block with its own gate mask.
SUBOBJECTS = {0: 2, 1: 3, 2: 4, 3: 0, 4: 1, 5: 0, 6: 0}
# And what each handler reads directly, on top of that. Ops 0, 1, 2 and 5 read
# nothing; op 3 reads ten bytes; ops 4 and 6 are variable and handled inline.
HANDLER = {0: 0, 1: 0, 2: 0, 3: 10, 5: 0}


class Overrun(Exception):
    """Read past the end of a stream. A grammar that is wrong about a width
    does not usually stop politely, so this is how it announces itself."""


class Cursor:
    """The four readers at `0x10002738`..`0x10002754`, and nothing else."""

    def __init__(self, b, at):
        self.b, self.at = b, at

    def _need(self, n):
        if self.at + n > len(self.b):
            raise Overrun(f'read {n} at {self.at} of {len(self.b)}')

    def u8(self):
        self._need(1)
        v = self.b[self.at]
        self.at += 1
        return v

    def u16(self):
        self._need(2)
        v = struct.unpack_from('>H', self.b, self.at)[0]
        self.at += 2
        return v

    def s16(self):
        self._need(2)
        v = struct.unpack_from('>h', self.b, self.at)[0]
        self.at += 2
        return v

    def u32(self):
        self._need(4)
        v = struct.unpack_from('>I', self.b, self.at)[0]
        self.at += 4
        return v


def read_anim(c, skip_alpha):
    """`0x1000243c` — the animation object and its keyframe chain.

    THE GATE BITS ARE ACTIVE LOW. `andi.` then `bne` skips the group when the
    bit is SET, so a clear bit means the field is present — the same polarity
    the geometry builder's prologue uses.

    The alpha byte inside group 2 is read only when `r20` is neither 1 nor 4.
    `r20` is 4 for the synthesised root, and it is set to 1 just before a
    handler is called — so a node's OWN animation object reads the byte and
    every SUB-OBJECT a handler allocates does not. One byte per keyframe, and
    it desynchronises everything downstream.
    """
    flags2 = c.u8()
    parent_hi = c.u8()
    parent_lo = c.u8()
    gate = flags2 & 0x1f
    loop = flags2 & 0xe0
    anim = {'flags2': flags2, 'flags3': parent_lo & 0xf0,
            'parent': (parent_hi << 16) | (parent_lo & 0x0f),
            'loopMode': loop >> 5, 'gate': gate, 'keys': []}
    if loop == 0:
        t = c.u8()
        anim['trigger'] = t & 0x0f
        anim['at72'] = (t >> 4) & 7
        anim['at71'] = t >> 7
    # 0x1f means no keyframe DATA — but `0x10002470` has already allocated the
    # track record, so the node still owns exactly one, carrying the defaults
    # `0x10002768` wrote. Reporting zero here makes a correct decode look wrong
    # against a dump that counts records.
    if gate == 0x1f:
        anim['keys'].append({'empty': True})
        return anim
    n = c.u8()
    for _ in range(n + 1):
        k = {'time': None}
        v = c.u16()
        k['hold'] = v >> 15
        k['time'] = v & 0x7fff
        if not gate & 1:
            k['translate'] = [c.s16(), c.s16(), c.s16()]
        if not gate & 2:
            k['rotate'] = [c.s16(), c.s16(), c.s16()]
        if not gate & 4:
            if not skip_alpha:
                k['alpha'] = c.u8()
            k['rgb'] = [c.u8(), c.u8(), c.u8()]
        if not gate & 0x10:
            # A RAW 32-BIT READ, not one of the four readers: one byte doubled
            # and two SIGNED twelve-bit fields, which is the projection triple.
            w = c.u32()
            k['project'] = [(w >> 24) * 2,
                            ((w << 8) & 0xFFFFFFFF) >> 20 | 0,
                            ((w << 20) & 0xFFFFFFFF) >> 20 | 0]
            for i in (1, 2):
                if k['project'][i] >= 0x800:
                    k['project'][i] -= 0x1000
        if not gate & 8:
            k['pan'] = [c.s16(), c.s16()]
        anim['keys'].append(k)
    return anim


def decode(body):
    """-> {nodes, consumed}. The list starts with the synthesised type-7 root.

    THE WALK READS AN OPCODE AND ONLY THEN TESTS THE BOUND, with `bge`. So the
    byte sitting at `length - 1` is consumed and thrown away, and a decoder that
    stops one byte later or earlier desynchronises everything after it.
    """
    c = Cursor(body, 0)
    end = len(body)
    nodes = []
    op, clip = 7, 0
    try:
      while True:
        node = {'op': op, 'clip': clip, 'size': SIZES.get(op), 'at': c.at}
        if op != 7:
            r = c.u8()
            node['resource'] = r & 0x7f
            node['at0d'] = 2 - (r >> 7)
        node['anim'] = read_anim(c, op == 7)
        node['subs'] = [read_anim(c, True)
                        for _ in range(SUBOBJECTS.get(op, 0))]
        if op == 4:
            n = c.u8()
            node['text'] = bytes(c.u8() for _ in range(n)).decode('latin1')
        elif op == 6:
            # `0x10002f44` reads a COUNT and then one byte per camera
            # sub-structure, chaining them on +0x2c and +0x64 — the same chain
            # the publish pass pushes the camera's channel block down.
            n = c.u8()
            node['cameras'] = [c.u8() for _ in range(n)]
        for _ in range(HANDLER.get(op, 0)):
            c.u8()
        nodes.append(node)
        if c.at >= end:
            break
        raw = c.u8()
        if c.at >= end:
            break
        op, clip = raw & 0x7f, raw & 0x80
        if op not in SIZES:
            return {'nodes': nodes, 'consumed': c.at, 'badOpcode': op,
                    'overrun': None}
    except Overrun as e:
        return {'nodes': nodes, 'consumed': c.at, 'badOpcode': None,
                'overrun': str(e)}
    return {'nodes': nodes, 'consumed': c.at, 'badOpcode': None, 'overrun': None}


def streams(flat):
    """Every scene stream, resolved exactly as export_scenes resolves them."""
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    r2 = 0x7ffe
    segs = {}
    import os
    import re
    for fn in os.listdir(flat):
        m = re.match(r'seg\d+_\w+?_([0-9a-f]{8})\.bin$', fn)
        if m:
            segs[int(m.group(1), 16)] = open(os.path.join(flat, fn), 'rb').read()

    def at(a, n):
        for b, d in segs.items():
            if b <= a < b + len(d):
                return d[a - b:a - b + n]
        return b''

    out = []
    for part, disps in JOBS:
        for disp in disps:
            addr = struct.unpack_from('>I', d0, r2 + disp)[0]
            n = struct.unpack('>H', at(addr, 2))[0]
            out.append({'part': part, 'disp': hex(disp), 'addr': hex(addr),
                        'body': at(addr + 2, n)})
    return out


JOBS = [
    ('p1', [0x25d2, 0x25aa, 0x25ba, 0x25ce, 0x25ae, 0x25b2, 0x25b6, 0x25ca,
            0x25be, 0x25c2, 0x25c6, 0x25da, 0x25d6, 0x25de, 0x25e2, 0x25ea,
            0x25e6, 0x25ee]),
    ('p3', [0x2782, 0x2786, 0x278a, 0x278e, 0x2792, 0x2796, 0x279a, 0x279e,
            0x27a2, 0x27a6, 0x27aa]),
]


def main():
    import os
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    oracle = sys.argv[2] if len(sys.argv) > 2 else 'out/arena.json'
    if not os.path.exists(f'{flat}/seg0_CODE_10000000.bin'):
        print('scenegram: no segment dump — see speccheck.py. Skipping.')
        sys.exit(ABSENT)
    if not os.path.exists(oracle):
        print(f'scenegram: {oracle} not here — '
              './ppcbox.sh python3 arenadump.py flat/ out/arena.json. Skipping.')
        sys.exit(ABSENT)

    doc = json.load(open(oracle))
    want = {}
    for sc in doc['scenes']:
        want[sc['stream']] = sc['nodes']

    fields = 0
    bad = []
    streams_ok = streams_seen = 0
    nodes_ok = nodes_seen = 0
    covered = set()
    for s in streams(flat):
        w = want.get(s['addr'])
        if w is None:
            continue
        streams_seen += 1
        r = decode(s['body'])
        g = r['nodes']
        good = len(g) == len(w) and not r['overrun'] and r['badOpcode'] is None
        for i in range(min(len(g), len(w))):
            nodes_seen += 1
            a, b = g[i], w[i]
            anim = b.get('anim') or {}
            checks = [
                ('type', a['op'], b['type']),
                ('clip', 1 if a['clip'] else 0, 1 if b['clip'] else 0),
                ('flags2', a['anim']['flags2'], anim.get('flags2')),
                ('flags3', a['anim']['flags3'], anim.get('flags3')),
                # `parent` is NOT compared. What the stream carries is an
                # encoded reference — `(B << 16) | (C & 0x0f)` — and a post-pass
                # at `0x100022d0` walks the finished list and resolves it into a
                # real pointer, or into -1 for a root. The two are different
                # values by design, and comparing them reads as 339 failures.
                ('keys', len(a['anim']['keys']), len(b.get('track') or [])),
            ]
            if a['op'] != 7:
                checks.append(('at0d', a['at0d'], b.get('at0d')))
            covered.add(a['op'])
            fine = True
            for name, got, wanted in checks:
                if wanted is None:
                    continue
                fields += 1
                if got != wanted:
                    fine = False
                    if len(bad) < 8:
                        bad.append(f"{s['part']} {s['disp']} node {i} "
                                   f'{name}: {got} vs {wanted}')
            nodes_ok += fine
            good = good and fine
        if len(g) != len(w):
            good = False
            if len(bad) < 8:
                bad.append(f"{s['part']} {s['disp']}: {len(g)} nodes vs {len(w)}"
                           + (f"  ({r['overrun']})" if r['overrun'] else ''))
        streams_ok += good

    # THE STRINGS ARE THE CHEAPEST CONFIRMATION IN THE FILE. If the walk were
    # even one byte out of step anywhere before a text node, its length byte
    # would be some other byte and the "string" would be binary noise. Coming
    # out as readable English is evidence no field comparison can give.
    texts = [n['text'] for st in streams(flat)
             for n in decode(st['body'])['nodes'] if n['op'] == 4]
    printable = [t for t in texts
                 if t and all(32 <= ord(ch) < 127 for ch in t)]

    print(f'{nodes_ok}/{nodes_seen} nodes agree on every field '
          f'({fields} comparisons), {streams_ok}/{streams_seen} whole streams')
    print(f'  opcodes exercised: {sorted(covered)}')
    print(f'  {len(printable)}/{len(texts)} text nodes decode to printable '
          f'strings, e.g. {", ".join(repr(t) for t in printable[:4])}')
    for b in bad:
        print(f'  {b}')
    if len(printable) != len(texts):
        print('scenegram: a text node decoded to binary — the walk is out of step')
        sys.exit(1)
    if streams_ok != streams_seen:
        print('scenegram: the grammar does NOT decode every stream')
        sys.exit(1)
    print('every scene stream decodes to the node list the original built')


if __name__ == '__main__':
    main()
