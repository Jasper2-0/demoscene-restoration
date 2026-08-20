import struct, sys
p = "/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/originals/haujobb/hjb_elef/elements.exe"
d = open(p,'rb').read()
print("file size:", len(d))
e_lfanew = struct.unpack_from('<I', d, 0x3c)[0]
print("e_lfanew: 0x%x" % e_lfanew, "sig:", d[e_lfanew:e_lfanew+4])
coff = e_lfanew+4
machine, nsec, tds, ptrsym, nsym, optsize, chars = struct.unpack_from('<HHIIIHH', d, coff)
print("machine=0x%x nsec=%d timedatestamp=0x%x optsize=%d chars=0x%x" % (machine,nsec,tds,optsize,chars))
import datetime
print("linked:", datetime.datetime.utcfromtimestamp(tds))
opt = coff+20
magic, majlnk, minlnk, sizecode, sizeidata, sizeudata, entry, basecode = struct.unpack_from('<HBBIIIII', d, opt)
imagebase, secalign, filealign = struct.unpack_from('<III', d, opt+28)
print("optmagic=0x%x linker=%d.%d sizeofcode=0x%x entry=0x%x imagebase=0x%x secalign=0x%x filealign=0x%x" % (magic,majlnk,minlnk,sizecode,entry,imagebase,secalign,filealign))
sizeimage, sizeheaders = struct.unpack_from('<II', d, opt+56)
subsys = struct.unpack_from('<H', d, opt+68)[0]
print("sizeofimage=0x%x sizeofheaders=0x%x subsystem=%d" % (sizeimage,sizeheaders,subsys))
nrva = struct.unpack_from('<I', d, opt+92)[0]
ddir = opt+96
names = ["export","import","resource","exception","security","basereloc","debug","arch","globalptr","tls","loadcfg","boundimp","iat","delayimp","com","reserved"]
dirs = {}
for i in range(min(nrva,16)):
    rva, sz = struct.unpack_from('<II', d, ddir+8*i)
    dirs[names[i]] = (rva, sz)
    if rva or sz: print("dir %-10s rva=0x%08x size=0x%x (%d)" % (names[i], rva, sz, sz))
secs = []
secoff = opt + optsize
print("\n%-8s %10s %10s %10s %10s %10s  %s" % ("name","vsize","vaddr","rawsize","rawptr","rawend","chars"))
maxend = 0
for i in range(nsec):
    o = secoff + 40*i
    name = d[o:o+8].rstrip(b'\0').decode('latin1')
    vsize, vaddr, rawsz, rawptr = struct.unpack_from('<IIII', d, o+8)
    ch = struct.unpack_from('<I', d, o+36)[0]
    secs.append((name,vsize,vaddr,rawsz,rawptr,ch))
    end = rawptr+rawsz
    maxend = max(maxend, end)
    print("%-8s 0x%08x 0x%08x 0x%08x 0x%08x 0x%08x  0x%08x" % (name,vsize,vaddr,rawsz,rawptr,end,ch))
print("\nend of last raw data: 0x%x (%d)" % (maxend, maxend))
print("OVERLAY: %d bytes (0x%x) starting at 0x%x" % (len(d)-maxend, len(d)-maxend, maxend) if len(d)>maxend else "no overlay")

def rva2off(rva):
    for name,vsize,vaddr,rawsz,rawptr,ch in secs:
        if vaddr <= rva < vaddr + max(vsize,rawsz):
            return rawptr + (rva - vaddr)
    return None

# imports
imp_rva, imp_sz = dirs.get("import",(0,0))
if imp_rva:
    print("\nIMPORTS:")
    o = rva2off(imp_rva)
    while True:
        ilt, tds2, fwd, namerva, iat = struct.unpack_from('<IIIII', d, o)
        if not (ilt or namerva or iat): break
        no = rva2off(namerva)
        dll = d[no:d.index(b'\0',no)].decode('latin1')
        # walk thunks
        t = rva2off(ilt if ilt else iat)
        funcs = []
        while True:
            v = struct.unpack_from('<I', d, t)[0]
            if v == 0: break
            if v & 0x80000000:
                funcs.append("ord#%d" % (v & 0xffff))
            else:
                fo = rva2off(v)
                funcs.append(d[fo+2:d.index(b'\0',fo+2)].decode('latin1'))
            t += 4
        print("  %s (%d):" % (dll, len(funcs)))
        print("    " + ", ".join(funcs))
        o += 20

# resources
res_rva, res_sz = dirs.get("resource",(0,0))
if res_rva:
    print("\nRESOURCES (dir size field: 0x%x):" % res_sz)
    base = rva2off(res_rva)
    def walkdir(off, level, path):
        chars, tds3, maj, mino, nnamed, nid = struct.unpack_from('<IIHHHH', d, base+off)
        for i in range(nnamed+nid):
            eo = base+off+16+8*i
            nameid, data = struct.unpack_from('<II', d, eo)
            if nameid & 0x80000000:
                so = base + (nameid & 0x7fffffff)
                slen = struct.unpack_from('<H', d, so)[0]
                label = d[so+2:so+2+slen*2].decode('utf-16le')
            else:
                label = str(nameid)
            if data & 0x80000000:
                walkdir(data & 0x7fffffff, level+1, path+[label])
            else:
                drva, dsz, cp = struct.unpack_from('<III', d, base+data)
                print("  %s -> rva=0x%x size=%d off=0x%x" % ("/".join(path+[label]), drva, dsz, rva2off(drva)))
    walkdir(0,0,[])
