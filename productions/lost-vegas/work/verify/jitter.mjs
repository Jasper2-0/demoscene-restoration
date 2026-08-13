// Frame-time DISTRIBUTION during live playback (audio on) vs debug (audio off).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const port=srv.address().port;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:false, args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required','--window-size=700,600']});
const pg=await b.newPage(); await pg.setViewport({width:640,height:480});

// (1) LIVE playback with audio: measure rAF-to-rAF deltas
await pg.goto(`http://127.0.0.1:${port}/web/index.html`,{waitUntil:'networkidle0'});
await pg.evaluate(()=>document.getElementById('overlay').click());
// wait until playback actually reaches scene B (~27s in), then sample
console.log('waiting for scene B in live playback...');
await new Promise(r=>setTimeout(r,29000));
const live = await pg.evaluate(()=>new Promise(res=>{
  const d=[]; let last=performance.now();
  const tick=()=>{const n=performance.now(); d.push(n-last); last=n;
    if(d.length<600) requestAnimationFrame(tick); else res(d);};
  requestAnimationFrame(tick);
}));
// (2) DEBUG, no audio: same measurement while stepping positions
await pg.goto(`http://127.0.0.1:${port}/web/index.html?pos=0x600`,{waitUntil:'networkidle0'});
await pg.waitForFunction('window.__lvReady===true',{timeout:20000});
const nosound = await pg.evaluate(()=>new Promise(res=>{
  const d=[]; let last=performance.now(), p=0x600;
  const tick=()=>{window.__lvRender(p); p+=1; if(p>0x7ff)p=0x600;
    const n=performance.now(); d.push(n-last); last=n;
    if(d.length<400) requestAnimationFrame(tick); else res(d);};
  requestAnimationFrame(tick);
}));
const stat=(a,name)=>{const s=[...a].sort((x,y)=>x-y);
  const q=k=>s[Math.floor(s.length*k)];
  const spikes=a.filter(x=>x>20).length;
  console.log(`${name.padEnd(22)} median ${q(.5).toFixed(1)}  p90 ${q(.9).toFixed(1)}  p99 ${q(.99).toFixed(1)}  max ${s[s.length-1].toFixed(1)}  frames>20ms: ${spikes}/${a.length}`);};
stat(live,'LIVE (audio on)');
stat(nosound,'DEBUG scene B (no audio)');
await b.close(); srv.close();
