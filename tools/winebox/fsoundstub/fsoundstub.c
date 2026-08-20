/* fsoundstub.c — an FSOUND.DLL that makes the Sunflower show clock an INPUT.
 *
 * Wonder drives its timeline from FMUSIC_GetOrder: the module's current pattern
 * order. Replace the library and that becomes whatever we say, so a rendered
 * frame is a deterministic function of (order), addressable and repeatable,
 * instead of a sample taken from a moving show.
 *
 * ORDER IS THE ENGINE'S OWN TIME UNIT, which makes this cleaner than the BASS
 * case. Wonder's port already runs on a recovered order-to-seconds clock, so the
 * number set here is the same number the port schedules on — no conversion, and
 * no rounding to argue about.
 *
 * ARGUMENT WIDTHS ARE FREE HERE. FMOD's exports are decorated MSVC-style
 * (`_FSOUND_Init@8`), so the stdcall byte count is IN THE NAME. The BASS stub
 * needed a call-site scan of the caller because the shipped BASS.DLL is packed and
 * its ret-N epilogues are unreadable; nothing like that is needed for this one.
 * The 16 entry points Wonder imports, with their widths straight off the names:
 *
 *   FSOUND_Init@8  FSOUND_Close@0  FSOUND_SetOutput@4  FSOUND_GetOutput@0
 *   FSOUND_SetMixer@4  FSOUND_GetMixer@0  FSOUND_GetDriver@0
 *   FSOUND_GetOutputRate@0  FSOUND_SetMixAhead@4  FSOUND_SetUpdateRate@4
 *   FSOUND_DSP_ClearMixBuffer@0
 *   FMUSIC_LoadSongMemory@4  FMUSIC_PlaySong@4  FMUSIC_FreeSong@4
 *   FMUSIC_GetOrder@4  FMUSIC_SetOrder@8
 *
 * Control (environment):
 *   SUNF_ORDER       the order FMUSIC_GetOrder reports; unset = leave at 0
 *   SUNF_ORDER_STEP  added per call; 0 = frozen, which is what addressing wants
 *   SUNF_TICKS       value GetTickCount should return; unset = leave alone
 *   SUNF_TICK_STEP   added to it per call
 *   SUNF_QPC         value QueryPerformanceCounter should report; unset = leave alone
 *   SUNF_QPC_STEP    added to it per call; 0 = frozen
 *   SUNF_QPC_FREQ    what QueryPerformanceFrequency reports (default 1000000)
 *   SUNF_TRACE       log every call to stderr as [fsoundstub] ...
 *
 * THE SECOND CLOCK, again — and it is a DIFFERENT one here. Freezing the module
 * order pins which part is playing but not the animation inside it, exactly as
 * pinning only the audio position did for the Haujobb engines. Those read
 * GetTickCount; wONDEr.exe imports QueryPerformanceCounter and
 * QueryPerformanceFrequency instead and does not import GetTickCount at all.
 * Both patches are here, both off unless their variable is set, and each reports
 * whether it actually found its target — a patch that silently missed is worse
 * than no patch, because the run still looks pinned.
 */
#include <windows.h>
#include <stdlib.h>
#include <stdio.h>

static double g_order = 0.0, g_order_step = 0.0;
static int    g_order_forced = 0;
static DWORD  g_ticks = 0;
static double g_tick_step = 0.0;
static int    g_ticks_forced = 0;
static int    g_trace = 0;
static DWORD  g_handle = 0x2000;   /* distinct handle per creating call */
static double g_qpc = 0.0, g_qpc_step = 0.0;
static long long g_qpc_freq = 1000000;
static int    g_qpc_forced = 0;

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
    g_trace = envs("SUNF_TRACE") != NULL;
    if ((v = envs("SUNF_ORDER")))      { g_order = atof(v); g_order_forced = 1; }
    if ((v = envs("SUNF_ORDER_STEP")))   g_order_step = atof(v);
    if ((v = envs("SUNF_TICKS")))      { g_ticks = (DWORD)strtoul(v, NULL, 0); g_ticks_forced = 1; }
    if ((v = envs("SUNF_TICK_STEP")))    g_tick_step = atof(v);
    if ((v = envs("SUNF_QPC")))        { g_qpc = atof(v); g_qpc_forced = 1; }
    if ((v = envs("SUNF_QPC_STEP")))     g_qpc_step = atof(v);
    if ((v = envs("SUNF_QPC_FREQ")))     g_qpc_freq = atoll(v);
}
#define TR(...) do { init_once(); if (g_trace) { fprintf(stderr, "[fsoundstub] " __VA_ARGS__); fputc('\n', stderr); fflush(stderr); } } while (0)

/* ---- FSOUND: device setup. Succeed, report something plausible, do nothing. */
int  __stdcall FSOUND_Init(int mixrate, int maxchannels) {
    TR("FSOUND_Init(mixrate=%d maxchannels=%d)", mixrate, maxchannels); return 1;
}
void __stdcall FSOUND_Close(void)                    { TR("FSOUND_Close"); }
int  __stdcall FSOUND_SetOutput(int o)               { TR("SetOutput(%d)", o); return 1; }
int  __stdcall FSOUND_GetOutput(void)                { return 0; }
int  __stdcall FSOUND_SetMixer(int m)                { TR("SetMixer(%d)", m); return 1; }
int  __stdcall FSOUND_GetMixer(void)                 { return 0; }
int  __stdcall FSOUND_GetDriver(void)                { return 0; }
int  __stdcall FSOUND_GetOutputRate(void)            { return 44100; }
int  __stdcall FSOUND_SetMixAhead(int ms)            { TR("SetMixAhead(%d)", ms); return 1; }
int  __stdcall FSOUND_SetUpdateRate(int hz)          { TR("SetUpdateRate(%d)", hz); return 1; }
void __stdcall FSOUND_DSP_ClearMixBuffer(void)       { }

/* ---- FMUSIC: the song, and the clock. */
DWORD __stdcall FMUSIC_LoadSongMemory(void *data) {
    DWORD h = ++g_handle;
    TR("FMUSIC_LoadSongMemory(%p) -> %#lx", data, (unsigned long)h);
    return h;
}
int __stdcall FMUSIC_PlaySong(DWORD song) { TR("PlaySong(%#lx)", (unsigned long)song); return 1; }
int __stdcall FMUSIC_FreeSong(DWORD song) { TR("FreeSong(%#lx)", (unsigned long)song); return 1; }

int __stdcall FMUSIC_SetOrder(DWORD song, int order) {
    init_once();
    /* The engine's own seek. Honour it only when nothing was forced — the BASS
     * stub's first version did the opposite and the engine promptly reset the
     * clock it had just been given, so two different requested positions both
     * rendered the same instant and looked like plausible different runs. */
    if (!g_order_forced) g_order = order;
    TR("SetOrder(%#lx, %d)%s", (unsigned long)song, order,
       g_order_forced ? " IGNORED (forced)" : "");
    return 1;
}

int __stdcall FMUSIC_GetOrder(DWORD song) {
    init_once();
    int r = (int)g_order;
    if (g_order_step != 0.0) g_order += g_order_step;
    return r;
}

/* ---- the wall clock, patched in the caller's IAT (see the header note). */
static DWORD WINAPI hooked_GetTickCount(void) {
    DWORD r = g_ticks;
    g_ticks = (DWORD)(g_ticks + g_tick_step);
    return r;
}

static BOOL WINAPI hooked_QueryPerformanceCounter(LARGE_INTEGER *out) {
    if (!out) return FALSE;
    out->QuadPart = (LONGLONG)g_qpc;
    g_qpc += g_qpc_step;
    return TRUE;
}
static BOOL WINAPI hooked_QueryPerformanceFrequency(LARGE_INTEGER *out) {
    if (!out) return FALSE;
    out->QuadPart = g_qpc_freq;
    return TRUE;
}

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
        if (lstrcmpiA((const char *)(base + imp->Name), dll) != 0) continue;
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
        TR("attached: order=%.2f step=%.3f", g_order, g_order_step);
        if (g_ticks_forced) {
            int ok = patch_iat("KERNEL32.dll", "GetTickCount", (void *)hooked_GetTickCount);
            TR("GetTickCount IAT patch: %s (ticks=%lu step=%.3f)",
               ok ? "installed" : "NOT FOUND", (unsigned long)g_ticks, g_tick_step);
        }
        if (g_qpc_forced) {
            int a = patch_iat("KERNEL32.dll", "QueryPerformanceCounter",
                              (void *)hooked_QueryPerformanceCounter);
            int b = patch_iat("KERNEL32.dll", "QueryPerformanceFrequency",
                              (void *)hooked_QueryPerformanceFrequency);
            TR("QPC IAT patch: counter=%s frequency=%s (qpc=%.0f step=%.3f freq=%lld)",
               a ? "installed" : "NOT FOUND", b ? "installed" : "NOT FOUND",
               g_qpc, g_qpc_step, (long long)g_qpc_freq);
        }
    }
    return TRUE;
}
