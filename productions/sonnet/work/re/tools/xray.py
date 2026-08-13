#!/usr/bin/env python3
"""xray — disassemble a function with every data reference RESOLVED.

Built for the scene-2 clean-room re-derivation (re/scenes/SCENE2_CLEANROOM.md).
The point is that no step of a derivation should depend on someone eyeballing a
hex address and remembering what lives there:

  * every `[0x4xxxxx]` operand is annotated with the dword AND its float value,
    and with the qword double as well when the operand is an `fld qword`;
  * every `call` is annotated with the target's known name, if we have one;
  * `push dword 0xNNNN` is annotated with the float reading when it looks like
    one (that is how this binary passes float literals).

Usage:
  python3 re/tools/xray.py 0x40a186 0x40a952            # a range
  python3 re/tools/xray.py 0x40c721 --len 0x200
  python3 re/tools/xray.py 0x40a186 0x40a952 --calls    # just the call graph
"""
import argparse, re, struct, subprocess, sys, pathlib

IMG = pathlib.Path(__file__).resolve().parents[2] / 'unpacked' / 'sonnet_img.bin'
BASE = 0x401000

# The VA -> name map now lives in re/oracle/names.json — ONE shared table for
# this tool, the emulator oracle and the coverage checks, so a mislabel cannot
# live in one copy and not another (the 0x40449f/0x4045f1 duplicate-name bug
# propagated into a wrong port decision and stood for months).  Only add a
# name there when the function's identity is PINNED; record how in `note`.
import json as _json
_NAMES_JSON = pathlib.Path(__file__).resolve().parents[1] / 'oracle' / 'names.json'
NAMES = {int(va, 16): e['name']
         for va, e in _json.loads(_NAMES_JSON.read_text())['symbols'].items()}

def load():
    return IMG.read_bytes()

def f32(data, va):
    off = va - BASE
    if off < 0 or off + 4 > len(data):
        return None
    return struct.unpack_from('<f', data, off)[0]

def f64(data, va):
    off = va - BASE
    if off < 0 or off + 8 > len(data):
        return None
    return struct.unpack_from('<d', data, off)[0]

def u32(data, va):
    off = va - BASE
    if off < 0 or off + 4 > len(data):
        return None
    return struct.unpack_from('<I', data, off)[0]

def pretty_float(v):
    if v is None:
        return '?'
    if v == int(v) and abs(v) < 1e9:
        return str(int(v))
    return f'{v:.9g}'

MEM = re.compile(r'\[(0x4[0-9a-f]{5})\]')
CALL = re.compile(r'^call (0x4[0-9a-f]{5})$')
PUSHD = re.compile(r'^push dword (0x[0-9a-f]+)$')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('start'); ap.add_argument('end', nargs='?')
    ap.add_argument('--len', dest='length')
    ap.add_argument('--calls', action='store_true')
    a = ap.parse_args()
    start = int(a.start, 16)
    end = int(a.end, 16) if a.end else start + int(a.length or '0x100', 16)
    data = load()
    blob = data[start - BASE:end - BASE]
    tmp = pathlib.Path('/tmp/_xray.bin'); tmp.write_bytes(blob)
    out = subprocess.run(['ndisasm', '-b', '32', '-o', hex(start), str(tmp)],
                         capture_output=True, text=True).stdout

    for line in out.splitlines():
        parts = line.split(None, 2)
        if len(parts) < 3:
            print(line); continue
        va, raw, ins = parts
        note = []
        m = CALL.match(ins)
        if m:
            t = int(m.group(1), 16)
            note.append(NAMES.get(t, ''))
            if a.calls:
                # print EVERY call, named or not — dropping the unnamed ones
                # hides exactly the calls a derivation has not accounted for yet
                print(f'{va}  call {m.group(1)}  {note[0] or "?"}')
                continue
        elif a.calls:
            continue
        for addr in MEM.findall(ins):
            va2 = int(addr, 16)
            fv, dv, iv = f32(data, va2), f64(data, va2), u32(data, va2)
            bits = f'={pretty_float(fv)}'
            # a plausible double (fld qword) is worth showing too
            if dv is not None and 1e-6 < abs(dv) < 1e7:
                bits += f' | qword={pretty_float(dv)}'
            if iv is not None and iv < 0x1000:
                bits += f' | int={iv}'
            note.append(f'{addr}{bits}')
        m = PUSHD.match(ins)
        if m:
            iv = int(m.group(1), 16)
            fv = struct.unpack('<f', struct.pack('<I', iv))[0] if iv > 0xffff else None
            if fv is not None and (abs(fv) < 1e6 and abs(fv) > 1e-6):
                note.append(f'float={pretty_float(fv)}')
        print(f'{line:<52}' + ('  ; ' + '  '.join(n for n in note if n) if any(note) else ''))

if __name__ == '__main__':
    main()
