import struct,re,glob,os
files=sorted(glob.glob('/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/originals/haujobb/moments/Data/*.HJB'))
pat=re.compile(rb'[ -~]{3,60} \([0-9A-F]{6,8}\)\x00')
for f in files:
    d=open(f,'rb').read()
    h=struct.unpack('<III',d[:12])
    ms=list(pat.finditer(d))
    recs=[]
    for m in ms:
        o=m.start()
        pre=struct.unpack('<I',d[o-4:o])[0] if o>=4 else None
        recs.append((o,pre,m.group()[:-1].decode()))
    print(f"\n### {os.path.basename(f)} size={len(d)} hdr={h} nrecs={len(recs)}")
    types={}
    for o,pre,n in recs:
        types.setdefault(pre if pre is not None and pre<10 else 'X',[]).append(n)
    for t,ns in sorted(types.items(),key=str):
        print(f"  type {t}: {len(ns)}: {ns[:6]}{'...' if len(ns)>6 else ''}")
