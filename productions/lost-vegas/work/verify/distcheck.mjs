import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root = path.resolve(fileURLToPath(import.meta.url),'../../../../../dist/lost-vegas-webgl');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream','.md':'text/plain'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const PORT=srv.address().port;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal']});
// every scene, on both quality paths, straight out of the shipped folder
// one position inside every timeline entry, including both sceneE instances
const SCENES=[0x0,0x100,0x400,0x700,0x900,0xb00,0xd00,0x1000,0x1300,0x1500,0x1900];
for (const q of ['', '&quality=original']) {
  const pg=await b.newPage(); await pg.setViewport({width:700,height:560});
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  pg.on('requestfailed',r=>errs.push('REQFAIL '+r.url().replace(`http://127.0.0.1:${PORT}`,'')));
  pg.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url().replace(`http://127.0.0.1:${PORT}`,''));});
  await pg.goto(`http://127.0.0.1:${PORT}/index.html?pos=0${q}`,{waitUntil:'networkidle0'});
  const ready=await pg.waitForFunction('window.__lvReady===true',{timeout:20000}).then(()=>true).catch(()=>false);
  const named=[];
  if(ready) for(const p of SCENES){
    // Render AND read back in one task: the context is preserveDrawingBuffer:false,
    // so a composite between two evaluate() calls wipes the buffer. Warm up first —
    // several scenes fade in from their entry position and a cold jump lands on black.
    const r=await pg.evaluate(x=>{
      for(let q=Math.max(0,x-0x120); q<x; q+=0x8) window.__lvRender(q);
      const res=window.__lvRender(x);
      const c=document.getElementById('screen'), g=c.getContext('webgl2');
      const px=new Uint8Array(c.width*c.height*4);
      g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,px);
      let n=0; for(let i=0;i<px.length;i+=4) if(px[i]+px[i+1]+px[i+2]>24) n++;
      return {scene:res.scene, ink:n/(c.width*c.height)};
    },p).catch(e=>({scene:'THREW: '+e.message, ink:0}));
    named.push(`${r.scene??'null'}${r.ink>0.001?'':'(BLANK)'}`);
  }
  console.log(`${q||'remastered '.padEnd(18)}`.padEnd(18), ready?'boots':'FAILED TO BOOT');
  console.log('   scenes:', named.join(' · '));
  console.log('   errors:', errs.length?[...new Set(errs)].slice(0,4):'none');
  await pg.close();
}
await b.close(); srv.close();
