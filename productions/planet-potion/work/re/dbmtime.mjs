// dbmtime.mjs — does the JS sequencer produce the show's timeline?
//
//   node work/re/dbmtime.mjs part1.dbm part3.dbm --showorder out/showorder.json
//
// The whole show is timed by the music: every scene driver loops until
// dbplayer.library reports signal 1, and nothing in the PowerPC code ever sets
// that flag. So the sequencer is not a convenience — get its row timing wrong
// and every scene starts at the wrong moment.
//
// That makes it checkable without an audio reference. showorder.py already
// zipped the signal events against the scene-driver calls it found by scanning
// _play_part_1 and _play_part_3, and the counts agreed exactly on both parts
// (26 and 26, 13 and 13). Its per-scene startTick values are therefore a
// timeline this sequencer has to reproduce tick for tick, not approximately.
//
// It also reports which effects the modules use that the player does NOT act
// on, because that gap should be a number in the output rather than something
// discovered later by ear.
import fs from 'node:fs';
import { parseDBM } from '../../web/js/dbm.js';
import { Sequencer, unhandledEffects } from '../../web/js/dbmplayer.js';

const argv = process.argv.slice(2);
const si = argv.indexOf('--showorder');
const files = argv.filter((a, k) => !a.startsWith('--') && k !== si + 1);
const show = si >= 0 ? JSON.parse(fs.readFileSync(argv[si + 1], 'utf8')) : null;

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

for (const f of files) {
  const mod = parseDBM(new Uint8Array(fs.readFileSync(f)));
  const part = f.includes('part1') ? 'p1' : 'p3';
  console.log(`\n=== ${f}  (${part})`);

  const { signals, rows, seconds } = new Sequencer(mod).run();
  console.log(`    ${rows} rows, ${seconds.toFixed(3)}s, ${signals.length} signals`);

  const fx = unhandledEffects(mod);
  console.log(`    effects used: ${Object.entries(fx.used)
    .map(([e, n]) => `${e}x${n}`).join(' ')}`);
  console.log(`    NOT acted on by the player: ${fx.unhandled.join(' ') || 'none'}`);

  // Every note trigger should land on real sample data. An off-by-one in the
  // instrument -> sample mapping (both are 1-based in the file) leaves the notes
  // and the timing intact and silences or mis-pitches everything, so it is worth
  // a count rather than a listen.
  let notes = 0, resolved = 0;
  const live = new Array(mod.info?.channels ?? 0).fill(0);
  new Sequencer(mod).run((cells) => {
    cells.forEach((c, i) => {
      if (!c) return;
      if (c.instrument) live[i] = c.instrument;
      if (!c.note) return;
      notes++;
      const inst = mod.instruments[live[i] - 1];
      if (inst && mod.samples[inst.sample - 1]?.data) resolved++;
    });
  });
  say(notes > 0 && resolved / notes > 0.99,
    'note triggers resolve to sample data',
    `${resolved} of ${notes}`);

  if (!show?.[part]) continue;
  const sched = show[part].schedule;
  say(signals.length === sched.length,
    'one signal per scene-driver call', `${signals.length} vs ${sched.length}`);
  say(rows === show[part].totalRows, 'total rows match showorder.py',
    `${rows} vs ${show[part].totalRows}`);
  say(Math.abs(seconds - show[part].totalSeconds) < 0.002,
    'total length matches showorder.py',
    `${seconds.toFixed(3)} vs ${show[part].totalSeconds}`);

  // The real check: each scene's start tick. showorder.py derives them from the
  // SAME signal list, so a mismatch here means the two walks of the pattern data
  // disagree — which is exactly what a wrong row duration or a missed effect 15
  // would look like.
  let worst = 0, at = null;
  for (let i = 0; i < Math.min(signals.length, sched.length); i++) {
    // Scene i ends at signal i, so scene i+1 starts there.
    const wantEnd = sched[i].startTick + sched[i].durTicks;
    const d = Math.abs(signals[i].ticks50 - wantEnd);
    if (d > worst) { worst = d; at = i; }
  }
  say(worst === 0, 'every scene boundary lands on the same tick',
    worst ? `worst ${worst} ticks at scene ${at}` : 'exact');
}

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
