import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root = path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal']});
const pg=await b.newPage(); await pg.setViewport({width:700,height:560});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('requestfailed',r=>errs.push('REQFAIL '+r.url()));pg.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url());});
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html?pos=0x100`,{waitUntil:'networkidle0'});
const ready = await pg.waitForFunction('window.__lvReady===true',{timeout:20000}).then(()=>true).catch(()=>false);
console.log('runtime boots:', ready);
if (ready) for (const p of [0x100,0x400,0xd00,0x1500,0x1900]) {
  const r = await pg.evaluate(x=>window.__lvRender(x), p).catch(e=>({scene:'THREW: '+e.message}));
  console.log(`  pos 0x${p.toString(16).padStart(4,'0')} -> ${r.scene}`);
}
console.log('page errors:', errs.length ? errs.slice(0,3) : 'none');
await b.close(); srv.close();
