#!/usr/bin/env python3
"""Slice the reference modules into one byte-exact target per softsynth call.

    python3 synthref.py flat/ mods/ out/synthref/

Runs nowhere near a PowerPC: it reads the binary and the two modules the
harness already built, and writes what a reimplementation has to reproduce.

WHY PER SAMPLE. `synthhash.py` pins each module as a whole and per chunk, which
answers "is the softsynth done" and nothing else — a single wrong frame in the
first sample and every digest is wrong with no clue which of 32 primitives did
it. The texture VM was finished the other way round: `texopdiff.mjs` gave each
opcode its own target, and per-opcode isolation is what got 30 of 30 byte-exact.
This is the same instrument for the synth. 94 samples, 94 independent targets,
each attributable to one named routine.

THE POSITIONAL RULE this rests on is §8e's, and it is exact rather than
approximate. Samples are appended to the module cursor in script order, so the
Nth sample-producing call produces the Nth sample. It checks out at 56/56 for
part one and 38/38 for part three, and this tool re-derives it rather than
trusting it: every call after the first is expected to produce exactly one
sample, and it fails if the counts disagree.

WHAT THIS TOOL FOUND, and it is the reason the container is not work. Everything
in each module before its first sample — DBM0, NAME, INFO, SONG, INST, VENV,
DSPE, PATT, and the SMPL chunk header — is ONE CONTIGUOUS LITERAL in seg4,
copied verbatim by `0x10006ef0`:

    part 1   seg4+32644 (0x10047f84)   17,882 bytes
    part 3   seg4+19984 (0x10044e10)   12,656 bytes

Both verified byte-identical here, and the tool re-checks it on every run rather
than hardcoding the offsets. PORT_SPEC §8i describes assembling those chunks;
nothing assembles them. That also explains the call arithmetic exactly — part
one has 57 calls of which the first is the blob copy, leaving 56 for 56 samples.
So the whole of the remaining softsynth work is PCM, and this is its target.
"""
import hashlib
import json
import os
import struct
import sys

BASE = 0x10000000
SEG4 = 0x10040000
# The two generators, and the module each builds. Script bounds are
# synthscript.py's; keep them in step.
PARTS = {
    'p1': {'script': (0x10006B6C, 0x10006DA0), 'module': 'part1_full.dbm'},
    'p3': {'script': (0x10006DA0, 0x10006EF0), 'module': 'part3.dbm'},
}
# The blob copier. First call of each script, and the only one that is not a
# sample producer.
HEADER_ROUTINE = 0x10006EF0


def calls(code, lo, hi):
    """Every `bl` in [lo, hi), with the r2-relative setup since the previous."""
    regs, out = {}, []
    for off in range(lo - BASE, hi - BASE, 4):
        w = struct.unpack_from('>I', code, off)[0]
        op = w >> 26
        rD, rA, imm = (w >> 21) & 31, (w >> 16) & 31, w & 0xFFFF
        simm = imm - 0x10000 if imm & 0x8000 else imm
        if op == 18 and (w & 1):                       # bl
            li = w & 0x03FFFFFC
            if li & 0x02000000:
                li -= 0x04000000
            out.append((BASE + off, BASE + off + li, dict(regs)))
            regs = {}
        elif op == 14 and rA == 2:                     # addi rD, r2, disp
            regs[f'r{rD}'] = f'r2{simm:+#07x}'
        elif op == 14 and rA == 0:                     # li rD, imm
            regs[f'r{rD}'] = simm
        elif op == 15:                                 # lis rD, imm
            regs[f'r{rD}'] = imm << 16
        elif op == 24 and rD == rA:                    # ori — completes a lis
            if isinstance(regs.get(f'r{rD}'), int):
                regs[f'r{rD}'] |= imm
        elif op == 48 and rA == 2:                     # lfs fD, disp(r2)
            regs[f'f{rD}'] = f'r2{simm:+#07x}'
    return out


def chunks(mod):
    """(id, payload offset, size) for each chunk; DBM0 header is 8 bytes."""
    p, out = 8, []
    while p + 8 <= len(mod):
        cid = mod[p:p + 4].decode('latin1')
        size = struct.unpack_from('>I', mod, p + 4)[0]
        out.append((cid, p + 8, size))
        p += 8 + size + (size & 1)
    return out


def samples(mod, at, size):
    """Walk SMPL: u32 flags, u32 frames, then `frames` bytes of 8-bit PCM."""
    p, end, out = at, at + size, []
    while p + 8 <= end:
        flags, frames = struct.unpack_from('>II', mod, p)
        out.append({'flags': flags, 'frames': frames, 'at': p, 'data': (p + 8, frames)})
        p += 8 + frames
    if p != end:
        raise SystemExit(f'synthref: SMPL walk ended at {p}, chunk ends at {end}')
    return out


def main():
    flat = sys.argv[1] if len(sys.argv) > 1 else 'flat'
    mods = sys.argv[2] if len(sys.argv) > 2 else 'mods'
    dest = sys.argv[3] if len(sys.argv) > 3 else 'out/synthref'

    try:
        code = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
        seg4 = open(f'{flat}/seg4_DATA_10040000.bin', 'rb').read()
    except FileNotFoundError as e:
        # 77 is SKIP across this tree: flat/ is gitignored, so a fresh clone has
        # the dataset but no segment dumps.
        print(f'synthref: {e.filename} not here — see checkall.sh. Skipping.')
        return 77

    os.makedirs(dest, exist_ok=True)
    out = {'note': 'One byte-exact target per softsynth call. See synthref.py.',
           'parts': {}}

    for part, spec in PARTS.items():
        path = f'{mods}/{spec["module"]}'
        if not os.path.exists(path):
            print(f'synthref: {path} not here — ./ppcbox.sh python3 synthdump.py '
                  f'{flat} {mods}. Skipping.')
            return 77
        mod = open(path, 'rb').read()

        smpl = [c for c in chunks(mod) if c[0] == 'SMPL']
        if len(smpl) != 1:
            raise SystemExit(f'{part}: expected one SMPL chunk, found {len(smpl)}')
        _, sat, ssize = smpl[0]
        head = mod[:sat]

        # The header blob, re-derived rather than hardcoded: it either is one
        # contiguous literal in seg4 or the claim in this file's docstring is
        # wrong, and that is worth finding out on every run.
        hoff = seg4.find(head)
        if hoff < 0:
            raise SystemExit(f'{part}: the {len(head)}-byte module header is NOT a '
                             f'contiguous literal in seg4 — §8i is back in play')

        script = calls(code, *spec['script'])
        if script[0][1] != HEADER_ROUTINE:
            raise SystemExit(f'{part}: first call is {script[0][1]:#x}, '
                             f'expected the blob copier {HEADER_ROUTINE:#x}')
        producers = script[1:]

        sam = samples(mod, sat, ssize)
        if len(sam) != len(producers):
            raise SystemExit(f'{part}: {len(producers)} sample-producing calls but '
                             f'{len(sam)} samples — the positional rule broke')

        entries = []
        for i, (s, (at, target, setup)) in enumerate(zip(sam, producers)):
            off, n = s['data']
            pcm = mod[off:off + n]
            name = f'{part}_{i:02d}_{target:08x}.raw'
            if n:
                open(f'{dest}/{name}', 'wb').write(pcm)
            entries.append({
                'index': i, 'call': f'{at:#010x}', 'routine': f'{target:#010x}',
                'setup': {k: (v if isinstance(v, str) else f'{v:#x}')
                          for k, v in sorted(setup.items())},
                'flags': s['flags'], 'frames': s['frames'],
                'moduleOffset': off,
                'file': name if n else None,
                'sha256': hashlib.sha256(pcm).hexdigest(),
            })

        out['parts'][part] = {
            'module': spec['module'],
            'moduleBytes': len(mod),
            'moduleSha256': hashlib.sha256(mod).hexdigest(),
            'header': {'seg4Offset': hoff, 'address': f'{SEG4 + hoff:#010x}',
                       'bytes': len(head),
                       'sha256': hashlib.sha256(head).hexdigest()},
            'smpl': {'at': sat, 'size': ssize},
            'samples': entries,
        }

        empty = sum(1 for e in entries if not e['frames'])
        print(f'{part}: header {len(head)} B literal at seg4+{hoff} '
              f'({SEG4 + hoff:#010x}); {len(entries)} samples '
              f'({empty} empty), {ssize} B of SMPL')
        byroutine = {}
        for e in entries:
            byroutine.setdefault(e['routine'], []).append(e['frames'])
        for r, fs in sorted(byroutine.items()):
            uniq = sorted(set(fs))
            shape = str(uniq[0]) if len(uniq) == 1 else f'{len(uniq)} lengths {uniq[0]}..{uniq[-1]}'
            print(f'    {r}  x{len(fs):<3} {shape}')

    with open(f'{dest}/index.json', 'w') as f:
        json.dump(out, f, indent=2)
    print(f'\nwrote {dest}/index.json and the per-sample .raw targets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
