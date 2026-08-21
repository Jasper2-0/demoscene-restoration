#!/usr/bin/env python3
"""
PURPOSE / INVOCATION
  python3 check-global-scale.py <ours.png> <ref.png>

  Is the reference a scaled version of our render? Resamples ours about its centre
  over 1.00..1.25 and reports the scale that maximises correlation. Exits 1 if the
  best scale is not 1.00, i.e. if a genuine scale error is present.

MODE:       CHECK
OBSERVABLE: Pearson r on luma between our frame, resampled about its centre, and the
            reference. The ARGMAX over scale is the result; the r value is incidental.
UNITS:      scale is a ratio about the frame centre, nearest-neighbour, 3px stride.

FALSE FINDING PREVENTED
  Believing your eyes about scale. Three unrelated Wonder parts (4106a0 @18.69,
  4138a0 @32.26, 40cea0 @68.64) all LOOKED, side by side, as though the reference
  were 10-15% larger -- text bigger, geometry bigger, composition pushed outward.
  Three parts sharing one signature reads as a single global defect that would cap
  every score in the production. It was not real: best scale is exactly 1.00 for two
  of the three (r 0.7793 and 0.7750). Only 4106a0 has a real scale component, and a
  modest one -- 1.06 lifts it from 0.448 to 0.516.

  A side-by-side image is not an instrument for judging scale.

LIMITATIONS
  Isotropic scale about the centre only -- it cannot see translation, rotation,
  anisotropic stretch, or a scale about any other origin. Nearest-neighbour
  resampling, so it is coarse near 1.00; treat sub-0.02 differences as noise.
  Says nothing about WHY a scale differs (field of view, camera distance, a 2D quad).
"""
import zlib,struct,sys,math
def readpng(p):
    d=open(p,'rb').read(); pos=8; idat=b''; ct=6
    while pos<len(d):
        ln=struct.unpack('>I',d[pos:pos+4])[0]; typ=d[pos+4:pos+8]
        if typ==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',d[pos+8:pos+18])
        elif typ==b'IDAT': idat+=d[pos+8:pos+8+ln]
        pos+=12+ln
    raw=zlib.decompress(idat); ch=4 if ct==6 else 3
    rows=[]; prev=bytearray(w*ch); i=0
    for y in range(h):
        f=raw[i]; i+=1; line=bytearray(raw[i:i+w*ch]); i+=w*ch
        for x in range(len(line)):
            a=line[x-ch] if x>=ch else 0; b=prev[x]; c=prev[x-ch] if x>=ch else 0
            if f==1: line[x]=(line[x]+a)&255
            elif f==2: line[x]=(line[x]+b)&255
            elif f==3: line[x]=(line[x]+(a+b)//2)&255
            elif f==4:
                pp=a+b-c; pa,pb,pc=abs(pp-a),abs(pp-b),abs(pp-c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[x]=(line[x]+pr)&255
        rows.append(bytes(line)); prev=line
    return w,h,ch,rows
def luma(w,h,ch,rows):
    g=[[0]*w for _ in range(h)]
    for y in range(h):
        r=rows[y]
        for x in range(w):
            g[y][x]=(r[x*ch]*299+r[x*ch+1]*587+r[x*ch+2]*114)/1000
    return g
def corr(A,B,w,h,step=3):
    sa=sb=saa=sbb=sab=0.0; n=0
    for y in range(0,h,step):
        for x in range(0,w,step):
            a=A[y][x]; b=B[y][x]
            sa+=a; sb+=b; saa+=a*a; sbb+=b*b; sab+=a*b; n+=1
    va=saa-sa*sa/n; vb=sbb-sb*sb/n; cv=sab-sa*sb/n
    return cv/math.sqrt(va*vb) if va>0 and vb>0 else 0.0
def scaled(G,w,h,s):
    out=[[0]*w for _ in range(h)]
    cx,cy=w/2,h/2
    for y in range(h):
        sy=(y-cy)/s+cy
        y0=min(h-1,max(0,int(sy)))
        for x in range(w):
            sx=(x-cx)/s+cx
            x0=min(w-1,max(0,int(sx)))
            out[y][x]=G[y0][x0]
    return out
ours,ref=sys.argv[1],sys.argv[2]
w,h,ch,A=readpng(ours); _,_,ch2,B=readpng(ref)
GA=luma(w,h,ch,A); GB=luma(w,h,ch2,B)
print(f'  scale   r')
best=None
for i in range(0,26):
    s=1.0+i*0.01
    r=corr(scaled(GA,w,h,s),GB,w,h)
    if best is None or r>best[1]: best=(s,r)
    if i%2==0: print(f'  {s:.2f}   {r:.4f}')
print(f'  BEST scale {best[0]:.2f} -> r {best[1]:.4f}')
base = corr(GA, GB, w, h)
print(f'  at 1.00      -> r {base:.4f}')
if abs(best[0] - 1.0) < 0.005:
    print('  PASS  no global scale error: the frames are the same size')
    sys.exit(0)
print(f'  FAIL  best scale {best[0]:.2f} beats 1.00 by {best[1]-base:+.4f} r')
sys.exit(1)
