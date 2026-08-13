import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const HERE = dirname(fileURLToPath(import.meta.url));
import { Timeline, positionToSeconds, secondsToPosition, activeSceneAt, seek, END_POSITION } from '../js/timeline.js';

const data = JSON.parse(readFileSync(join(HERE,'..','assets','timeline.json'),'utf8'));
let fails = 0;
const ok = (c,msg,extra='') => { console.log((c?'PASS':'FAIL')+'  '+msg+(extra?'   ['+extra+']':'')); if(!c) fails++; };

ok(data.events.length === 293, 'timeline has 293 events', String(data.events.length));

// round-trip position <-> seconds
ok(Math.abs(positionToSeconds(END_POSITION) - 461.6) < 0.5, 'end position is ~461.6 s', positionToSeconds(END_POSITION).toFixed(2));
let rt = true;
for (const p of [0x0000,0x0400,0x0a00,0x1200,0x2300,0x2c0f]) if (secondsToPosition(positionToSeconds(p)) !== p) rt = false;
ok(rt, 'position <-> seconds round-trips');

// dispatch: log every call
const log = [];
const objs = Array.from({length:11}, (_,i) => ({
  layer: 0, event:(m,f)=>log.push([i,m,f]), render(){},
}));
const tl = new Timeline(data, objs);
tl.init();
const initCalls = log.length;
ok(initCalls > 0, 'init pass fired setup events', String(initCalls));

log.length = 0;
tl.dispatchUpTo(END_POSITION);
ok(log.length + initCalls === 293, 'every event fires exactly once across init+playback', String(log.length+initCalls));

// no event fires twice
log.length = 0;
tl.dispatchUpTo(END_POSITION);
ok(log.length === 0, 'cursor does not rewind (re-tick fires nothing)', String(log.length));

// the eight scene handovers
const handovers = data.events.filter(e => e.m === 255 && e.obj >= 3);
ok(handovers.length === 16, '8 scenes = 16 enable/disable events', String(handovers.length));
const seq = [];
for (const e of handovers) if (e.f === 1) seq.push([e.obj, '0x'+e.t.toString(16)]);
ok(seq.length === 8 && seq[0][0] === 3 && seq[7][0] === 10, 'scenes 3..10 enable in order', JSON.stringify(seq));

// render: 16 layers, objects draw on their own layer only
let drawn = [];
const objs2 = Array.from({length:11}, (_,i) => ({ layer: i % 16, event(){}, render(l){ drawn.push([i,l]); } }));
new Timeline(data, objs2).render(null);
ok(drawn.length === 11 && drawn.every(([i,l]) => l === i % 16), 'each object renders once, on its own layer', String(drawn.length));

// seek replays from scratch
const log2 = [];
const objs3 = Array.from({length:11}, (_,i)=>({layer:0,event:(m,f)=>log2.push(i),render(){}}));
const tl3 = new Timeline(data, objs3);
seek(tl3, 0x1200);
const n1 = log2.length;
seek(tl3, 0x1200);
ok(log2.length === 2*n1 && n1 > 0, 'seek replays the script deterministically', `${n1} events`);

console.log(`\n${fails===0 ? 'ALL PASS' : fails+' FAILED'}`);
process.exit(fails?1:0);
