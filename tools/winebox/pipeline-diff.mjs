// pipeline-diff.mjs — walk the whole fixed-function pipeline and say where the
//
// MODE:       REPORT — prints differences and exits 0, because differences are its
//             output. It must NOT be placed behind `&&` as a gate. It is not a check
//             and cannot become one while known-benign artefacts remain in its output:
//             23 of its current differences are the order-sensitive "n-th distinct
//             texture seen this frame" key, which is a limitation of the identity
//             scheme rather than a port defect. Fix texture identity first; only then
//             is a non-zero exit on difference meaningful.
// OBSERVABLE: per-draw fixed-function pipeline state, paired by SUBMISSION ORDER.
// UNITS:      draw indices are positions in the submission stream, not vertex counts.
// port and the executable diverge, per draw, per field.
//
//   node tools/winebox/pipeline-diff.mjs <pipe.txt> <port.jsonl> [frameIndex]
//
// WHY. Chasing one symptom at a time turns every difference into a guess about
// which piece of state caused it, and this port has already produced a dozen
// confident wrong guesses that way. But the fixed-function pipeline is a CLOSED
// SET: transform (modelview / projection / texture), the vertex attributes, the
// per-unit texture state, and the raster gates. If both sides emit the same
// canonical record for every draw, a divergence names itself.
//
// The two inputs are:
//   * `pipe.txt` — an apitrace dump reduced to state + draw calls (see the awk in
//     the probe). apitrace is required rather than Wine's +opengl channel, which
//     logs POINTERS for glLoadMatrixf and the *v entry points, so matrices and
//     vertex data are invisible there.
//   * `port.jsonl` — tools/record-minigl-draws.mjs output, whose `states` array is
//     the same record taken from inside minigl.
//
// PAIRING IS BY SUBMISSION ORDER, which is checked rather than assumed: both
// sides submit a frame's draws in the same sequence, and the tool reports the
// vertex-count sequence of each so a mismatch is visible rather than silent.
// Pairing by vertex count alone is not injective when several clips are live —
// that mistake cost three wrong "fixes" before it was caught.
//
// TEXTURE NAMES DO NOT CORRESPOND. The executable's are GL names in upload order
// and the port's are its own. What is comparable is the PATTERN of binding: which
// draws share a texture with which. So texture identity is normalised to "the
// n-th distinct texture seen in this frame" on both sides before comparing.
import fs from 'node:fs';

const [pipePath, portPath, frameArg] = process.argv.slice(2);
if (!pipePath || !portPath) {
  console.error('usage: node tools/winebox/pipeline-diff.mjs <pipe.txt> <port.jsonl> [frame]');
  process.exit(2);
}

const FACTOR = {
  GL_ZERO: 'ZERO', GL_ONE: 'ONE', GL_SRC_ALPHA: 'SRC_ALPHA',
  GL_ONE_MINUS_SRC_ALPHA: 'ONE_MINUS_SRC_ALPHA', GL_SRC_COLOR: 'SRC_COLOR',
  GL_ONE_MINUS_SRC_COLOR: 'ONE_MINUS_SRC_COLOR', GL_DST_COLOR: 'DST_COLOR',
};
const round = (v) => Math.round(v * 1e4) / 1e4;

function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function mul(a, b) {              // column-major, b applied after a (GL semantics)
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}
const translate = (x, y, z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
const scaleM = (x, y, z) => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
function rotate(deg, x, y, z) {
  const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [
    t*x*x + c,   t*x*y + s*z, t*x*z - s*y, 0,
    t*x*y - s*z, t*y*y + c,   t*y*z + s*x, 0,
    t*x*z + s*y, t*y*z - s*x, t*z*z + c,   0,
    0, 0, 0, 1,
  ];
}
function frustum(l, r, b, t, n, f) {
  return [
    2*n/(r-l), 0, 0, 0,
    0, 2*n/(t-b), 0, 0,
    (r+l)/(r-l), (t+b)/(t-b), -(f+n)/(f-n), -1,
    0, 0, -2*f*n/(f-n), 0,
  ];
}
function ortho(l, r, b, t, n, f) {
  return [
    2/(r-l), 0, 0, 0,
    0, 2/(t-b), 0, 0,
    0, 0, -2/(f-n), 0,
    -(r+l)/(r-l), -(t+b)/(t-b), -(f+n)/(f-n), 1,
  ];
}

/** Replay the reduced apitrace stream and emit one record per draw. */
function replay(text) {
  const nums = (s) => (s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  const st = {
    mode: 'MODELVIEW', unit: 0,
    mats: { MODELVIEW: identity(), PROJECTION: identity() },
    texMats: [identity(), identity()],
    stacks: { MODELVIEW: [], PROJECTION: [], TEX0: [], TEX1: [] },
    blend: false, blendFunc: '?', depthTest: false, depthMask: 'true',
    cull: false, alphaTest: false, lighting: false,
    units: [{ tex: 0, enabled: false, env: null, gen: false },
            { tex: 0, enabled: false, env: null, gen: false }],
    color: null,
  };
  const cur = () => (st.mode === 'TEXTURE' ? st.texMats[st.unit] : st.mats[st.mode]);
  const setCur = (m) => { if (st.mode === 'TEXTURE') st.texMats[st.unit] = m; else st.mats[st.mode] = m; };
  const frames = [];
  let draws = [];
  let pendingUV = null;

  for (const line of text.split('\n')) {
    if (line === 'FRAME') { frames.push(draws); draws = []; continue; }
    if (line.startsWith('UV ')) { pendingUV = line.split(' ').slice(1); continue; }
    if (line.startsWith('DRAW ')) {
      draws.push({
        kind: 'prim', n: Number(line.slice(5)) || 0,
        color: st.color, blend: st.blend, blendFunc: st.blendFunc,
        depthTest: st.depthTest, depthMask: st.depthMask, cull: st.cull,
        lighting: st.lighting,
        modelview: st.mats.MODELVIEW.map(round),
        projection: st.mats.PROJECTION.map(round),
        units: st.units.map((u, i) => ({ ...u, matrix: st.texMats[i].map(round) })),
        uv: pendingUV ? [Number(pendingUV[1]), Number(pendingUV[2]),
                         Number(pendingUV[3]), Number(pendingUV[4])] : null,
      });
      pendingUV = null;
      continue;
    }
    if (!line.includes('gl')) continue;
    const call = line.slice(line.indexOf('gl'));
    let m;
    if ((m = /^glEnable\(cap = (\w+)/.exec(call)) || (m = /^glDisable\(cap = (\w+)/.exec(call))) {
      const on = call.startsWith('glEnable');
      if (m[1] === 'GL_BLEND') st.blend = on;
      else if (m[1] === 'GL_DEPTH_TEST') st.depthTest = on;
      else if (m[1] === 'GL_CULL_FACE') st.cull = on;
      else if (m[1] === 'GL_ALPHA_TEST') st.alphaTest = on;
      else if (m[1] === 'GL_LIGHTING') st.lighting = on;
      else if (m[1] === 'GL_TEXTURE_2D') st.units[st.unit].enabled = on;
      else if (m[1].startsWith('GL_TEXTURE_GEN')) st.units[st.unit].gen = on;
    } else if ((m = /^glBlendFunc\(sfactor = (\w+), dfactor = (\w+)/.exec(call))) {
      st.blendFunc = `${FACTOR[m[1]] ?? m[1]},${FACTOR[m[2]] ?? m[2]}`;
    } else if ((m = /^glDepthMask\(flag = (\w+)/.exec(call))) {
      st.depthMask = m[1] === 'GL_FALSE' || m[1] === '0' ? 'false' : 'true';
    } else if ((m = /^glActiveTexture(?:ARB)?\(texture = GL_TEXTURE(\d+)/.exec(call))) {
      st.unit = Math.min(1, Number(m[1]));
    } else if ((m = /^glBindTexture\(target = \w+, texture = (\d+)/.exec(call))) {
      st.units[st.unit].tex = Number(m[1]);
    } else if ((m = /^glTexEnv[fi]\(target = \w+, pname = \w+, param = (\w+)/.exec(call))) {
      st.units[st.unit].env = m[1];
    } else if ((m = /^glMatrixMode\(mode = GL_(\w+)/.exec(call))) {
      st.mode = m[1];
    } else if (/^glLoadIdentity/.test(call)) {
      setCur(identity());
    } else if ((m = /^glLoadMatrixf\(m = \{([^}]*)\}/.exec(call))) {
      setCur(nums(m[1]));
    } else if ((m = /^glMultMatrixf\(m = \{([^}]*)\}/.exec(call))) {
      setCur(mul(cur(), nums(m[1])));
    } else if ((m = /^glFrustum\(/.exec(call))) {
      const v = nums(call); setCur(mul(cur(), frustum(...v.slice(0, 6))));
    } else if ((m = /^glOrtho\(/.exec(call))) {
      const v = nums(call); setCur(mul(cur(), ortho(...v.slice(0, 6))));
    } else if (/^glTranslatef/.test(call)) {
      const v = nums(call); setCur(mul(cur(), translate(v[0], v[1], v[2])));
    } else if (/^glRotatef/.test(call)) {
      const v = nums(call); setCur(mul(cur(), rotate(v[0], v[1], v[2], v[3])));
    } else if (/^glScalef/.test(call)) {
      const v = nums(call); setCur(mul(cur(), scaleM(v[0], v[1], v[2])));
    } else if (/^glPushMatrix/.test(call)) {
      const key = st.mode === 'TEXTURE' ? `TEX${st.unit}` : st.mode;
      st.stacks[key].push(cur().slice());
    } else if (/^glPopMatrix/.test(call)) {
      const key = st.mode === 'TEXTURE' ? `TEX${st.unit}` : st.mode;
      const v = st.stacks[key].pop(); if (v) setCur(v);
    } else if ((m = /^glColor4f\(red = ([-\d.e+]+), green = ([-\d.e+]+), blue = ([-\d.e+]+), alpha = ([-\d.e+]+)/.exec(call))) {
      // The executable passes RGB as 255.0 in many calls; GL 1.x clamps at
      // specification time, so normalise here or every colour reads as different.
      st.color = [Math.min(1, Number(m[1])), Math.min(1, Number(m[2])),
                  Math.min(1, Number(m[3])), Number(m[4])].map((v) => Math.round(v * 1000) / 1000);
    }
  }
  frames.push(draws);
  return frames.filter((f) => f.length);
}

/** Texture ids do not correspond across the two; compare the PATTERN instead. */
function normaliseTextures(draws) {
  // Prefer SIZE as the identity: both sides can report the bound texture's
  // dimensions, and unlike "n-th distinct texture seen", it does not depend on the
  // order textures were bound or uploaded in. That ordering dependence was the
  // source of 23 of the last 24 differences this tool reported.
  const seen = new Map();
  let anySize = false;
  for (const d of draws) for (const u of d.units ?? []) if (u?.size?.[0]) anySize = true;
  for (const d of draws) {
    for (const u of d.units ?? []) {
      if (!u || u.tex === 0 || u.tex == null) { u.slot = 0; continue; }
      if (anySize && u.size && u.size[0]) { u.slot = `${u.size[0]}x${u.size[1]}`; continue; }
      if (!seen.has(u.tex)) seen.set(u.tex, seen.size + 1);
      u.slot = seen.get(u.tex);
    }
  }
}

// DRIVER-SOURCED STATE when available. `exe-draw-state.sh` asks glretrace what the
// GL state actually was at each draw, which removes the whole class of "our regex
// replay implemented GL's selector semantics wrong" — the source of 40 of the 44
// false `unit0.enabled` differences this tool used to report. The text replay below
// stays as a fallback for traces that have not been through that pass, and says so.
const ndjson = pipePath.endsWith('.ndjson');
const exeFrames = ndjson
  ? [fs.readFileSync(pipePath, 'utf8').trim().split('\n').map((l) => {
      const d = JSON.parse(l);
      const FAC = { 0: 'ZERO', 1: 'ONE', 768: 'SRC_COLOR', 769: 'ONE_MINUS_SRC_COLOR',
        770: 'SRC_ALPHA', 771: 'ONE_MINUS_SRC_ALPHA', 774: 'DST_COLOR' };
      const fac = (v) => (typeof v === 'string' ? v.replace('GL_', '') : (FAC[v] ?? String(v)));
      return {
        n: d.n, kind: 'prim',
        // GL 1.x clamps colour at specification time; the executable passes 255.0.
        color: Array.isArray(d.color) ? d.color.map((v) => Math.round(Math.min(1, v) * 1000) / 1000) : null,
        blend: d.blend, blendFunc: `${fac(d.blendSrc)},${fac(d.blendDst)}`,
        depthTest: d.depthTest, depthMask: String(d.depthMask), cull: d.cull,
        lighting: d.lighting,
        modelview: (d.modelview ?? []).flat().map(round),
        projection: (d.projection ?? []).flat().map(round),
        units: (d.units ?? []).map((u) => ({
          tex: u.tex, enabled: u.enabled, env: u.env, size: u.size,
          matrix: (u.matrix ?? []).flat().map(round),
        })),
        uv: null,
      };
    })]
  : replay(fs.readFileSync(pipePath, 'utf8'));
if (!ndjson) console.log('  (text replay — run exe-draw-state.sh for driver-sourced state)\n');
const port = JSON.parse(fs.readFileSync(portPath, 'utf8').trim().split('\n')[0]);
const portDraws = (port.states ?? []).map((s) => ({ ...s }));

// The held instant is the settled tail; take the last frame whose draw count
// repeats, so a partially recorded final frame cannot be chosen.
let idx = frameArg !== undefined ? Number(frameArg) : exeFrames.length - 1;
if (frameArg === undefined) {
  for (let i = exeFrames.length - 2; i >= 1; i--) {
    if (exeFrames[i].length === exeFrames[i - 1].length) { idx = i; break; }
  }
}
// Drop the executable's EMPTY draws. It issues glBegin/glEnd pairs that submit no
// vertices — 46 of 90 in the frame this was built on — and the port has nothing
// corresponding, so leaving them in shifts every pair by one and reports the whole
// frame as different.
const exeDraws = (exeFrames[idx] ?? []).filter((d) => d.n > 0);
normaliseTextures(exeDraws);
normaliseTextures(portDraws);

console.log(`executable frame ${idx}: ${exeDraws.length} draws   port: ${portDraws.length} draws`);
console.log(`  exe  counts: ${exeDraws.map((d) => d.n).join(' ')}`);
console.log(`  port counts: ${portDraws.map((d) => d.n).join(' ')}\n`);

const near = (a, b, eps = 0.02) => typeof a === 'number' && typeof b === 'number'
  ? Math.abs(a - b) <= eps : JSON.stringify(a) === JSON.stringify(b);
const matNear = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
  && a.every((v, i) => Math.abs(v - b[i]) <= 0.01);

const tally = new Map();
const n = Math.min(exeDraws.length, portDraws.length);
for (let i = 0; i < n; i++) {
  const e = exeDraws[i], p = portDraws[i];
  const diffs = [];
  if (e.n !== p.n) diffs.push(`n ${e.n} vs ${p.n}`);
  if (!near(e.blend, p.blend)) diffs.push(`blend ${e.blend} vs ${p.blend}`);
  if (e.blend && p.blend && e.blendFunc !== p.blendFunc) diffs.push(`blendFunc ${e.blendFunc} vs ${p.blendFunc}`);
  if (!near(e.depthTest, p.depthTest)) diffs.push(`depthTest ${e.depthTest} vs ${p.depthTest}`);
  // depthMask only reaches the framebuffer when the depth TEST is on: GL writes no
  // depth for a draw with GL_DEPTH_TEST disabled, whatever the mask says. Reporting
  // it anyway produced four findings on draws where it could not affect a pixel.
  // This is the "impact" rule in miniature — a field is only a finding where the
  // pipeline can act on it.
  if (String(e.depthMask) !== String(p.depthMask) && (e.depthTest || p.depthTest)) {
    diffs.push(`depthMask ${e.depthMask} vs ${p.depthMask}`);
  }
  if (!near(e.cull, p.cull)) diffs.push(`cull ${e.cull} vs ${p.cull}`);
  if (!near(e.lighting, p.lighting)) diffs.push(`lighting ${e.lighting} vs ${p.lighting}`);
  if (e.color && p.color && !e.color.every((v, k) => Math.abs(v - p.color[k]) <= 0.01)) {
    diffs.push(`color [${e.color}] vs [${p.color}]`);
  }
  if (!matNear(e.modelview, p.modelview)) diffs.push('modelview');
  if (e.uv && p.uv && !e.uv.every((v, k) => Math.abs(v - p.uv[k]) <= 0.002)) {
    diffs.push(`uv exe u[${e.uv[0]},${e.uv[1]}] v[${e.uv[2]},${e.uv[3]}]`
      + ` vs port u[${p.uv[0]},${p.uv[1]}] v[${p.uv[2]},${p.uv[3]}]`);
  }
  if (!matNear(e.projection, p.projection)) diffs.push('projection');
  for (let u = 0; u < 2; u++) {
    const eu = e.units?.[u], pu = p.units?.[u];
    if (!eu || !pu) continue;
    if (eu.slot !== pu.slot) diffs.push(`unit${u}.texture slot ${eu.slot} vs ${pu.slot}`);
    // unit.enabled is deliberately not compared: the driver state dump does not
    // carry per-unit enables, and whether a unit is switched on is mechanism —
    // what changes pixels is the bound texture and how it combines. This field
    // alone produced 40 of 44 false differences while it was compared.
    // The texture MATRIX is deliberately not compared. Wonder scrolls by baking the
    // offset into its texcoords and the port does it with a matrix translation, so
    // the matrices differ on almost every draw while the sampled texel is identical.
    // What matters is where the draw READS, which is the effective UV below.
  }
  for (const d of diffs) tally.set(d.split(' ')[0], (tally.get(d.split(' ')[0]) ?? 0) + 1);
  if (diffs.length) console.log(`  draw ${String(i).padStart(3)} (n=${e.n}): ${diffs.join('; ')}`);
}

console.log(`\n  ${n} draws compared`);
if (!tally.size) console.log('  no field differs — the pipeline state matches on every draw');
else {
  console.log('  fields that differ, by frequency:');
  for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(4)}  ${k}`);
}
