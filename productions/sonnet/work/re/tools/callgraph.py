#!/usr/bin/env python3
"""callgraph — the transitive callee set of one or more functions, from the image.

Built for the scene-2 unimplemented-function inventory.  The point is the same
as `xray.py`'s: an inventory of what a scene NEEDS must be derived from the
binary, not from our own notes, because our notes are exactly what goes stale.

Function boundaries come from the Ghidra listing's function list
(`re/out/sonnet.c`), so a "function" here is whatever Ghidra decided one is;
ranges are [addr, next addr).  That is good enough for callee extraction — a
missed boundary shows up as extra callees, never as missing ones.

  python3 re/tools/callgraph.py 0x40b0b0                 # one root
  python3 re/tools/callgraph.py 0x40b0b0 0x40c721 --depth 2
  python3 re/tools/callgraph.py 0x40b0b0 --flat          # addresses only
"""
import argparse, re, subprocess, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
IMG = HERE.parents[1] / 'unpacked' / 'sonnet_img.bin'
SRC = HERE.parents[0] / 'out' / 'sonnet.c'
BASE = 0x401000
CALL = re.compile(r'^call (0x4[0-9a-f]{5})$')


def func_starts():
    """Sorted list of every function address Ghidra found."""
    text = SRC.read_text(errors='ignore')
    addrs = sorted({int(m, 16) for m in re.findall(r'\bFUN_(0[0-9a-f]{7})\(', text)})
    return addrs


def callees(data, starts, addr):
    """Direct callees of the function beginning at `addr`."""
    i = starts.index(addr) if addr in starts else None
    if i is None:
        # not a known function start — disassemble a modest window instead
        end = addr + 0x200
    else:
        end = starts[i + 1] if i + 1 < len(starts) else addr + 0x200
    blob = data[addr - BASE:end - BASE]
    if not blob:
        return []
    tmp = pathlib.Path('/tmp/_callgraph.bin')
    tmp.write_bytes(blob)
    out = subprocess.run(['ndisasm', '-b', '32', '-o', hex(addr), str(tmp)],
                         capture_output=True, text=True).stdout
    found = []
    for line in out.splitlines():
        parts = line.split(None, 2)
        if len(parts) < 3:
            continue
        m = CALL.match(parts[2])
        if m:
            t = int(m.group(1), 16)
            if t not in found:
                found.append(t)
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('roots', nargs='+')
    ap.add_argument('--depth', type=int, default=99)
    ap.add_argument('--flat', action='store_true')
    a = ap.parse_args()

    data = IMG.read_bytes()
    starts = func_starts()
    roots = [int(r, 16) for r in a.roots]

    seen = {}
    frontier = [(r, 0) for r in roots]
    while frontier:
        addr, d = frontier.pop(0)
        if addr in seen and seen[addr] <= d:
            continue
        seen[addr] = d
        if d >= a.depth:
            continue
        for c in callees(data, starts, addr):
            if c not in seen:
                frontier.append((c, d + 1))

    if a.flat:
        for addr in sorted(seen):
            print(f'0x{addr:06x}')
        return
    for addr in sorted(seen):
        known = 'FUN' if addr in starts else '   '
        print(f'0x{addr:06x}  depth {seen[addr]}  {known}')
    print(f'\n{len(seen)} functions reachable from '
          f'{", ".join(hex(r) for r in roots)} (depth <= {a.depth})',
          file=sys.stderr)


if __name__ == '__main__':
    main()
