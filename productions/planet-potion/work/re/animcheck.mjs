// animcheck.mjs — run the ported keyframe evaluator against the original's own
// answers.
//
//   node work/re/animcheck.mjs anim.json
//
// `animdump.py` writes, per frame, each node's keyframe track AND the evaluated
// channels `_calc_matrix` published from it. So the polynomial in
// ../../web/js/anim.js can be checked directly: pick the active keyframe, work
// out `u`, evaluate, compare.
//
// WHAT THIS ESTABLISHES, on a scene whose scale really moves (226.771 at t=92,
// 191.112 at t=200, 132.465 at t=400):
//
//   * the keyframe search is "the last keyframe whose tick <= local time";
//   * `u = (t - t0) * invSpan`, with both fields read from the keyframe;
//   * `c0 + c1·u + c2·u³ - c3·u²` reproduces the PUBLISHED cx, cy and scale
//     exactly, from coefficient blocks 12, 13 and 14.
//
// AND IT CONFIRMS THE HIERARCHY, by failing on a node until the hierarchy is
// accounted for. The second node in the sampled scene carries `parent` =
// 0x109a8180, which is the FIRST node's animation object; its own coefficient
// blocks are all zero, and its published cx, cy and scale are the first node's
// exactly. So a parented node does not evaluate its own track into those
// channels, and checking it as if it did reports a 200-unit error that is really
// a missing pass — §3b. Nodes with a parent are reported, not asserted on, until
// that pass is read.
//
// WHAT IT DOES NOT ESTABLISH. Blocks do not map onto channels by a fixed offset.
// Ten of fifteen land on `channel = block + 9` on the unparented node and five
// do not: one pair reads as swapped and others differ by a factor. That is
// reported rather than asserted.
import fs from 'node:fs';
import { channel, normalise } from '../../web/js/anim.js';

const doc = JSON.parse(fs.readFileSync(process.argv[2] ?? 'anim.json', 'utf8'));

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

/**
 * The last keyframe whose tick is at or before the local time — and if the walk
 * runs off the end of the track, the time CLAMPS to that keyframe's t0 rather
 * than running on (0x10005060). Returns both, since the clamp changes `u`.
 */
function active(track, t) {
  let k = track[0];
  for (let i = 1; i < track.length; i++) {
    if (track[i].tick >= t) return { key: k, t };
    k = track[i];
  }
  return { key: k, t: k.t0 };
}

// Confirmed on the sampled scenes: these three blocks are cx, cy and scale.
const PUBLISHED = [[12, 21, 'cx'], [13, 22, 'cy'], [14, 23, 'scale']];

const nodeCount = doc.frames[0]?.nodes.length ?? 0;
console.log(`${doc.frames.length} frames, ${nodeCount} nodes with an animation object`);

const NIL = 0xffffffff;
let checked = 0;
for (let n = 0; n < nodeCount; n++) {
  const node0 = doc.frames[0].nodes[n];
  const track = node0.track;
  if (!track?.length) continue;
  checked++;
  const parented = node0.anim && node0.anim.parent !== NIL;
  console.log(`\nnode ${node0.addr}  ${track.length} keyframes`
    + `  ticks ${track.map((k) => k.tick).join(' ')}`
    + (parented ? `  PARENTED to ${node0.anim.parent.toString(16)}` : ''));
  if (parented) {
    // §3b, checked rather than skipped. The flag bits of `+0x03` select which
    // groups compose, and the offsets are relative to the channel block at
    // `+0x0c`, so they land on known channel indices:
    //
    //   0x40            +0x3c..+0x48  -> channels 15..18, multiplied
    //   0x80            +0x4c, +0x50  -> channels 19, 20, added
    //   0x20 and 0x10   +0x54..+0x5c  -> channels 21..23, COPIED
    //
    // That last group is cx, cy and scale — which is why a child inherits its
    // parent's projection outright instead of scaling it.
    // BY INDEX, not by position 0. This located the parent correctly and then
    // read `nodes[0]` anyway, which happened to be the same node while the dump
    // only contained the two that drew. animdump now walks the whole list from
    // the head, so index 0 is the type-7 root and the shortcut compared the
    // child against the wrong node — the check went red on a change that made
    // the DUMP more complete, not the port less correct.
    const pi = doc.frames[0].nodes.findIndex((x) => x.anim
      && parseInt(x.anim.addr, 16) === node0.anim.parent);
    if (pi < 0) { console.log('    parent not in this dump'); continue; }
    const f3 = node0.anim.flags3;
    if ((f3 & 0x30) === 0x30) {
      let worst = 0;
      for (const f of doc.frames) {
        const c = f.nodes[n].anim.channels, p = f.nodes[pi].anim.channels;
        for (let k = 21; k <= 23; k++) worst = Math.max(worst, Math.abs(c[k] - p[k]));
      }
      say(worst === 0, 'flags3 0x20|0x10 copies channels 21..23 from the parent',
        `worst |diff| ${worst}`);
    }
    continue;
  }

  for (const [block, ch, name] of PUBLISHED) {
    let worst = 0, moved = 0, first = null;
    for (const f of doc.frames) {
      const node = f.nodes[n];
      if (!node?.anim) continue;
      const a = active(node.track, f.t);
      if (!a) continue;
      const { u, u2, u3 } = normalise(a.t, a.key.t0, a.key.invSpan);
      const got = channel(a.key.blocks[block], u, u2, u3, a.key.flags);
      const want = node.anim.channels[ch];
      if (first === null) first = want; else if (want !== first) moved++;
      worst = Math.max(worst, Math.abs(got - want));
    }
    say(worst < 1e-3, `block ${block} evaluates to the published ${name}`,
      `worst |diff| ${worst.toExponential(2)}${moved ? `, ${moved} frames where it moves` : ', constant'}`);
  }

  // The unpinned blocks, reported rather than asserted.
  const offset = [];
  for (let b = 0; b < 15; b++) {
    let ok = true;
    for (const f of doc.frames) {
      const node = f.nodes[n];
      const a = active(node.track, f.t);
      if (!a) continue;
      const { u, u2, u3 } = normalise(a.t, a.key.t0, a.key.invSpan);
      if (Math.abs(channel(a.key.blocks[b], u, u2, u3, a.key.flags)
        - node.anim.channels[b + 9]) > 1e-3) {
        ok = false;
      }
    }
    if (ok) offset.push(b);
  }
  console.log(`    block -> channel+9 holds for ${offset.length}/15: ${offset.join(' ')}`);
}

// A NODE LIST OF ZERO IS NOT A PASS. The node list comes from frames[0], and
// animdump's default times start at t=0 — where the scene has not drawn yet, so
// that frame is empty and every assertion below is skipped. This script then
// printed "all checks passed" having checked nothing, which is the failure
// METHOD.md names: a check that cannot exit non-zero is a report. Give animdump
// times inside the scene's own span instead:
//
//   animdump.py flat/ <stream> out/anim.json 92 200 400
if (checked === 0) {
  console.log('\nFAIL  no node with a keyframe track was checked — frames[0] '
    + `has ${nodeCount} nodes. Sample times inside the scene's span, not t=0.`);
  process.exit(1);
}

console.log(bad === 0 ? `\nall checks passed  (${checked} tracked nodes)`
  : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
