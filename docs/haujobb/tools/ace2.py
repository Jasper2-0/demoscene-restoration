import struct
p = "/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/originals/haujobb/hjb_elef/elements.exe"
d = open(p,'rb').read()
# archive 1 last data end
end1 = 0x2d2c73 + 1676
print("archive1 last byte+1: 0x%x" % end1)
xz = d[end1:end1+48]
print("bytes at end1:", xz.hex())
# try parsing main header at end1
for S in range(end1-2, end1+8):
    crc, hsz = struct.unpack_from('<HH', d, S)
    htype = d[S+4]
    if d[S+7:S+14] == b"**ACE**" and htype == 0:
        print("valid-looking main header at 0x%x hsize=%d flags=0x%04x ever=%d cver=%d" % (S, hsz, struct.unpack_from('<H',d,S+5)[0], d[S+14], d[S+15]))
        o = S + 4 + hsz
        while o < len(d)-4:
            crc, hsz2 = struct.unpack_from('<HH', d, o)
            htype2 = d[o+4]; hflags2 = struct.unpack_from('<H', d, o+5)[0]
            if htype2 != 1:
                print("  non-file header type %d at 0x%x hsize=%d" % (htype2, o, hsz2)); break
            packsz, origsz, ftime, attr, crc32v = struct.unpack_from('<IIIII', d, o+7)
            ttype, tqual = d[o+27], d[o+28]
            fnlen = struct.unpack_from('<H', d, o+33)[0]
            fn = d[o+35:o+35+fnlen].decode('latin1')
            dt = "%04d-%02d-%02d %02d:%02d" % (((ftime>>25)&0x7f)+1980,(ftime>>21)&0xf,(ftime>>16)&0x1f,(ftime>>11)&0x1f,(ftime>>5)&0x3f)
            print("  FILE %-24s packed=%d orig=%d tech=%d/%d %s data@0x%x-0x%x" % (fn, packsz, origsz, ttype, tqual, dt, o+4+hsz2, o+4+hsz2+packsz))
            o += 4 + hsz2 + packsz
        print("  archive2 ends at 0x%x" % o)
        break
