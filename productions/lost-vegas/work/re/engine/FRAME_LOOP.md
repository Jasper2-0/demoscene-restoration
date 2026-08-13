# FRAME_LOOP.md — startup, message loop, timing, exit

## Entry chain
`PE entry 0x53a9` → CRT init → **WinMain body = `FUN_004053ae`**.

`FUN_004053ae`:
```
FUN_00405170(&PTR_s_DDRAW_DLL_0041b6e8)  ; resolve DirectDrawEnumerateA / DirectDrawCreateEx
FUN_004052e4()                           ; RegisterClassA + CreateWindow
if (FUN_004041df())  goto shutdown       ; DDraw/D3D7 init; nonzero return = failure → exit
FUN_00404b10()                           ; build base font/logo texture (DR generator seed)
FUN_00404aa0()                           ; build sqrt lookup table
puVar2 = FUN_0040133c()                  ; [AUDIO — other agent] init softsynth/MXM
FUN_004114f1(..., DAT_004f4fbc, puVar2)  ; [AUDIO] start DSOUND playback thread
FUN_0040f285()                           ; ***MAIN DEMO LOOP*** (runs to completion)
FUN_0040538f()                           ; shutdown
```

## Window (`FUN_004052e4` → `FUN_00405269`)
- `RegisterClassA` with style `3`, wndproc `FUN_0040520a`, class/title
  `"3state # lost vegas"`.
- `CreateWindowExA(0, title, title, 0xCF0000 /*WS_POPUP|... borderless*/, ...)`
  then `AdjustWindowRect` + `SetWindowPos` to **640×200 logical** (the client is
  driven to 640×480 by the exclusive-mode `SetDisplayMode`). `UpdateWindow`.
- Handle in `DAT_004f4fbc`.

## WndProc `FUN_0040520a`
- `WM_DESTROY (2)` → return 0.
- `WM_PAINT (0xf)` → `ValidateRect`.
- `WM_CLOSE (0x10)` → set `DAT_004f4fb8 = 1` (the loop's quit flag).
- `WM_ACTIVATE... (0x20)` → `SetCursor(NULL)` (hide cursor).
- `WM_KEYDOWN (0x100)` with VK_ESCAPE (`0x1b`) → set quit flag.
- else `DefWindowProcA`.

`DAT_004f4fb8` is the global **quit flag**; every timeline loop tests it.

## Per-frame pump + present — `FUN_00405346`
Called once at the bottom of every effect iteration:
```
if (PeekMessageA(&msg,0,0,0)) { GetMessageA; TranslateMessage; DispatchMessageA; }
FUN_004049a6();   ; EndScene → primary->Flip(WAIT) → Clear(target+Z) → BeginScene → reset default state
```
So there is **one Flip per frame**, vsync-locked (`DDFLIP_WAIT`). Effects render
into the back buffer between the BeginScene/EndScene that this function manages.

## Timing — two clocks
1. **`timeGetTime()` (WINMM)** — wall-clock milliseconds. Used for smooth
   per-frame animation: e.g. `fVar1 = (now - base)/DAT_004124f0 + DAT_004123dc`
   feeds text/scroll positions; fade ramps like
   `_DAT_005101bc = (now - t0)/DAT_00412838` clamped to [0,1].
2. **`FUN_004051ef()` — the demo/music clock.** It reads a 16-bit song position
   from the softsynth player (`FUN_00410678`, owned by the audio agent), clamps to
   `≤ 0x3000`, and offsets by `0x200` past `0x1ff`. **This value (`& 0xffff`) is
   the master timeline coordinate** — every scene runs `while (quit==0 && pos < THRESHOLD)`.
   Synchronizing visuals to music position (not wall time) keeps the demo locked
   to the soundtrack even if frame rate varies.

At startup the loop spins on `timeGetTime` until `> _DAT_00412840` ms elapsed
(intro sync delay), then zeroes the state and begins.

## Timeline structure (`FUN_0040f285`)
One-time generators are called up front (§EFFECTS_OVERVIEW), then a sequence of
`while (pos < T)` blocks, each calling one per-frame renderer + `FUN_00405346`:

| music pos `<` | per-frame call | scene |
|---------------|----------------|-------|
| `0x114` / `0x200` | `FUN_00404dd0(text,…)` | intro titles "threestate"/"lost vegas" |
| `0x600` | `FUN_004078a0` (init `FUN_00407880`) | scene A |
| `0x800` | `FUN_0040cce0` (init `FUN_0040ccd0`) | scene B |
| `0xa00` | `FUN_0040af80` (init `FUN_0040af60`) | scene C |
| `0xc00` | `FUN_0040bf80` (init `FUN_0040bf50`, `FUN_00409d8d`) | scene D (with fade `_DAT_005101bc`) |
| `0xe00` | `FUN_00409da6(0)` | scene E |
| `0x1200` | `FUN_00408e90` (init `FUN_00408cc0`) | scene F |
| `0x1400` | `FUN_00409da6(1)` (re-init `FUN_00409d8d`) | scene E variant |
| `0x1600` | `FUN_00406520` (init `FUN_00406500`) | scene G |
| `0x1a20` | `FUN_0040eb90` (init `FUN_0040e940`) | scene H (finale) |

Text overlays (`FUN_00404dd0` / `FUN_00404e70`) are drawn on top within several of
these blocks (greetings, credits — see EFFECTS_OVERVIEW).

## Exit
When the last block's condition fails (music reached `0x1a20`) or the quit flag is
set (ESC / WM_CLOSE), `FUN_0040f285` returns to `FUN_004053ae`, which calls
`FUN_0040538f`:
```
FUN_004111b1(); FUN_004115fa(...)   ; [AUDIO] stop synth / thread
FUN_00404780()                       ; release D3D/DDraw, restore NORMAL coop level, DestroyWindow
ExitProcess(0)
```
