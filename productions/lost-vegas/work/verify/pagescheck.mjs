// Serves a dist folder the way GitHub Pages does — CASE-SENSITIVE — and drives
// each production through its whole timeline, logging every request that misses.
// macOS's filesystem is case-insensitive, so a wrong-case reference passes every
// local test and only 404s once deployed. This is the check that catches it.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const DIST=process.argv[2]||path.resolve(fileURLToPath(import.meta.url),'../../../../../dist');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.png':'image/png','.xm':'application/octet-stream','.m4a':'audio/mp4',
  '.as1':'application/octet-stream','.md':'text/plain'};

/** resolve a path only if every segment matches a real dir entry exactly */
function strictResolve(root, rel){
  let cur=root;
  for(const seg of rel.split('/').filter(Boolean)){
    let entries; try{ entries=fs.readdirSync(cur); }catch{ return null; }
    if(!entries.includes(seg)) return null;         // case-sensitive membership
    cur=path.join(cur,seg);
  }
  return cur;
}
const PROJECTS=[
  { name:'lost vegas', dir:'lost-vegas-webgl', ready:'__lvReady',
    boot:(base,q)=>`${base}/index.html?pos=0${q}`,
    sweep:'[0x0,0x100,0x400,0x700,0x900,0xb00,0xd00,0x1000,0x1300,0x1500,0x1900].map(p=>window.__lvRender(p).scene)',
    variants:['','&quality=original'] },
  { name:'cookie thing', dir:'ptct-webgl', ready:'__ptctReady',
    boot:(base,q)=>`${base}/index.html?t=0${q}`,
    sweep:'[0,10,25,40,55,70,85,100,115,130,145,160].map(t=>{window.__ptctSeek(t);return t})',
    variants:['','&quality=original&aspect=classic'] },
];
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new',args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required']});
let bad=0;
for(const proj of PROJECTS){
  const root=path.join(DIST,proj.dir);
  const misses=[];
  const srv=http.createServer((q,r)=>{
    const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
    const f=strictResolve(root,rel);
    if(!f||!fs.statSync(f).isFile()){ misses.push(rel); r.writeHead(404); r.end(); return; }
    r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
    r.end(fs.readFileSync(f));
  });
  await new Promise(r=>srv.listen(0,r));
  const base=`http://127.0.0.1:${srv.address().port}`;
  for(const v of proj.variants){
    const pg=await b.newPage(); await pg.setViewport({width:700,height:560});
    const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto(proj.boot(base,v),{waitUntil:'networkidle0'});
    const ok=await pg.waitForFunction(`window.${proj.ready}===true`,{timeout:25000}).then(()=>true).catch(()=>false);
    let n=0; if(ok) n=(await pg.evaluate(proj.sweep).catch(()=>[])).length;
    const label=`${proj.name} ${v||'(default)'}`.padEnd(42);
    console.log(`${label} boot:${ok?'ok ':'FAIL'} frames:${n}  errors:${errs.length?errs[0]:'none'}`);
    if(!ok||errs.length) bad++;
    await pg.close();
  }
  const uniq=[...new Set(misses)].filter(m=>m!=='favicon.ico');
  console.log(`   case-sensitive 404s: ${uniq.length?uniq.join(', '):'none'}`);
  if(uniq.length) bad++;
  srv.close();
}
console.log(bad?`\nFAILED (${bad})`:'\nboth productions serve clean under case-sensitive hosting');
await b.close();
