import struct, sys

class R:
    def __init__(s,d): s.d=d; s.o=0
    def u32(s):
        v=struct.unpack_from('<I',s.d,s.o)[0]; s.o+=4; return v
    def i32(s):
        v=struct.unpack_from('<i',s.d,s.o)[0]; s.o+=4; return v
    def f32(s):
        v=struct.unpack_from('<f',s.d,s.o)[0]; s.o+=4; return v
    def cstr(s):
        e=s.d.index(b'\0',s.o); v=s.d[s.o:e].decode('latin1'); s.o=e+1; return v

def track(r, payload_words, tag, log):
    a=r.u32(); n=r.i32()
    keys=[]
    for _ in range(n):
        fr=r.u32(); tcb=[r.f32() for _ in range(5)]
        pay=[r.f32() for _ in range(payload_words)]
        keys.append((fr,pay))
    log.append(f'    track {tag}: flags={a} nkeys={n} keys={[(k[0],[round(x,3) for x in k[1]]) for k in keys[:4]]}{"..." if n>4 else ""}')
    return keys

def neg1list(r, log):
    vals=[]
    while True:
        v=r.i32()
        if v==-1: break
        vals.append(v)
    log.append(f'    -1list: {len(vals)} vals')

def material(r, log):
    name=r.cstr()
    slots=[]
    for i in range(11):
        amt=r.f32(); path=r.cstr()
        if amt>0 or path: slots.append((i,round(amt,3),path))
    log.append(f'    material "{name}" slots={slots}')

def morphtrack(r, log):
    a=r.u32(); n=r.i32()
    tot=0
    for _ in range(max(n,0)):
        fr=r.u32(); [r.f32() for _ in range(5)]
        nv=r.i32(); tot+=nv
        for _ in range(nv*3): r.f32()
    log.append(f'    morphtrack flags={a} nkeys={n} totverts={tot}')

def node(r, log, depth):
    t=r.i32()
    if t==-1: return False
    if t not in (0,1,2,3,4,5):
        r.o-=4; return None  # not a node: material table begins here
    name=r.cstr()
    log.append('  '*depth + f'node type={t} "{name}" @after-name=0x{r.o:x}')
    if t==0:  # mesh
        nv=r.i32(); 
        for _ in range(nv*3): r.f32()
        nf=r.i32()
        for _ in range(nf*3): r.u32(); r.f32(); r.f32()
        ng=r.i32()
        for _ in range(ng):
            mid=r.u32(); nidx=r.i32()
            for _ in range(nidx): r.u32()
        log.append('  '*depth + f'  mesh nv={nv} nf={nf} ngroups={ng}')
        track(r,3,'pos',log); track(r,4,'rot(quat)',log); track(r,3,'scale',log)
        neg1list(r,log); morphtrack(r,log)
    elif t==1:  # camera
        track(r,3,'pos',log); track(r,1,'roll?',log); track(r,1,'fov',log); neg1list(r,log)
    elif t==2:  # camera target
        track(r,3,'pos',log); neg1list(r,log)
    elif t==4:  # light
        rgb=[r.f32() for _ in range(3)]
        log.append('  '*depth + f'  light rgb={[round(x,3) for x in rgb]}')
        track(r,3,'pos',log); track(r,4,'rot(quat)',log); track(r,3,'scale?',log); neg1list(r,log)
    elif t==3:  # light variant (spot?)
        rgb=[r.f32() for _ in range(3)]
        track(r,3,'pos',log); track(r,4,'rot?',log); track(r,3,'vec3?',log); neg1list(r,log)
    elif t==5:  # camera-like (spot target?)
        track(r,3,'pos',log); track(r,1,'f1',log); track(r,1,'f2',log); neg1list(r,log)
    else:
        raise Exception(f'node type {t} not implemented @0x{r.o:x}')
    # children
    v=r.i32()
    if v!=-1:
        r.o-=4
        while node(r,log,depth+1): pass
    return True

fn=sys.argv[1]
d=open(fn,'rb').read()
r=R(d); log=[]
z=r.u32(); nf=r.u32()
log.append(f'{fn}: hdr0={z} nframes={nf}')
try:
    while r.o < len(d):
        v=node(r,log,0)
        if not v: break
    if r.o + 4 <= len(d):
        nmat=r.i32()
        while nmat==-1 and r.o+4<=len(d): nmat=r.i32()
        log.append(f'material table: n={nmat}')
        for _ in range(nmat): material(r,log)
    if r.o != len(d):
        log.append(f'TRAILING {len(d)-r.o} bytes: {d[r.o:r.o+16].hex()}')
    status=f'CONSUMED 0x{r.o:x} of 0x{len(d):x} ({"EXACT" if r.o==len(d) else "MISMATCH"})'
except Exception as e:
    status=f'FAILED @0x{r.o:x}/{len(d):#x}: {e}'
print('\n'.join(log[:60])); print(status)
