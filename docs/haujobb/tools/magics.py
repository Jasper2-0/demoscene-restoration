p = "/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/originals/haujobb/hjb_elef/elements.exe"
d = open(p,'rb').read()
magics = {
 "Rar!": b"Rar!\x1a\x07",
 "PKZIP": b"PK\x03\x04",
 "JPEG SOI+JFIF/EXIF": None,  # special
 "PNG": b"\x89PNG",
 "ID3": b"ID3",
 "MThd": b"MThd",
 "OggS": b"OggS",
 "RIFF": b"RIFF",
 "XM": b"Extended Module:",
 "IT(IMPM)": b"IMPM",
 "MOD(M.K.)": b"M.K.",
 "S3M(SCRM)": b"SCRM",
 "GIF8": b"GIF8",
 "BM(bmp)": None,
 "hjb?": b"HJB",
 "TGA?": None,
 "MP3 fffb": None,
}
def findall(pat):
    out=[]; i=d.find(pat)
    while i!=-1:
        out.append(i); i=d.find(pat,i+1)
    return out
for name,pat in magics.items():
    if pat is None: continue
    hits = findall(pat)
    if hits:
        print("%-18s count=%-5d first: %s" % (name, len(hits), ", ".join("0x%x"%h for h in hits[:8])))
# JPEG: FFD8FF
hits = findall(b"\xff\xd8\xff")
print("%-18s count=%-5d first: %s" % ("JPEG FFD8FF", len(hits), ", ".join("0x%x"%h for h in hits[:12])))
# mp3 frame sync fffb / fffa
for sync in (b"\xff\xfb", b"\xff\xfa", b"\xff\xf3"):
    hits = findall(sync)
    print("%-18s count=%d first: %s" % ("sync %s"%sync.hex(), len(hits), ", ".join("0x%x"%h for h in hits[:5])))
