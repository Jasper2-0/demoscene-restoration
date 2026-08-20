#!/usr/bin/env python3
"""Stream an `apitrace dump` and emit the big primitives with their vertex positions.

    apitrace dump trace.trace | python3 extract-prims.py > prims.json

Streaming, not buffered: a 4.4M-call dump is roughly half a gigabyte of text, and
only the large glBegin/glEnd blocks matter. Everything below MIN_VERTS is counted
and dropped.

Positions are kept ROUNDED and SORTED into a set alongside the raw first few. The
question these are for is whether two draws of one mesh carry the same positions
or different ones, and set comparison answers that without depending on the order
the two runs happened to submit them in — which is a real difference between the
original's interleaved batches and the port's grouped ones, and not the difference
being investigated.
"""
import sys, json, re

MIN_VERTS = 100
MAX_PRIMS = 400

vtx = re.compile(r'^\d+ glVertex3fv\(v = \{([^}]*)\}\)')
beg = re.compile(r'^\d+ glBegin\(mode = (\w+)\)')
end = re.compile(r'^\d+ glEnd\(\)')
swap = re.compile(r'^\d+ (glXSwapBuffers|glClear)\(')

out, cur, frame, small = [], None, 0, 0
for line in sys.stdin:
    m = beg.match(line)
    if m:
        cur = {'mode': m.group(1).replace('GL_', ''), 'pts': [], 'frame': frame}
        continue
    if cur is not None:
        m = vtx.match(line)
        if m:
            try:
                cur['pts'].append(tuple(round(float(x), 4) for x in m.group(1).split(',')))
            except ValueError:
                pass
            continue
        if end.match(line):
            if len(cur['pts']) >= MIN_VERTS and len(out) < MAX_PRIMS:
                pts = cur['pts']
                out.append({
                    'frame': cur['frame'],
                    'mode': cur['mode'],
                    'n': len(pts),
                    'first': [list(p) for p in pts[:3]],
                    # sorted unique positions: the identity of the geometry,
                    # independent of submission order
                    'uniq': len(set(pts)),
                    'key': sorted(set(pts))[:2000],
                })
            elif len(cur['pts']):
                small += 1
            cur = None
            continue
    if swap.match(line):
        frame += 1

sys.stderr.write(f'{len(out)} primitives kept (>= {MIN_VERTS} verts), {small} smaller dropped, {frame} frames\n')
json.dump(out, sys.stdout)
