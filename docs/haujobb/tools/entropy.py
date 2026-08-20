import math, collections
p = "/Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration/originals/haujobb/hjb_elef/elements.exe"
d = open(p,'rb').read()
W = 4096
blocks = "▁▂▃▄▅▆▇█"
line = []
ents = []
for off in range(0, len(d), W):
    w = d[off:off+W]
    c = collections.Counter(w)
    n = len(w)
    e = -sum((v/n)*math.log2(v/n) for v in c.values())
    ents.append((off,e))
    line.append(blocks[min(7,int(e))])
# print sparkline in rows of 128 windows (512KB per row)
for i in range(0, len(line), 128):
    print("0x%06x %s" % (i*W, "".join(line[i:i+128])))
# transitions: report runs of entropy classes
def cls(e):
    if e > 7.5: return "HIGH(compressed)"
    if e > 6.0: return "MED"
    if e > 3.0: return "LOW"
    return "VLOW"
prev = None; start = 0
runs = []
for off,e in ents:
    c = cls(e)
    if c != prev:
        if prev is not None: runs.append((start, off, prev))
        prev = c; start = off
runs.append((start, len(d), prev))
print("\nentropy runs (>= 3 windows):")
for s,e,c in runs:
    if e-s >= 3*W:
        print("  0x%06x - 0x%06x (%7d bytes) %s" % (s,e,e-s,c))
