// Advance the one process-global MSVC rand() stream to the point where
// Part_Hairball constructs its HairMeshes.  This is history replay, not a
// fitted seed: the same fixed frame period used by the hair integrator also
// determines how many rand() calls the earlier Empt and Pehko frames make.
//
// Binary anchors:
//   Demo::loadPhase part creation order       0x403017-0x40306e
//   Hair::Hair, three calls per strand        0x42393f/0x42395c/0x423979
//   RandomFadeOut, one call per Empt frame    0x401ea0-0x401f19 (call 0x401ece)
//   Part_Empt stamp calls                     0x40585e-0x405ada
//   ParticleSystem::emit, 13 calls/emission   0x40db9f-0x40deb8
//
// This deliberately accepts dt rather than baking in a prefix. HairMesh gets
// the real QPC delta in the executable, so any dt candidate tested against the
// capture must carry its own matching pre-Hairball rand history.
export const HAIRBALL_STATIC_RAND_DRAWS = 3024;

const RAND_SCALE = Math.fround(1 / 32767);
const EMIT_INTERVAL = Math.fround(0.1);
const PARTICLE_LIFE = Math.fround(1.6772206058531576);
const AGE_NOISE = Math.fround(0.3);

// Count the Pehko emissions with the binary's float storage semantics. This
// cannot use the renderer's higher-level stepSystem helper: the x87 addition
// at 0x40d4d7 is stored to dword [system+0x100] before the next callback, and
// the ages are likewise stored to dword [particle+0x0c] at 0x40e6f3-0x40e6fa.
// At 60 Hz that rounding makes the 0.1 timer fire on callback 6, while an
// unrounded JS Number reaches only 0.099999... and fires on callback 7.
function stepPehkoSystem(system, dt, rand) {
  const sum = system.sinceEmit + dt;
  system.sinceEmit = Math.fround(sum);
  if (sum >= EMIT_INTERVAL && system.ages.length < 10) {
    let age = 0;
    for (let i = 0; i < 13; i++) {
      const r = rand();
      // emit's third rand is the 0..0.3 age head-start (0x40dc33-0x40dc4f).
      if (i === 2) age = Math.fround(r * RAND_SCALE * AGE_NOISE);
    }
    system.ages.push(age);
    system.sinceEmit = 0;
  }
  // LifeTime kills these particles before either size or alpha can, so ages
  // alone determine pool availability and therefore subsequent rand calls.
  for (let i = system.ages.length - 1; i >= 0; i--) {
    system.ages[i] = Math.fround(system.ages[i] + dt);
    if (system.ages[i] >= PARTICLE_LIFE) system.ages.splice(i, 1);
  }
}

/**
 * Mutate `rand` through every consumer before phase-2 Hairball construction.
 * Returns an audit record; `draws` is the equivalent value for ?hairskip=.
 *
 * The fixed-grid convention mirrors the single-frame renderer: the first
 * callback is at local t=0 and receives one full dt, then t=dt, 2dt, ... .
 */
export function advanceRandToHairball(rand, dt = 1 / 60) {
  if (!(dt > 0) || !Number.isFinite(dt)) throw new RangeError('hair dt must be finite and positive');
  const frameDt = Math.fround(dt);
  let draws = 0;
  const next = () => { draws++; return rand(); };

  // Phase 1 constructs both 500-strand Krediili meshes and Pehko's one
  // 8-strand ruoksa mesh before playback: (1000 + 8) * 3.
  for (let i = 0; i < HAIRBALL_STATIC_RAND_DRAWS; i++) next();

  let emptFrames = 0, emptStampDraws = 0;
  let emptA = 0, emptB = 0, emptC = 0;
  for (let k = 0; k * dt < 13; k++) {
    let stamps;
    if (emptA < Math.fround(1.3)) {
      const t = emptA;
      emptA = Math.fround(emptA + frameDt);
      const x = 8 * t - 8;
      stamps = Math.max(1, Math.trunc((x - 2) * 3));
      emptStampDraws += 3 * stamps;
      for (let i = 0; i < 3 * stamps; i++) next();
    } else if (emptB < 8) {
      emptB = Math.fround(emptB + frameDt);
      stamps = 1;
      emptStampDraws += 3;
      for (let i = 0; i < 3; i++) next();
    } else {
      const d = emptC;
      emptC = Math.fround(emptC + frameDt);
      stamps = Math.max(1, Math.trunc(28 * d + 1.4));
      emptStampDraws += 4 * stamps;
      for (let i = 0; i < 4 * stamps; i++) next();
    }
    // Demo::render invokes the fade-out object after Part_Empt::vf2 on every
    // frame. RandomFadeOut clamps a negative progress value but still calls
    // rand; it early-outs only at progress >= 1, after the part has ended.
    next();
    emptFrames++;
  }

  // Part_Pehko clones one zero-timer system for every one of Hair_ruoksa's
  // 8*10 nodes. Its vf2 updates them in strand/node order once per callback.
  const systems = Array.from({ length: 80 }, () => ({ ages: [], sinceEmit: 0 }));
  const beforePehko = draws;
  let pehkoFrames = 0;
  for (let k = 0; k * dt < 9.531; k++) {
    for (const system of systems) stepPehkoSystem(system, frameDt, next);
    pehkoFrames++;
  }
  const pehkoDraws = draws - beforePehko;

  return {
    draws,
    staticDraws: HAIRBALL_STATIC_RAND_DRAWS,
    emptFrames,
    emptStampDraws,
    emptFadeDraws: emptFrames,
    pehkoFrames,
    pehkoEmissions: pehkoDraws / 13,
    pehkoDraws,
    pehkoLive: systems.reduce((n, system) => n + system.ages.length, 0),
  };
}
