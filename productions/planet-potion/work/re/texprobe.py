#!/usr/bin/env python3
"""Operand sensitivity for every texture opcode, by measurement.

    python3 texprobe.py flat/ [out/tex_operands.json]

The differential pass in `texops2.py` asked "what does this opcode do to a noise
field" and produced twenty one-line labels, eight of which turned out wrong when
the handlers were finally read — a channel permutation had been recorded as a
darken, and a whole mask pipeline as "state setters". The trouble is that a
single before/after comparison collapses an opcode to one number.

This asks a narrower question that a probe can actually answer: **which operand
changes what**. For each opcode, each operand is moved off a baseline in turn and
the four channel means and the spread are measured. That does not name the
algorithm, but it does say "operand 5 is channel 1's amplitude", which is what
someone reimplementing it needs and what a label cannot give.

Results are read off the CURRENT surface (`r2+0x2472`), not the convolution's
work buffer — reading the wrong one is how an earlier probe concluded that three
opcodes ignored their operands entirely.
"""
import json
import struct
import sys

import ppcrun as H
import texconv as TC

BASE = 0x10000000
R2 = BASE + 0x7FFE
G_CUR, G_OPCOUNT = 0x2472, 0x1000a500
N = 128 * 128 * 4
BASELINE, PROBES = 0x40, (0x00, 0x80)
SEED = bytes([9]) + bytes([0x40]) * 12       # a populated field to act on


def measure(flat, cur, payload):
    res = TC.run(flat, payload, [(cur, N * 4)], timeout=25)
    if res is None:
        return None                       # the opcode did not terminate
    raw, = res
    v = struct.unpack(f'>{N}f', raw)
    out = []
    for c in range(4):
        ch = v[c::4]
        out.append((sum(ch) / len(ch), max(ch) - min(ch)))
    return out


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    dest = sys.argv[2] if len(sys.argv) > 2 else None
    H.FLAT = flat
    try:
        d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    except FileNotFoundError:
        print('texprobe: no segment dump under ' + repr(flat) + ' — see '
              'speccheck.py for the rehydration steps.', file=sys.stderr)
        sys.exit(77)
    H.preload_tables(d0)
    cur = struct.unpack_from('>I', d0, R2 + G_CUR - BASE)[0]
    counts = [d0[G_OPCOUNT - BASE + i] for i in range(20)]

    base_state = measure(flat, cur, SEED)
    report = {}
    for op in range(20):
        n = 1 if counts[op] == 127 else counts[op]
        ref = measure(flat, cur, SEED + bytes([op]) + bytes([BASELINE]) * n)
        if ref is None:
            report[op] = {'operands': n, 'rows': None, 'note': 'baseline hangs'}
            print(f'  op {op:2} ({n:3} operands)  baseline does not terminate')
            continue
        rows = []
        for i in range(n):
            eff, hangs = [], []
            for val in PROBES:
                ops = bytearray([BASELINE] * n)
                ops[i] = val
                got = measure(flat, cur, SEED + bytes([op]) + bytes(ops))
                if got is None:
                    hangs.append(val); continue
                eff.append([round(got[c][0] - ref[c][0], 2) for c in range(4)] +
                           [round(got[1][1] - ref[1][1], 2)])
            # which channels moved, and did the spread move?
            moved = {c for e in eff for c in range(4) if abs(e[c]) > 0.5}
            spread = any(abs(e[4]) > 0.5 for e in eff)
            rows.append({'operand': i, 'channelsMoved': sorted(moved),
                         'spreadMoved': spread, 'deltas': eff,
                         'hangsAt': [hex(v) for v in hangs]})
        report[op] = {'operands': n, 'rows': rows}
        tags = []
        for r in rows:
            if r['hangsAt']:
                tags.append('HANG')
            elif not r['channelsMoved'] and not r['spreadMoved']:
                tags.append('.')
            elif len(r['channelsMoved']) == 1:
                tags.append(f"c{r['channelsMoved'][0]}")
            elif r['channelsMoved']:
                tags.append('all')
            else:
                tags.append('~')
        print(f'  op {op:2} ({n:3} operands)  {" ".join(tags)}')

    if dest:
        json.dump({'note': 'per-operand sensitivity, measured not read. "." = no '
                           'measurable effect, "cN" = one channel, "all" = every '
                           'channel, "~" = spread only. Baseline operand 0x40, '
                           'probes 0x00 and 0x80, acting on an op9 field.',
                   'opcodes': report}, open(dest, 'w'), indent=2)
        print(f'wrote {dest}')


if __name__ == '__main__':
    main()
