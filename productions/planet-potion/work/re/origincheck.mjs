// origincheck.mjs — where a beat-triggered node's clock starts.
//
//   node work/re/origincheck.mjs [out/arena.json]
//
// `anim.origin` is the one piece of animation state that is not zero when a
// scene is built. `0x1000262c` runs once per node after its keyframes are in
// place: if the loop mode is 0 it stores `currentTime - lastKey.tick` into
// +0x6c, and the clock is zero at build time, so the origin becomes MINUS THE
// TRACK LENGTH. The node therefore starts one whole track PAST its end, clamped
// to its last keyframe, and stays there until its trigger fires.
//
// Getting this wrong is not subtle and was invisible to every other suite:
// every beat-triggered node played once through the moment its scene appeared.
// 0x279e is eleven greetings on one screen and drew all of them at once — 33,
// 72 and 85 primitives at ticks 10, 40 and 80 against the original's 9, 10 and
// 11. `pipeline` could not see it because it TAKES the origins from the arena
// dump rather than deriving them, which is right for testing the evaluator and
// means the initial value was never on trial.
//
// SEVEN OF FORTY-THREE DO NOT FOLLOW THE RULE. They are mode 0, they carry a
// trigger, they have a real track, and they still start at zero. The original
// guards that store on a register this has not traced, so the rule here fits
// the exported data rather than being lifted from the code — and the split is
// pinned in both directions so that neither half can drift unnoticed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../../web/js/engine.js';
import { sinus } from '../../web/js/tables.js';
import { glyphTable, layoutText } from '../../web/js/font.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(HERE, '..', '..', 'web', 'data');
const arenaPath = process.argv[2] ?? path.join(HERE, 'out', 'arena.json');
const NEED = ['seg0.bin', 'seg3.bin', 'seg4.bin'].map((f) => path.join(DATA, f));
for (const f of NEED.concat([arenaPath])) {
  if (!fs.existsSync(f)) {
    console.log(`origincheck: need ${f} — run work/re/export.py. Skipping.`);
    process.exit(ABSENT);
  }
}

const seg0 = new Uint8Array(fs.readFileSync(path.join(DATA, 'seg0.bin')));
const glyphs = glyphTable(seg0);
const engine = createEngine({
  seg0,
  seg3: new Uint8Array(fs.readFileSync(path.join(DATA, 'seg3.bin'))),
  seg4: new Uint8Array(fs.readFileSync(path.join(DATA, 'seg4.bin'))),
  table: sinus(),
  layoutText: (t) => layoutText(glyphs, t),
});
const arena = JSON.parse(fs.readFileSync(arenaPath, 'utf8'));

let checked = 0, agree = 0, zeroOK = 0, zeroBad = 0;
const exceptions = [], wrong = [];
for (const s of arena.scenes) {
  const order = engine.orderOfSlot(s.part, s.slot);
  if (order === null) continue;
  const S = engine.scene(s.part, order);
  s.nodes.forEach((an, i) => {
    const a = an.anim ?? {};
    if (a.origin === undefined || !S.anims[i]) return;
    checked++;
    const ours = S.anims[i].origin;
    if (ours === a.origin) {
      agree++;
      if (a.origin === 0) zeroOK++;
    } else if (a.mode === 0 && a.trigger > 0 && a.origin === 0) {
      exceptions.push(`${s.slot}/${i}`);
    } else {
      zeroBad++;
      if (wrong.length < 6) {
        wrong.push(`${s.slot} node ${i} mode ${a.mode} trigger ${a.trigger}: `
          + `ours ${ours}, arena ${a.origin}`);
      }
    }
  });
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${checked} animation objects, against the arena as the scene VM `
  + `leaves it\n`);
ok('every node starts its clock where the original starts it, bar a known seven',
  zeroBad === 0, `${agree}/${checked} exact, ${exceptions.length} known exceptions`);
for (const w of wrong) console.log(`     ${w}`);
// PINNED AS A COUNT, so that "fewer exceptions" is a change somebody has to
// make on purpose and "more" is a regression rather than a rounding.
ok('and the exceptions are the same seven', exceptions.length === 7,
  exceptions.join(' '));
// A CONTROL: if nothing in the demo had a non-zero origin the assertion above
// would pass on a port that ignored the rule entirely.
ok('the rule is exercised — some nodes really do start before zero',
  agree - zeroOK >= 30, `${agree - zeroOK} nodes start at minus their track length`);

if (failed) process.exit(1);
console.log('\nbeat-triggered nodes start finished, and wait for the music');
