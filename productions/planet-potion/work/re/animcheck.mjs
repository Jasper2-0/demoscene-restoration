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

/** The last keyframe whose tick is at or before the local time. */
const active = (track, t) => track.reduce((b, k) => (k.tick <= t ? k : b), null);

// Confirmed on the sampled scenes: these three blocks are cx, cy and scale.
const PUBLISHED = [[12, 21, 'cx'], [13, 22, 'cy'], [14, 23, 'scale']];

const nodeCount = doc.frames[0]?.nodes.length ?? 0;
console.log(`${doc.frames.length} frames, ${nodeCount} nodes with an animation object`);

const NIL = 0xffffffff;
for (let n = 0; n < nodeCount; n++) {
  const node0 = doc.frames[0].nodes[n];
  const track = node0.track;
  if (!track?.length) continue;
  const parented = node0.anim && node0.anim.parent !== NIL;
  console.log(`\nnode ${node0.addr}  ${track.length} keyframes`
    + `  ticks ${track.map((k) => k.tick).join(' ')}`
    + (parented ? `  PARENTED to ${node0.anim.parent.toString(16)}` : ''));
  if (parented) {
    console.log('    skipped: its channels come from the parent, not its own '
      + 'track — see the hierarchy note above');
    continue;
  }

  for (const [block, ch, name] of PUBLISHED) {
    let worst = 0, moved = 0, first = null;
    for (const f of doc.frames) {
      const node = f.nodes[n];
      if (!node?.anim) continue;
      const k = active(node.track, f.t);
      if (!k) continue;
      const { u, u2, u3 } = normalise(f.t, k.t0, k.invSpan);
      const got = channel(k.blocks[block], u, u2, u3, k.flags);
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
      const k = active(node.track, f.t);
      if (!k) continue;
      const { u, u2, u3 } = normalise(f.t, k.t0, k.invSpan);
      if (Math.abs(channel(k.blocks[b], u, u2, u3, k.flags) - node.anim.channels[b + 9]) > 1e-3) {
        ok = false;
      }
    }
    if (ok) offset.push(b);
  }
  console.log(`    block -> channel+9 holds for ${offset.length}/15: ${offset.join(' ')}`);
}

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
