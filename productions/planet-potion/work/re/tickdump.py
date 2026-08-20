#!/usr/bin/env python3
"""Run the original's renderer at ARBITRARY ticks and dump the draw stream.

    ./ppcbox.sh python3 tickdump.py p3 0x279e 10,40,80,160

`draws.json` samples five ticks per scene, which is enough to pin the emitter
and not enough to answer "does this look right at the moment I am looking at
it". This runs `drawlog` at whatever ticks are asked for and writes them in the
same shape, so the engine can be compared against the original anywhere.

It is how the "colours have an animation curve we have missed" reading was
ruled out: colours ARE animated, through channels 16-18, and the five sampled
ticks could not tell a right curve from a wrong one.
"""
import struct, sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ppcrun as H, drawlog, export, rungeo, runscene
from drawlog import g, run, parse

ABSENT = 77
JOBS = {'p1': (0x25d2, 0x2642, 0x2706), 'p3': (None, 0x27a6, 0x27fe)}


def main():
    flat = os.environ.get('PPFLAT', 'flat')
    part = sys.argv[1] if len(sys.argv) > 1 else 'p1'
    want = {s.strip() for s in sys.argv[2].split(',')} if len(sys.argv) > 2 else None
    ticks = [int(t) for t in sys.argv[3].split(',')] if len(sys.argv) > 3 else [0]
    if not os.path.isdir(flat):
        print(f'tickdump: need {flat}. Skipping.')
        sys.exit(ABSENT)
    H.FLAT = rungeo.FLAT = runscene.FLAT = flat
    drawlog.setflat(flat)
    d0 = open(os.path.join(flat, next(f for f in os.listdir(flat)
                                      if f.startswith('seg0_'))), 'rb').read()
    H.fix_glyph_scan(d0)
    H.preload_tables(d0)
    sch = json.load(open('out/showorder.json'))
    over, txt, obj = JOBS[part]
    res = []
    for disp, start, dur, fog in export.spans(sch[part]['schedule']):
        if want is not None and hex(disp) not in want:
            continue
        out, err = run(g(disp), frames=tuple(ticks), txt_tab=txt, obj_tab=obj,
                       overlay=g(over) if over else None)
        frames = parse(out) if out else []
        res.append({'part': part, 'slot': hex(disp), 'frames': [
            {'t': f['time'], 'clear': f.get('clear'), 'draws': [
                {'prim': d['prim'], 'texture': d['texture'],
                 'v': [[round(q['x'], 5), round(q['y'], 5)]
                       + [round(c, 6) for c in q['rgba']] for q in d['vertices']]}
                for d in f['draws']]} for f in frames]})
        print(f'{part} {disp:#06x}: '
              + ' '.join(f't{f["t"]}={len(f["draws"])}' for f in res[-1]['frames']),
              file=sys.stderr)
    json.dump(res, open('out/tickdump.json', 'w'))
    print(f'wrote out/tickdump.json — {len(res)} scene(s)', file=sys.stderr)


if __name__ == '__main__':
    main()
