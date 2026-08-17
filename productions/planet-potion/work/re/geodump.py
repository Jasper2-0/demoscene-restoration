"""Every structure the geometry builder builds, for all 39 programs.

    ./ppcbox.sh python3 geodump.py flat/ out/geo.json

`meshes.json` records op4's vertex arrays and nothing else — 24 of 142 nodes —
so the 86 nodes ops 0 and 3 build have no recorded geometry at all. This is the
oracle that replaces it: run `_generate_obj` on every program and read back all
three chains it hangs off each geometry node.

    node +0x00  0x58 bytes, chained +0x54   the shared prologue's records
         +0x04  0x6c bytes, chained +0x68   vertices
         +0x08  0x52 bytes, chained +0x4e   indexed triangles
         +0x10  u16 opcode * 4
         +0x14  next node

THE 0x52 TRIANGLE IS NOT THE FACE `arenadump.read_faces` WALKS. That one is
0x64+ bytes with u32 vertex POINTERS at +0x04 and a +0x5c chain; this one is
0x52 bytes with u16 vertex INDICES at +0x02/+0x04/+0x06 and a +0x4e chain.
`0x1000335c` emits one triangle from (r25, r24, r23) and, when `r15` is not
0xffff, a second from (r23, r15, r25) — a quad as two triangles, both with a
count of 3. Something downstream (`0x10003868`) fills the rest of the record in
from the 0x58 material record, which is why the two layouts overlap in the
middle and reading one as the other half works.

WHAT THIS TOOL PROVES, and it contradicts NOTES.md. The build-time operand
widths were recorded as "structurally unmodellable from the stream" because the
shared prologue indexes a table built at runtime. That table is the TEXTURE
table, passed in as `_generate_obj`'s second argument, and it is read for two
POINTER VALUES at `table[byte1 * 8]` — never for a width. Every width in the
prologue and in all five handlers is gated by a bit that was itself read from
the stream a few instructions earlier. `geogram.py` decodes all 39 programs
statically and checks itself against what this tool dumps.
"""
import json
import struct
import sys
import os
import subprocess
import ppcrun as H

FLAT = H.FLAT = (sys.argv[1] if len(sys.argv) > 1 else 'flat')
BASE = 0x10000000
R2 = BASE + 0x7FFE
NIL = 0xFFFFFFFF
SET_ALLOC, GEN_OBJ = 0x10006b14, 0x10003018
# EVERY REGION HERE SITS ABOVE 0x20600000, and that is not cosmetic. ppcrun's
# SCRATCH is one PT_LOAD of 0x20000000 + 0x600000 that deliberately swallows
# STACK and DEST as zero fill; rungeo.py puts its arena at 0x20340000, INSIDE
# that. Adding a second PT_LOAD over the same addresses — which a dumper needs,
# because the texture table has to arrive with contents — makes two overlapping
# program headers and the loader segfaults before reaching main.
ARENA, ARENA_SZ = 0x20600000, 0x00800000
OUT = 0x20f00000
# Distinct stubs per Warp3D vector, for the same reason runscene.py has them:
# the builder bakes DrawTriFan or DrawLineStrip into a record as a fan/strip
# discriminator, and one shared vector erases the distinction.
W3DBASE, STUBS, TABLE, NVEC = 0x21000000, 0x21100000, 0x21200000, 100
STUBSZ = 32
# The texture table's entries must be DISTINCT so a record's +0x14/+0x18 says
# which slot it came from — and DEREFERENCEABLE, because at least one program
# follows them. An earlier version used the unmapped sentinels 0x7E0000ii and
# p1[26] segfaulted on the twelfth opcode; pointing the same distinct values at
# real zeroed memory fixed it. `runscene.py` reached the same arrangement for
# its texture objects for the same reason.
TEXOBJ, TEXSTRIDE = 0x21800000, 0x200
MAX_NODES, MAX_RECS, MAX_VERTS, MAX_TRIS = 256, 4096, 65536, 65536

# The two programs' pointer tables, exactly as export.py resolves them.
PROGRAMS = (('p1', 0x2706, 28), ('p3', 0x27fe, 11))


def stub_addr(i):
    return STUBS + i * STUBSZ


def vector_addr(i):
    """The pointer for LVO -6*(i+1) lives at LVO+2."""
    return W3DBASE - (6 * (i + 1) - 2)


def stw(s, a, d):
    return (36 << 26) | (s << 21) | (a << 16) | (d & 0xFFFF)


def lwz(d, a, o):
    return (32 << 26) | (d << 21) | (a << 16) | (o & 0xFFFF)


def subf(d, a, b):
    return (31 << 26) | (d << 21) | (a << 16) | (b << 11) | (40 << 1)


def data_segments():
    """The Warp3D vector table and the texture table, as memory images.

    Building these as data rather than as emitted stores keeps the stub short
    and lets the texture table carry 256 DISTINCT entries — the prologue reads
    two words from `table[byte1 * 8]`, and a table of zeroes would make every
    record's +0x14/+0x18 identical and unfalsifiable.
    """
    lo = W3DBASE - 0x1000
    vec = bytearray(0x1000)
    for i in range(NVEC):
        struct.pack_into('>I', vec, vector_addr(i) - lo, stub_addr(i))
    stubs = b''.join(struct.pack('>I', 0x4E800020) + b'\0' * (STUBSZ - 4)
                     for _ in range(NVEC))
    tab = bytearray(256 * 8)
    for i in range(256):
        struct.pack_into('>II', tab, i * 8,
                         TEXOBJ + i * TEXSTRIDE, TEXOBJ + i * TEXSTRIDE + 0x100)
    return [(lo, bytes(vec), 0x1000), (STUBS, stubs, len(stubs)),
            (TABLE, bytes(tab), len(tab)),
            (TEXOBJ, None, 256 * TEXSTRIDE)]


def run(prog):
    """-> (head, high-water, arena bytes) for one geometry program."""
    c = []
    c += H.load32(1, H.STACK) + H.load32(2, R2) + H.load32(13, H.STACK - 0x1000)
    c += H.load32(5, W3DBASE) + H.load32(6, 0x1000a348) + [stw(5, 6, 0)]
    c += H.load32(3, ARENA) + H.call32(12, SET_ALLOC)
    c += H.load32(3, prog) + H.load32(4, TABLE) + H.call32(12, GEN_OBJ)
    c += H.load32(4, OUT) + [stw(3, 4, 0)]
    c += H.load32(5, ARENA) + [lwz(6, 5, 0), stw(6, 4, 4)]   # the bump cursor
    c += H.load32(4, OUT) + H.load32(5, 8) + [H.li(0, 4), H.li(3, 1), H.sc()]
    # Dump exactly as far as the allocator got, so the window can never silently
    # truncate the way animdump's fixed 0x20000 once did.
    c += H.load32(4, ARENA) + [lwz(5, 4, 0), subf(5, 4, 5)]
    c += [H.li(0, 4), H.li(3, 1), H.sc()]
    c += [H.li(0, 1), H.li(3, 0), H.sc()]
    stub = b''.join(struct.pack('>I', w) for w in c)

    pieces = H.segments(FLAT)
    pieces.append((H.SCRATCH, stub, 0x00600000))
    pieces.append((ARENA, None, ARENA_SZ))
    pieces.append((OUT, None, 0x1000))
    pieces += data_segments()
    EH, PH, AL = 52, 32, 0x1000
    blob = b''
    loads = []
    cur = EH + PH * len(pieces)
    for va, data, msz in pieces:
        if data is None:
            loads.append((va, 0, msz, 0, 6))
            continue
        blob += b'\0' * ((-(cur + len(blob))) % AL)
        loads.append((va, len(data), max(msz, len(data)), cur + len(blob), 7))
        blob += data
    eh = (b'\x7fELF' + bytes([1, 2, 1, 0]) + b'\0' * 8
          + struct.pack('>HHIIIIIHHHHHH', 2, 20, 1, H.SCRATCH, EH, 0, 0,
                        EH, PH, len(pieces), 0, 0, 0))
    phs = b''.join(struct.pack('>IIIIIIII', 1, off, va, va, f, m, fl, AL)
                   for va, f, m, off, fl in loads)
    open('/tmp/pp-geodump.elf', 'wb').write(eh + phs + blob)
    os.chmod('/tmp/pp-geodump.elf', 0o755)
    p = subprocess.run([H.qemu(), '/tmp/pp-geodump.elf'],
                       capture_output=True, timeout=300)
    if len(p.stdout) < 8:
        raise RuntimeError(p.stderr.decode('utf8', 'replace').strip()[:200]
                           or 'no output')
    head, hi = struct.unpack('>II', p.stdout[:8])
    return head, hi, p.stdout[8:]


class Arena:
    """Bounds-checked readers over the dumped arena."""

    def __init__(self, data, base=ARENA):
        self.d, self.base = data, base

    def has(self, a, n):
        o = a - self.base
        return 0 <= o and o + n <= len(self.d)

    def u8(self, a, o=0):
        return self.d[a - self.base + o]

    def u16(self, a, o=0):
        return struct.unpack_from('>H', self.d, a - self.base + o)[0]

    def u32(self, a, o=0):
        return struct.unpack_from('>I', self.d, a - self.base + o)[0]

    def s32(self, a, o=0):
        return struct.unpack_from('>i', self.d, a - self.base + o)[0]

    def f32(self, a, o=0):
        return struct.unpack_from('>f', self.d, a - self.base + o)[0]

    def vec3(self, a, o=0):
        return list(struct.unpack_from('>3f', self.d, a - self.base + o))

    def raw(self, a, n):
        return self.d[a - self.base:a - self.base + n].hex()


def _fin(v):
    """JSON has no NaN or Infinity and an unevaluated arena word is often both."""
    return v if -1e30 < v < 1e30 else None


def _clean(o):
    if isinstance(o, float):
        return _fin(o)
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_clean(v) for v in o]
    return o


def chain(A, head, nxt, size, limit):
    """Walk a linked list of fixed-size records. Cycle- and bound-safe."""
    out, a, seen = [], head, set()
    while a and a != NIL and A.has(a, size) and a not in seen and len(out) < limit:
        seen.add(a)
        out.append(a)
        a = A.u32(a, nxt)
    return out, (a not in (0, NIL) and len(out) >= limit)


def read_record(A, a):
    """One 0x58 material record, exactly as `0x100030f8` writes it.

    The four floats at +0x04..+0x10 are PRE-SET TO 1.0 and only overwritten when
    bit 3 of the flags byte is CLEAR, so a record that does not carry a colour
    reads as opaque white rather than as zero. `alloc_mem` zeroes what it hands
    out, so anything still zero here was genuinely never written.
    """
    return {
        'addr': hex(a),
        'kind': A.u8(a, 0x00),
        'sub': A.u8(a, 0x01),
        'cull': A.u8(a, 0x02),
        'flag': A.u8(a, 0x03),
        'rgba': [_fin(A.f32(a, 0x04 + 4 * i)) for i in range(4)],
        'texA': hex(A.u32(a, 0x14)),
        'texB': hex(A.u32(a, 0x18)),
        'texIndex': table_index(A.u32(a, 0x18)),
        'size': [_fin(A.f32(a, 0x1c)), _fin(A.f32(a, 0x20))],
        'span': [_fin(A.f32(a, 0x24)), _fin(A.f32(a, 0x28))],
        'at2c': _fin(A.f32(a, 0x2c)),
        'translate': [_fin(x) for x in A.vec3(a, 0x30)],
        # Degrees times 91, kept as the INTEGER the builder stored: 32768/360 is
        # 91.02, so the sine table's 8,192 entries span exactly one turn.
        'rotate': [A.s32(a, 0x3c), A.s32(a, 0x40), A.s32(a, 0x44)],
        'scale': [_fin(x) for x in A.vec3(a, 0x48)],
        'next': hex(A.u32(a, 0x54)),
    }


def table_index(v):
    """Which texture-table slot a record's +0x18 came from, or None.

    `data_segments` gives every slot a distinct address precisely so this is
    answerable; a zeroed table would make every record's texture identical, the
    same way one shared draw vector once erased fan-vs-strip on every face.
    """
    d = v - TEXOBJ
    return d // TEXSTRIDE if 0 <= d < 256 * TEXSTRIDE and d % TEXSTRIDE == 0 else None


def read_vertex(A, a):
    """A 0x6c vertex. SOURCE fields only — nothing has transformed it yet.

    `arenadump.read_vertex` documents why +0x24 rather than +0x00 is the built
    position: `_calc_matrix` reads +0x24 and stores the result at +0x00. Out of
    a freshly built arena +0x00 is still zero, so a dump that read it would
    record thousands of vertices of nothing.
    """
    return {
        'addr': hex(a),
        'p': [_fin(x) for x in A.vec3(a, 0x24)],
        'rgba': [_fin(A.f32(a, 0x30 + 4 * i)) for i in range(4)],
        'n': [_fin(x) for x in A.vec3(a, 0x50)],
        'next': hex(A.u32(a, 0x68)),
    }


def read_triangle(A, a):
    """A 0x52 indexed triangle. The count is ALWAYS 3 — `0x1000335c` hardcodes
    `li r3, 3` on both of its two emit sites, and a quad arrives as two of
    these rather than as one record with four indices."""
    return {
        'addr': hex(a),
        'count': A.u16(a, 0x00),
        'idx': [A.u16(a, 0x02), A.u16(a, 0x04), A.u16(a, 0x06)],
        # The middle of the record is filled in later, from the 0x58 material
        # record, by 0x10003868. Kept raw rather than guessed at.
        'mid': A.raw(a + 0x08, 0x46),
        'next': hex(A.u32(a, 0x4e)),
    }


# Per-opcode node fields, from the five handlers at 0x1000a9b0. Each entry is
# (offset, reader) and the readers are named for what the handler stores.
def read_node_fields(A, a, op):
    if op == 0:
        return {'mode': A.u8(a, 0x18)}
    if op == 1:
        return {'at18': A.u32(a, 0x18),
                'a': [_fin(x) for x in A.vec3(a, 0x1c)],
                'b': [_fin(x) for x in A.vec3(a, 0x28)],
                'scale': [_fin(x) for x in A.vec3(a, 0x34)]}
    if op == 2:
        return {'at18': A.u16(a, 0x18), 'sel': A.u16(a, 0x1a),
                'value': _fin(A.f32(a, 0x1c))}
    if op == 3:
        # +0x19 is the outer count and +0x1b the packed 2-bit transform
        # selectors PORT_SPEC 4b describes; the triples follow on 0xc centres.
        return {'at18': A.u8(a, 0x18), 'count': A.u8(a, 0x19),
                'flag': A.u8(a, 0x1a), 'sel': A.u8(a, 0x1b),
                'triples': [[_fin(x) for x in A.vec3(a, 0x1c + 0xc * i)]
                            for i in range(4)]}
    if op == 4:
        n = A.u16(a, 0x1a)
        p = A.u32(a, 0x1c)
        pts = []
        if 0 < n <= 4096 and A.has(p, n * 20):
            for i in range(n):
                q = p + i * 20
                pts.append({'p': [_fin(x) for x in A.vec3(q)],
                            'w': _fin(A.f32(q, 0xc)), 'k': A.u32(q, 0x10)})
        return {'at18': A.u8(a, 0x18), 'flag': A.u8(a, 0x19),
                'count': n, 'points': pts}
    return {}


def dump_program(part, index, prog):
    head, hi, data = run(prog)
    A = Arena(data)
    used = hi - ARENA
    nodes, truncated = [], []
    seq, over = chain(A, head, 0x14, 0x20, MAX_NODES)
    if over:
        truncated.append('nodes')
    for a in seq:
        op = A.u16(a, 0x10) // 4
        recs, o1 = chain(A, A.u32(a, 0x00), 0x54, 0x58, MAX_RECS)
        verts, o2 = chain(A, A.u32(a, 0x04), 0x68, 0x6c, MAX_VERTS)
        tris, o3 = chain(A, A.u32(a, 0x08), 0x4e, 0x52, MAX_TRIS)
        for flag, name in ((o1, 'records'), (o2, 'vertices'), (o3, 'triangles')):
            if flag:
                truncated.append(f'{hex(a)}:{name}')
        n = {'addr': hex(a), 'op': op,
             'records': [read_record(A, r) for r in recs],
             'vertices': [read_vertex(A, v) for v in verts],
             'triangles': [read_triangle(A, t) for t in tris]}
        n.update(read_node_fields(A, a, op))
        nodes.append(n)
    return {'part': part, 'index': index, 'program': hex(prog),
            'head': hex(head), 'arenaUsed': used, 'nodes': nodes,
            'truncated': truncated}


def main():
    try:
        d0 = open(os.path.join(FLAT, 'seg0_CODE_10000000.bin'), 'rb').read()
    except FileNotFoundError:
        print('geodump: no segment dump under ' + repr(FLAT) + ' — see '
              'speccheck.py for the rehydration steps.', file=sys.stderr)
        sys.exit(77)
    # WITHOUT THIS the second half of _generate_obj — the eval pass that runs
    # over the finished node list — reads a zeroed sine table, and every
    # rotation collapses to zero. rungeo.py omits it and gets away with it only
    # because it never looks past the node list; export.py's main() happens to
    # call it first, so export_meshes is preloaded by luck of call order rather
    # than by anything export_meshes does.
    H.preload_tables(d0)

    out = sys.argv[2] if len(sys.argv) > 2 else 'out/geo.json'
    progs, fails = [], []
    for part, disp, n in PROGRAMS:
        for i in range(n):
            addr = struct.unpack_from('>I', d0, 0x7FFE + disp + i * 4)[0]
            if addr == NIL:
                continue
            try:
                progs.append(dump_program(part, i, addr))
            except Exception as e:
                fails.append(f'{part}[{i}] {addr:#x}: {e}')
    doc = {'note': 'every structure _generate_obj builds, all 39 programs',
           'arena': hex(ARENA), 'textureTable': hex(TABLE),
           'programs': progs, 'failed': fails}
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    json.dump(_clean(doc), open(out, 'w'), indent=1)

    nodes = sum(len(p['nodes']) for p in progs)
    verts = sum(len(n['vertices']) for p in progs for n in p['nodes'])
    tris = sum(len(n['triangles']) for p in progs for n in p['nodes'])
    recs = sum(len(n['records']) for p in progs for n in p['nodes'])
    trunc = [t for p in progs for t in p['truncated']]
    print(f'{len(progs)} programs, {nodes} nodes, {recs} records, '
          f'{verts} vertices, {tris} triangles -> {out}')
    print(f'  arena high-water {max((p["arenaUsed"] for p in progs), default=0)} '
          f'of {ARENA_SZ} bytes')
    for f in fails:
        print(f'  FAILED {f}')
    if trunc:
        print(f'  TRUNCATED at a walk limit: {trunc[:10]}')


if __name__ == '__main__':
    main()
