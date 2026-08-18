"""Record the Warp3D draw stream by running _show_scene itself.

The three pure subsystems could be run as functions. The renderer cannot: it
ends in library calls. But those calls are the interesting part, so instead of
stubbing them to nothing we point every Warp3D vector at a stub that WRITES ITS
ARGUMENTS DOWN and returns. Run a scene at a chosen frame time and the log is
the intro's own draw stream — every W3D_DrawTriFan, its texture, and its
64-byte screen-space vertices.

Two details make it work:

* `_show_scene` builds each primitive into ONE reusable W3D_Triangles struct
  (r2+0x29fa for fans, r2+0x2a0a for line strips) whose vertex array is a single
  buffer reused every call. So the stub advances that buffer pointer past the
  vertices it was just handed. The vertices then accumulate instead of being
  overwritten, and the log records where each call's slice starts.
* Time comes from a 50Hz counter at `r2+0x2862`, which the frame function
  derives from the system clock. Writing it directly makes the whole renderer a
  deterministic function of (scene, frame).
"""
import struct, os, sys, subprocess
import ppcrun as H

FLAT = H.FLAT = (sys.argv[1] if len(sys.argv) > 1 else 'flat')
BASE = 0x10000000
R2 = BASE + 0x7FFE

CALC_TXT, ALLOC_TXT, CALC_OBJ = 0x10001e9c, 0x1000202c, 0x10001f98
SET_ALLOC, GEN_SCENE = 0x10006b14, 0x100021a0
INIT_TXTGEN, INIT_SCENE_GEN = 0x1000139c, 0x10002fb8
INIT_SCENE_SHOW = 0x100069f8
CALC_MATRIX, SHOW_SCENE = 0x10004f0c, 0x10005d28

G_W3DBASE, G_CONTEXT, G_HEAD, G_TIME = 0x1000a348, 0x1000a36c, 0x1000a898, 0x1000a860
G_OVER = 0x1000a8a0                     # r2+0x28a2 — the synchro overlay's graph
G_SIGNAL = 0x1000a3ba                   # r2+0x23bc — the music signal, per frame

W3DBASE = 0x20500000
BLRSTUB = 0x20402040          # halves identical — see runscene.py
STUBS, RECORDER, DRAWREC = 0x20410000, 0x20411000, 0x20411100
LOGPW, LOG = 0x20420000, 0x20420010
# The intro's own output vertex array sits 0x500 bytes below the clip-buffer
# pointer arrays, so accumulating into it would overwrite them within twenty
# vertices. Point both primitive templates at our own scratch instead.
#
# Sized for the worst scene with room to spare: r2+0x25aa (the opening titles,
# one quad per glyph) writes 14,731 vertices over five frames, which filled 96%
# of the first 0xF0000 arena. An overflow does not fault — the vertices simply
# land outside the dumped region and parse() drops those slices — so the arena
# is now generous AND the dump length is computed from the real cursor, so a
# slice that falls outside is a counted `dropped`, never a silent gap.
MYVBUF, MYVBUFCAP = 0x21000000, 0x1000000
SCRATCHSZ = 0x02000000
LOGSZ, REC = 0x80000, 64        # log size, and one record
# THE SNAPSHOT MUST OUTRUN THE ARENA, and 0x20000 did not. The highest address
# a scene actually uses is arena+0x1ff74 — 140 bytes inside the old window — so
# the last keyframe track of part three's first scene fell off the end and the
# dump reported a node with a track pointer and no keyframes. Nothing failed;
# the walk just stopped, which is how a truncated export looks from the inside.
ARENADUMP = 0x80000             # per-frame snapshot of the scene graph
T_FAN, T_LINE = 0x29fe, 0x2a0e          # the .v field of each template
FAKEOBJ = 0x20560000

# the 22 Warp3D vector displacements this intro actually fetches, from vecscan
DISPS = [-28, -34, -46, -58, -64, -70, -94, -100, -118, -142, -166, -184,
         -190, -196, -214, -220, -226, -232, -244, -292, -388, -448]
DRAW = {-166, -388}           # DrawTriFan, DrawLineStrip

ABSENT = 77


def _load(path):
    """The segment dump, or None — see runsynth.py for why this must not raise.

    Importing this module used to die inside the import machinery when flat/ was
    absent, which made every importer's own missing-binary handling unreachable.
    Unchanged when the file is there."""
    try:
        return open(os.path.join(path, 'seg0_CODE_10000000.bin'), 'rb').read()
    except FileNotFoundError:
        return None


d0 = _load(FLAT)


def _need():
    if d0 is None:
        print(f'drawlog: no segment dump under {FLAT!r} — see speccheck.py for '
              'the rehydration steps.', file=sys.stderr)
        raise SystemExit(ABSENT)


def g(disp):
    _need()
    return struct.unpack_from('>I', d0, R2 + disp - BASE)[0]


# Deferred rather than dropped: with the dump present this is the same value at
# the same moment as before. Without it, ARENA is None and the first real call
# reports the absence properly instead of the import raising.
ARENA = g(0x2832) if d0 is not None else None


def setflat(path):
    """Point the module at a different flat/ directory (export.py imports us)."""
    global FLAT, d0, ARENA
    FLAT = H.FLAT = path
    d0 = _load(path)
    _need()
    ARENA = g(0x2832)


# --- the extra PPC forms this file needs on top of ppcrun's
def stw(s, a, d):    return (36 << 26) | (s << 21) | (a << 16) | (d & 0xFFFF)
def lwz(d, a, o):    return (32 << 26) | (d << 21) | (a << 16) | (o & 0xFFFF)
def addi(d, a, v):   return (14 << 26) | (d << 21) | (a << 16) | (v & 0xFFFF)
def add(d, a, b):    return (31 << 26) | (d << 21) | (a << 16) | (b << 11) | (266 << 1)
def mulli(d, a, v):  return (7 << 26) | (d << 21) | (a << 16) | (v & 0xFFFF)
def mr(d, s):        return (31 << 26) | (s << 21) | (d << 16) | (s << 11) | (444 << 1)
def subf(d, a, b):   return (31 << 26) | (d << 21) | (a << 16) | (b << 11) | (40 << 1)
def lhz(d, a, o):    return (40 << 26) | (d << 21) | (a << 16) | (o & 0xFFFF)
def lbz(d, a, o):    return (34 << 26) | (d << 21) | (a << 16) | (o & 0xFFFF)
def sth(s_, a, o):   return (44 << 26) | (s_ << 21) | (a << 16) | (o & 0xFFFF)
def blr():           return (19 << 26) | (20 << 21) | (16 << 1)
def b(off):          return (18 << 26) | (off & 0x03FFFFFC)


def recorder():
    """Log (tag, r3..r9) and return FAKEOBJ."""
    c = H.load32(12, LOGPW) + [lwz(11, 12, 0), stw(0, 11, 0)]
    c += [stw(r, 11, 4 * (r - 2)) for r in range(3, 10)]
    # Return the record's own address: every call gets a distinct non-null
    # handle, so W3D_AllocTexObj's return value identifies the texture and the
    # draw calls that bind it can be tied back to which one.
    c += [mr(3, 11), addi(11, 11, REC), stw(11, 12, 0)]
    return c + [blr()]


def drawrec():
    """Log the draw call and the emitter's own inputs, then advance the cursor.

    The emitter reaches the draw vector by `mtctr r15; bctr` — a TAIL branch, not
    a call — so everything it was working with is still live here: r30 is the
    scene node, r14 the primitive template, r19 the source-vertex cursor, r22 the
    minimum vertex count (3 for fans, 2 for line strips). Recording the node's
    cx/cy/scale alongside the projected vertices makes the projection invertible,
    which is what a reimplementation of `_calc_matrix` has to be checked against:
    x = (sx - cx) / (scale * w).
    """
    c = H.load32(12, LOGPW) + [lwz(11, 12, 0)]
    c += [stw(0, 11, 0), stw(3, 11, 4), stw(4, 11, 8)]
    c += [lwz(9, 4, 0), lwz(10, 4, 4), lwz(8, 4, 8)]          # count, v, tex
    c += [stw(9, 11, 12), stw(10, 11, 16), stw(8, 11, 20)]
    c += [lwz(8, 4, 12), stw(8, 11, 24)]                      # 4th word (line width)
    c += [stw(30, 11, 28)]                                    # the scene node
    for off, slot in ((0x14, 32), (0x18, 36), (0x1c, 40)):    # cx, cy, scale
        c += [lwz(8, 30, off), stw(8, 11, slot)]
    c += [lbz(8, 30, 0x0e), stw(8, 11, 44)]                   # clip enable
    c += [stw(22, 11, 48), stw(19, 11, 52), stw(14, 11, 56)]
    c += [addi(11, 11, REC), stw(11, 12, 0)]
    # Advance the shared cursor past the slice just drawn — in BOTH templates,
    # since fans and line strips interleave and write into the same array.
    c += [mulli(9, 9, 64), add(10, 10, 9), stw(10, 2, T_FAN), stw(10, 2, T_LINE)]
    return c + H.load32(3, FAKEOBJ) + [blr()]


def build(stream, frames, txt_tab, obj_tab, stop=99, overlay=None, signal=None,
          nodes=False, probe=None):
    c = []
    c += H.load32(1, H.STACK) + H.load32(2, R2) + H.load32(13, H.STACK - 0x1000)

    # 1. blanket every 2-byte slot below the base with a plain returning stub,
    #    then overwrite the 22 real vectors with per-LVO recorders.
    for k, w in enumerate(H.load32(3, FAKEOBJ) + [blr()]):
        c += H.load32(5, w) + H.load32(6, BLRSTUB + k * 4) + [stw(5, 6, 0)]
    c += H.load32(5, BLRSTUB)
    for off in list(range(4, 1028, 4)) + list(range(2, 1026, 4)):
        c += H.load32(6, W3DBASE - off) + [stw(5, 6, 0)]
    for i, disp in enumerate(DISPS):
        stub = STUBS + i * 8
        tgt = DRAWREC if disp in DRAW else RECORDER
        for k, w in enumerate([H.li(0, disp), b(tgt - (stub + 4))]):
            c += H.load32(5, w) + H.load32(6, stub + k * 4) + [stw(5, 6, 0)]
        c += H.load32(5, stub) + H.load32(6, W3DBASE + disp) + [stw(5, 6, 0)]
    for addr, body in ((RECORDER, recorder()), (DRAWREC, drawrec())):
        for k, w in enumerate(body):
            c += H.load32(5, w) + H.load32(6, addr + k * 4) + [stw(5, 6, 0)]

    # 2. library base and context
    c += H.load32(5, W3DBASE) + H.load32(6, G_W3DBASE) + [stw(5, 6, 0)]
    c += H.load32(5, FAKEOBJ) + H.load32(6, G_CONTEXT) + [stw(5, 6, 0)]

    # Arm the log BEFORE anything can call a vector: the recorder dereferences
    # this word, and a zero here is a null store on the very first library call.
    c += H.load32(5, LOG) + H.load32(6, LOGPW) + [stw(5, 6, 0)]

    # Redirect both primitive templates at our own vertex arena
    c += H.load32(5, MYVBUF) + [stw(5, 2, T_FAN), stw(5, 2, T_LINE)]

    # 3. the setup _play_scene_p_end does before any scene runs
    setup = [([addi(31, 2, txt_tab)] + H.call32(12, CALC_TXT)),
             H.call32(12, ALLOC_TXT),
             ([addi(31, 2, obj_tab)] + H.call32(12, CALC_OBJ)),
             H.call32(12, INIT_TXTGEN),
             H.call32(12, INIT_SCENE_GEN),
             H.call32(12, INIT_SCENE_SHOW),
             # _init_synchro: the overlay drawn on top of every scene, built
             # once into its own arena and never regenerated.
             ((H.load32(3, g(0x2836)) + H.call32(12, SET_ALLOC)
               + H.load32(4, overlay) + H.load32(5, g(0x288e)) + H.load32(6, g(0x2896))
               + H.call32(12, GEN_SCENE)
               + H.load32(6, G_OVER) + [stw(3, 6, 0)]) if overlay else []),
             # 4. build the scene graph
             (H.load32(3, ARENA) + H.call32(12, SET_ALLOC)
              + H.load32(4, stream) + H.load32(5, g(0x288e)) + H.load32(6, g(0x2896))
              + H.call32(12, GEN_SCENE)
              + H.load32(6, G_HEAD) + [stw(3, 6, 0)])]
    for step in setup[:stop]:
        c += step

    # 5. render each requested frame; marker 0 closes the setup calls off
    c += [H.li(0, 0)] + H.load32(3, 0) + H.call32(12, RECORDER)
    for t in frames:
        c += H.load32(5, t) + H.load32(6, G_TIME) + [stw(5, 6, 0)]
        if signal is not None:
            # What the 68K frame routine leaves at r2+0x23bc: the value
            # dbplayer.library reported this frame. The keyframe evaluator
            # compares it against each node's trigger byte at node+0x70.
            c += H.load32(5, signal) + H.load32(6, G_SIGNAL) + [sth(5, 6, 0)]
        for glob in ((G_OVER, G_HEAD) if overlay else (G_HEAD,)):
            c += H.load32(3, t) + H.load32(4, glob) + [lwz(4, 4, 0)]
            c += H.call32(12, CALC_MATRIX)
        for glob in ((G_HEAD, G_OVER) if overlay else (G_HEAD,)):
            c += H.load32(3, glob) + [lwz(3, 3, 0)]
            c += H.call32(12, SHOW_SCENE)
        if nodes:
            # Stage C's output: _calc_matrix updates the graph IN PLACE, so a
            # snapshot after each frame is the node state the emitter then read.
            # These land on stdout ahead of the log, one per frame, in order.
            c += H.load32(4, ARENA) + H.load32(5, ARENADUMP)
            c += [H.li(0, 4), H.li(3, 1), H.sc()]
        # Marker: r3 = the frame, r4 = the "scene finished" halfword _play_scene
        # spins on. A handler sets it when the scene's own timeline runs out, so
        # this is where each scene's length comes from.
        #
        # r5 = the frame's CLEAR COLOUR. `_calc_matrix` ends by packing the first
        # node's channels into r2+0x2846 (0x10004f90) and `0x10001df8` loads that
        # into r4 for W3D_ClearDrawRegion — a call the harness never reaches,
        # because it lives in the frame loop rather than in _show_scene. So the
        # colour cannot be recorded by intercepting the vector; it has to be read
        # out of the global after _calc_matrix has run, which is exactly here.
        # Without it the recording says what to draw but not what to draw it on,
        # and part one's pale scenes replay as black on black.
        c += [H.li(0, 1)] + H.load32(3, t) + [lhz(4, 2, 0x23ba), lwz(5, 2, 0x2846)]
        c += H.call32(12, RECORDER)

    # An arbitrary extra region, dumped last — for asking whether some table the
    # real program builds at startup is actually populated in the harness.
    dumps = [(LOGPW, 4), (LOG, LOGSZ)]
    for addr, n in dumps:
        c += H.load32(4, addr) + H.load32(5, n) + [H.li(0, 4), H.li(3, 1), H.sc()]
    # The vertex arena is dumped to its REAL extent: the fan template's .v field
    # is the shared cursor, so cursor - MYVBUF is exactly what was written.
    c += H.load32(4, MYVBUF) + [lwz(5, 2, T_FAN), subf(5, 4, 5)]
    c += [H.li(0, 4), H.li(3, 1), H.sc()]
    if probe:
        c += H.load32(4, probe[0]) + H.load32(5, probe[1])
        c += [H.li(0, 4), H.li(3, 1), H.sc()]
    c += [H.li(0, 1), H.li(3, 0), H.sc()]
    return b''.join(struct.pack('>I', w) for w in c)


def run(stream, frames=(0,), txt_tab=0x2642, obj_tab=0x2706, timeout=240, stop=99,
        overlay=None, signal=None, nodes=False, probe=None):
    stub = build(stream, frames, txt_tab, obj_tab, stop, overlay, signal, nodes, probe)
    pieces = H.segments(FLAT)
    pieces.append((H.SCRATCH, stub, SCRATCHSZ))
    EH, PH, AL = 52, 32, 0x1000
    blob, loads = b'', []
    cur = EH + PH * len(pieces)
    for va, data, msz in pieces:
        if data is None:
            loads.append((va, 0, msz, 0, 6)); continue
        blob += b'\0' * ((-(cur + len(blob))) % AL)
        loads.append((va, len(data), max(msz, len(data)), cur + len(blob), 7))
        blob += data
    eh = (b'\x7fELF' + bytes([1, 2, 1, 0]) + b'\0' * 8 +
          struct.pack('>HHIIIIIHHHHHH', 2, 20, 1, H.SCRATCH, EH, 0, 0, EH, PH,
                      len(pieces), 0, 0, 0))
    phs = b''.join(struct.pack('>IIIIIIII', 1, off, va, va, f, m, fl, AL)
                   for va, f, m, off, fl in loads)
    open('/tmp/pp-draw.elf', 'wb').write(eh + phs + blob)
    os.chmod('/tmp/pp-draw.elf', 0o755)
    try:
        p = subprocess.run([H.qemu(), '/tmp/pp-draw.elf'], capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, 'timeout'
    return p.stdout, p.stderr.decode('utf8', 'replace')


def snapshots(out, n):
    """The per-frame scene-graph dumps, when run(nodes=True) produced them."""
    return [out[i * ARENADUMP:(i + 1) * ARENADUMP] for i in range(n)]


def node(snap, addr):
    """Read a render node out of a snapshot: the fields _show_scene reads."""
    o = addr - ARENA
    if not 0 <= o < len(snap) - 0x30:
        return None
    anim, tex, typ = (struct.unpack_from('>I', snap, o)[0],
                      struct.unpack_from('>I', snap, o + 4)[0],
                      struct.unpack_from('>H', snap, o + 8)[0] // 4)
    cx, cy, sc = struct.unpack_from('>fff', snap, o + 0x14)
    return {'anim': anim, 'texture': tex, 'type': typ, 'clip': snap[o + 0x0e],
            'cx': cx, 'cy': cy, 'scale': sc,
            'next': struct.unpack_from('>I', snap, o + 0x10)[0]}


def parse(out, nodes=0):
    """-> list of frames, each a list of draw dicts."""
    out = out[nodes * ARENADUMP:]
    if not out or len(out) < 4 + LOGSZ:
        return []
    end = struct.unpack('>I', out[:4])[0]
    log, vbuf = out[4:4 + LOGSZ], out[4 + LOGSZ:]
    frames, cur, tex, dropped = [], [], {}, 0
    for o in range(0, min(end - LOG, LOGSZ), REC):
        r = struct.unpack_from('>16i', log, o)
        tag = r[0]
        if tag == -94:                                 # W3D_AllocTexObj, in table order
            tex[LOG + o] = len(tex)
            continue
        if tag == 1:                                   # frame marker
            frames.append({'time': r[1], 'done': bool(r[2]),
                           'clear': r[3] & 0xFFFFFF, 'draws': cur}); cur = []
            continue
        if tag not in DRAW:
            continue
        count, v = r[3], r[4] & 0xFFFFFFFF
        vs = []
        if not (0 < count <= 4096 and MYVBUF <= v and
                v - MYVBUF + count * 64 <= len(vbuf)):
            dropped += 1
        else:
            for i in range(count):
                q = v - MYVBUF + i * 64
                x, y = struct.unpack_from('>ff', vbuf, q)
                z, = struct.unpack_from('>d', vbuf, q + 8)
                w, u, tv = struct.unpack_from('>fff', vbuf, q + 0x10)
                cr, cg, cb, ca = struct.unpack_from('>ffff', vbuf, q + 0x20)
                vs.append({'x': x, 'y': y, 'z': z, 'w': w, 'u': u, 'v': tv,
                           'rgba': [cr, cg, cb, ca]})
        cx, cy, sc = struct.unpack_from('>fff', log, o + 32)
        cur.append({'prim': 'trifan' if tag == -166 else 'linestrip',
                    'texture': tex.get(r[5] & 0xFFFFFFFF), 'count': count,
                    # the emitter's own inputs — see drawrec()
                    'node': r[7] & 0xFFFFFFFF, 'cx': cx, 'cy': cy, 'scale': sc,
                    'clip': bool(r[11]), 'minVerts': r[12],
                    # r19 as the emitter left it: initial + 4*count. For an
                    # unclipped primitive the initial value is the face record,
                    # so the source vertices are reachable from here.
                    'srcEnd': r[13] & 0xFFFFFFFF,
                    'vertices': vs})
    if cur:
        frames.append({'time': None, 'draws': cur})
    if dropped:
        # Loud on purpose: a dropped slice is missing ground truth, and the
        # shape of the output does not otherwise show it.
        print(f'drawlog: {dropped} draw(s) fell outside the {len(vbuf)}-byte '
              f'vertex arena — raise MYVBUFCAP', file=sys.stderr)
    return frames


if __name__ == '__main__':
    strm = g(0x25d2)                                   # part one's opening scene
    out, err = run(strm, frames=(0, 25, 50, 100))
    print(f'vertex arena {MYVBUF:#010x}, scene arena {ARENA:#010x}')
    if out is None:
        print('FAILED:', err); raise SystemExit(1)
    frames = parse(out)
    print(f'{len(frames)} frames, stderr: {err.strip()[:120]}')
    for f in frames:
        tris = sum(d['count'] - 2 for d in f['draws'] if d['prim'] == 'trifan')
        texs = len({d['texture'] for d in f['draws']})
        print(f'  t={f["time"]:4}  {len(f["draws"]):4} draws  {tris:5} triangles  {texs} textures')
        for d in f['draws'][:3]:
            v = d['vertices'][0] if d['vertices'] else None
            s = f'({v["x"]:.1f},{v["y"]:.1f}) w={v["w"]:.4f} uv=({v["u"]:.2f},{v["v"]:.2f}) a={v["rgba"][3]:.2f}' if v else '-'
            print(f'      {d["prim"]:9} n={d["count"]:3} tex={d["texture"]}  v0={s}')
