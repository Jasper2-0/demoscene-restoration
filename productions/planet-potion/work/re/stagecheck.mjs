// stagecheck.mjs — the per-stage recorded/computed switch, as assertions.
//
//   node work/re/stagecheck.mjs
//
// `stages.js` decides which half of each pipeline stage runs. Two things about
// it can go wrong quietly, and both would make every other check here weaker:
//
//   * a request for a side that does not exist could fall back to the side that
//     does, and render a perfectly good picture that is not the one asked for.
//     A sweep recording "anim=computed" against a recorded frame is worse than
//     no sweep;
//   * the switch could be inert — a query parameter that resolves correctly and
//     changes nothing downstream. That is the usual fate of scaffolding written
//     ahead of the thing it is meant to switch.
//
// THE SECOND ONE IS WHY THIS BUILDS BOTH TEXTURE SETS IN THE PAGE. Textures are
// the one stage with two live implementations — the VM, and the exported PNGs
// it is checked against — so the switch can be exercised rather than described,
// and the comparison re-checks the VM's colour through the browser's own PNG
// decoder, which is a different decoder from the inflate `texvmdiff` uses.
//
// IT COMPARES TEXTURE DATA AND NOT FRAMEBUFFERS, and the reason is a finding.
// `rendertex.py` writes PNG colour type 2: it takes the ARGB surface and emits
// R, G and B only. So the recorded side comes back opaque, the shim blends on
// SRC_ALPHA, and the two composite differently on any scene using transparency
// — which made a rendered-frame comparison fail for a reason that is about the
// DATASET rather than about the switch. The same gap means the VM's ALPHA
// CHANNEL HAS NEVER BEEN CHECKED AGAINST ANYTHING: texvmdiff compares three
// channels of four and says so in a comment. The size of that hole is measured
// below rather than left implicit.
//
// The resolver assertions need no browser and always run; the rest skips
// without Chrome, as rendercheck does.
import { withPage, findChrome } from '../../../../tools/harness/index.mjs';
import { PIPELINE, resolveStages, provenance } from '../../web/js/stages.js';

let bad = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) bad++;
};

// --- the resolver, with no browser in the way -------------------------------

const dflt = resolveStages(new URLSearchParams()).choice;
ok('every stage resolves by default',
  PIPELINE.every((s) => dflt[s.name] === 'computed' || dflt[s.name] === 'recorded'),
  `${Object.keys(dflt).length} stages`);

ok('the default is the port wherever there is one',
  PIPELINE.every((s) => dflt[s.name] === (s.computed ? 'computed' : 'recorded')),
  PIPELINE.filter((s) => dflt[s.name] === 'computed').map((s) => s.name).join(', '));

const both = PIPELINE.filter((s) => s.computed && s.recorded);
ok('at least one stage has two live sides', both.length > 0,
  both.map((s) => s.name).join(', ') || 'none — the switch would be untestable');

for (const s of both) {
  for (const side of ['computed', 'recorded']) {
    const r = resolveStages(new URLSearchParams(`${s.name}=${side}`));
    ok(`${s.name}=${side} is honoured`,
      r.choice[s.name] === side && r.errors.length === 0);
  }
}

// A stage with only one side must REFUSE the other rather than substitute.
const oneSided = PIPELINE.filter((s) => !s.computed || !s.recorded);
let refused = 0;
for (const s of oneSided) {
  const missing = s.computed ? 'recorded' : 'computed';
  const r = resolveStages(new URLSearchParams(`${s.name}=${missing}`));
  const kept = r.choice[s.name] === (s.computed ? 'computed' : 'recorded');
  if (r.errors.length === 1 && kept) refused++;
}
ok('a side that does not exist is refused, not substituted',
  refused === oneSided.length, `${refused}/${oneSided.length} stages`);

const junk = resolveStages(new URLSearchParams('textures=maybe'));
ok('a value that is neither side is rejected', junk.errors.length === 1,
  junk.errors[0] ?? 'accepted silently');

const prov = provenance(dflt);
ok('provenance names every stage and how it was produced',
  PIPELINE.every((s) => prov[s.name]?.how && prov[s.name]?.side),
  `${Object.keys(prov).length} entries`);

// --- and that it reaches the framebuffer ------------------------------------

if (!findChrome()) {
  console.log('\nskipped the browser assertions — no Chrome');
} else {
  // 1. The adapter reports every stage, and reports a refusal as a refusal.
  await withPage({
    root: 'productions/planet-potion/web', path: '/index.html',
    // `tables=recorded` is the refusal now: the four lookup tables have no
    // recorded side and never will. `anim=computed` used to be one and stopped
    // being when the animation was ported — a test for a refusal has to name a
    // stage that CANNOT be honoured, not one that merely was not yet.
    query: '?inspect=1&tables=recorded&textures=recorded',
    extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  }, async ({ page }) => {
    await page.waitForFunction('window.__demoReady === true', { timeout: 20000 });
    const st = await page.evaluate('window.__demo.state()');
    ok('__demo.state() reports every pipeline stage',
      PIPELINE.every((x) => st[x.name]?.side && st[x.name]?.how),
      `${PIPELINE.length} stages`);
    ok('a honoured request shows in the adapter',
      st.textures?.side === 'recorded', `textures=${st.textures?.side}`);
    ok('a refused request shows in the adapter as an error, and the stage keeps '
      + 'the side that exists',
      st.stageErrors?.length === 1 && st.tables?.side === 'computed',
      `${st.stageErrors?.[0] ?? 'no error reported'}; tables=${st.tables?.side}`);
    // The fog plumbing needs two files to agree, and neither of rendercheck's
    // two target frames is one of the four scenes that use it — so without this
    // the wiring could be entirely absent and every suite would still pass.
    ok('the page loaded the fog presets', st.fog?.presets === 4,
      `${st.fog?.presets} presets`);
    ok('and sees four scenes using them', st.fog?.scenes?.length === 4,
      (st.fog?.scenes ?? []).join(' ') || 'none');
  });

  // 1b. THE ENGINE DRAWS, in a real browser. Everything else about it is
  // checked in node against the recording; this is the one assertion that says
  // its output reaches a framebuffer at all, through the same shim the recorded
  // path uses and with no recorded draw stream in the picture.
  //
  // IT IS NOT THE SAME FRAME THE RECORDING HOLDS and should not be read as one.
  // The single-frame mode passes a music signal of -1, so no node's beat sync
  // has fired and every origin is still zero — the arithmetic is the same and
  // the phase is not. pipeline.mjs is where the frame is compared; this is
  // where it is shown to reach a framebuffer.
  await withPage({
    root: 'productions/planet-potion/web', path: '/index.html',
    query: '?scene=1&tick=92',
    extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  }, async ({ page }) => {
    // No `inspect=1` here: that mode draws nothing on its own, which is the
    // whole point of it. Wait on the status line instead.
    await page.waitForFunction(
      "/computed |no scene at/.test(document.getElementById('status')?.textContent ?? '')",
      { timeout: 30000 });
    const line = await page.evaluate(
      "document.getElementById('status')?.textContent ?? ''");
    const m = /computed \S+ (\S+) tick=(\d+): (\d+) draws, (\d+) triangles, glError (\d+)/
      .exec(line);
    ok('the engine renders a frame in the browser', Boolean(m) && Number(m[3]) > 0,
      m ? `${m[3]} draws, ${m[4]} triangles — no recorded stream involved`
        : line.slice(0, 90));
    ok('and the shim reports no GL error on it', Boolean(m) && m[5] === '0',
      m ? `glError ${m[5]}` : 'no computed frame');
  });

  // 2. The switch reaches the pixels, and the two sides agree where they can.
  //
  // NOT a framebuffer comparison. The exported PNGs are colour type 2 and carry
  // no alpha, so the recorded side is opaque where the VM's textures are not
  // and the two composite differently through SRC_ALPHA blending. Comparing
  // rendered frames would fail for a reason that is about the DATASET rather
  // than about the switch. Comparing the texture data itself is the equality
  // that actually holds — and it re-checks the VM's colour through the
  // browser's own PNG decoder, which is a different decoder from the one
  // texvmdiff uses.
  await withPage({
    root: 'productions/planet-potion/web', path: '/index.html',
    query: '?inspect=1',
    extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  }, async ({ page }) => {
    await page.waitForFunction('window.__demoReady === true', { timeout: 20000 });
    const r = await page.evaluate(async () => {
      const t = await import('./js/textures.js');
      const programs = await (await fetch('./data/tex_programs.json')).json();
      const kernels = await (await fetch('./data/tex_kernels.json')).json();
      const gen = t.buildTextures(programs, kernels);
      const rec = await t.loadTextures(programs);
      let compared = 0, rgbDiff = 0, alphaDiff = 0, worst = 0, missing = 0;
      for (const part of Object.keys(gen.byPart)) {
        const a = gen.byPart[part], b = rec.byPart[part] ?? [];
        for (let i = 0; i < a.length; i++) {
          if (!a[i] || !b[i]) { missing++; continue; }
          compared++;
          for (let k = 0; k < a[i].length; k += 4) {
            for (let c = 0; c < 3; c++) {
              const d = Math.abs(a[i][k + c] - b[i][k + c]);
              if (d) { rgbDiff++; if (d > worst) worst = d; }
            }
            if (a[i][k + 3] !== b[i][k + 3]) alphaDiff++;
          }
        }
      }
      return { compared, rgbDiff, alphaDiff, worst, missing,
        genFail: gen.failures.length, recFail: rec.failures.length,
        noAlpha: Boolean(rec.noAlpha) };
    });
    ok('both texture sides produced all 69 programs',
      r.missing === 0 && r.genFail === 0 && r.recFail === 0,
      `${r.compared} compared, ${r.missing} missing, ` +
      `${r.genFail}/${r.recFail} build failures`);
    ok('the generated and recorded textures agree on every colour channel',
      r.rgbDiff === 0, `${r.rgbDiff} differing samples, worst ${r.worst}`);
    // Stated as a check so it cannot quietly stop being true, and so the
    // number is on the record: this is how much of the surface the PNG oracle
    // does not cover.
    ok('and the recorded side is opaque, because the PNGs have no alpha',
      r.noAlpha && r.alphaDiff > 0,
      `${r.alphaDiff} texels where the VM's alpha is not 255`);
  });
}

if (bad) {
  console.log(`\n${bad} assertion(s) failed`);
  process.exit(1);
}
console.log('\nthe stage switch resolves, refuses, and reaches the page');
