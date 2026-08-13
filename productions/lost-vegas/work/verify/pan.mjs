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
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/tools/font.html`,{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,600));
await pg.evaluate(()=>document.getElementById('trace').click());
await new Promise(r=>setTimeout(r,300));

const SIG=`(dx,dy)=>{const c=document.getElementById('edit'),d=c.getContext('2d')
 .getImageData(0,0,c.width,c.height).data,o=[];
 for(let y=60;y<c.height-60;y+=11)for(let x=60;x<c.width-60;x+=11){
   const X=x+dx,Y=y+dy; if(X<0||Y<0||X>=c.width||Y>=c.height){o.push(-1);continue;}
   const i=(Y*c.width+X)*4; o.push(d[i]+d[i+1]+d[i+2]); } return o;}`;
const sig=(dx=0,dy=0)=>pg.evaluate(`(${SIG})(${dx},${dy})`);
const match=(a,c)=>{let n=0;for(let i=0;i<a.length;i++) if(Math.abs(a[i]-c[i])<=6) n++; return n/a.length;};
const pts=()=>pg.$eval('#stat',e=>+(e.textContent.match(/(\d+) pts/)?.[1]??-1));
const cur=()=>pg.$eval('#edit',e=>getComputedStyle(e).cursor);
const box=await pg.$eval('#edit',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}});
const cx=Math.round(box.x+box.w/2), cy=Math.round(box.y+box.h/2);
const D=[120,40];

// --- 1. the view actually pans, and the drag draws nothing ------------------
const before=await sig(), p0=await pts(), cur0=await cur();
await pg.keyboard.down('Space');            const cur1=await cur();
await pg.mouse.move(cx,cy); await pg.mouse.down(); const cur2=await cur();
await pg.mouse.move(cx+D[0],cy+D[1],{steps:6}); await pg.mouse.up();
await pg.keyboard.up('Space');              const cur3=await cur();
const shifted=await sig(D[0],D[1]), unshifted=await sig();
console.log(`cursor  idle ${cur0} · space ${cur1} · dragging ${cur2} · released ${cur3}`);
console.log(`view shifted by (${D})  match ${(match(before,shifted)*100).toFixed(1)}% (was ${(match(before,unshifted)*100).toFixed(1)}% before)`);
console.log(`no stray point drawn while panning: ${await pts()===p0}`);

// --- 2. a click while panned lands where it looks like it lands -------------
//     draw at S with no pan, undo, pan by D, draw at S+D, unpan: identical.
await pg.keyboard.press('0');
await pg.mouse.click(cx-80,cy-30); const withA=await sig(); const pA=await pts();
await pg.keyboard.press('Backspace');
await pg.keyboard.down('Space'); await pg.mouse.move(cx,cy); await pg.mouse.down();
await pg.mouse.move(cx+D[0],cy+D[1],{steps:4}); await pg.mouse.up(); await pg.keyboard.up('Space');
await pg.mouse.click(cx-80+D[0],cy-30+D[1]); const pB=await pts();
await pg.keyboard.press('0'); const withB=await sig();
console.log(`click honours the pan: ${(match(withA,withB)*100).toFixed(1)}% identical, pts ${pA} vs ${pB}`);
await pg.keyboard.press('Backspace');

// --- 3. '0' recentres, and space can't get stuck ---------------------------
await pg.keyboard.down('Space'); await pg.mouse.move(cx,cy); await pg.mouse.down();
await pg.mouse.move(cx+200,cy,{steps:4}); await pg.mouse.up(); await pg.keyboard.up('Space');
const panned=await sig(); await pg.keyboard.press('0'); const home=await sig();
console.log(`'0' recentres: ${(match(before,home)*100).toFixed(1)}% back to start (panned was ${(match(before,panned)*100).toFixed(1)}%)`);
await pg.keyboard.down('Space'); await pg.evaluate(()=>dispatchEvent(new Event('blur')));
console.log(`blur releases a held space (cursor back to ${await cur()}): ${await cur()!=='grab'}`);
await pg.keyboard.up('Space');

// --- 4. drawing still works, and middle-drag pans too ----------------------
const p1=await pts(); await pg.mouse.click(cx+30,cy+10);
console.log(`drawing still works afterwards: ${await pts()-p1===1}`);
await pg.keyboard.press('Backspace');
const m0=await sig();
await pg.mouse.move(cx,cy); await pg.mouse.down({button:'middle'});
await pg.mouse.move(cx-60,cy,{steps:4}); await pg.mouse.up({button:'middle'});
console.log(`middle-drag pans: ${(match(m0,await sig(-60,0))*100).toFixed(1)}% match`);

console.log('errors:', errs.length?errs.slice(0,3):'none');
await b.close(); srv.close();
