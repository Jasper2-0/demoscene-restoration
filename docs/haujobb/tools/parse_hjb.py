import struct,re,glob,os,sys
files=sorted(glob.glob('/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/originals/haujobb/moments/Data/*.HJB'))
pat=re.compile(rb'[ -~]{3,60} \([0-9A-F]{6,8}\)\x00')
def u32(d,o): return struct.unpack('<I',d[o:o+4])[0]
def f32(d,o): return struct.unpack('<f',d[o:o+4])[0]
totals={'mesh':0,'cam':0,'tgt':0,'omni':0,'mat':0,'verts':0,'faces':0}
allA=[]
tails=[]
matpaths=[]
for f in files:
    d=open(f,'rb').read()
    ms=list(pat.finditer(d))
    starts=[m.start() for m in ms]+[len(d)]
    print(f"\n### {os.path.basename(f)} frames={u32(d,4)} hdr2={u32(d,8)}")
    ok=bad=0
    firstmat=None
    for i,m in enumerate(ms):
        o=m.start(); nxt=starts[i+1]
        t=u32(d,o-4)
        name=m.group()[:-1].decode()
        p=m.end()  # payload
        if name.startswith('Material'):
            if firstmat is None:
                firstmat=(t,o)
            # payload: 5 bytes, float, path asciiz
            amt=struct.unpack('<f',d[p+5:p+9])[0]
            pe_=d.index(b'\0',p+9)
            path=d[p+9:pe_].decode('latin1')
            matpaths.append((os.path.basename(f),name,round(amt,4),path))
            totals['mat']+=1
            continue
        if t==0 and not name.startswith(('Omni','Camera')):
            nv=u32(d,p); vp=p+4+12*nv
            nf=u32(d,vp); fp=vp+4+36*nf
            q=fp
            A=struct.unpack('<6I',d[q:q+24]); q+=24
            npos=u32(d,q); q+=4+36*npos
            n2=u32(d,q); q+=4+36*n2
            nrot=u32(d,q); q+=4+44*nrot
            nsca=u32(d,q); q+=4+36*nsca
            tail=struct.unpack('<4i',d[q:q+16]); q+=16
            end=q+4  # next record's type dword
            status='OK' if q==nxt-4 or q==nxt else f'MISMATCH end={hex(q)} next={hex(nxt)} delta={nxt-4-q}'
            if q==nxt-4 or q==nxt: ok+=1
            else: bad+=1
            allA.append(A); tails.append(tail)
            totals['mesh']+=1; totals['verts']+=nv; totals['faces']+=nf
            kf=[u32(d,fp+28+36*k) for k in range(min(npos,6))]
            print(f"  mesh {name[:30]:32} nv={nv:6} nf={nf:6} A={A} pos={npos:4} t2={n2} rot={nrot} sca={nsca} tail={tail} {status} posFrames={kf}")
        elif t==1:
            totals['cam']+=1; print(f"  cam  {name[:30]:32} payload={nxt-4-p}B")
        elif t==2 and name.startswith('Camera'):
            totals['tgt']+=1; print(f"  tgt  {name[:30]:32} payload={nxt-4-p}B")
        elif name.startswith('Omni'):
            totals['omni']+=1; print(f"  omni {name[:30]:32} type={t} payload={nxt-4-p}B")
        else:
            print(f"  ??   {name[:30]:32} pre={t}")
    if firstmat: print(f"  matCount dword before first material = {firstmat[0]}")
print('\nTOTALS',totals)
import collections
print('A-block population:',collections.Counter(allA).most_common(10))
print('tail population:',collections.Counter(tails).most_common(10))
print('\nMATERIAL PATHS:')
for r in matpaths: print(' ',r)
