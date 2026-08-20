"""Synthesise one-opcode texture programs and render each, to see what it does."""
import struct, os, sys, zlib, subprocess
import ppcrun as H
H.FLAT=FLAT=(sys.argv[1] if len(sys.argv)>1 else 'flat')
BASE=0x10000000; R2=BASE+0x7FFE
PROG=0x20340000
d0=open(os.path.join(FLAT,'seg0_CODE_10000000.bin'),'rb').read()
OPCOUNT=[d0[0x1000a500-BASE+i] for i in range(20)]
def stw(s,a,d): return (36<<26)|(s<<21)|(a<<16)|(d&0xFFFF)
def render(payload):
    body=struct.pack('>H',len(payload))+payload
    c=[]
    c+=H.load32(1,H.STACK); c+=H.load32(2,R2); c+=H.load32(13,H.STACK-0x1000)
    for i in range(0,len(body),4):
        w=int.from_bytes(body[i:i+4].ljust(4,b'\0'),'big')
        c+=H.load32(5,w)+H.load32(6,PROG+i)+[stw(5,6,0)]
    c+=H.load32(3,PROG)+H.load32(4,H.DEST)
    c+=H.call32(12,0x10000404)
    c+=H.load32(4,H.DEST)+H.load32(5,128*128*4)
    c+=[H.li(0,4),H.li(3,1),H.sc()]
    c+=[H.li(0,1),H.li(3,0),H.sc()]
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
    open('/tmp/pp-tex.elf','wb').write(eh+phs+blob); os.chmod('/tmp/pp-tex.elf',0o755)
    try:
        p=subprocess.run([H.qemu(),'/tmp/pp-tex.elf'],capture_output=True,timeout=12)
        return p.stdout
    except subprocess.TimeoutExpired:
        return b''
def classify(img):
    if not img: return 'hang/fault'
    px={img[i:i+4] for i in range(0,len(img),4)}
    if len(px)==1: return f'uniform {img[:4].hex()}'
    return f'{len(px)} distinct colours'
print(' op  operands  fill=0x00                 fill=0x40')
tiles=[]
for op in range(20):
    n=OPCOUNT[op]; n=1 if n==127 else n
    row=[]
    for fill in (0x00,0x40):
        img=render(bytes([op])+bytes([fill])*n)
        row.append((img,classify(img)))
    tiles.append((op,row[0][0],row[1][0]))
    print(f' {op:2}  {OPCOUNT[op]:3}       {row[0][1]:24} {row[1][1]}')
# contact sheet: two columns per opcode
TS,GAP,COLS=128,2,8
imgs=[(f'{op}a',a) for op,a,b in tiles]+[(f'{op}b',b) for op,a,b in tiles]
rows=(len(imgs)+COLS-1)//COLS
W,Hh=COLS*(TS+GAP)+GAP,rows*(TS+GAP)+GAP
buf=bytearray(W*Hh*3)
for i,(lab,img) in enumerate(imgs):
    if len(img)!=TS*TS*4: continue
    cx,cy=GAP+(i%COLS)*(TS+GAP),GAP+(i//COLS)*(TS+GAP)
    for y in range(TS):
        o=(cy+y)*W*3+cx*3; r=img[y*TS*4:(y+1)*TS*4]
        buf[o:o+TS*3]=bytes(b for j in range(0,len(r),4) for b in (r[j+1],r[j+2],r[j+3]))
raw=b''.join(b'\0'+bytes(buf[y*W*3:(y+1)*W*3]) for y in range(Hh))
def ch(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
open('texops.png','wb').write(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',W,Hh,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b''))
print('wrote texops.png')
