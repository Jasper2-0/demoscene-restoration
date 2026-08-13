#!/usr/bin/env python3
"""Milestone 2 — run the ORIGINAL texgen VM (FUN_00416036) per program.

Prerequisite verified cold-callable: only FUN_00401c1f() (points DAT_004747b8
at the resource archive); the op table is built per call inside the entry, and
the archive's slot-0 progress callback (jmp progressTick) is neutralised by
the harness's `ret` patch.

For each texture program 0..27 (11 = the GDI font strip, op 17 only — skipped,
not emulatable and not a pixel program), the program's own header supplies
(w, h); output is dumped raw as the fixture `pixels.bin` (the VM's native
byte order — the JS comparison establishes/asserts the channel mapping).

Program outputs are entry-state independent (every random op self-seeds:
op33 = srand from bytecode, op3/op16 seed from their own args), so no seed
setup is needed for reproducibility; seed_before/after are recorded anyway.

  .venv/bin/python targets/texgen.py            # all programs
  .venv/bin/python targets/texgen.py 14 3       # a subset
"""

import pathlib
import struct
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from emu import SonnetEmu, write_fixture  # noqa: E402

INIT_VA = 0x401c1f      # FUN_00401c1f: resource-archive pointer init
TEXGEN_VA = 0x416036    # FUN_00416036(id, w, h, out) cdecl
ARCHIVE_VA = 0x4170da   # 52 length-prefixed blocks {u32 len; u8 data[len]}
ARCHIVE_END = 0x4181fc
FONT_PROGRAM = 11       # op 17 (Win32 GDI) only


def read_archive(emu):
    """The resource archive, exactly as FUN_00401c3b walks it."""
    blocks = []
    va = ARCHIVE_VA
    while va < ARCHIVE_END:
        ln = emu.u32(va)
        blocks.append(bytes(emu.read(va + 4, ln)))
        va += 4 + ln
    assert va == ARCHIVE_END, f'archive walk ended at {va:#x}, not {ARCHIVE_END:#x}'
    assert len(blocks) == 52, f'{len(blocks)} blocks, expected 52'
    return blocks


def main():
    ids = [int(a) for a in sys.argv[1:]] or [i for i in range(28) if i != FONT_PROGRAM]

    emu = SonnetEmu(heap_mb=256)
    blocks = read_archive(emu)
    emu.call(INIT_VA)
    print(f'archive: 52 blocks OK, init FUN_00401c1f done')

    failures = 0
    for pid in ids:
        if pid == FONT_PROGRAM:
            print(f'prog {pid:2}: skipped (GDI font strip)')
            continue
        prog = blocks[pid]
        ver, w, h, n_ops = prog[0], *struct.unpack_from('<HH', prog, 1), prog[5]
        assert ver == 1, f'prog {pid}: header version {ver}'
        out = emu.alloc(w * h * 4)
        seed_before = emu.seed
        try:
            emu.call(TEXGEN_VA, pid, w, h, out, timeout_s=600)
        except Exception as e:
            print(f'prog {pid:2}: FAIL {e}')
            failures += 1
            continue
        pixels = emu.read(out, w * h * 4)
        d = write_fixture('texgen', f'prog{pid:02d}_{w}x{h}', fn_va=TEXGEN_VA,
                          call={'convention': 'cdecl',
                                'args': [pid, w, h, {'role': 'out'}]},
                          emu=emu, dumps=[('pixels', pixels)],
                          seed_before=seed_before, seed_after=emu.seed,
                          extra={'ops': n_ops})
        print(f'prog {pid:2}: {w}x{h}  {n_ops:2} ops  '
              f'{emu.last_call_seconds:6.2f} s  -> {d.name}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
