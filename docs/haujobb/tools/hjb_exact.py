#!/usr/bin/env python3
"""Exact .HJB parser implementing the byte grammar recovered from the
decompiled loader in Moments.exe (FUN_0040db10 tree at 0x40db10).
Validates byte-exact closure to EOF and collects population stats."""
import struct, sys, glob, os, collections

class R:
    def __init__(self, d):
        self.d = d; self.o = 0; self.err = None
    def u32(self):
        v, = struct.unpack_from('<I', self.d, self.o); self.o += 4; return v
    def i32(self):
        v, = struct.unpack_from('<i', self.d, self.o); self.o += 4; return v
    def f32(self):
        v, = struct.unpack_from('<f', self.d, self.o); self.o += 4; return v
    def cstr(self):
        e = self.d.index(b'\0', self.o)
        s = self.d[self.o:e].decode('latin1'); self.o = e + 1; return s

stats = collections.Counter()
tcb_nonzero = collections.Counter()
flagpop = collections.Counter()
keycounts = collections.Counter()
maxframes = {}

def point3_track(r, st):
    flag = r.u32(); n = r.i32()
    flagpop['p3.' + str(flag)] += 1
    frames = []
    for _ in range(n):
        f = r.i32(); tcb = [r.f32() for _ in range(5)]
        v = (r.f32(), r.f32(), r.f32())
        frames.append(f)
        if n > 1:
            for i, x in enumerate(tcb):
                if x != 0.0: tcb_nonzero['p3.' + 'tcbEe'[i]] += 1
            stats['p3keys_multi'] += 1
    keycounts['p3.' + str(n if n < 5 else '5+')] += 1
    st['frames'] += frames
    return frames

def rot_track(r, st):
    flag = r.u32(); n = r.i32()
    flagpop['rot.' + str(flag)] += 1
    frames = []
    for _ in range(n):
        f = r.i32(); tcb = [r.f32() for _ in range(5)]
        q = [r.f32() for _ in range(4)]
        frames.append(f)
        if n > 1:
            for i, x in enumerate(tcb):
                if x != 0.0: tcb_nonzero['rot.' + 'tcbEe'[i]] += 1
            stats['rotkeys_multi'] += 1
            l = sum(c * c for c in q)
            if abs(l - 1.0) < 1e-3: stats['quat_unit'] += 1
            else: stats['quat_nonunit'] += 1
    keycounts['rot.' + str(n if n < 5 else '5+')] += 1
    st['frames'] += frames
    return frames

def float_track(r, st):
    flag = r.u32(); n = r.i32()
    flagpop['flt.' + str(flag)] += 1
    frames = []
    for _ in range(n):
        f = r.i32(); tcb = [r.f32() for _ in range(5)]
        v = r.f32()
        frames.append(f)
        if n > 1:
            for i, x in enumerate(tcb):
                if x != 0.0: tcb_nonzero['flt.' + 'tcbEe'[i]] += 1
    keycounts['flt.' + str(n if n < 5 else '5+')] += 1
    st['frames'] += frames
    return frames

def vis_list(r, st):
    n = 0
    while True:
        v = r.i32()
        if v == -1: break
        n += 1
        st['frames'].append(v)
    if n: stats['vis_nonempty'] += 1
    keycounts['vis.' + str(n if n < 5 else '5+')] += 1

def vertexanim_track(r, st):
    flag = r.u32(); n = r.i32()
    flagpop['va.' + str(flag)] += 1
    for _ in range(n):
        f = r.i32(); tcb = [r.f32() for _ in range(5)]
        nv = r.u32(); r.o += 12 * nv
        st['frames'].append(f)
        if n > 1:
            for i, x in enumerate(tcb):
                if x != 0.0: tcb_nonzero['va.' + 'tcbEe'[i]] += 1
    keycounts['va.' + str(n if n < 5 else '5+')] += 1

def mesh(r, st):
    name = r.cstr()
    nv = r.u32(); r.o += 12 * nv
    nf = r.u32(); r.o += 36 * nf
    ngrp = r.u32()
    for _ in range(ngrp):
        mat = r.u32(); cnt = r.u32(); r.o += 4 * cnt
    point3_track(r, st)      # position
    rot_track(r, st)         # rotation
    sf = point3_track(r, st) # scale
    st['scale_frames'] += sf
    vis_list(r, st)          # visibility toggles
    vertexanim_track(r, st)  # whole-mesh vertex animation keys
    stats['mesh'] += 1; return name

def camera(r, st):
    name = r.cstr()
    point3_track(r, st)  # position
    float_track(r, st)   # roll
    float_track(r, st)   # fov
    vis_list(r, st)
    stats['camera'] += 1; return name

def target(r, st):
    name = r.cstr()
    point3_track(r, st)
    stats['target'] += 1; return name

def type3(r, st):
    name = r.cstr()
    a, b, c = r.u32(), r.u32(), r.u32()
    point3_track(r, st)
    float_track(r, st)
    float_track(r, st)
    vis_list(r, st)
    stats['type3'] += 1; return name

def omni(r, st):
    name = r.cstr()
    a, b, c = r.u32(), r.u32(), r.u32()
    point3_track(r, st)  # position
    rot_track(r, st)
    point3_track(r, st)
    vis_list(r, st)
    stats['omni'] += 1; return name

def type5(r, st):
    name = r.cstr()
    point3_track(r, st)
    rot_track(r, st)
    point3_track(r, st)
    vis_list(r, st)
    stats['type5'] += 1; return name

HANDLERS = {0: mesh, 1: camera, 2: target, 3: type3, 4: omni, 5: type5}

def tree(r, st, depth):
    # mirrors FUN_0040dbe0: [record, children..., -1]* , -1
    t = r.i32()
    while True:
        if t == -1: return
        if t not in HANDLERS: raise ValueError(f'bad type {t} at {r.o-4:#x}')
        HANDLERS[t](r, st)
        st['types'].append(t)
        w = r.i32()
        if w != -1:
            r.o -= 4
            st['depth'] = max(st['depth'], depth + 1)
            tree(r, st, depth + 1)
        t = r.i32()

def materials(r, st):
    skipped = r.u32(); cnt = r.i32()
    st['mat_skip'] = skipped
    for _ in range(cnt):
        name = r.cstr()
        for slot in range(11):
            amt = r.f32(); path = r.cstr()
            if amt > 0.0: st['maps'].append((slot, round(amt, 4), path))
        stats['material'] += 1
    st['nmat'] = cnt

def parse(path):
    d = open(path, 'rb').read()
    r = R(d)
    st = {'frames': [], 'types': [], 'maps': [], 'depth': 0, 'scale_frames': []}
    hdr0 = r.u32(); nframes = r.u32()
    try:
        tree(r, st, 0)
        materials(r, st)
    except Exception as e:
        return (path, len(d), r.o, hdr0, nframes, st, f'FAIL {type(e).__name__} {e}')
    status = 'OK' if r.o == len(d) else f'SHORT {len(d)-r.o} bytes left'
    return (path, len(d), r.o, hdr0, nframes, st, status)

if __name__ == '__main__':
    roots = sys.argv[1:]
    files = []
    for root in roots:
        files += sorted(glob.glob(os.path.join(root, '*.HJB')) + glob.glob(os.path.join(root, '*.hjb')))
    ok = bad = 0
    hdr0pop = collections.Counter()
    firstrec = collections.Counter()
    for f in files:
        path, size, o, hdr0, nframes, st, status = parse(f)
        hdr0pop[hdr0] += 1
        if st['types']:
            firstrec[(st['types'][0])] += 1
        mx = max(st['frames']) if st['frames'] else 0
        over = '' if mx <= nframes else f' MAXKEY {mx}>{nframes}'
        smx = max(st['scale_frames']) if st['scale_frames'] else 0
        if smx > nframes: over += f' SCALEMAX {smx}'
        if status == 'OK': ok += 1
        else: bad += 1
        tag = os.path.basename(os.path.dirname(f)) + '/' + os.path.basename(f)
        print(f'{tag:44} {size:8} nfr={nframes:5} depth={st["depth"]} nmat={st.get("nmat","-"):3} {status}{over}')
    print(f'\n== {ok} OK, {bad} FAIL of {len(files)}')
    print('hdr word0 population:', dict(hdr0pop))
    print('first record type:', dict(firstrec))
    print('record totals:', dict(stats))
    print('track flag dword:', dict(flagpop))
    print('key-count histogram:', dict(sorted(keycounts.items())))
    print('nonzero TCB/ease fields in multi-key tracks:', dict(tcb_nonzero))
