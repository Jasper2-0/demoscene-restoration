import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal']});
const pg=await b.newPage(); await pg.setViewport({width:640,height:480});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html?pos=0x100`,{waitUntil:'networkidle0'});
await pg.waitForFunction('window.__lvReady===true',{timeout:20000});
const SHOTS=[[0x1200,'e2a'],[0x1210,'e2b'],[0x1230,'e2c'],[0x1300,'e2d'],[0x1320,'e2e'],[0x1330,'e2f']];
fs.mkdirSync('shots',{recursive:true});
for (const [pos,name] of SHOTS){
  const t0=Date.now();
  const r=await pg.evaluate(p=>window.__lvRender(p),pos).catch(e=>({scene:'THREW '+e.message}));
  const ms=Date.now()-t0;
  const gl=await pg.evaluate(()=>{const c=document.getElementById('screen');const g=c.getContext('webgl2');return g?g.getError():-1;});
  await (await pg.$('#screen')).screenshot({path:`shots/lv_${name}.png`});
  console.log(`${name.padEnd(8)} pos 0x${pos.toString(16)} scene=${String(r.scene).padEnd(12)} glErr=${gl} ${ms}ms`);
}
console.log('page errors:', errs.length?errs.slice(0,3):'none');
await b.close(); srv.close();
