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
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html`,{waitUntil:'networkidle0'});
// instrument renderAt by wrapping __lvRender? live path doesn't expose it; sample the clock the same way main.js does
await pg.evaluate(()=>document.getElementById('overlay').click());
await new Promise(r=>setTimeout(r,3000));
const s = await pg.evaluate(()=>new Promise(res=>{
  const samples=[];
  const tick=()=>{ const c=window.__lvClock;
    if(c) samples.push(c.songMs);
    if(samples.length<300) requestAnimationFrame(tick); else res(samples); };
  requestAnimationFrame(tick);
}));
// per-frame deltas of the SCENE ANIMATION CLOCK (songMs) — this is what motion uses
const d=[]; for(let i=1;i<s.length;i++) d.push(s[i]-s[i-1]);
const sorted=[...d].sort((a,b)=>a-b);
const q=k=>sorted[Math.floor(sorted.length*k)];
const stalls=d.filter(x=>x<1).length, jumps=d.filter(x=>x>20).length;
console.log(`songMs deltas: median ${q(.5).toFixed(2)}ms  p99 ${q(.99).toFixed(2)}ms  max ${sorted[sorted.length-1].toFixed(2)}ms`);
console.log(`stalls(<1ms) ${stalls}  jumps(>20ms) ${jumps}  of ${d.length}`);
await b.close(); srv.close();
