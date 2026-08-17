"""Second pass at the texture opcodes: run a GENERATOR first, then the opcode
under test, and see what it does to a surface that already has content."""
import struct, os, sys, subprocess, collections
import ppcrun as H
H.FLAT=FLAT=(sys.argv[1] if len(sys.argv)>1 else 'flat')
BASE=0x10000000; R2=BASE+0x7FFE; PROG=0x20340000
d0=open(os.path.join(FLAT,'seg0_CODE_10000000.bin'),'rb').read()
OPC=[d0[0x1000a500-BASE+i] for i in range(20)]
def stw(s,a,d): return (36<<26)|(s<<21)|(a<<16)|(d&0xFFFF)
def render(payload,timeout=15):
    body=struct.pack('>H',len(payload))+payload
    c=[]
    c+=H.load32(1,H.STACK); c+=H.load32(2,R2); c+=H.load32(13,H.STACK-0x1000)
    for i in range(0,len(body),4):
        w=int.from_bytes(body[i:i+4].ljust(4,b'\0'),'big')
        c+=H.load32(5,w)+H.load32(6,PROG+i)+[stw(5,6,0)]
    c+=H.load32(3,PROG)+H.load32(4,H.DEST)+H.call32(12,0x10000404)
    c+=H.load32(4,H.DEST)+H.load32(5,128*128*4)
    c+=[H.li(0,4),H.li(3,1),H.sc()]+[H.li(0,1),H.li(3,0),H.sc()]
    stub=b''.join(struct.pack('>I',w) for w in c)
    segs=H.read_layout(FLAT)
    pieces=[(va,(None if fn is None else open(os.path.join(FLAT,fn),'rb').read()),sz) for va,sz,fn in segs]
    pieces.append((H.SCRATCH,stub,H.SCRATCH_SZ))
    EH,PH,AL=52,32,0x1000; blob=b''; loads=[]; cur=EH+PH*len(pieces)
    for va,data,msz in pieces:
        if data is None: loads.append((va,0,msz,0,6)); continue
        blob+=b'\0'*((-(cur+len(blob)))%AL)
        loads.append((va,len(data),max(msz,len(data)),cur+len(blob),7)); blob+=data
    eh=(b'\x7fELF'+bytes([1,2,1,0])+b'\0'*8+struct.pack('>HHIIIIIHHHHHH',2,20,1,H.SCRATCH,EH,0,0,EH,PH,len(pieces),0,0,0))
    phs=b''.join(struct.pack('>IIIIIIII',1,off,va,va,f,m,fl,AL) for va,f,m,off,fl in loads)
    open('/tmp/pp-t2.elf','wb').write(eh+phs+blob); os.chmod('/tmp/pp-t2.elf',0o755)
    try:
        p=subprocess.run([H.qemu(),'/tmp/pp-t2.elf'],capture_output=True,timeout=timeout)
        return p.stdout
    except subprocess.TimeoutExpired: return b''
def stats(img):
    if len(img)!=128*128*4: return None
    px=[img[i:i+4] for i in range(0,len(img),4)]
    uniq=len(set(px))
    lum=[(p[1]+p[2]+p[3])//3 for p in px]
    alpha={p[0] for p in px}
    return uniq, sum(lum)//len(lum), min(lum), max(lum), len(alpha)
NOISE=bytes([9])+bytes([0x40])*12          # op9 = the noise generator
base=render(NOISE); b=stats(base)
print(f'baseline  op9 alone: {b[0]} colours, mean lum {b[1]}, range {b[2]}..{b[3]}, {b[4]} alphas\n')
print(' op  operands  result after op9                              verdict')
for op in range(20):
    n=1 if OPC[op]==127 else OPC[op]
    img=render(NOISE+bytes([op])+bytes([0x40])*n)
    s=stats(img)
    if s is None: print(f' {op:3}  {OPC[op]:3}       (hang/fault)'); continue
    d_uniq=s[0]-b[0]; d_lum=s[1]-b[1]
    v=[]
    if s[0]==1: v.append('WIPES to uniform')
    elif abs(d_uniq)>b[0]*0.3: v.append(f'colours {d_uniq:+}')
    if abs(d_lum)>8: v.append(f'lum {d_lum:+}')
    if s[4]!=b[4]: v.append(f'alpha levels {b[4]}->{s[4]}')
    if s[2]!=b[2] or s[3]!=b[3]: v.append(f'range {s[2]}..{s[3]}')
    print(f' {op:3}  {OPC[op]:3}       {s[0]:6} colours, lum {s[1]:3}, {s[4]:3} alphas      {", ".join(v) or "no change"}')
