import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const REF=path.join(root,'work/reference/lostvegas_ref.webm');
const ORD=[0,5.6,9.3,17.1,24.9,32.3,40.1,47.9,55.4,63.2,71.0,74.7,78.4,86.2,94.0,
           101.4,109.2,117.0,124.5,132.3,140.1,147.5,155.3,163.1,171.3];
const vt=(pos)=>{const raw=pos>0x3ff?pos-0x200:pos; return ORD[raw>>8]+(raw&0xff)*0.120+0.22;};
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:false,args:['--use-angle=metal','--window-size=700,600']});
const pg=await b.newPage(); await pg.setViewport({width:640,height:480});
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html?pos=0x1600`,{waitUntil:'networkidle0'});
await pg.waitForFunction('window.__lvReady===true',{timeout:20000});
fs.mkdirSync('tree',{recursive:true});
const PTS=[0x1700,0x1720,0x1800,0x1820,0x1900];
let i=0;
for(const pos of PTS){
  // grow from the scene start (0x1600) so the L-system accumulates properly
  await pg.evaluate((target)=>{
    for(let p=0x1600;p<=target;p+=2) window.__lvRender(p, undefined, 0);
  }, pos);
  await (await pg.$('#screen')).screenshot({path:`tree/o_${i}.png`});
  execFileSync('ffmpeg',['-v','error','-ss',String(vt(pos)),'-i',REF,'-frames:v','1','-vf','scale=320:240',`tree/r_${i}.png`,'-y']);
  execFileSync('ffmpeg',['-v','error','-i',`tree/o_${i}.png`,'-vf','scale=320:240',`tree/os_${i}.png`,'-y']);
  console.log(`pos 0x${pos.toString(16)} -> video ${vt(pos).toFixed(1)}s`);
  i++;
}
const args=[]; PTS.forEach((_,k)=>args.push('-i',`tree/os_${k}.png`)); PTS.forEach((_,k)=>args.push('-i',`tree/r_${k}.png`));
const n=PTS.length;
const fc=`${PTS.map((_,k)=>`[${k}]`).join('')}hstack=${n}[o];${PTS.map((_,k)=>`[${k+n}]`).join('')}hstack=${n}[r];[o][r]vstack=2,scale=1600:-1`;
execFileSync('ffmpeg',['-v','error',...args,'-filter_complex',fc,'-frames:v','1','tree/cmp.png','-y']);
console.log('wrote tree/cmp.png (top ours / bottom original)');
await b.close(); srv.close();
