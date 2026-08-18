#!/usr/bin/env python3
"""Add each recorded frame's CLEAR COLOUR to an existing draws.json.

    ./ppcbox.sh python3 clearscan.py flat/ out/draws.json ../../web/data/draws.json

`draws.json` says what to draw and never said what to draw it ON, so the page
cleared to black and part one's opening -- which runs on white -- replayed as
black on black, correlating at -0.86 against the capture: not merely wrong but
photographically inverted.

The colour is not in the draw stream and cannot be got by intercepting a Warp3D
vector. `_calc_matrix` ENDS by packing the first node's channels 16-18 into
`r2+0x2846` (0x10004f50..0x10004f90), and the only reader is 0x10001dfc, which
loads it into r4 for W3D_ClearDrawRegion -- from the frame loop, which the
harness never enters, because the harness drives `_calc_matrix` and
`_show_scene` directly. So it has to be read out of the global once per frame,
which is what `drawlog`'s frame marker now does (r5).

This is a PATCHER rather than part of `export.py` on purpose: regenerating the
whole 20 MB export to add one integer per frame costs a full qemu pass over
every subsystem. It imports export.py's own `spans` and `NSAMPLES` so the ticks
it samples cannot drift from the ones the draws were recorded at, and it
asserts the frame count it finds against the frame count already in the file
rather than trusting that they lined up.
"""
import json, sys, os
import ppcrun as H
import drawlog, export, showorder, rungeo, runscene

ABSENT = 77


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    targets = sys.argv[2:] or ['out/draws.json']
    if not os.path.isdir(flat) or not os.path.exists(targets[0]):
        print(f'clearscan: need {flat} and {targets[0]}. Skipping.')
        sys.exit(ABSENT)

    H.FLAT = rungeo.FLAT = runscene.FLAT = flat
    drawlog.setflat(flat)
    d0 = open(os.path.join(flat, next(f for f in os.listdir(flat)
                                      if f.startswith('seg0_'))), 'rb').read()
    # The same two harness prerequisites export.py applies: without the glyph
    # patch the two text scenes spin forever, and without the tables seg 5 is
    # zero and every rotation collapses.
    H.fix_glyph_scan(d0)
    H.preload_tables(d0)

    doc = json.load(open(targets[0]))
    sch = json.load(open(os.path.join(os.path.dirname(targets[0]),
                                      'showorder.json')))
    by_slot = {}
    jobs = [('p1', export.P1_OVERLAY, 0x2642, 0x2706), ('p3', None, 0x27a6, 0x27fe)]
    for part, over, txt, obj in jobs:
        for disp, start, dur, fog in export.spans(sch[part]['schedule']):
            samples = tuple(round(dur * (k + 0.5) / export.NSAMPLES)
                            for k in range(export.NSAMPLES))
            out, err = drawlog.run(drawlog.g(disp), frames=samples,
                                   txt_tab=txt, obj_tab=obj,
                                   overlay=drawlog.g(over) if over else None)
            frames = drawlog.parse(out) if out else []
            by_slot[(part, hex(disp))] = [f['clear'] for f in frames]
            print(f'  {part} {disp:#06x}  '
                  + (' '.join(f'{c:#08x}' for c in by_slot[(part, hex(disp))])
                     or f'no frames: {(err or "")[:60]}'), flush=True)

    filled = missed = 0
    for scene in doc['scenes']:
        got = by_slot.get((scene['part'], scene['slot']))
        frames = scene.get('frames') or []
        if not got or len(got) != len(frames):
            missed += len(frames)
            continue
        for f, c in zip(frames, got):
            f['clear'] = c
            filled += 1
    print(f'clearscan: {filled} frames given a clear colour, {missed} left without')
    for t in targets:
        if os.path.exists(t):
            json.dump(doc, open(t, 'w'), separators=(',', ':'))
            print(f'  wrote {t}')
    sys.exit(1 if missed else 0)


if __name__ == '__main__':
    main()
