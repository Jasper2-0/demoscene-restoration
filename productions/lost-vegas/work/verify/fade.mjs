// Sample the actual rendered colour through the finale's outro wash.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.xm':'application/octet-stream'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:false,args:['--use-angle=metal','--window-size=700,600']});
const pg=await b.newPage(); await pg.setViewport({width:640,height:480});
await pg.goto(`http://127.0.0.1:${srv.address().port}/web/index.html?pos=0x1900`,{waitUntil:'networkidle0'});
await pg.waitForFunction('window.__lvReady===true',{timeout:20000});
// step finely through the wash: pos 0x1900 -> 0x1a20, 8 sub-steps per row
const out = await pg.evaluate(()=>{
  const gl=document.getElementById('screen').getContext('webgl2');
  const W=64,H=48; const buf=new Uint8Array(W*H*4); const res=[];
  const absRow=(p)=>{const pat=p>=0x400?(p>>8)-2:(p>>8); return pat*64+(p&0xff);};
  for(let r=0;r<96;r++){
    for(let k=0;k<8;k++){
      const row=r%64, pat=0x19+Math.floor(r/64);
      const pos=((pat<<8)|row);
      window.__lvRender(pos, undefined, k/8);
      gl.readPixels(288,216,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buf);
      let sr=0,sg=0,sb=0; for(let i=0;i<buf.length;i+=4){sr+=buf[i];sg+=buf[i+1];sb+=buf[i+2];}
      const n=buf.length/4;
      res.push([absRow(pos)+k/8, +(sr/n).toFixed(3), +(sg/n).toFixed(3), +(sb/n).toFixed(3)]);
    }
  }
  return res;
});
// look for repeated identical colours = stepping
let runs=[], cur=1;
for(let i=1;i<out.length;i++){
  const same = Math.abs(out[i][1]-out[i-1][1])<0.005 && Math.abs(out[i][2]-out[i-1][2])<0.005;
  if(same) cur++; else { runs.push(cur); cur=1; }
}
runs.push(cur);
const long = runs.filter(r=>r>=8).length;
console.log(`samples ${out.length}, distinct-colour runs ${runs.length}, runs >=8 samples (a whole row frozen): ${long}`);
console.log('max run length:', Math.max(...runs));
// dense look at the two fade windows: to-blue (first 2s) and to-black (10-11.5s)
const win=(a,b,label)=>{const seg=out.filter(x=>x[0]>=1472+a&&x[0]<=1472+b);
  let rep=0; for(let i=1;i<seg.length;i++) if(Math.abs(seg[i][1]-seg[i-1][1])<0.005) rep++;
  console.log(`${label}: ${seg.length} samples, ${rep} repeated (${(100*rep/(seg.length-1)).toFixed(0)}% frozen)`);
  console.log('   ', seg.filter((_,i)=>i%3===0).slice(0,18).map(x=>x[1].toFixed(1)).join(' '));};
win(0,17,'fade TO BLUE (rows 0-17)');
win(80,96,'fade TO BLACK (rows 80-96)');
await b.close(); srv.close();
