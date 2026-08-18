import capstone
BASE=0x10000000
d=open('flat/seg0_CODE_10000000.bin','rb').read()
md=capstone.Cs(capstone.CS_ARCH_PPC, capstone.CS_MODE_32|capstone.CS_MODE_BIG_ENDIAN)
lo,hi=0x100062bc,0x10006300
for i in md.disasm(d[lo-BASE:hi-BASE], lo):
    print(f'{i.address:#010x}  {i.mnemonic:9} {i.op_str}')
print('   ...')
lo,hi=0x10006420,0x1000644c
for i in md.disasm(d[lo-BASE:hi-BASE], lo):
    print(f'{i.address:#010x}  {i.mnemonic:9} {i.op_str}')
