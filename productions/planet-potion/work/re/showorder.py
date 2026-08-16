#!/usr/bin/env python3
"""Reconstruct the show schedule: which scene runs when, and for how long.

    python3 showorder.py flat/ [part1.dbm part3.dbm]

With no module files it generates them itself through `runsynth.py`, which is
the honest default: the modules are not data that exists anywhere, they are
output of the intro's own softsynth.

Two halves that only mean something together:

* `_play_part_1` and `_play_part_3` are straight-line code — a sequence of calls
  to the six scene drivers, each of which loops until the music says next. So
  scanning them linearly recovers the ORDER: which scene stream each call plays,
  and which camera each `_play_scene_new_camera` selects.
* The music supplies the DURATIONS. Every driver's loop exits when
  `dbplayer.library` reports signal 1, and `dbmpatt.py` finds exactly as many
  signal-1 events in the generated module as there are driver calls in the part —
  26 and 26 for part one, 13 and 13 for part three. Zipping the two gives each
  call its span.

That equality is the whole argument. It is not a fit: the counts were measured
independently, on both parts, and they agree exactly.
"""
import json
import struct
import sys

import dbmpatt
import runsynth

BASE = 0x10000000
R2 = BASE + 0x7FFE
DRIVERS = {0x100018ec: 'play_scene', 0x1000196c: 'synchro',
           0x10001a58: 'new_camera', 0x10001adc: 'dalej',
           0x10001b3c: 'p_start', 0x10001bc4: 'p_end'}
# _play_scene_new_camera and _play_scene_dalej reuse the graph already built, so
# they carry no stream of their own.
REUSES = {'new_camera', 'dalej'}
PARTS = [('p1', 0x100013f0, 0x10001698, 0x2642, 0x2706),
         ('p3', 0x10001724, 0x10001898, 0x27a6, 0x27fe)]
FOG_SETTER = 0x100016e8


def scan(d0, lo, hi):
    """Walk the part function, tracking the two argument idioms the drivers use.

    `lwz r10, disp(r2)` stages the scene stream; `li r3, n` stages the camera
    index; `addi r3, r2, disp` stages a fog preset. Each `bl` to a driver
    consumes whatever is currently staged.
    """
    calls, stream, cam, fog = [], None, None, None
    for off in range(lo - BASE, hi - BASE, 4):
        w = struct.unpack_from('>I', d0, off)[0]
        op, rD, rA, imm = w >> 26, (w >> 21) & 31, (w >> 16) & 31, w & 0xFFFF
        if op == 32 and rD == 10 and rA == 2:                 # lwz r10, d(r2)
            stream = imm
        elif op == 14 and rD == 3 and rA == 0:                # li r3, n
            cam = imm
        elif op == 14 and rD == 3 and rA == 2:                # addi r3, r2, d
            fog = imm
        elif op == 18 and (w & 1):                            # bl
            li = w & 0x03FFFFFC
            if li & 0x02000000:
                li -= 0x04000000
            t = BASE + off + li
            if t == FOG_SETTER:
                continue                                      # keeps `fog` staged
            if t not in DRIVERS:
                continue
            drv = DRIVERS[t]
            calls.append({'driver': drv,
                          'slot': None if drv in REUSES else hex(stream),
                          'camera': cam if drv == 'new_camera' else None,
                          'fog': hex(fog) if fog is not None else None})
            fog = None
    return calls


def schedule(flat, mods=()):
    """-> {part: {matched, totalSeconds, totalRows, schedule[]}}"""
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    runsynth.setflat(flat)
    out = {}
    for i, (part, lo, hi, txt, obj) in enumerate(PARTS):
        calls = scan(d0, lo, hi)
        d = open(mods[i], 'rb').read() if i < len(mods) else runsynth.module(part)
        _, cs = dbmpatt.chunks(d)
        by = {c: (o, n) for c, o, n in cs}
        chn = struct.unpack_from('>5H', d, by['INFO'][0])[4]
        pats = dbmpatt.patterns(d, *by['PATT'], chn)
        orders = dbmpatt.songs(d, *by['SONG'])[0][1]
        ev, rows, secs = dbmpatt.timeline(pats, orders)
        ok = len(ev) == len(calls)
        print(f'\n=== {part}: {len(calls)} driver calls, {len(ev)} signal-1 events'
              f'  {"MATCH" if ok else "MISMATCH — schedule below is not trustworthy"}')
        sched, prev_s, prev_t = [], 0.0, 0
        for i, c in enumerate(calls):
            e = ev[i] if i < len(ev) else None
            end_s = e['seconds'] if e else secs
            end_t = e['ticks50'] if e else round(secs * 50)
            row = {**c, 'index': i, 'start': round(prev_s, 3),
                   'end': round(end_s, 3), 'dur': round(end_s - prev_s, 3),
                   'startTick': prev_t, 'durTicks': end_t - prev_t}
            sched.append(row)
            cam = '' if c['camera'] is None else f" cam{c['camera']}"
            fog = '' if c['fog'] is None else f" fog@{c['fog']}"
            print(f"  [{i:2}] {c['driver']:11} {c['slot'] or '(reuse)':>8}{cam}{fog}"
                  f"   {prev_s:8.3f}..{end_s:8.3f}s  ({row['durTicks']:5} ticks)")
            prev_s, prev_t = end_s, end_t
        out[part] = {'matched': ok, 'totalSeconds': round(secs, 3),
                     'totalRows': rows, 'schedule': sched}
    return out


def main():
    out = schedule(sys.argv[1], sys.argv[2:4])
    json.dump(out, open('showorder.json', 'w'), indent=2)
    print('\nwrote showorder.json')


if __name__ == '__main__':
    main()
