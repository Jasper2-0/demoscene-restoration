import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=path.resolve(fileURLToPath(import.meta.url),'../../..');
const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.json':'application/json'};
const srv=http.createServer((q,r)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,''));
 try{const d=fs.readFileSync(p);r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const port=srv.address().port;
fs.writeFileSync(path.join(root,'web/test/_bench.html'), `<!doctype html><canvas id=c width=640 height=480></canvas><script type=module>
import { MiniD3D7, D3DMatrix } from '../js/minid3d7.js';
const d3d = new MiniD3D7(document.getElementById('c'));
const gl = d3d.gl;
// one small triangle, FVF 0x242 (XYZ|DIFFUSE|TEX2) = 8 floats
const v = new Float32Array(3*8);
for (let i=0;i<3;i++){ v[i*8]=Math.cos(i)*10; v[i*8+1]=Math.sin(i)*10; v[i*8+2]=50;
  new Uint32Array(v.buffer)[i*8+3]=0xffffffff; }
const idx = new Uint16Array([0,1,2]);
const world = D3DMatrix.identity ? D3DMatrix.identity() : new D3DMatrix();
d3d.SetTransform(1, new D3DMatrix()); d3d.SetTransform(2, new D3DMatrix());
d3d.SetTransform(3, D3DMatrix.perspectiveFovLH ? D3DMatrix.perspectiveFovLH(1.57,1.333,1,1000) : new D3DMatrix());
const N=2000;
function benchShim(){
  d3d.BeginScene();
  for(let i=0;i<N;i++){ d3d.SetTransform(1, world); d3d.DrawIndexedPrimitive(4, 0x242, v, 3, idx, 3); }
  d3d.EndScene();
}
// raw WebGL2 equivalent: same buffer uploads + one uniform + drawElements
const prog = gl.getParameter(gl.CURRENT_PROGRAM);
const vbo=gl.createBuffer(), ibo=gl.createBuffer();
function benchRaw(){
  for(let i=0;i<N;i++){
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo); gl.bufferData(gl.ARRAY_BUFFER,v,gl.STREAM_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STREAM_DRAW);
    gl.drawElements(gl.TRIANGLES,3,gl.UNSIGNED_SHORT,0);
  }
}
function timed(fn){ benchShim; gl.finish(); const t=performance.now(); fn(); gl.finish(); return performance.now()-t; }
benchShim(); benchRaw(); gl.finish();          // warm-up
const shim = Math.min(timed(benchShim), timed(benchShim));
const raw  = Math.min(timed(benchRaw),  timed(benchRaw));
window.__bench = { N, shimTotalMs: shim, shimPerCallUs: shim*1000/N,
                   rawTotalMs: raw, rawPerCallUs: raw*1000/N, ratio: shim/raw };
</script>`);
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-angle=metal']});
const pg=await b.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(`http://127.0.0.1:${port}/web/test/_bench.html`,{waitUntil:'networkidle0'});
const ok = await pg.waitForFunction('window.__bench!==undefined',{timeout:30000}).then(()=>1).catch(()=>0);
console.log(ok ? JSON.stringify(await pg.evaluate(()=>window.__bench),null,1) : 'bench failed: '+errs.slice(0,2));
await b.close(); srv.close(); fs.unlinkSync(path.join(root,'web/test/_bench.html'));
