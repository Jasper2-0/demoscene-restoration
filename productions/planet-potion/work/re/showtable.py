#!/usr/bin/env python3
"""Write SHOW_SCHEDULE.md — what is on screen, when, under which name.

    python3 showtable.py [showorder.json] [-o SHOW_SCHEDULE.md]

`showorder.py` recovers the schedule and writes it as JSON, which is the right
shape for the page to load and the wrong shape for a person trying to say which
scene they are looking at. This turns it into a table that can be read while
watching, and its whole reason for existing is the `on screen` column: the slot
in a schedule entry is NOT always the thing you can see.

READS THE SHIPPED COPY BY DEFAULT — `web/data/showorder.json`, the file the page
actually fetches, rather than `work/re/showorder.json` next door. The two have
drifted before (the RE copy predates the `fogOn` field), and a reference that
documents a file nobody loads is worse than no reference at all.

TWO SCENE POINTERS, which is what the `on screen` column is for. The original
holds the scene being shown at `r2+0x289a` and a second graph at `r2+0x289e`:

  * every driver that names a slot generates into `0x289a` — EXCEPT `p_start`,
    which generates into `0x289e`;
  * `_play_scene`, `_play_scene_synchro`, `_dalej` and `_new_camera` then draw
    `0x289a` alone;
  * `_play_scene_p_start` and `_play_scene_p_end` draw `0x289a` and then
    `0x289e` OVER it, both of them, every frame.

So a transition scene is on screen for its own `p_start` entry and for the
`p_end` that follows it, with the picture underneath swapped halfway — p3's
`0x2796` runs 58.008..60.000 s, not the 0.820 s its own entry occupies. That is
a fact about the drivers, so it is derived here from `driver` exactly as
`web/js/main.js` `spansFor` derives it.

⚠ THE RULE IS IMPLEMENTED TWICE — here and in `spansFor`. It is eight lines and
sharing them across a Python tool and an ES module is not worth a build step,
but they have to be changed together, and a table that disagrees with the
renderer is a reference that lies. `showcheck.mjs` walks the real schedule
through the real engine; this only ever describes it.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SHIPPED = os.path.join(HERE, '..', '..', 'web', 'data', 'showorder.json')

# MEASURED, NOT DERIVED — both are in prod.json's capture note, put there by
# work/re/capalign.mjs and work/re/NOTES.md. They are here so a timestamp read
# off the reference video can be turned into a show time without going to look
# them up, and they are constants rather than arguments because they are
# properties of one specific capture file.
CAPTURE_OFFSET_S = 0.120      # alignmentOffsetMs=120, 0 ppm drift across part one
INTER_PART_SILENCE_S = 1.852  # the intro is silent for 1,852 ms between the parts
# Part three runs 2,640 ppm fast against the capture's clock, which is ~0.15 s by
# the 58-second mark: enough to name a scene by, nowhere near frame-exact.
P3_DRIFT_PPM = 2640

PARTS = [('p1', 'part one'), ('p3', 'part three')]


def onscreen(schedule):
    """Annotate each entry with the graph(s) actually drawn, bottom layer first.

    Mirrors `spansFor` in web/js/main.js — see the module docstring.
    """
    main = over = None
    rows = []
    for e in schedule:
        if e['driver'] == 'p_start':
            over = e['slot']
        elif e['slot']:
            main = e['slot']
        shown = main or '?'
        if e['driver'] in ('p_start', 'p_end') and over:
            shown = f'{main} + {over}'
        rows.append((e, shown))
    return rows


def table(rows):
    head = (f"{'#':>2}  {'driver':<11} {'slot':<8} {'on screen':<18} "
            f"{'start':>8} {'end':>8} {'dur':>7}  {'ticks':>13}  {'cam':>3} {'fog':>6}")
    out = [head, '-' * len(head)]
    for e, shown in rows:
        at, dur = e['startTick'], e['durTicks']
        out.append(
            f"{e['index']:>2}  {e['driver']:<11} {str(e['slot'] or '—'):<8} {shown:<18} "
            f"{e['start']:>8.3f} {e['end']:>8.3f} {e['dur']:>7.3f}  "
            f"{at:>6}..{at + dur:<6}  "
            f"{'—' if e['camera'] is None else e['camera']:>3} "
            f"{str(e['fog'] or '—'):>6}")
    return '\n'.join(out)


def render(doc):
    p1_total = doc['p1']['totalSeconds']
    p3_base = CAPTURE_OFFSET_S + p1_total + INTER_PART_SILENCE_S
    md = [
        '# Planet Potion — the show schedule',
        '',
        '**Generated** by `work/re/showtable.py` from `web/data/showorder.json`.',
        'Do not edit by hand: regenerate with',
        '',
        '```',
        'python3 work/re/showtable.py',
        '```',
        '',
        'The schedule itself comes from `showorder.py`: the call ORDER is scanned out',
        'of `_play_part_1` / `_play_part_3`, and the DURATIONS come from the music —',
        "every driver's loop exits when `dbplayer.library` reports signal 1, and the",
        'generated module carries exactly as many effect-7 signal-1 events as the part',
        'has driver calls (26 and 26, 13 and 13).',
        '',
        '## Reading the table',
        '',
        '`slot` is what the schedule entry names. **`on screen` is what is drawn**, in',
        'draw order, bottom layer first — and the two differ more often than not:',
        '',
        '* an entry with no slot (`new_camera`, `dalej`) CONTINUES the scene before it;',
        '* `p_start` and `p_end` draw **two** graphs. The original keeps the visible',
        '  scene at `r2+0x289a` and a second at `r2+0x289e`; `p_start` generates into',
        '  the second, `p_end` into the first, and both drivers show `0x289a` and then',
        '  `0x289e` over the top of it, every frame.',
        '',
        'That second point is the whole shape of a transition: the transition graph is',
        'held across the `p_start` **and** the `p_end`, while the picture underneath it',
        'is swapped. p3 `0x2796` is on screen 58.008..60.000 s — not the 0.820 s its own',
        'entry occupies.',
        '',
        '`start`/`end`/`dur` are seconds within the part; `ticks` is the same span on the',
        '50 Hz clock the engine actually runs on. `fog` is the preset address, `cam` the',
        'camera ordinal a `new_camera` entry selects.',
        '',
        '## Matching a timestamp in the reference capture',
        '',
        '`work/reference/planet-potion_ref.mkv`, measured by `capalign.mjs`:',
        '',
        '```',
        f'part one    show = capture - {CAPTURE_OFFSET_S:.3f}',
        f'part three  show = capture - {p3_base:.3f}',
        '```',
        '',
        f'The part-three figure is the {CAPTURE_OFFSET_S:.3f} s capture offset plus part'
        f" one's {p1_total:.3f} s",
        f'plus the {INTER_PART_SILENCE_S:.3f} s of silence between the parts.',
        '',
        f'⚠ Part three runs **{P3_DRIFT_PPM} ppm fast** against the capture (~0.15 s by the',
        '58-second mark), and the capture is 29.97 fps against the intro\'s 50 Hz, so it',
        'has already been frame-rate converted. Good enough to name a scene by; never a',
        'frame-exact oracle.',
        '',
    ]
    for part, label in PARTS:
        d = doc[part]
        md += [
            f'## {label} (`{part}`)',
            '',
            f"{d['totalSeconds']:.3f} s, {len(d['schedule'])} entries, "
            f"{d['totalRows']} rows"
            + ('' if d.get('matched', True)
               else '  — ⚠ **MISMATCH**: driver calls and signal-1 events disagree'),
            '',
            '```',
            table(onscreen(d['schedule'])),
            '```',
            '',
        ]
    return '\n'.join(md)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    out = os.path.join(HERE, 'SHOW_SCHEDULE.md')
    if '-o' in sys.argv:
        out = sys.argv[sys.argv.index('-o') + 1]
        args = [a for a in args if a != out]
    src = args[0] if args else SHIPPED
    with open(src) as f:
        doc = json.load(f)
    with open(out, 'w') as f:
        f.write(render(doc))
    print(f'wrote {os.path.relpath(out)} from {os.path.relpath(src)}')


if __name__ == '__main__':
    main()
