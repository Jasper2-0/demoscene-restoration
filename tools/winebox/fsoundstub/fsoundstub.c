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
 *   SUNF_QPC_HOLD    seconds INTO the pinned order to freeze at (see below)
 *   SUNF_QPC_LATCH   calls to report 0 before jumping to HOLD (default 8)
 *   SUNF_TRACE       log every call to stderr as [fsoundstub] ...
 *   SUNF_PEEK        "addr:len" (hex) — dump engine memory once per frame
 *   SUNF_PEEK_PTR    "addr:len" (hex) — DEREFERENCE addr, then dump len from there
 *
 *   ** THE PEEK DOES NOT FIRE YET. ** It is configured correctly (the attach line
 *   reports the parsed address, length and deref flag) and the run renders normally
 *   — 47 frames, 466,832 GL calls, no crash — but do_peek's own entry trace never
 *   appears, so the counter in the QPC hook is not reaching its threshold. The QPC
 *   hook itself IS working: SUNF_QPC_HOLD demonstrably changes what the engine
 *   renders. Unresolved, and left in place rather than removed because the approach
 *   is sound: the stub is inside the process, the PE has no ASLR, and reading the
 *   engine's own memory is the one route that answers layout questions static
 *   analysis cannot.
 *
 * ADDRESSING A SHOW TIME, not just an order. wONDEr.exe's clock is (read out of the
 * frame handler around 0x40e8xx, constants at 0x4337b0 = 1000 and 0x4337a8 = 0.001,
 * which cancel):
 *
 *     if (order changed) { latch orderStartQpc; orderStartSeconds = table[order]; }
 *     showTime = orderStartSeconds + (QPC_now - orderStartQpc) / frequency
 *
 * So a FROZEN counter latches and then compares against itself: elapsed is always
 * zero and the show sits exactly on the order boundary, which is why every frozen
 * recording reproduced the boundary frame and nothing else. A freely stepping
 * counter advances but lands wherever the call count happens to put it.
 *
 * SUNF_QPC_HOLD makes it addressable. The counter reports 0 for the first
 * SUNF_QPC_LATCH calls — long enough for the order-change branch to latch at zero —
 * and HOLD*frequency for every call after, so elapsed is exactly HOLD and the show
 * freezes at orderStartSeconds + HOLD. One instant, held, repeatable.
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
static double g_qpc_hold = -1.0;      /* seconds into the order; <0 = disabled */
static long   g_qpc_latch = 8;        /* calls reported as 0 before the jump */
static long   g_qpc_calls = 0;

static void parse_peek(const char *v, int deref);   /* defined below, used by init_once */

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
    if ((v = envs("SUNF_QPC_LATCH")))    g_qpc_latch = atol(v);
    if ((v = envs("SUNF_QPC_HOLD")))   { g_qpc_hold = atof(v); g_qpc_forced = 1; }
    parse_peek(envs("SUNF_PEEK"), 0);
    parse_peek(envs("SUNF_PEEK_PTR"), 1);
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

static long g_peek_frames = 0;
static void do_peek(void);

static BOOL WINAPI hooked_QueryPerformanceCounter(LARGE_INTEGER *out) {
    if (!out) return FALSE;
    /* Let the scene load and draw a few frames before looking — the pointers this
     * reads are null until the engine has built them. */
    if (++g_peek_frames >= 30) do_peek();   /* self-guards via g_peek_done */
    if (g_qpc_hold >= 0.0) {
        /* Two-phase: zero while the engine latches its order start, then a
         * constant offset forever. elapsed == HOLD exactly, on every frame. */
        out->QuadPart = (g_qpc_calls++ < g_qpc_latch)
            ? (LONGLONG)0
            : (LONGLONG)(g_qpc_hold * (double)g_qpc_freq);
        return TRUE;
    }
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

/* ---- reading the engine's own memory.
 *
 * The stub is loaded INTO the process, so absolute addresses in the executable's
 * image are directly readable — these PEs have no ASLR and Wine honours the
 * 0x400000 ImageBase. That settles questions static analysis cannot: whether a
 * runtime struct matches the layout of the file it was built from, and what a
 * field actually holds while the demo is running.
 *
 * Guarded with IsBadReadPtr because a wrong address here takes the whole process
 * down and the run reports nothing at all. */
static unsigned long g_peek_addr = 0, g_peek_len = 0;
static int g_peek_deref = 0, g_peek_done = 0;

static void parse_peek(const char *v, int deref) {
    if (!v) return;
    char buf[64]; size_t i = 0;
    while (v[i] && i < sizeof buf - 1) { buf[i] = v[i]; i++; }
    buf[i] = 0;
    char *colon = buf;
    while (*colon && *colon != ':') colon++;
    if (*colon != ':') return;
    *colon = 0;
    g_peek_addr = strtoul(buf, NULL, 16);
    g_peek_len = strtoul(colon + 1, NULL, 16);
    g_peek_deref = deref;
    if (g_peek_len > 0x400) g_peek_len = 0x400;
}

static void do_peek(void) {
    if (!g_peek_addr || g_peek_done) return;
    TR("peek: firing at addr=%#lx len=%#lx deref=%d after %ld calls",
       g_peek_addr, g_peek_len, g_peek_deref, g_peek_frames);
    unsigned char *p = (unsigned char *)g_peek_addr;
    if (IsBadReadPtr(p, 4)) { TR("peek: %#lx unreadable", g_peek_addr); g_peek_done = 1; return; }
    if (g_peek_deref) {
        unsigned long target = *(unsigned long *)p;
        TR("peek: [%#lx] -> %#lx", g_peek_addr, target);
        if (!target || IsBadReadPtr((void *)target, g_peek_len)) {
            TR("peek: target %#lx unreadable", target); g_peek_done = 1; return;
        }
        p = (unsigned char *)target;
    } else if (IsBadReadPtr(p, g_peek_len)) {
        TR("peek: range unreadable"); g_peek_done = 1; return;
    }
    static const char HEX[] = "0123456789abcdef";
    for (unsigned long off = 0; off < g_peek_len; off += 16) {
        char line[80]; int n = 0;
        line[n++] = '+';
        line[n++] = HEX[(off >> 8) & 0xf]; line[n++] = HEX[(off >> 4) & 0xf];
        line[n++] = HEX[off & 0xf]; line[n++] = ' ';
        for (int k = 0; k < 16 && off + k < g_peek_len; k++) {
            line[n++] = HEX[p[off + k] >> 4];
            line[n++] = HEX[p[off + k] & 0xf];
            line[n++] = ' ';
        }
        line[n] = 0;
        TR("peek %s", line);
    }
    g_peek_done = 1;
}

BOOL WINAPI DllMain(HINSTANCE h, DWORD reason, LPVOID reserved) {
    if (reason == DLL_PROCESS_ATTACH) {
        init_once();
        TR("attached: order=%.2f step=%.3f peek=%#lx len=%#lx deref=%d", g_order, g_order_step, g_peek_addr, g_peek_len, g_peek_deref);
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
            TR("QPC IAT patch: counter=%s frequency=%s (qpc=%.0f step=%.3f freq=%lld hold=%.3f latch=%ld)",
               a ? "installed" : "NOT FOUND", b ? "installed" : "NOT FOUND",
               g_qpc, g_qpc_step, (long long)g_qpc_freq, g_qpc_hold, g_qpc_latch);
        }
    }
    return TRUE;
}
