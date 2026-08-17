"""Run the scene interpreter for real and read back the graph it builds.

_generate_scene's operand bytes index tables that only exist once _calculate_txt
and _calculate_obj have run, so the streams cannot be decoded statically. Running
the actual part-one setup sequence builds those tables, and then the scene graph
falls out of the arena.
"""
import struct, os, sys, subprocess
import ppcrun as H
H.FLAT=FLAT=(sys.argv[1] if len(sys.argv)>1 else 'flat')
BASE=0x10000000; R2=BASE+0x7FFE
CALC_TXT=0x10001e9c; ALLOC_TXT=0x1000202c; CALC_OBJ=0x10001f98
SET_ALLOC=0x10006b14; GEN_SCENE=0x100021a0
INIT_TXTGEN=0x1000139c; INIT_SCENE_GEN=0x10002fb8
W3DBASE=0x20500000; OUT=0x203c0000
# The stub lives at an address whose two halves are IDENTICAL (0x2040/0x2040), so
# the vector region can be filled with the repeating halfword 0x2040 and ANY
# 2-byte-aligned lwz below the base returns a valid pointer. Necessary because the
# real fetch displacements are not multiples of 6 — the global holds base+2, so
# LVO -96 is read as -0x5e, -144 as -0x8e, -120 as -0x76.
BLR=0x20402040
ABSENT=77
def _load(path):
    """The segment dump, or None — see runsynth.py. Importing must not raise."""
    try:
        return open(os.path.join(path,'seg0_CODE_10000000.bin'),'rb').read()
    except FileNotFoundError:
        return None
d0=_load(FLAT)
def _need():
    if d0 is None:
        print(f'runscene: no segment dump under {FLAT!r} — see speccheck.py for '
              'the rehydration steps.', file=sys.stderr)
        raise SystemExit(ABSENT)
def g(d):
    _need()
    return struct.unpack_from('>I',d0,R2+d-BASE)[0]
ARENA=g(0x2832) if d0 is not None else None
def stw(s,a,d): return (36<<26)|(s<<21)|(a<<16)|(d&0xFFFF)
def blr(): return (19<<26)|(20<<21)|(16<<1)
FAKEOBJ=0x20560000
def lis(d,v): return (15<<26)|(d<<21)|(v&0xFFFF)
def ori(a,s,v): return (24<<26)|(s<<21)|(a<<16)|(v&0xFFFF)
def addi(d,a,v): return (14<<26)|(d<<21)|(a<<16)|(v&0xFFFF)
def run(stream, txt_tab=0x2642, obj_tab=0x2706, dump=0x20000, steps=99, want_alloc=False, pre=()):
    c=[]
    c+=H.load32(1,H.STACK); c+=H.load32(2,R2); c+=H.load32(13,H.STACK-0x1000)
    for k,w in enumerate([lis(3,FAKEOBJ>>16), ori(3,3,FAKEOBJ&0xFFFF), blr()]):
        c+=H.load32(5,w)+H.load32(6,BLR+k*4)+[stw(5,6,0)]
    # blanket the whole vector region with the self-similar pointer
    c+=H.load32(5,BLR)
    for off in range(4,1028,4):
        c+=H.load32(6,W3DBASE-off)+[stw(5,6,0)]
    for off in range(2,1026,4):
        c+=H.load32(6,W3DBASE-off)+[stw(5,6,0)]
    c+=H.load32(5,W3DBASE)+H.load32(6,0x1000a348)+[stw(5,6,0)]
    if steps>0: c+=[addi(31,2,txt_tab)]+H.call32(12,CALC_TXT)
    if steps>1: c+=H.call32(12,ALLOC_TXT)
    if steps>2: c+=[addi(31,2,obj_tab)]+H.call32(12,CALC_OBJ)
    if steps>3:
        # _play_scene_p_end calls these two before any scene runs; the second
        # unpacks the 40-glyph font table that scene handler [4] walks looking
        # for a 0xFF terminator. Without it that walk runs off mapped memory.
        c+=H.call32(12,INIT_TXTGEN)
        c+=H.call32(12,INIT_SCENE_GEN)
        for ps in pre:                      # run earlier scenes first, same process
            c+=H.load32(3,ARENA)+H.call32(12,SET_ALLOC)
            c+=H.load32(4,ps)
            c+=H.load32(5,g(0x288e))+H.load32(6,g(0x2896))
            c+=H.call32(12,GEN_SCENE)
        c+=H.load32(3,ARENA)+H.call32(12,SET_ALLOC)
        c+=H.load32(4,stream)
        c+=H.load32(5,g(0x288e))+H.load32(6,g(0x2896))
        c+=H.call32(12,GEN_SCENE)
    else:
        c+=H.load32(3,0)
    c+=H.load32(4,OUT)+[stw(3,4,0)]
    c+=H.load32(4,OUT)+H.load32(5,4)
    c+=[H.li(0,4),H.li(3,1),H.sc()]
    c+=H.load32(4,ARENA)+H.load32(5,dump)
    c+=[H.li(0,4),H.li(3,1),H.sc()]
    c+=[H.li(0,1),H.li(3,0),H.sc()]
    stub=b''.join(struct.pack('>I',w) for w in c)
    pieces=H.segments(FLAT)
    pieces.append((H.SCRATCH,stub,0x00600000))
    EH,PH,AL=52,32,0x1000; blob=b''; loads=[]; cur=EH+PH*len(pieces)
    for va,data,msz in pieces:
        if data is None: loads.append((va,0,msz,0,6)); continue
        blob+=b'\0'*((-(cur+len(blob)))%AL)
        loads.append((va,len(data),max(msz,len(data)),cur+len(blob),7)); blob+=data
    eh=(b'\x7fELF'+bytes([1,2,1,0])+b'\0'*8+struct.pack('>HHIIIIIHHHHHH',2,20,1,H.SCRATCH,EH,0,0,EH,PH,len(pieces),0,0,0))
    phs=b''.join(struct.pack('>IIIIIIII',1,off,va,va,f,m,fl,AL) for va,f,m,off,fl in loads)
    open('/tmp/pp-scene.elf','wb').write(eh+phs+blob); os.chmod('/tmp/pp-scene.elf',0o755)
    try:
        p=subprocess.run([H.qemu(),'/tmp/pp-scene.elf'],capture_output=True,timeout=120)
        return p.stdout,p.stderr.decode('utf8','replace')
    except subprocess.TimeoutExpired:
        return b'',''
if __name__=='__main__':
    # Before anything formats ARENA, which is None without the dump — leaving
    # that unguarded turned a clear FileNotFoundError into a TypeError about
    # NoneType.__format__, which is a worse error than the one it replaced.
    _need()
    print(f'scene arena = {ARENA:#010x}   param3={g(0x288e):#010x}  param4={g(0x2896):#010x}')
    strm=struct.unpack_from('>I',d0,R2+0x25aa-BASE)[0]
    for k in range(5):
        o,e=run(strm,steps=k)
        lbl=['(nothing)','+calculate_txt','(alloc skipped)','+calculate_obj','+generate_scene'][k]
        print(f'   steps={k} {lbl:18} -> {len(o):6} bytes  {e.strip()[:60]}')
    out,err=run(strm)
    print(f'stream {strm:#010x} -> {len(out)} bytes; err={err.strip()[:120]}')
    if len(out)>=4:
        head=struct.unpack('>I',out[:4])[0]; arena=out[4:]
        print(f'head = {head:#010x}  (arena {ARENA:#010x}..{ARENA+len(arena):#010x})')
        node=head; n=0
        while node and ARENA<=node<ARENA+len(arena)-64 and n<12:
            o=node-ARENA
            print(f'   node[{n}] @{node:#010x}: '+' '.join(f'{b:02x}' for b in arena[o:o+20]))
            node=struct.unpack_from('>I',arena,o+0x10)[0]; n+=1
        print(f'   walked {n} nodes')
