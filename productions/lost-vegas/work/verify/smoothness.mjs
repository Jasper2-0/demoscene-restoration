// Does row-derived motion advance smoothly now? Sample the finale's own clock
// proxy: render live and measure how evenly `rowFrac` sweeps 0->1.
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
await pg.evaluate(()=>document.getElementById('overlay').click());
await new Promise(r=>setTimeout(r,2000));
const s=await pg.evaluate(()=>new Promise(res=>{const a=[];
  const id=setInterval(()=>{const c=window.__lvClock; if(c) a.push([c.acTime,c.pos,c.rowFrac]);
    if(a.length>=600){clearInterval(id);res(a);}},16);}));
// "effective row position" = absolute row + fraction; must advance ~linearly
const eff=s.map(([t,p,f])=>{const pat=p>=0x400?(p>>8)-2:(p>>8); return [t, pat*64+(p&0xff)+f];});
const d=[]; for(let i=1;i<eff.length;i++){const dt=eff[i][0]-eff[i-1][0]; if(dt>0) d.push((eff[i][1]-eff[i-1][1])/dt);}
const sd=[...d].sort((a,b)=>a-b); const q=k=>sd[Math.floor(sd.length*k)];
const frozen=d.filter(x=>x<0.5).length;   // rows/sec far below the 8.33 expected
console.log(`effective row rate: median ${q(.5).toFixed(2)}/s  p10 ${q(.1).toFixed(2)}  p90 ${q(.9).toFixed(2)}  (expect ~8.33)`);
console.log(`frozen samples (<0.5 rows/s): ${frozen}/${d.length}  -> ${frozen? 'STEPPING':'SMOOTH'}`);
await b.close(); srv.close();
