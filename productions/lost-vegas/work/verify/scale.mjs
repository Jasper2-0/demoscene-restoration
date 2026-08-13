import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal']});
for (const [w,h,tag] of [[640,480,'small'],[1280,960,'big']]) {
  const pg=await b.newPage(); await pg.setViewport({width:w,height:h,deviceScaleFactor:1});
  await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html?pos=0x1000`,{waitUntil:'networkidle0'});
  await pg.waitForFunction('window.__lvReady===true',{timeout:20000});
  const info = await pg.evaluate(()=>{ const c=document.getElementById('screen');
    for(let q=0xf00;q<0x1000;q+=8) window.__lvRender(q);
    window.__lvRender(0x1000);
    return {cw:c.width, ch:c.height, styleW:c.style.width}; });
  await (await pg.$('#screen')).screenshot({path:`/tmp/scale_${tag}.png`});
  console.log(tag, JSON.stringify(info));
  await pg.close();
}
await b.close(); srv.close();
