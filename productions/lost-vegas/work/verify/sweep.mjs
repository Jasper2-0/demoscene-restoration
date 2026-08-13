import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const pg=await b.newPage(); await pg.setViewport({width:1400,height:900});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/tools/fontmatch.html`,{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,700));
const A=process.argv.slice(2);
if(A.length) await pg.evaluate(([t,cx,cy,cw,ch,tx,ty])=>{
  document.getElementById('txt').value=t;
  document.getElementById('cx').value=cx; document.getElementById('cy').value=cy;
  document.getElementById('cw').value=cw; document.getElementById('chh').value=ch;
  document.getElementById('tx').value=tx; document.getElementById('ty').value=ty;
  document.getElementById('cx').dispatchEvent(new Event('input'));
}, A);
await pg.evaluate(()=>document.getElementById('sweep').click());
await new Promise(r=>setTimeout(r,2500));
const top = await pg.evaluate(()=>[...document.querySelectorAll('#rank tr')].slice(0,8)
  .map(tr=>[...tr.children].map(td=>td.textContent).join('  ')));
console.log(`top matches for "${process.argv[2]||'legend'}":`);
top.forEach((t,i)=>console.log(` ${i+1}. ${t}`));
console.log('errors:', errs.length?errs.slice(0,2):'none');
await pg.screenshot({path:'/tmp/fontmatch.png'});
await b.close(); srv.close();
