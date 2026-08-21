#!/usr/bin/env python3
"""
PURPOSE / INVOCATION
  python3 decode-exe-texture.py <state_NNN.json> [outDir]

  Decodes every bound texture in a `glretrace -D` state dump to PNG, one file per
  texture unit, named exe_tex_<call>_<unit>.png.

MODE:       EXTRACT
OBSERVABLE: the bound texture image at that call, per unit, as the driver holds it.
UNITS:      pixels. **ROWS ARE BOTTOM-UP.** glretrace emits the image in GL order,
            so a decoded texture appears vertically mirrored against the asset file
            it came from. Do not "correct" this here -- the comparator reverses rows
            explicitly so the flip stays visible and stated.

FALSE FINDING PREVENTED
  Without the row-order note, the first comparison run reads as a clean V-flip
  defect in the port. It is not: the control is the WONDER text overlay texture
  (512x256, texture 27 at capture 68.642), which decodes upside down. An asymmetric
  image with readable text is a valid orientation control; a nebula is not.

LIMITATIONS
  Only level 0, only the units glretrace reports as bound at that call. Says nothing
  about mip levels or about textures bound elsewhere in the frame.
"""
import base64, json, os, re, sys

if len(sys.argv) < 2:
    sys.exit("usage: decode-exe-texture.py <state_NNN.json> [outDir]")
path = sys.argv[1]
outdir = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(path) or "."
call = (re.search(r"state_(\d+)", os.path.basename(path)) or [None, "x"])[1]

# glretrace embeds shader source with raw newlines inside JSON strings, which is not
# parseable. Outside a string a control character is only whitespace, so replacing
# every raw control char with a space fixes the strings and changes nothing else.
raw = re.sub(r"[\x00-\x1f]", " ", open(path, encoding="utf-8", errors="replace").read())
try:
    j = json.loads(raw)
except Exception as e:
    sys.exit(f"could not parse {path}: {e}")

textures = j.get("textures") or {}
if not textures:
    sys.exit(f"{path} has no bound textures at that call -- wrong call number?")

for key, v in textures.items():
    if not isinstance(v, dict) or "__data__" not in v:
        continue
    unit = key.split(",")[0].strip().replace("GL_", "")
    data = base64.b64decode(v["__data__"])
    name = os.path.join(outdir, f"exe_tex_{call}_{unit}.png")
    with open(name, "wb") as fh:
        fh.write(data)
    print(f"{key}: {v.get('__width__')}x{v.get('__height__')} {v.get('__format__')} "
          f"-> {os.path.basename(name)} ({len(data)} bytes)")
