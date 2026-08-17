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
# ONE STUB PER VECTOR, at its own address, rather than one self-similar pointer
# blanketed over the whole table.
#
# The old arrangement put 0x20402040 — an address whose two halves are identical
# — at every even offset below the base, so any 2-byte-aligned `lwz` returned a
# valid pointer regardless of alignment. That is neat and it destroys
# information: the geometry builder READS two vectors, W3D_DrawTriFan (LVO -168)
# and W3D_DrawLineStrip (LVO -390), and BAKES THE POINTER INTO THE FACE RECORD
# as a fan-vs-strip discriminator it later branches through. With every vector
# the same pointer, all 7,867 mesh faces came out identical and which primitive
# each face draws was unrecoverable from any export built on this harness.
#
# It is safe to give each vector a distinct pointer because library vectors are
# 6 bytes apart and the code reads the pointer at LVO+2 — so consecutive 4-byte
# writes cannot overlap, which is the reason the self-similar trick was needed
# in the first place. `vecscan.py` confirms the displacements: LVO -96 is read
# at -94, -168 at -166, -390 at -388.
#
# W3D_AllocTexObj gets more than a `blr`: it returns a DIFFERENT object each
# call, so `face+0x54` names which texture a face uses instead of naming the one
# fake object every allocation used to share. The ordinal is the AllocTexObj
# call index, which is exactly what drawlog.py already keys the recorded draw
# stream's texture field on.
STUBS=0x20440000; STUBSZ=32          # 88 stubs, inside the rwx scratch region
TEXCTR=0x20460000                    # the counter the AllocTexObj stub bumps
TEXSTRIDE=0x1000                     # objects far enough apart to be written to
VECTORS=88                           # lvocheck.py: the table is 88 entries
ALLOC_TEX=15                         # W3D_AllocTexObj, LVO -96 — vecscan.py
FAN_LVO=168; STRIP_LVO=390           # what the geometry builder reads
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
def lwz(d,a,o): return (32<<26)|(d<<21)|(a<<16)|(o&0xFFFF)
def ori(a,s,v): return (24<<26)|(s<<21)|(a<<16)|(v&0xFFFF)
def addi(d,a,v): return (14<<26)|(d<<21)|(a<<16)|(v&0xFFFF)
def vector_addr(index):
    """Where the pointer for vector `index` is read from, relative to nothing.

    LVO is -6*(index+1) and the pointer sits at LVO+2, so this is the effective
    address of the `lwz` the caller emits.
    """
    return W3DBASE - (6 * (index + 1) - 2)


def stub_addr(index):
    return STUBS + index * STUBSZ


def stubs():
    """Write 88 distinguishable vectors and point _Warp3DBase at them."""
    c = []
    # A bare `blr` per vector. Nothing here is meant to DO anything — the point
    # is only that the pointer differs, so a value baked into a record says
    # which vector produced it.
    for i in range(VECTORS):
        c += H.load32(5, blr()) + H.load32(6, stub_addr(i)) + [stw(5, 6, 0)]
    # W3D_AllocTexObj: load the counter, hand it back, bump it.
    prog = [lis(4, TEXCTR >> 16), ori(4, 4, TEXCTR & 0xFFFF), lwz(3, 4, 0),
            addi(5, 3, TEXSTRIDE), stw(5, 4, 0), blr()]
    assert len(prog) * 4 <= STUBSZ
    for k, w in enumerate(prog):
        c += H.load32(5, w) + H.load32(6, stub_addr(ALLOC_TEX) + k * 4) + [stw(5, 6, 0)]
    c += H.load32(5, FAKEOBJ) + H.load32(6, TEXCTR) + [stw(5, 6, 0)]
    for i in range(VECTORS):
        c += H.load32(5, stub_addr(i)) + H.load32(6, vector_addr(i)) + [stw(5, 6, 0)]
    c += H.load32(5, W3DBASE) + H.load32(6, 0x1000a348) + [stw(5, 6, 0)]
    return c


# Same window as drawlog.ARENADUMP, and for the same reason: a scene reaches
# arena+0x1ff74, so 0x20000 truncates by 140 bytes and the walks simply stop.
def run(stream, txt_tab=0x2642, obj_tab=0x2706, dump=0x80000, steps=99, want_alloc=False, pre=()):
    c=[]
    c+=H.load32(1,H.STACK); c+=H.load32(2,R2); c+=H.load32(13,H.STACK-0x1000)
    c+=stubs()
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
