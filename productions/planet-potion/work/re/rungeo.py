"""Run the whole geometry interpreter and read back the node list it builds.

Sidesteps operand widths entirely: _generate_obj returns the head of a linked
list whose nodes carry opcode*4 at +0x10 and next at +0x14. Walk that and the
program is decoded. Warp3DBase is pointed at a table of no-op vectors so the
draw calls inside the build pass cannot fault.
"""
import struct, os, sys, subprocess
import ppcrun as H
FLAT=H.FLAT=(sys.argv[1] if len(sys.argv)>1 else 'flat')
BASE=0x10000000; R2=BASE+0x7FFE
SET_ALLOC=0x10006b14; GEN_OBJ=0x10003018
ARENA=0x20340000; TABLE=0x20380000; OUT=0x203c0000
W3DBASE=0x20500000; BLR=0x20400000
def stw(s,a,d): return (36<<26)|(s<<21)|(a<<16)|(d&0xFFFF)
def blr(): return (19<<26)|(20<<21)|(16<<1)
def run(prog):
    c=[]
    c+=H.load32(1,H.STACK); c+=H.load32(2,R2); c+=H.load32(13,H.STACK-0x1000)
    # a blr, and a vector table of pointers to it, spanning LVO -6..-600
    c+=H.load32(5,blr())+H.load32(6,BLR)+[stw(5,6,0)]
    c+=H.load32(5,BLR)
    for lvo in range(6,606,6):
        c+=H.load32(6,W3DBASE-lvo)+[stw(5,6,0)]
    c+=H.load32(5,W3DBASE)+H.load32(6,0x1000a348)+[stw(5,6,0)]   # _Warp3DBase
    c+=H.load32(3,ARENA)+H.call32(12,SET_ALLOC)
    c+=H.load32(3,prog)+H.load32(4,TABLE)
    c+=H.call32(12,GEN_OBJ)
    c+=H.load32(4,OUT)+[stw(3,4,0)]              # head pointer
    c+=H.load32(4,OUT)+H.load32(5,4)
    c+=[H.li(0,4),H.li(3,1),H.sc()]
    c+=H.load32(4,ARENA)+H.load32(5,0x8000)      # dump the arena
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
    open('/tmp/pp-obj.elf','wb').write(eh+phs+blob); os.chmod('/tmp/pp-obj.elf',0o755)
    p=subprocess.run([H.qemu(),'/tmp/pp-obj.elf'],capture_output=True,timeout=90)
    return p.stdout,p.stderr.decode('utf8','replace')
if __name__=='__main__':
    d0=open(os.path.join(FLAT,'seg0_CODE_10000000.bin'),'rb').read()
    ptr=[struct.unpack_from('>I',d0,R2+0x2706-BASE+i*4)[0] for i in range(28)]
    okc=0
    for i,prog in enumerate(ptr[:6]):
        out,err=run(prog)
        if len(out)<4: print(f'  [{i}] {prog:#x} no output: {err.strip()[:90]}'); continue
        head=struct.unpack('>I',out[:4])[0]; arena=out[4:]
        seq=[]; node=head; guard=0
        while node and ARENA<=node<ARENA+len(arena) and guard<64:
            o=node-ARENA
            seq.append(struct.unpack_from('>H',arena,o+0x10)[0]//4)
            node=struct.unpack_from('>I',arena,o+0x14)[0]; guard+=1
        print(f'  [{i}] {prog:#010x} head={head:#010x} ops={seq}')
        okc+= bool(seq)
    print(f'decoded {okc}/6')
