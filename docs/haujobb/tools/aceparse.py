import struct, datetime
p = "/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/originals/haujobb/hjb_elef/elements.exe"
d = open(p,'rb').read()
sig = d.find(b"**ACE**")
start = sig - 7  # hdr_crc(2)+hdr_size(2)+hdr_type(1)+hdr_flags(2)
print("ACE signature at 0x%x, main header at 0x%x" % (sig, start))
o = start
crc, hsz = struct.unpack_from('<HH', d, o)
htype, hflags = d[o+4], struct.unpack_from('<H', d, o+5)[0]
ever, cver, host, vol = d[o+14], d[o+15], d[o+16], d[o+17]
tcr = struct.unpack_from('<I', d, o+18)[0]
print("main: hsize=%d type=%d flags=0x%04x extract_ver=%d creat_ver=%d host=%d vol=%d" % (hsz, htype, hflags, ever, cver, host, vol))
# advert
av_off = o+4+18+8  # after reserved1(8)
avsz = d[av_off]
print("advert: %r" % d[av_off+1:av_off+1+avsz])
o = start + 4 + hsz
n = 0; totpack = 0; totorig = 0
entries = []
print("\n%-24s %9s %9s %6s %5s %5s  %-16s %s" % ("name","packed","orig","ratio","tech","parm","datetime","crc32"))
while o < len(d) - 4:
    crc, hsz = struct.unpack_from('<HH', d, o)
    if o+4+hsz > len(d): break
    htype = d[o+4]
    hflags = struct.unpack_from('<H', d, o+5)[0]
    if htype != 1:
        print("header type %d at 0x%x (flags 0x%04x, hsize %d) - stopping/skipping" % (htype, o, hflags, hsz))
        if htype > 5: break
        o += 4 + hsz
        continue
    packsz, origsz, ftime, attr, crc32v = struct.unpack_from('<IIIII', d, o+7)
    ttype, tqual, tparm = d[o+27], d[o+28], struct.unpack_from('<H', d, o+29)[0]
    resv = struct.unpack_from('<H', d, o+31)[0]
    fnlen = struct.unpack_from('<H', d, o+33)[0]
    fn = d[o+35:o+35+fnlen].decode('latin1')
    # DOS datetime
    dt = "%04d-%02d-%02d %02d:%02d:%02d" % (((ftime>>25)&0x7f)+1980, (ftime>>21)&0xf, (ftime>>16)&0x1f, (ftime>>11)&0x1f, (ftime>>5)&0x3f, (ftime&0x1f)*2)
    print("%-24s %9d %9d %5.1f%% %2d/%-2d %5d  %s %08x  data@0x%x" % (fn, packsz, origsz, 100.0*packsz/max(1,origsz), ttype, tqual, tparm, dt, crc32v, o+4+hsz))
    entries.append((fn, packsz, origsz, ttype, o+4+hsz))
    totpack += packsz; totorig += origsz; n += 1
    o += 4 + hsz + packsz
print("\n%d files, packed total %d, orig total %d" % (n, totpack, totorig))
print("archive ends at 0x%x; .data raw ends at 0x73a000; file ends 0x746000" % o)
print("gap after archive: %d bytes" % (0x73a000 - o))
