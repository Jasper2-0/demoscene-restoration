#!/usr/bin/env python3
"""Milestone 1 — prove the harness executes the ORIGINAL's own rand.

Maps the image, asserts the initial seed word [0x41a9b8] is 1 (as in the
image), calls srand(0x1234) then rand (FUN_00404258) 1000x, and compares every
return AND the final seed word against the MSVC LCG computed in Python.  This
exercises: image mapping, cdecl call/return via the sentinel, argument
passing, and FPCW surviving a call — with no IAT dependency at all.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from emu import SonnetEmu, RAND_VA, SRAND_VA  # noqa: E402


def main():
    emu = SonnetEmu()
    assert emu.seed == 1, f'initial seed word is {emu.seed:#x}, expected 1'
    print('PASS  initial seed word [0x41a9b8] == 1')

    emu.call(SRAND_VA, 0x1234)
    assert emu.seed == 0x1234, f'srand: seed {emu.seed:#x}'
    print('PASS  srand(0x1234) via emulated FUN_0040424e')

    seed = 0x1234
    for i in range(1000):
        got = emu.call(RAND_VA) & 0xffffffff
        seed = (seed * 214013 + 2531011) & 0xffffffff
        want = (seed >> 16) & 0x7fff
        assert got == want, f'draw {i}: emulated {got:#x} != LCG {want:#x}'
    assert emu.seed == seed, f'final seed {emu.seed:#x} != {seed:#x}'
    print(f'PASS  1000 emulated rand() draws match the MSVC LCG '
          f'(final state {seed:#010x})')
    print(f'PASS  seed-write hook counted {emu.rand_writes} writes (1001 expected)'
          if emu.rand_writes == 1001 else
          f'FAIL  seed-write hook counted {emu.rand_writes}, expected 1001')
    return 0 if emu.rand_writes == 1001 else 1


if __name__ == '__main__':
    sys.exit(main())
