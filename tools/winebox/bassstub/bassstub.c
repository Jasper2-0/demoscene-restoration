/* bassstub.c — a BASS.DLL that makes the show clock an INPUT.
 *
 * The Haujobb engines drive their timeline from BASS_ChannelGetPosition: a byte
 * position in the playing stream, divided by 176.4 to get milliseconds (44.1 kHz
 * stereo 16-bit = 176.4 bytes/ms). Replace the library and that clock becomes
 * whatever we say, so a rendered frame is a deterministic function of
 * (script, position) instead of a sample taken from a moving show.
 *
 * ARGUMENT WIDTHS ARE NOT GUESSED. These are stdcall, so the callee cleans the
 * stack and a wrong count corrupts the caller. The shipped BASS.DLL is PACKED
 * (entropy 7.99, export RVAs zero-filled on disk), so its ret-N epilogues cannot
 * be read statically. The counts here were measured from the CALLER instead — the
 * push sequences before each call site in Genoaux.exe — which is the authority
 * that actually matters, and they were then found to agree with published BASS
 * 1.x prototypes. Agreement is the result, not the starting assumption.
 *
 *   BASS_Init 4   BASS_StreamCreateFile 5   BASS_MusicLoad 5   BASS_MusicPlayEx 4
 *   BASS_StreamPlay 3   BASS_ChannelSetPosition 2   BASS_MusicSetPositionScaler 2
 *   BASS_ChannelGetPosition 1   BASS_GetVersion 0   BASS_Start 0   BASS_Free 0
 *
 * Control (environment):
 *   HJB_POS_MS       position in milliseconds  (converted at 176.4 bytes/ms)
 *   HJB_POS_BYTES    position in bytes         (overrides HJB_POS_MS)
 *   HJB_POS_STEP_MS  added per GetPosition call; 0 = frozen, which is what
 *                    frame-exact addressing wants
 *   HJB_BASS_VERSION returned by BASS_GetVersion. Default 0x00080000 — Genoaux
 *                    does `cmp eax, 0x80000` and refuses otherwise. Liquid wants
 *                    0x00060001. The gate differs per production, so it is an input.
 *   HJB_TICKS        value GetTickCount should return (see below); unset = leave alone
 *   HJB_TICK_STEP    added to it per call; 0 = frozen
 *   HJB_TRACE        if set, log every call to stderr as [bassstub] ...
 *
 * THE SECOND CLOCK. Freezing the BASS position freezes part scheduling but not
 * the whole show: Genoaux also imports GetTickCount, and with the BASS clock
 * pinned the trace still varied frame to frame. (Moments does the same thing more
 * bluntly — its timeline is a hardcoded table on a GetTickCount clock.) So this
 * DLL also takes that clock, by patching the MAIN MODULE's import thunk for
 * GetTickCount once it is loaded. Nothing on disk is modified; the original
 * executable is untouched and the patch lives only in the running process.
 */
#include <windows.h>
#include <stdlib.h>
#include <stdio.h>

static double g_pos_bytes = 0.0;
static double g_step_ms   = 0.0;
static DWORD  g_version   = 0x00080000;
static int    g_trace     = 0;
static int    g_forced    = 0;        /* HJB_POS_MS / HJB_POS_BYTES was given */
static DWORD  g_handle    = 0x1000;   /* distinct handle per creating call, so a
                                       * later call that binds one is attributable
                                       * to which — the recorder lesson, applied. */

static const char *envs(const char *n) {
    static char buf[64];
    DWORD r = GetEnvironmentVariableA(n, buf, sizeof buf);
    return (r == 0 || r >= sizeof buf) ? NULL : buf;
}
static void init_once(void) {
    static int done = 0;
    if (done) return;
    done = 1;
    const char *v;
    g_trace = envs("HJB_TRACE") != NULL;
    if ((v = envs("HJB_BASS_VERSION"))) g_version = (DWORD)strtoul(v, NULL, 0);
    if ((v = envs("HJB_POS_STEP_MS")))  g_step_ms = atof(v);
    if ((v = envs("HJB_POS_MS")))    { g_pos_bytes = atof(v) * 176.4; g_forced = 1; }
    if ((v = envs("HJB_POS_BYTES")))  { g_pos_bytes = atof(v);         g_forced = 1; }
}
#define TR(...) do { init_once(); if (g_trace) { fprintf(stderr, "[bassstub] " __VA_ARGS__); fputc('\n', stderr); fflush(stderr); } } while (0)

__declspec(dllexport) DWORD __stdcall BASS_GetVersion(void) {
    TR("GetVersion -> %#lx", (unsigned long)g_version); return g_version;
}
__declspec(dllexport) BOOL __stdcall BASS_Init(int device, DWORD freq, DWORD flags, HWND win) {
    TR("Init(device=%d freq=%lu flags=%#lx)", device, (unsigned long)freq, (unsigned long)flags);
    return TRUE;
}
__declspec(dllexport) BOOL __stdcall BASS_Start(void) { TR("Start"); return TRUE; }
__declspec(dllexport) BOOL __stdcall BASS_Free(void)  { TR("Free");  return TRUE; }

__declspec(dllexport) DWORD __stdcall BASS_StreamCreateFile(BOOL mem, const void *file,
        DWORD offset, DWORD length, DWORD flags) {
    DWORD h = ++g_handle;
    TR("StreamCreateFile(mem=%d file=%s) -> %#lx", (int)mem,
       mem ? "<memory>" : (const char *)file, (unsigned long)h);
    return h;
}
__declspec(dllexport) DWORD __stdcall BASS_MusicLoad(BOOL mem, const void *file,
        DWORD offset, DWORD length, DWORD flags) {
    DWORD h = ++g_handle;
    TR("MusicLoad(mem=%d file=%s) -> %#lx", (int)mem,
       mem ? "<memory>" : (const char *)file, (unsigned long)h);
    return h;
}
__declspec(dllexport) BOOL __stdcall BASS_StreamPlay(DWORD handle, BOOL flush, DWORD flags) {
    TR("StreamPlay(%#lx)", (unsigned long)handle); return TRUE;
}
__declspec(dllexport) BOOL __stdcall BASS_MusicPlayEx(DWORD handle, DWORD pos, int flags, BOOL reset) {
    TR("MusicPlayEx(%#lx pos=%lu)", (unsigned long)handle, (unsigned long)pos); return TRUE;
}
__declspec(dllexport) BOOL __stdcall BASS_MusicSetPositionScaler(DWORD handle, DWORD scale) {
    TR("MusicSetPositionScaler(%#lx scale=%lu)", (unsigned long)handle, (unsigned long)scale);
    return TRUE;
}
__declspec(dllexport) BOOL __stdcall BASS_ChannelSetPosition(DWORD handle, DWORD pos) {
    init_once();
    /* The engine's own seek: Script.txt's [mp3] start offset arrives here. Honour
     * it ONLY when no position was forced. The first version honoured it always,
     * and the engine promptly called SetPosition(0) from an offset-0 script —
     * silently resetting the clock we had just set, so runs at 20 s and 150 s
     * both rendered t=0 and merely LOOKED like plausible different runs.
     * A forced clock is an override, not a default. */
    if (!g_forced) g_pos_bytes = (double)pos;
    TR("ChannelSetPosition(%#lx pos=%lu = %.1f ms)%s", (unsigned long)handle,
       (unsigned long)pos, (double)pos / 176.4, g_forced ? " IGNORED (forced)" : "");
    return TRUE;
}
__declspec(dllexport) DWORD __stdcall BASS_ChannelGetPosition(DWORD handle) {
    init_once();
    DWORD r = (DWORD)g_pos_bytes;
    if (g_step_ms != 0.0) g_pos_bytes += g_step_ms * 176.4;
    return r;
}

static DWORD g_ticks = 0;
static double g_tick_step = 0.0;
static int g_ticks_forced = 0;

static DWORD WINAPI hooked_GetTickCount(void) {
    DWORD r = g_ticks;
    g_ticks = (DWORD)(g_ticks + g_tick_step);
    return r;
}

/* Overwrite one IAT slot of the process's main image. Walking the import
 * descriptors by name is deliberate: the thunk's position is a build detail,
 * its name is the contract. */
static int patch_iat(const char *dll, const char *fn, void *repl) {
    BYTE *base = (BYTE *)GetModuleHandleA(NULL);
    IMAGE_DOS_HEADER *dos = (IMAGE_DOS_HEADER *)base;
    if (dos->e_magic != IMAGE_DOS_SIGNATURE) return 0;
    IMAGE_NT_HEADERS *nt = (IMAGE_NT_HEADERS *)(base + dos->e_lfanew);
    if (nt->Signature != IMAGE_NT_SIGNATURE) return 0;
    DWORD rva = nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_IMPORT].VirtualAddress;
    if (!rva) return 0;
    IMAGE_IMPORT_DESCRIPTOR *imp = (IMAGE_IMPORT_DESCRIPTOR *)(base + rva);
    for (; imp->Name; imp++) {
        const char *name = (const char *)(base + imp->Name);
        if (lstrcmpiA(name, dll) != 0) continue;
        IMAGE_THUNK_DATA *orig = (IMAGE_THUNK_DATA *)(base + imp->OriginalFirstThunk);
        IMAGE_THUNK_DATA *addr = (IMAGE_THUNK_DATA *)(base + imp->FirstThunk);
        if (!imp->OriginalFirstThunk) orig = addr;
        for (; orig->u1.AddressOfData; orig++, addr++) {
            if (orig->u1.Ordinal & IMAGE_ORDINAL_FLAG) continue;
            IMAGE_IMPORT_BY_NAME *ibn = (IMAGE_IMPORT_BY_NAME *)(base + orig->u1.AddressOfData);
            if (lstrcmpA((const char *)ibn->Name, fn) != 0) continue;
            DWORD old;
            if (!VirtualProtect(&addr->u1.Function, sizeof(void *), PAGE_READWRITE, &old)) return 0;
            addr->u1.Function = (DWORD_PTR)repl;
            VirtualProtect(&addr->u1.Function, sizeof(void *), old, &old);
            return 1;
        }
    }
    return 0;
}

BOOL WINAPI DllMain(HINSTANCE h, DWORD reason, LPVOID reserved) {
    if (reason == DLL_PROCESS_ATTACH) {
        init_once();
        const char *v;
        if ((v = envs("HJB_TICKS")))     { g_ticks = (DWORD)strtoul(v, NULL, 0); g_ticks_forced = 1; }
        if ((v = envs("HJB_TICK_STEP")))   g_tick_step = atof(v);
        TR("attached: pos=%.1f ms step=%.3f ms version=%#lx",
           g_pos_bytes / 176.4, g_step_ms, (unsigned long)g_version);
        if (g_ticks_forced) {
            int ok = patch_iat("KERNEL32.dll", "GetTickCount", (void *)hooked_GetTickCount);
            TR("GetTickCount IAT patch: %s (ticks=%lu step=%.3f)",
               ok ? "installed" : "NOT FOUND", (unsigned long)g_ticks, g_tick_step);
        }
    }
    return TRUE;
}
