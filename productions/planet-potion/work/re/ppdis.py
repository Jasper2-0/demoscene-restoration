#!/usr/bin/env python3
"""Disassemble a range of the PowerPC code, with recovered symbol names.

    python3 ppdis.py flat/ 0x100018ec 0x100019b0     # PowerPC
    python3 ppdis.py flat/ 0x1000025e 0x100002bc -m  # the 68K bootstrap

Not a substitute for Ghidra — `PPLoad.java` is still the way to read this
program properly — but a `bl` target annotated with its symbol answers most
questions without leaving the terminal, and the 68K mode is the only way to read
the bootstrap at all, since Ghidra is loading the file as PowerPC.
"""
import sys
import capstone

BASE = 0x10000000


def main():
    flat, lo, hi = sys.argv[1], int(sys.argv[2], 16), int(sys.argv[3], 16)
    m68k = '-m' in sys.argv
    d0 = open(f'{flat}/seg0_CODE_10000000.bin', 'rb').read()
    syms = {int(a, 16): n for a, n in
            (l.strip().split(',') for l in open(f'{flat}/symbols.csv'))}
    md = (capstone.Cs(capstone.CS_ARCH_M68K,
                      capstone.CS_MODE_BIG_ENDIAN | capstone.CS_MODE_M68K_020) if m68k
          else capstone.Cs(capstone.CS_ARCH_PPC,
                           capstone.CS_MODE_32 | capstone.CS_MODE_BIG_ENDIAN))
    for i in md.disasm(d0[lo - BASE:hi - BASE], lo):
        if i.address in syms:
            print(f'--- {syms[i.address]}')
        note = ''
        if i.mnemonic.startswith('b') and i.op_str.startswith('0x'):
            t = int(i.op_str.split(',')[-1].strip(), 16)
            if t in syms:
                note = '   ; ' + syms[t]
        print(f'{i.address:#010x}  {i.mnemonic:<9} {i.op_str}{note}')


if __name__ == '__main__':
    main()
