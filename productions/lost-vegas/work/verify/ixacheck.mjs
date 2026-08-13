// Public ixalance build: serves dist/ixalance the way Pages does (case-sensitive)
// and checks the two things that define this build — Boost absent, Square hidden
// until you type its name — plus that the runtime still actually boots.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT=path.resolve(fileURLToPath(import.meta.url),'../../../../../dist/ixalance-js');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.ixa':'application/octet-stream','.md':'text/plain','.txt':'text/plain','.sha256':'text/plain'};
function strictResolve(root, rel){
  let cur=root;
  for(const seg of rel.split('/').filter(Boolean)){
    let e; try{ e=fs.readdirSync(cur); }catch{ return null; }
    if(!e.includes(seg)) return null;
    cur=path.join(cur,seg);
  }
  return cur;
}
const misses=[];
// paths this harness probes on purpose to prove Boost is gone — a 404 here is
// the passing result, so they must not be counted as build failures
const PROBES=['sdk/ixalance-sdk/ports/boost/boost.ixa','data/boost.ixa'];
const srv=http.createServer((q,r)=>{
  const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
  const f=strictResolve(ROOT,rel);
  if(!f||!fs.statSync(f).isFile()){ if(!PROBES.includes(rel)) misses.push(rel); r.writeHead(404); r.end(); return; }
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
  r.end(fs.readFileSync(f));
});
await new Promise(r=>srv.listen(0,r));
const BASE=`http://127.0.0.1:${srv.address().port}`;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new',args:['--autoplay-policy=no-user-gesture-required']});
const pg=await b.newPage(); await pg.setViewport({width:900,height:700});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
pg.on('response',r=>{ const u=r.url().replace(BASE,'');
  if(r.status()>=400 && !u.endsWith('favicon.ico') && !PROBES.some(p=>u.endsWith(p))) errs.push(`HTTP ${r.status()} ${u}`); });
await pg.goto(`${BASE}/index.html`,{waitUntil:'networkidle0'});
await pg.evaluate(()=>new Promise(r=>setTimeout(r,700)));   // let any HEAD probes settle

const opts=()=>pg.$$eval('#prod option',o=>o.map(x=>x.textContent.trim()));
const before=await opts();
console.log('selector on load:');
before.forEach(o=>console.log('   ', o));
console.log(`  exactly the three TBL productions: ${before.length===3 && !before.some(o=>/boost|square/i.test(o))}`);

// Boost must not be served at all, under any of its paths
const boost=await pg.evaluate(async(base)=>{
  const r=await Promise.all(['./sdk/ixalance-sdk/ports/boost/boost.ixa','./data/boost.ixa']
    .map(p=>fetch(p,{method:'HEAD'}).then(x=>x.status).catch(()=>0)));
  return r;},BASE);
console.log(`  boost.ixa fetch status: ${boost.join(', ')} (must be 404/0)`);

// Square: hidden, then revealed by typing its name on the page
await pg.evaluate(()=>document.body.focus());
await pg.keyboard.type('square', {delay:30});
await pg.evaluate(()=>new Promise(r=>setTimeout(r,500)));
const after=await opts();
const sq=after.find(o=>/square/i.test(o));
console.log(`  after typing "square": ${after.length} options, revealed: ${sq||'NONE'}`);
console.log(`  it is preselected: ${(await pg.$eval('#prod',s=>s.value)).includes('square.ixa')}`);

// typing it again must not duplicate the entry
await pg.keyboard.type('square', {delay:20});
await pg.evaluate(()=>new Promise(r=>setTimeout(r,300)));
console.log(`  no duplicate on retype: ${(await opts()).length===after.length}`);

// and the runtime still boots: pick a TBL production and start the worker
await pg.select('#prod','./data/stash.ixa');
await pg.click('#start');
const booted=await pg.waitForFunction(
  "document.getElementById('log').textContent.includes('runtime:')",{timeout:60000})
  .then(()=>true).catch(()=>false);
const logTxt=await pg.$eval('#log',e=>e.textContent);
const firstLines=logTxt.split('\n').slice(0,1).join(' ').slice(0,0);
console.log(`  worker + modules boot: ${booted}`);
console.log(`  runtime line: ${(logTxt.match(/runtime:[^\n]*/)||['(none)'])[0].trim()}`);
console.log(`  log never says "boost": ${!/boost/i.test(logTxt)}`);
console.log(`case-sensitive 404s: ${[...new Set(misses)].filter(m=>m!=='favicon.ico').join(', ')||'none'}`);
console.log('page errors:', errs.length?[...new Set(errs)].slice(0,3):'none');
await b.close(); srv.close();
