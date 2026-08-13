# FUNCTION_MAP.md — all 145 functions (image base 0x400000)

Grouped by role. Audio functions are **owned by another agent** — listed but not
analyzed. Names are proposed; confidence noted where inferred.

## WinMain / window / message loop
| addr | proposed name | role |
|------|---------------|------|
| `FUN_004053ae` | WinMain | resolve imports → create window → init D3D → generators → main loop → shutdown |
| `FUN_00405170` | ResolveImports | LoadLibraryA + GetProcAddress table walker (DDRAW.DLL) |
| `FUN_004052e4` | RegisterAndCreateWindow | fills WNDCLASSA, RegisterClassA, calls CreateWindow |
| `FUN_00405269` | CreateMainWindow | CreateWindowExA (borderless) + SetWindowPos 640×200 |
| `FUN_0040520a` | WndProc | WM_CLOSE/ESC→quit flag, WM_PAINT, hide cursor |
| `FUN_00405346` | PumpAndPresent | PeekMessage/Dispatch + `FUN_004049a6` (present) each frame |
| `FUN_0040f285` | RunDemo | master timeline; `while(pos<T)` per-scene ladder |
| `FUN_0040f270` | (music-tick wrapper) | calls `FUN_00411147` [audio] |
| `FUN_0040538f` | Shutdown | stop audio + `FUN_00404780` + ExitProcess |
| `FUN_004051ef` | DemoClock | music-position master timeline coord (wraps `FUN_00410678`) |
| `FUN_004051c3` | Alloc | VirtualAlloc(size, MEM_COMMIT, PAGE_READWRITE) |
| `FUN_004051d7` | Free | VirtualFree(MEM_RELEASE) |

## DirectDraw7 / Direct3D7 device + surface setup
| addr | proposed name | role |
|------|---------------|------|
| `FUN_004041df` | **InitD3D7** | full DDraw/D3D7 device+primary+backbuffer+Zbuf+state init (see D3D7_API.md §1) |
| `FUN_004041b6` | EnumDriverCB | DirectDrawEnumerateA callback — capture primary GUID |
| `FUN_004040d2` | EnumZFmtCB | EnumZBufferFormats callback — pick 16-bit Z format |
| `FUN_004040f4` | EnumTexFmtCB | texture-format enum — record 32/16/alpha DDPIXELFORMATs |
| `FUN_004041a1` | popcount | bit population count (format matching) |
| `FUN_0040404a` | bitlen_delta | log2 difference → channel shift amount |
| `FUN_00404780` | ShutdownD3D | Release device/surfaces/DD, SetCoopLevel NORMAL, DestroyWindow |
| `FUN_00403bd6` | **CreateTexture** | CreateSurface + Lock + ARGB→dev-format upload + Unlock (D3D7_API.md §5) |

## Per-frame render / pipeline state
| addr | proposed name | role |
|------|---------------|------|
| `FUN_004049a6` | PresentFrame | EndScene → Flip(WAIT) → Clear → BeginScene → reset state |
| `FUN_00404984` | ClearFrame | device->Clear(TARGET|ZBUFFER, color, z=1) |
| `FUN_0040484a` | SetPipeMode | state dispatcher: cull/blend/fog/addressing/stage1-combine (D3D7_API.md §3d) |
| `FUN_004047f9` | EnableFog | FOGENABLE/COLOR/TABLEMODE(EXP)/DENSITY |
| `FUN_0040406d` | SetTextures | SetTexture stage0/stage1 from handle+0x14 |
| `FUN_004049f5` | DrawQuad2D_list | DrawPrimitive TRIANGLELIST, FVF 0x244 (screen-space) |
| `FUN_00404a3f` | DrawQuad2D_fan | DrawPrimitive TRIANGLEFAN, FVF 0x244 (glyph/overlay) |
| `FUN_00402180` | DrawMesh | SetTransform WORLD + DrawIndexedPrimitive TRIANGLELIST, FVF 0x242 |
| `FUN_00402a60` | DrawParticles | camera-facing billboard quads, DrawIndexedPrimitive FVF 0x242 |
| `FUN_00402760` | SetSceneView | build+SetTransform VIEW matrix |
| `FUN_00402860` | SetSceneTransforms | SetTransform PROJECTION(3)/VIEW(2)/WORLD(1) |

## Text engine
| addr | proposed name | role |
|------|---------------|------|
| `FUN_00404dd0` | DrawText | render centered string (calls glyph builder + `FUN_00404f10`) |
| `FUN_00404e70` | DrawText2 | variant of DrawText |
| `FUN_00404f10` | FlushTextQuads | emit glyph quads via `FUN_00404a3f` |
| `FUN_00404c30` | BuildGlyph | per-char quad vertex/color builder (font metrics in `.rdata`) |
| `FUN_00404b10` | BuildFontTexture | seed logo/font bitmap → `FUN_00403bd6` |

## Geometry / mesh generation
| addr | proposed name | role |
|------|---------------|------|
| `FUN_00402040` | NewMesh | alloc mesh obj (0x78 hdr) + vtx(32B) + idx buffers, diffuse=0xffffffff |
| `FUN_00402100` | MeshAllocVtx | alloc vertex/aux arrays |
| `FUN_00402140` | MeshAllocIdx | alloc index array |
| `FUN_004031b0` | GenGeodesicSphere | icosahedral sphere mesh, spherical UVs |
| `FUN_00402990` | NewParticleMesh | billboard/particle mesh (quad index pattern) |
| `FUN_004022a0` | BuildGeometry | large mesh construction routine |
| `FUN_00402680` | (mesh helper) | geometry helper (inferred) |
| `FUN_004026f0` | (mesh helper) | geometry helper (inferred) |
| `FUN_00402d00` | BuildFace | face/strip generation into mesh |
| `FUN_00402f40` | VtxIndexLookup | geodesic vertex index resolver |
| `FUN_00403150` | SetMeshVertex | write vertex position |
| `FUN_00403180` | SinCosPair | angle → (sin,cos) helper |
| `FUN_00402230` | SetMeshRotation | store rotation on mesh obj |
| `FUN_00402210` | SetVec3 | write 3-float vector |
| `FUN_00403ba0` | Store2Shorts | pack two shorts into a global |
| `FUN_00403bb7` | memzero | zero-fill (used for DDSURFACEDESC2 etc.) |

## Math / matrix / vector
| addr | proposed name | role |
|------|---------------|------|
| `FUN_004019d0` | MatZero | zero 4×4 |
| `FUN_00401a10` | MatIdentity | identity 4×4 |
| `FUN_00401a50` | MatSetTranslation | set row-3 translation |
| `FUN_00401730` | MatScale | scale matrix (inferred) |
| `FUN_004017f0` | MatRotCompose | compose rotation (inferred) |
| `FUN_00401930` | Vec3Transform3x3 | rotate a vector |
| `FUN_00401a70` | MatYaw | yaw rotation matrix |
| `FUN_00401f50` | MatRotX | rotation about X |
| `FUN_00401fa0` | MatRotY | rotation about Y |
| `FUN_00401ff0` | MatRotZ | rotation about Z |
| `FUN_00401b50` | MatLookAt | LookAt view matrix |
| `FUN_00401eb0` | MatPerspective | LH perspective proj, z∈[0,1] |
| `FUN_00401590` | (math helper) | inferred |
| `FUN_00401390` | (math helper) | inferred |
| `FUN_004015f0` | Vec3op | 3-vector op (inferred) |
| `FUN_00402910` | Vec3Dot | dot product |
| `FUN_00402930` | Vec3Cross | cross product |
| `FUN_00404aa0` | BuildSqrtLUT | fast sqrt lookup table |
| `FUN_0040f790` | fround | round-to-int |

## Procedural "DR design generator" (bitstream decoder → textures)
| addr | proposed name | role |
|------|---------------|------|
| `FUN_004053f1` | BitsPeek | peek N bits (big-endian MSB) from `DAT_0050ffe0` |
| `FUN_00405434` | BitsRead | read+advance N bits |
| `FUN_00405474` | BitRead1 | read 1 bit |
| `FUN_00405429` | BitsSkip | advance bit cursor |
| `FUN_0040549d` | BitsSeekMarker | align + scan to marker |
| `FUN_004054cb` | DesignDecode1 | bitstream consumer → pattern/texture |
| `FUN_0040563b` | DesignDecode2 | bitstream consumer |
| `FUN_004057bc` | DesignDecode3 | bitstream consumer |
| `FUN_004059cf` | DesignHelper | decode helper |
| `FUN_00405a17` | DesignDecode4 | bitstream consumer |
| `FUN_00405bee` | DesignDecode5 | bitstream consumer |
| `FUN_00405fe6` | DesignHelper2 | decode helper |
| `FUN_0040604d` | DesignDecode6 | bitstream consumer |
| `FUN_0040607f` | DesignDecode7 | bitstream consumer → RGBA fill |

## Effects — up-front generators & per-frame renderers
(Init = generate mesh/texture once; Render = per-frame draw. See EFFECTS_OVERVIEW.md
for the scene→pos mapping.)
| addr | proposed name | role |
|------|---------------|------|
| `FUN_0040df90` | GenSceneInit0 | up-front generator |
| `FUN_004087c0` | GenSceneInit1 | up-front generator |
| `FUN_0040bd10` | GenSceneInit2 | up-front generator |
| `FUN_00409bb0` | GenSceneInit3 | up-front generator |
| `FUN_00407380` | GenSceneInit4 | up-front generator |
| `FUN_0040c730` | GenSceneInit5 | up-front generator |
| `FUN_00406280` | GenSceneInit6 | up-front generator |
| `FUN_0040aca0` | GenSceneInit7 | up-front generator |
| `FUN_00407880` | SceneA_init | |
| `FUN_004078a0` | SceneA_frame | per-frame (pos<0x600) |
| `FUN_0040ccd0` | SceneB_init | |
| `FUN_0040cce0` | SceneB_frame | per-frame (pos<0x800) |
| `FUN_0040af60` | SceneC_init | |
| `FUN_0040af80` | SceneC_frame | per-frame (pos<0xa00) |
| `FUN_0040bf50` | SceneD_init | |
| `FUN_0040bf80` | SceneD_frame | per-frame (pos<0xc00), fade `_DAT_005101bc` |
| `FUN_00409d8d` | SphereScene_init | resets sphere/particle scene |
| `FUN_00409da6` | SphereScene_frame | per-frame (pos<0xe00 / <0x1400) — geodesic sphere + billboards |
| `FUN_00408cc0` | SceneF_init | |
| `FUN_00408e90` | SceneF_frame | per-frame (pos<0x1200) |
| `FUN_00408550` | SceneF_helperA | render/gen helper |
| `FUN_004086b0` | SceneF_helperB | render/gen helper |
| `FUN_00408ce0` | SceneF_helperC | render helper (arg int) |
| `FUN_00406500` | SceneG_init | |
| `FUN_00406520` | SceneG_frame | per-frame (pos<0x1600) — credits/text scroller |
| `FUN_00406160` | SceneG_helper | helper |
| `FUN_0040e940` | SceneH_init | |
| `FUN_0040eb90` | SceneH_frame | per-frame (pos<0x1a20) — finale |
| `FUN_0040e960` | SceneH_colorA | float color/param setter |
| `FUN_0040ea00` | SceneH_colorB | float color/param setter |
| `FUN_0040ead0` | SceneH_helper | render helper |
| `FUN_0040aba0` | SceneC_colorA | float color setter |
| `FUN_0040ac70` | SceneC_colorB | float color setter |
| `FUN_0040aa40` | SceneC_helper | render helper (byte* arg) |
| `FUN_0040b630` | GenHelperA | mesh/texture gen helper |
| `FUN_0040b780` | GenHelperB | mesh/texture gen helper (float* arg) |
| `FUN_0040d890` | GenHelperC | gen helper (float*, int) |
| `FUN_0040de40` | FreeMeshNode | recursive mesh free (VirtualFree children) |
| `FUN_0040df20` | FreeMeshTree | mesh tree teardown |

## Audio — softsynth + MXM player + DSOUND thread (OWNED BY ANOTHER AGENT)
`FUN_00401000`, `FUN_004010c0`, `FUN_004011e9`, `FUN_0040123d`, `FUN_0040133c`
(synth setup) and the player/thread cluster: `FUN_00410000`, `FUN_00410289`,
`FUN_0041032e`, `FUN_0041033b`, `FUN_0041038c`, `FUN_0041042c`, `FUN_00410488`,
`FUN_00410678` (song position — *read by the timeline via `FUN_004051ef`*),
`FUN_0041068c`, `FUN_00410daf`, `FUN_00410dc0`, `FUN_00411147`, `FUN_004111b1`,
`FUN_004114d0`, `FUN_004114f1` (playback thread start), `FUN_004115fa`.
