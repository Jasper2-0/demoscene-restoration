/* Sonnet — recover the MSVC rand() state at softsynth time.
 *
 * The intro never calls srand (FUN_0040424e @0x0040424e has no callers) and the
 * seed word at 0x0041a9b8 is 1 in the image, but FUN_004160ff runs the whole
 * scene precalc (FUN_00402e4e + FUN_00402d87(this,0xffff)) BEFORE audio init
 * FUN_00403039, and the texgen/meshgen call rand() an unknown number of times.
 * So the state at synth time has to be recovered from the output.
 *
 * Attack point: instrument 23. Its parameters are
 *   wave = {NOISE, NOISE, SAW}, amp = {0.02, 0.12, 0.02}, detune = {0,-48,0},
 *   every sequencer step note 0 / decay 0  (so the decay envelope is a constant 1),
 *   every filter step cutoff 240 / resonance 15  (constant coefficients),
 *   filterIsHighpass = 1.
 * The 4th-order LP at cutoff 240/255 has gain ~6.1e-5, so the highpass output
 * out[i] = trunc(x[i] - lowpass[i]) is essentially the raw oscillator sum. Each
 * output sample therefore pins 0.04*a + 0.24*b (a,b = two consecutive rand()
 * outputs) to within ~1 part in 9175 -> one sample prunes 2^32 candidates to
 * ~1.5M, two samples to ~0, so a full 32-bit sweep is cheap.
 *
 * Build:  cc -O3 -o seedsearch seedsearch.c -lm
 * Usage:  ./seedsearch <inst23.raw>       (raw s16le PCM of oracle instrument 23)
 */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <stdint.h>

#define A 0x343fdu
#define C 0x269ec3u
#define NCHECK 16
#define TOL 2

static short ref[NCHECK];

/* filter coefficients for cutoff=240, resonance=15 (FUN_0040326d) */
static float gain, a1s1, a2s1, a1s2, a2s2;

static void mkcoef(void) {
    double cutoff = 240.0, resonance = 15.0;
    float fc = (float)(0.49 - cutoff / 255.0 * 0.49);
    if (fc == 0.0f) fc = 0.01f;
    float res = (float)(1.0 + resonance / 255.0 * 100.0);
    double k = 2.0 * tan(M_PI * (double)fc);
    double ik = 1.0 / k;
    double q = (float)sqrt((double)res);
    double tmp = ik * 4.0;
    double h = 2.0 - ik * ik * 8.0;
    double d1 = 0.765367 / q, g1 = 1.0 / ((d1 * 2.0 + tmp) * ik + 1.0);
    double d2 = 1.847759 / q, g2 = 1.0 / ((d2 * 2.0 + tmp) * ik + 1.0);
    gain = (float)(g1 * g2);
    a1s1 = (float)(h * g1);  a2s1 = (float)(1.0 - d1 * 4.0 * ik * g1);
    a1s2 = (float)(h * g2);  a2s2 = (float)(1.0 - d2 * 4.0 * ik * g2);
}

/* saw partial (j=2): detune 0 -> freq 523.2511596679688, rate 44096 */
static float sawv[NCHECK];   /* v * amp2, precomputed per sample index */
static int periodInt;
static float period;

static void mksaw(void) {
    float freq = (float)(pow(2.0, (float)(0.0 / 12.0)) * 523.2511596679688f);
    period = (float)(44096.0f / freq);
    periodInt = (int)period;
    for (int i = 0; i < NCHECK; i++) {
        float ph = (float)((double)(i % periodInt) / (double)period);
        sawv[i] = (float)((double)ph * 65536.0 - 32767.0);
    }
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: seedsearch inst23.raw\n"); return 1; }
    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror("open"); return 1; }
    if (fread(ref, 2, NCHECK, f) != NCHECK) { fprintf(stderr, "short read\n"); return 1; }
    fclose(f);
    mkcoef(); mksaw();

    const double amp0 = (double)(float)0.02, amp1 = (double)(float)0.12, amp2 = (double)(float)0.02;
    long long hits = 0;

    for (uint64_t s0 = 0; s0 < 0x100000000ull; s0++) {
        uint32_t st = (uint32_t)s0;
        float z1 = 0, z2 = 0, w1 = 0, w2 = 0;
        int ok = 1;
        for (int i = 0; i < NCHECK; i++) {
            st = st * A + C; int a = (int)((st >> 16) & 0x7fff);
            st = st * A + C; int b = (int)((st >> 16) & 0x7fff);
            float acc = (float)((double)(2 * a - 32767) * amp0);
            acc = (float)((double)(2 * b - 32767) * amp1 + (double)acc);
            acc = (float)((double)sawv[i] * amp2 + (double)acc);
            int xi = (int)acc;                       /* trunc toward zero */
            float x = (float)xi;
            float t1 = (float)((double)x * gain - (double)a1s1 * z1 - (double)a2s1 * z2);
            float y1 = (float)((double)t1 + 2.0 * z1 + z2);
            z2 = z1; z1 = t1;
            float t2 = (float)((double)y1 - (double)a1s2 * w1 - (double)a2s2 * w2);
            float y2 = (float)((double)t2 + 2.0 * w1 + w2);
            w2 = w1; w1 = t2;
            int o = (int)((double)x - (double)y2);
            if (o > 32000) o = 32000; if (o < -32000) o = -32000;
            int d = o - ref[i]; if (d < 0) d = -d;
            if (d > TOL) { ok = 0; break; }
        }
        if (ok) { printf("HIT state=0x%08x\n", (uint32_t)s0); fflush(stdout); hits++; }
    }
    fprintf(stderr, "done, %lld hits\n", hits);
    return 0;
}
