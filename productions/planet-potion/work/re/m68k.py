#!/usr/bin/env python3
"""Disassemble one of the embedded dbplayer.library segments as 68K."""
import sys
import capstone

path, base = sys.argv[1], int(sys.argv[2], 16)
pat = sys.argv[3] if len(sys.argv) > 3 else None
d = open(path, 'rb').read()
md = capstone.Cs(capstone.CS_ARCH_M68K, capstone.CS_MODE_BIG_ENDIAN | capstone.CS_MODE_M68K_040)
md.skipdata = True
out = []
for i in md.disasm(d, base):
    out.append(f'0x{i.address:08x}  {i.mnemonic:<12} {i.op_str}')
if pat:
    import re
    rx = re.compile(pat, re.I)
    for k, line in enumerate(out):
        if rx.search(line):
            for j in range(max(0, k - 6), min(len(out), k + 7)):
                print(('>>' if j == k else '  ') + out[j])
            print('-' * 60)
else:
    print('\n'.join(out))
