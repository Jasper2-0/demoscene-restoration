// A/B the corrected baselines against the original, in the real engine.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const port=srv.address().port;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal']});
fs.mkdirSync('kern',{recursive:true});
// text-heavy positions: intro titles, greets/slogan banners, credits
const PTS=[[0x180,'intro'],[0x420,'sceneA'],[0x1320,'E2'],[0x1500,'credits']];
for (const [mode,suffix] of [['','remaster'],['&quality=original','authentic']]) {
  const pg=await b.newPage(); await pg.setViewport({width:640,height:480});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${port}/web/index.html?pos=0x180${mode}`,{waitUntil:'networkidle0'});
  await pg.waitForFunction('window.__lvReady===true',{timeout:20000});
  for (const [pos,name] of PTS) {
    await pg.evaluate((p)=>{for(let q=Math.max(0,p-0x120);q<p;q+=8) window.__lvRender(q); window.__lvRender(p);}, pos);
    await (await pg.$('#screen')).screenshot({path:`kern/${name}_${suffix}.png`});
  }
  console.log(`${suffix}: captured ${PTS.length}`, errs.length?errs.slice(0,1):'no errors');
  await pg.close();
}
for (const [,name] of PTS)
  execFileSync('ffmpeg',['-v','error','-i',`kern/${name}_remaster.png`,'-i',`kern/${name}_authentic.png`,
    '-filter_complex','[0]crop=iw:ih*0.42:0:ih*0.55[a];[1]crop=iw:ih*0.42:0:ih*0.55[b];[a][b]vstack=2',
    '-frames:v','1',`kern/${name}_ab.png`,'-y']);
execFileSync('ffmpeg',['-v','error','-i','kern/intro_ab.png','-i','kern/credits_ab.png',
  '-filter_complex','[0][1]hstack=2,scale=1400:-1','-frames:v','1','kern/ab.png','-y']);
console.log('wrote kern/ab.png  (each pair: remaster on top, authentic below)');
await b.close(); srv.close();
