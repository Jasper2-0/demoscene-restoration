// Verify the audible position tracks the music: sample (songMs,pos) live and
// check pos advances monotonically at the true row rate with a smooth clock.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:false,args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required','--window-size=700,600']});
const pg=await b.newPage(); await pg.setViewport({width:640,height:480});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html`,{waitUntil:'networkidle0'});
await pg.evaluate(()=>document.getElementById('overlay').click());
await new Promise(r=>setTimeout(r,1500));
// sample against the AUDIO clock (setInterval, not rAF) to remove frame-rate effects
const s = await pg.evaluate(()=>new Promise(res=>{
  const a=[]; const ac=window.__lvAC;
  const id=setInterval(()=>{ const c=window.__lvClock; if(c) a.push([c.acTime,c.pos,c.songMs]);
    if(a.length>=600){clearInterval(id);res(a);} }, 16); }));
const dMs=[]; for(let i=1;i<s.length;i++) dMs.push((s[i][0]-s[i-1][0])*1000);
const sm=[...dMs].sort((x,y)=>x-y);
const changes=[]; for(let i=1;i<s.length;i++) if(s[i][1]!==s[i-1][1]) changes.push(s[i][0]*1000);
const rowGaps=[]; for(let i=1;i<changes.length;i++) rowGaps.push(changes[i]-changes[i-1]);
const elapsed=(s[s.length-1][0]-s[0][0]);
console.log(`AUDIO elapsed ${elapsed.toFixed(2)}s over ${s.length} samples; pos ${changes.length} changes => ${(changes.length/elapsed).toFixed(2)}/s (expect 8.33/s)`);
const rg=[...rowGaps].sort((x,y)=>x-y);
const back=s.filter((v,i)=>i&&v[1]<s[i-1][1]&&s[i-1][1]-v[1]<0x200).length;
console.log(`songMs delta: median ${sm[sm.length>>1].toFixed(2)}ms  max ${sm[sm.length-1].toFixed(2)}ms  stalls ${dMs.filter(x=>x<1).length}`);
console.log(`pos changes: ${changes.length}  gap median ${rg.length?rg[rg.length>>1].toFixed(1):'-'}ms (expect ~120)  min ${rg.length?rg[0].toFixed(1):'-'}  max ${rg.length?rg[rg.length-1].toFixed(1):'-'}`);
console.log(`pos went backwards: ${back}   span pos 0x${s[0][1].toString(16)} -> 0x${s[s.length-1][1].toString(16)}`);
console.log('page errors:', errs.length?errs.slice(0,2):'none');
await b.close(); srv.close();
