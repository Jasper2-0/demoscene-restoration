# PTCT (Aardbei, 2000) — Function Map

Source: `work/re/out/ptct.c` (Ghidra export, 374 fns) plus targeted re-decompiles in
`work/re/out/renderfuncs.c` and `work/re/out/renderfuncs2.c` (functions the bulk export missed).
Binary base 0x400000. All addresses are VAs.

Framework identifies itself as **"asysgl/64"** (string 0x41d4b4). Music player is the
**IXS synth ("It's X-mas time / wnoise")** producing an in-memory IT module.

## Startup / window / GL init

| Address | Name | Role |
|---|---|---|
| 00418b6a | `entry` | CRT entry → WinMain |
| 00403820 | `demoMain` | WinMain body: dialog, cmdline res parse (`x1024/x1280/x1600`, windowed flag), open GL window `FUN_00411fd0`, scissor letterbox (`glScissor(0,h/12,w,5h/6)`), open resource archive, load music+textures, build & register all 28 effect objects, load `data\script.as1`, start music, main loop |
| 00407430 | `configDialog` | DialogBoxParamA(resource dlg 0x66, proc LAB_00406fa0); returns option string buffer (DAT_0041e97c) parsed by strstr for res/windowed/bpp |
| 00406ec0 | `dlgCheckModes` | grey out unavailable resolutions in dialog |
| 00406e30 | `enumHasMode(w,h,bpp)` | EnumDisplaySettings search |
| 00411910 | `asysInit(cmdline,hinst)` | MMX check (`FUN_00411ab0/a80`), fills 0x100-entry random table `DAT_0041f834`, windowed/`DAT_0041f41c` flags |
| 00411fd0 | `videoOpen(w,h)` | cmdline `16/32/z32` bpp flags, ChangeDisplaySettings fullscreen, `FUN_00411e20`, warm-up 2 frames |
| 00411e20 | `createWindow(w,h)` | RegisterClass (wndproc LAB_00411cf0), CreateWindowExA, `FUN_00411b30` |
| 00411b30 | `glInit` | pixel format (bpp DAT_0041d4c0, depth DAT_0041d4c8), wglCreateContext, enables TEXTURE_2D/DEPTH_TEST (depthFunc LEQUAL), detects `GL_ARB_multitexture`+`GL_EXT_texture_env_combine` (DAT_0041fca0 flag; proc ptrs DAT_0041fc9c=glActiveTextureARB, DAT_0041fc48=glMultiTexCoord2fARB) |
| 00411ad0 | `pumpMessages` | PeekMessage loop |
| 004121f0 | `frameFlip` | `FUN_004122c0` (pop MV, set projection gluPerspective(90,1,…)), pump messages, glFinish, **SwapBuffers**, clear color+depth, `FUN_00412270` (MODELVIEW identity, push, translate(0,0,-0.1), disable fog, COLOR_MATERIAL on) |
| 004122c0 | `endFrameMatrix` | glPopMatrix; PROJECTION = gluPerspective(90°, 1.0, …) |
| 00412270 | `beginFrameMatrix` | see frameFlip |
| 00412260 | `clearAll` | glClear(COLOR|DEPTH) |
| 004119d0 | `getTicks` | **engine clock**: `(timeGetTime()-t0)*4` → 1 tick = 0.25 ms (t0 latched on first call) |
| 004119a0 | `rand31` | LCG: `seed = seed*0x41c64e6d+0x3093; return seed>>16` (seed DAT_0041d488) |
| 00411900 | `quitDemo` | `FUN_00411a00` (stop music `FUN_004094d0`, restore display) + ExitProcess |
| 004121a0 | `glShutdown` | delete GL context, restore mode |

## Resource archive (in-EXE pack)

| Address | Name | Role |
|---|---|---|
| 00415b90 | `archiveOpen(resId)` | FindResourceA(id&0xFFFF, type 10) → LockResource → `FUN_00415c20`. Called with 0x66 |
| 00415c20 | `archiveCtor` | layout: u32 count; count × 0x88 dir entries { char name[0x80]; u32 size; u32 offset }; data follows dir |
| 00415c60 | `archiveOpenFile(this,out,name)` | **tries real file on disk first** (CreateFileA) — external files override the pack; else case-insensitive dir search. out = {ptr,size,pos} stream |
| 00415d90 | `streamRead(s,dst,n)` | memcpy + advance pos |
| 00415dd0 | `streamClose` | free |

## ATG texture glue (ATG internals handled elsewhere)

| Address | Name | Role |
|---|---|---|
| 00403620 | `loadAllTextures(...)` | varargs NUL-terminated list of 15 .atg names (see EFFECTS.md for index table); reads each from archive, `atgLoadList`, then for every image **except dword indices 7..12** (the six `cr_*` credit images) makes a GL texture (`FUN_00412300`) into `DAT_0041d938[i]` and frees the raw image; indices 7..12 keep raw ARGB pixels in `DAT_0041d934[i]` for CPU sampling by effect 0x13. Shows loading bar for ≥10000 ticks (2.5 s) |
| 00412c00 | `atgLoadList(list,cb)` | runs ATG scripts → list of 256×256 ARGB images (DAT_0041d934); progress callback (LAB_004035c0 → loading bar + flip) |
| 004128d0 | `atgInitTables` | mul/div LUTs for the texture generator |
| 00412a20 / 00412b10 | `tgaCacheWrite/Read` | optional `tex%03i.tga` disk cache (debug switch DAT_004201ac via cmdline) |
| 00412300 | `glTextureFromBuffer` | glGenTextures + glTexImage2D (RGBA4 if 16-bpp else RGBA8), LINEAR filters, no mipmaps. Args passed in registers (256×256 for ATG, w×h for text) |
| 004123f0 | `bindTexture(id)` | glBindTexture + glEnable(TEXTURE_2D) |

## Text rendering (GDI → texture)

| Address | Name | Role |
|---|---|---|
| 004126b0 | `createFont(fontIdx,height,bold,italic)` | CreateFontA; fonts[]: 0=Arial, 1=Courier New, 2=Times New Roman, 3=Symbol (ptr array 0x41d544) |
| 00412700 | `textToAlphaBuffer(str,dst,x,y,w,h,centered)` | GDI TextOutA into DIB, GetDIBits row-flipped, **adds** blue channel bytes into dst RGBA buffer (saturating) |
| 00401f90 | `blurGrayscale(buf,w,h)` | horizontal 3-tap box blur of channel[2], splat to all 4 channels |
| 0040192c | `drawTextQuad(w,y)` | 2D quad x∈[0.05,0.05+w], height 0.045 (greetings helper) |

## Music (IXS synth + IT player + waveOut)

| Address | Name | Role |
|---|---|---|
| 004037b0 | `loadMusic` | archive `data\wnoise.ixx` → `FUN_00409430(data, LAB_004035f0 progressCb)` |
| 00409430 | `musicLoad(data,cb)` | creates player `FUN_00409770(useWaveOut,1,1)`, calls vt+0 load |
| 00409490/004094b0 | `musicPlay` / `musicPlayFrom(pos)` | vt+4; DAT_0041f08c = start order |
| 004094d0 | `musicStop` | vt+8 + vt+0x28 close |
| 00409500 | `musicGetPos(&order,&row,&zero)` | vt+0x14 → AX = (order<<8)\|row; writes *arg1=order(AH), *arg2=row(AL), *arg3=0. **The** sync source |
| 00409770/00409530 | `playerNew/Ctor` | player object; synth state = 0x5d63c bytes (`FUN_004097d0`) |
| vtable 0041a9b8 | `IXSPlayer` | [0]=409670 load→`FUN_0040b760`, [1]=409620 play, [2]=4096a0 stop, [3]=4096b0 pause, [4]=4096c0 resume, **[5]=4096d0 getOrderRow→`FUN_0040a760`**, [6]=4096e0 getSeconds→`FUN_0040a770`, [7]=4096f0 setPos→`FUN_0040a7d0`, [8]=409740 ?, [9]=409710 dtor, [10]=409730 close, [11]=409750 setVolume |
| 0040b760 | `songLoad` | magic `IXS!` (0x21535849) → `FUN_0040b7b0` (IXS: synthesize samples, build IT in memory) else `FUN_0040c500` (IT loader, magic `IMPM`) |
| 0040c500 | `itLoad` | parses IT: orders → mod+0xC8, instruments +0xCC, samples +0xD0/+0xD4, pattern headers +0xD8 (u16 length; u16 rows), pattern data +0xDC |
| 0040c880 | `itUnpackPattern(idx)` | decode pattern into cache mod+0xE0 |
| 00409bd0 | `playerStart` | reset pos (order DAT_0041f08c, row 0), CreateThread → mixer thread proc 00409b10 |
| 00409b10 | `mixerThreadProc` | loop { EnterCS; `FUN_00409e10(synth,1)`; LeaveCS; sleep } |
| 00409e10 | `synthUpdate(realtime)` | compute playback byte cursor (`FUN_00409dc0`→waveOutGetPosition via `FUN_0040b3e0`), set **synth+0x3218 = audible (order<<8)\|row** via `FUN_0040d3e0`; free played blocks `FUN_0040d390`; while free block `FUN_0040d440`: advance one tracker tick `FUN_00409e80` + mix/submit block `FUN_00409ec0` (block records its order/row) |
| 00409e80 | `tickAdvance` | tick counter synth+0x320e; on 0 → `FUN_0040a240` next row/pattern (row=+0x3216, orderIdx=+0x3215, pattern=+0x3214) else `FUN_00409f50` per-tick fx |
| 0040a760 | `getOrderRow` | returns synth+0x3218 (latency-compensated) |
| 0040a770 | `getSeconds` | (playCursor−startCursor)/bytesPerSec; rate 44100 (DAT_0041f088), flags DAT_0041f080 (stereo/16-bit) |
| 0040a7d0 | `setPosition(order<<8\|row)` | seeks order table skipping 0xFE markers |
| 0040d290.. | `driverCommon` | 512 KiB (0x80000) ring buffer; per-tick block descriptors {used, startByte, len, order, row} stride 0x14 |
| 0040d3e0 | `ringCursorToOrderRow(cursor)` | find newest block starting before cursor → (order<<8)\|row |
| 0040b040 (≈line 4954) | `waveOutStart` | waveOutOpen 44.1 kHz, prepare single looping 512 KiB WAVEHDR, waveOutWrite |
| 0040b3e0 | `waveOutGetPos` | waveOutGetPosition (bytes) |
| vtables 0041aa18/2c/40/54 | output drivers | 8-bit / 16-bit mono / 16-bit stereo waveOut writers (XOR 0x80/0x8080 conversions) + 0041aa54 = **silent/no-sound driver** |

## Script interpreter / sync

| Address | Name | Role |
|---|---|---|
| 00415df0 | `registerEffect(obj,id)` | `DAT_004201b8[id&0xFF] = obj`; DAT_00441ef0 = max id |
| 00415e20 | `scriptAddEvent(d0,d1)` | append 16-byte in-memory record (8 file bytes + timerHandle=-1 + 0) at DAT_004206c0[DAT_00441edc++] |
| 00415e60 | `scriptLoad(buf)` | u32 count + count×8-byte events → addEvent; then call `init` (vt+4) on every registered effect; error box "error initializing effect #%d" |
| 00415ed0 | `scriptTick` | per frame: copy layer table cur→prev, query music pos, evaluate all events (see SCRIPT_FORMAT.md), bubble-sort active list by layer, call `render(elapsedTicks)` per active effect. Layer tables: DAT_00440ed8 (cur) / DAT_004416d8 (prev), 256×{startTicks,effectId} |
| effect vtable | | [0]=dtor(00404170) [1]=init→bool [2]=render(elapsedTicks) [3]=trigger(u16 param). 004163b0 = trivial init (ret 1), 0040f980 = nop trigger |

## 3D engine ("asysgl" scene graph)

| Address | Name | Role |
|---|---|---|
| 004163c0 | `Scene::ctor` (0x1c) | +4 camera (new Camera), +8 objects[0x400], +0xC lights[0x20]×0x20, +0x10 tiltedUpFlag, +0x14 objCount, +0x18 lightCount |
| 004164b0 | `Scene::addObject` | append |
| 004166d0 | `Scene::addLight(x,y,z,radius,rgb)` | light = {r,g,b,pad,x,y,z,radius} floats |
| 00416550 | `Scene::computeVertexLighting(ambientRGB)` | per vertex: color = ambient + Σ lights max(0, 1−dist/radius)·lightColor → object colors array (+0x1c) |
| 004164d0 | `Scene::render` | glHints, for each object `Mesh::draw(camera)` |
| 00416e70 | `Camera::ctor` | +4..C pos (default −100³), +0x10..0x18 target, +0x1c roll°, +0x20 fov (default 90) |
| 00416ee0 | `Camera/Mesh::setPos(x,y,z)` (writes +4..+0xC) | for Camera = position; for Mesh = translation |
| 004168d0 | `setVec10(x,y,z)` (writes +0x10..+0x18) | Camera = look-at target; Mesh = rotation (degrees X,Y,Z) |
| 00416770 | `Mesh::ctor(nVerts,nFaces,texId)` | fields: +4/8/C pos; +10/14/18 rot°; +0x1c vertColors RGBA f32[n][4] (init 1); +0x20 vertNormals; +0x24 verts f32[n][3]; +0x28 nVerts; +0x2c faceNormals; +0x30 faces (0x30 bytes: u32 i0,i1,i2,flags; f32 uv[3][2]; 8 pad); +0x34 nFaces; +0x38 texId; +0x3c colorARGB; +0x40 drawMode mask; +0x44 texFxMask (1=detail/lightmap pass, 2=envmap pass, 4=flat glColor); +0x45 cull (0=front,1=back,2=off); +0x46 dynamic (recompute normals every frame); +0x47 alphaBlend; +0x48 additiveBlend; +0x49 isQuadCube; +0x4c detailTexId (0→default spot DAT_00481f18); +0x50 fogDist (0=off); +0x54 fogColorRGB; +0x58 normalsValid |
| 00416b40 | `Mesh::draw(cam)` | normals (if needed) → gluPerspective(cam.fov,1,2,32768) → blend/cull/fog state → glRotatef(−roll,0,0,1), gluLookAt(pos→target, up=(0,1,0) or (1,1,1) if scene.tilted; +0.0001 fudge if pos==target xz) → translate/rotate object → `FUN_00418610` |
| 00418610 | `Mesh::emit` | drawMode mask: 1=`FUN_00418170` GL_LINES wireframe (color +0x3c); 2=`FUN_00418330` flat untextured tris/quads; 4=`FUN_00417860` main textured pass; 8=`FUN_004184c0` GL_POINTS; 0x10..0x800 = user callbacks DAT_00481ef8.. (0x10→LAB_00406280 eff13, 0x20→LAB_00402750 eff1C) |
| 00417860 | `mainPass` | textured GL_TRIANGLES with per-vertex colors (lighting) or flat color (mask 4); +0x44&2: extra eye-linear-texgen envmap pass; +0x44&1: detail/lightmap pass — multitexture single-pass (unit1 = detail tex, EXT_combine ADD) or two-pass additive with texgen fallback |
| 004168f0/004169d0 | `computeNormals` | face cross products → averaged vertex normals |
| 00418700/00418800 | `makeDefaultDetailTex` | procedural 128×128 grayscale radial spot (DAT_00481f18), alpha=v>>2 |
| 00418830 | `unpackColor(argb,&r,&g,&b,&a)` | ×1/256 |
| 00416f00 | `genCube(halfSize,tex)` | 8 verts, 6 quad faces, isQuadCube=1 |
| 00417140 | `genSphere(n,radius,tex)` | n×n lat/long sphere, uv grid |
| 00417400 | `genGrid(n,size,tex)` | (n+1)² flat XZ grid, y=0, centered, uv 0..1 |
| 00417650 | `genTube(nSeg,nSides,radius,length,tex)` | cylinder along Y, centered |
| 004079b0/00407a40/00407ab0-00407b80 | `mat4` helpers | 4×4 multiply, transform point, identity, rotX/Y/Z, `eulerMatrix(rx,ry,rz)` |

## Effects (registry id → object)

See EFFECTS.md for details. init/render/trigger from vtables (dumped from binary):

| id | vtable | init | render | trigger | name |
|---|---|---|---|---|---|
| 0x0A | 41a768 | 401490 | 4016e0 | – | landscape flyover (heightfield + sky sphere) |
| 0x0C | 41a758 | 408120 | 408300 | – | triple-tube flight |
| 0x0D | 41a748 | 4066f0 | 4069c0 | 406960 | floor+ceiling lightgrid |
| 0x10 | 41a718 | 407780 | 4078d0 | 4078b0 | radial-wave pool |
| 0x11 | 41a708 | 405e70 | 405f80 | – | twin warped tri-tubes |
| 0x12 | 41a6f8 | 4091b0 | 4092a0 | 409410 | "please the cookie thing" title board |
| 0x13 | 41a6e8 | 406140 | 406660 | – | credits pixel-spray |
| 0x15 | 41a6d8 | 407bf0 | 407e40 | – | swinging tube-worm |
| 0x18 | 41a6c8 | 4041a0 | 404fb0 | – | 6-face marching-squares blob |
| 0x19 | 41a6b8 | 402ec0 | 403410 | – | Lissajous tunnel ribbon |
| 0x1A | 41a6a8 | 402a90 | 402de0 | – | spiky blob flower |
| 0x1C | 41a698 | 4025c0 | 402a50 | – | streak/star field (end) |
| 0x1D | 41a688 | 4017e0 | 4019eb | 401929(nop) | greetings typewriter text |
| 0x1E | 41a678 | 407470 | 407570 | – | rotating-rings bounce (beat cam) |
| 0x1F | 41a668 | 401000 | 4013d0 | – | morphing cylinder tube |
| 0x20 | 41a658 | 408da0 | 408f30 | – | 16 jumping cloth-domes + ground |
| 0x21 | 41a648 | 401a80 | 401b70 | – | pulsating cos-blob sphere |
| 0x32 | 41a628 | 4163b0 | 405840 | – | overlay: white flash α=1−t/5000t |
| 0x33 | 41a618 | 4163b0 | 405980 | – | overlay: black fade-in α=1−0.0002t |
| 0x34 | 41a608 | 4163b0 | 405b30 | – | overlay: additive zooming grid-lines flash |
| 0x35 | 41a5f8 | 4163b0 | 405a10 | – | overlay: black slow fade α=1−0.00001t |
| 0x36 | 41a5e8 | 4163b0 | 405aa0 | – | overlay: black flash α=0.7−0.0002t |
| 0x37 | 41a5d8 | 4163b0 | 4058e0 | – | overlay: white flash α=0.7−0.0002t |
| 0x38 | 41a5c8 | 4163b0 | 40f980 | – | no-op |
| 0x3C | 41a728 | 402330 | 402490 | 4021f0 | "p l e a s e   i t" text flashes |
| 0x3D | 41a738 | 4020d0 | 402210 | 4021f0 | unused text-flash variant (empty string list) |
| 0x46 | 41a638 | 4163b0 | 405d70 | 405e60 | end logo fade (gizmozone2 tex) |

## Loading screen

| Address | Name | Role |
|---|---|---|
| 00403580/00406c40 | `loadScene ctor` | 25 dark cubes (size 200, flat color 0x1f1f1f, mode 2), point clouds shifted per cube |
| 00406d80 | `loadSceneDraw(progress)` | shows cube i if i ≤ progress·25; camera tracks progress; called from ATG progress cb LAB_004035c0 and music cb LAB_004035f0 and the 2.5 s wait loop in `loadAllTextures` |

## Misc / CRT

`FUN_00404170` shared effect dtor; `FUN_0040f980` nop; `FUN_004118a0/FUN_004118c0` error message helper (MessageBox + exit); operator new/delete, ftol, fsin/fcos/fpatan wrappers, strstr/wsprintf imports; `FUN_00418980` __chkstk; entry-side CRT at 0x418a76+. IXS synth internals occupy ≈0x40a000–0x40f97f (not needed for the port; audio is baked).
