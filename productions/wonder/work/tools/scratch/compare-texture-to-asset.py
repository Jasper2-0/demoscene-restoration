#!/usr/bin/env python3
"""
PURPOSE / INVOCATION
  python3 compare-texture-to-asset.py <exe_tex.png> <asset.png|.jpg> [--max=5] [--no-flip]

  Is the texture the executable actually had bound the same image as the asset the
  port binds? Exits 0 when the mean absolute difference per channel is at or below
  --max, 1 when it is not.

MODE:       CHECK   (fails on its named property: "these are the same picture")
OBSERVABLE: mean |exe - asset| per RGB channel over a 2x2-subsampled grid.
UNITS:      0-255 per channel. Reference points measured on Wonder: ~1.0 for the
            same image through two JPEG decoders, ~80 for unrelated images.

PAIRING AND COVERAGE
  Pixel (x, y) of the asset is paired with pixel (x, h-1-y) of the extracted
  texture, because glretrace emits rows BOTTOM-UP. Sizes must match exactly or the
  comparison is refused -- a resample would hide the very difference being tested.

VALIDATION
  --no-flip is the built-in control: on a real match it must produce a LARGE
  difference, proving the row reversal is load-bearing and that the tool is not
  reporting equality for an unrelated reason. The orientation itself was
  established independently with the WONDER text overlay (texture 27, capture
  68.642), which decodes upside down.

FALSE FINDING PREVENTED
  Reading the bottom-up row order as a vertical-flip defect in the port. It would
  have been the sixth false lead of the campaign that motivated this tool.

LIMITATIONS
  Says the two images are the same PICTURE. It does not check filtering, wrap mode,
  mip levels, or which unit the port bound it to.
"""
import struct, subprocess, sys, tempfile, zlib, os

def read_png(p):
    d = open(p, "rb").read()
    pos, idat, ct = 8, b"", 6
    w = h = None
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos + 4])[0]
        typ = d[pos + 4:pos + 8]
        if typ == b"IHDR":
            w, h, _bd, ct = struct.unpack(">IIBB", d[pos + 8:pos + 18])
        elif typ == b"IDAT":
            idat += d[pos + 8:pos + 8 + ln]
        pos += 12 + ln
    if w is None:
        raise SystemExit(f"{p}: not a PNG")
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ct]
    raw = zlib.decompress(idat)
    rows, prev, i = [], bytearray(w * ch), 0
    for _y in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i + w * ch]); i += w * ch
        for x in range(len(line)):
            a = line[x - ch] if x >= ch else 0
            b = prev[x]
            c = prev[x - ch] if x >= ch else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append(bytes(line)); prev = line
    return w, h, ch, rows

def as_png(p):
    if p.lower().endswith(".png"):
        return p, None
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
    if subprocess.run(["sips", "-s", "format", "png", p, "--out", tmp],
                      capture_output=True).returncode != 0:
        raise SystemExit(f"could not convert {p} to PNG (sips failed; convert it yourself)")
    return tmp, tmp

args = [a for a in sys.argv[1:] if not a.startswith("--")]
flags = [a for a in sys.argv[1:] if a.startswith("--")]
if len(args) != 2:
    raise SystemExit(__doc__.strip().splitlines()[2])
limit = next((float(f.split("=")[1]) for f in flags if f.startswith("--max=")), 5.0)
flip = "--no-flip" not in flags

exe_p, asset_p = args
asset_p, tmp = as_png(asset_p)
w1, h1, c1, A = read_png(exe_p)
w2, h2, c2, B = read_png(asset_p)
if tmp:
    os.unlink(tmp)

print(f"  exe {w1}x{h1}ch{c1}   asset {w2}x{h2}ch{c2}   rows {'reversed' if flip else 'AS-IS (control)'}")
if (w1, h1) != (w2, h2):
    print("  SIZE MISMATCH -- refusing to compare")
    sys.exit(1)

tot = n = 0
for y in range(0, h1, 2):
    ra = A[h1 - 1 - y] if flip else A[y]
    rb = B[y]
    for x in range(0, w1, 2):
        for k in range(3):
            tot += abs(ra[x * c1 + k] - rb[x * c2 + k]); n += 1
mean = tot / n
print(f"  mean |exe - asset| per channel = {mean:.2f}   (limit {limit}; ~1 = same image, ~80 = unrelated)")
sys.exit(0 if mean <= limit else 1)
