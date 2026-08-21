// draw-state.mjs — the GL STATE in force at each draw of one recorded frame.
//
//   node tools/winebox/draw-state.mjs <gl.log> [frameIndex]
//
// MODE:       REPORT — prints state per draw and exits 0. Not a gate.
// OBSERVABLE: GLOBAL GL state (blend, depth, cull, current colour) reconstructed by
//             replaying the WINEDEBUG=+opengl log as a state machine.
// UNITS:      frame indices count glClear calls; draw indices count glEnd within a frame.
// STATUS:     superseded (partial) — active for global state, forbidden for per-unit
// SUPERSEDED BY: tools/winebox/exe-draw-state.sh, for per-unit texture/enable state
//
// PARTIAL SUPERSESSION — read this before using the `bound` or texture columns.
// Reconstructing PER-UNIT state from the text log means reimplementing GL's own
// selector semantics, and this file gets them wrong: glEnable(GL_TEXTURE_2D) applies
// to the server's ACTIVE unit, glClientActiveTexture is a different selector again,
// and texture-matrix operations need both the matrix mode and the unit. Replaying
// this trace reported texture unit 0 disabled on 40 of 44 draws — every one false.
// `exe-draw-state.sh` asks a real driver via `glretrace -D` instead, so that entire
// class of error does not exist there. Use this file for global state across a whole
// frame, which it does correctly and cheaply; do not use its per-unit output as
// evidence.
//
// WHY. `compare-draws.mjs` shows that Wonder's port submits the executable's
// primitives vertex-for-vertex and alpha-for-alpha, and the pixels still disagree
// by a factor of three in light. Matching primitives is not matching state: the
// same triangles with a different blend function, depth test or texture
// environment produce a completely different image, and nothing in a primitive
// count can see that.
//
// So this replays the trace as a state machine and prints, for each draw, what
// was actually in force when it happened. That is the list to work through.
import fs from 'node:fs';

const [logPath, frameArg] = process.argv.slice(2);
if (!logPath) {
  console.error('usage: node tools/winebox/draw-state.mjs <gl.log> [frameIndex]');
  process.exit(2);
}

// GL enums that matter here, by value, because the trace prints numbers.
const CAP = {
  2884: 'CULL_FACE', 2929: 'DEPTH_TEST', 3042: 'BLEND', 3553: 'TEXTURE_2D',
  2896: 'LIGHTING', 2912: 'FOG', 3008: 'ALPHA_TEST', 32925: 'MULTISAMPLE',
};
const FACTOR = {
  0: 'ZERO', 1: 'ONE', 768: 'SRC_COLOR', 769: 'ONE_MINUS_SRC_COLOR',
  770: 'SRC_ALPHA', 771: 'ONE_MINUS_SRC_ALPHA', 772: 'DST_ALPHA',
  773: 'ONE_MINUS_DST_ALPHA', 774: 'DST_COLOR', 775: 'ONE_MINUS_DST_COLOR',
};
const DEPTHFN = {
  512: 'NEVER', 513: 'LESS', 514: 'EQUAL', 515: 'LEQUAL', 516: 'GREATER',
  517: 'NOTEQUAL', 518: 'GEQUAL', 519: 'ALWAYS',
};
const TEXENV = { 8448: 'MODULATE', 7681: 'REPLACE', 260: 'DECAL', 3042: 'BLEND', 34160: 'COMBINE' };

const want = frameArg === undefined ? null : Number(frameArg);
const state = {
  blend: false, blendFunc: '?', depth: false, depthFn: '?', depthMask: '?',
  cull: false, tex: false, unit: 0, bound: {}, texEnv: {}, color: '?',
};
let frame = -1, drawn = 0;
const out = [];

for (const line of fs.readFileSync(logPath, 'utf8').split('\n')) {
  if (!line.includes('trace:opengl:')) continue;
  const call = line.slice(line.indexOf('trace:opengl:') + 13);

  if (call.startsWith('glClear ')) { frame++; drawn = 0; continue; }
  // State is tracked across EVERY frame and only PRINTED for the wanted one.
  // Filtering lines by frame loses whatever was set before it — which showed up
  // as a run of draws with no blend or texture state at all.

  let m;
  if ((m = /^glEnable cap (\d+)/.exec(call))) {
    const c = CAP[+m[1]];
    if (c === 'BLEND') state.blend = true;
    else if (c === 'DEPTH_TEST') state.depth = true;
    else if (c === 'CULL_FACE') state.cull = true;
    else if (c === 'TEXTURE_2D') state.tex = true;
  } else if ((m = /^glDisable cap (\d+)/.exec(call))) {
    const c = CAP[+m[1]];
    if (c === 'BLEND') state.blend = false;
    else if (c === 'DEPTH_TEST') state.depth = false;
    else if (c === 'CULL_FACE') state.cull = false;
    else if (c === 'TEXTURE_2D') state.tex = false;
  } else if ((m = /^glBlendFunc sfactor (\d+), dfactor (\d+)/.exec(call))) {
    state.blendFunc = `${FACTOR[+m[1]] ?? m[1]},${FACTOR[+m[2]] ?? m[2]}`;
  } else if ((m = /^glDepthFunc func (\d+)/.exec(call))) {
    state.depthFn = DEPTHFN[+m[1]] ?? m[1];
  } else if ((m = /^glDepthMask flag (\d+)/.exec(call))) {
    state.depthMask = m[1] === '0' ? 'false' : 'true';
  } else if ((m = /^glActiveTexture(?:ARB)? texture (\d+)/.exec(call))) {
    // Only GL_TEXTUREn are unit selectors; anything else in this call shape is a
    // different entry point and must not be read as a unit, or the bound-texture
    // map fills with hundreds of phantom units.
    const u = +m[1] - 33984;
    if (u >= 0 && u < 8) state.unit = u;
  } else if ((m = /^glBindTexture target \d+, texture (\d+)/.exec(call))) {
    state.bound[state.unit] = +m[1];
  } else if ((m = /^glTexEnv[fi]v? target \d+, pname \d+, param(?:s)? ([\d.]+)/.exec(call))) {
    state.texEnv[state.unit] = TEXENV[+m[1]] ?? m[1];
  } else if ((m = /^glColor4f red ([\d.e+-]+), green ([\d.e+-]+), blue ([\d.e+-]+), alpha ([\d.e+-]+)/.exec(call))) {
    state.color = `${(+m[1]).toFixed(3)},${(+m[2]).toFixed(3)},${(+m[3]).toFixed(3)},${(+m[4]).toFixed(4)}`;
  } else if ((m = /^glDrawElements|^glDrawArrays|^glEnd\b/.exec(call))) {
    if (want === null || frame === want) out.push({ frame, n: drawn++, ...JSON.parse(JSON.stringify(state)) });
    else drawn++;
  }
}

const rows = want === null ? out.filter((r) => r.frame === out[out.length - 1]?.frame) : out;
console.log(`frame ${rows[0]?.frame ?? '?'}: ${rows.length} draws\n`);
console.log('  # blend  blendFunc              depth  dFn    dMask  cull  tex  bound          color');
for (const r of rows.slice(0, 40)) {
  console.log(`  ${String(r.n).padStart(2)} ${String(r.blend).padEnd(6)} ${r.blendFunc.padEnd(22)} `
    + `${String(r.depth).padEnd(6)} ${r.depthFn.padEnd(6)} ${r.depthMask.padEnd(6)} `
    + `${String(r.cull).padEnd(5)} ${String(r.tex).padEnd(4)} ${JSON.stringify(r.bound).padEnd(14)} ${r.color}`);
}
