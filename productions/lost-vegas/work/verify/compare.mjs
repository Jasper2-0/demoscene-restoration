// Whole-timeline side-by-side: our port vs the original capture.
// pos -> song time via the measured order start times, then +0.22s (measured
// lag of our render vs the reference capture).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const REF=path.join(root,'work/reference/lostvegas_ref.webm');
const LAG=0.22;
// The order table and the pos->seconds mapping come from the PAGE
// (web/js/timeline.js), so the harness and the demo cannot disagree about what
// time it is. They used to hold separate copies — the page's was a flat average
// that was out by ~4.5x per row.
const { posToSeconds } = await import(path.join(root, 'web/js/timeline.js'));
const posToVideo = (pos) => { const s = posToSeconds(pos); return s === null ? null : s + LAG; };
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal']});
const pg=await b.newPage(); await pg.setViewport({width:640,height:480});
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html?pos=0x100`,{waitUntil:'networkidle0'});
await pg.waitForFunction('window.__lvReady===true',{timeout:20000});
fs.mkdirSync('cmp',{recursive:true});
const PTS=[0x500,0x700,0x900,0xb10,0xd00,0x1000,0x1300,0x1500,0x1700,0x1900];
let i=0;
for(const pos of PTS){
  const vt=posToVideo(pos);
  // warm up: scenes track their own entry time (text fades, beat timers), so
  // cold-jumping into one starts its fade at zero. Step in from 0x120 earlier,
  // which is well inside the preceding scene, before screenshotting.
  const r=await pg.evaluate(async (p)=>{
    for(let q=Math.max(0,p-0x120); q<p; q+=0x8) window.__lvRender(q);
    return window.__lvRender(p);
  },pos);
  await (await pg.$('#screen')).screenshot({path:`cmp/ours_${i}.png`});
  execFileSync('ffmpeg',['-v','error','-ss',String(vt),'-i',REF,'-frames:v','1','-vf','scale=320:240',`cmp/ref_${i}.png`,'-y']);
  execFileSync('ffmpeg',['-v','error','-i',`cmp/ours_${i}.png`,'-vf','scale=320:240',`cmp/o_${i}.png`,'-y']);
  console.log(`pos 0x${pos.toString(16)} -> video ${vt.toFixed(1)}s  scene=${r.scene}`);
  i++;
}
// stack: row of ours over row of reference
const ours=PTS.map((_,k)=>`cmp/o_${k}.png`), refs=PTS.map((_,k)=>`cmp/ref_${k}.png`);
const args=[]; [...ours,...refs].forEach(f=>args.push('-i',f));
const n=PTS.length;
const fc=`${ours.map((_,k)=>`[${k}]`).join('')}hstack=${n}[o];${refs.map((_,k)=>`[${k+n}]`).join('')}hstack=${n}[r];[o][r]vstack=2,scale=2400:-1`;
execFileSync('ffmpeg',['-v','error',...args,'-filter_complex',fc,'-frames:v','1','cmp/sidebyside.png','-y']);
console.log('wrote cmp/sidebyside.png  (top = ours, bottom = original)');
await b.close(); srv.close();
