// Per-scene frame cost in a REAL (non-headless) Chrome window, flushed both sides.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:false, args:['--use-angle=metal','--window-size=700,600']});
const pg=await b.newPage(); await pg.setViewport({width:640,height:480});
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html?pos=0x100`,{waitUntil:'networkidle0'});
await pg.waitForFunction('window.__lvReady===true',{timeout:30000});
const PTS=[[0x100,'intro'],[0x500,'A'],[0x700,'B'],[0x900,'C'],[0xb10,'D'],[0xd00,'E'],
           [0x1000,'F'],[0x1300,'E2'],[0x1500,'credits'],[0x1700,'finale-early'],[0x1900,'finale-climax']];
console.log('scene            cpu(ms)    total(ms)');
for(const [pos,name] of PTS){
  const ms = await pg.evaluate(async (p)=>{
    const gl=document.getElementById('screen').getContext('webgl2');
    for(let q=Math.max(0,p-0x120); q<p; q+=0x8) window.__lvRender(q);   // warm up scene state
    for(let i=0;i<5;i++) window.__lvRender(p);                          // warm up GPU
    gl.finish();
    // CPU/submission only (no flush): JS + driver call overhead
    const N=20; let t0=performance.now();
    for(let i=0;i<N;i++) window.__lvRender(p);
    const cpu=(performance.now()-t0)/N;
    gl.finish();
    // total including GPU
    gl.finish(); t0=performance.now();
    for(let i=0;i<N;i++) window.__lvRender(p);
    gl.finish();
    return { cpu, total:(performance.now()-t0)/N };
  }, pos);
  const bound = ms.cpu > ms.total*0.7 ? 'CPU-BOUND' : 'GPU/draw-bound';
  console.log(`${name.padEnd(14)} cpu ${ms.cpu.toFixed(2).padStart(7)}  total ${ms.total.toFixed(2).padStart(7)}  ${ms.total>16.6?bound:''}`);
}
await b.close(); srv.close();
