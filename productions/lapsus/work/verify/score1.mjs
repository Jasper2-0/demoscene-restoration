// score1.mjs — score ONE instant, with arbitrary renderer query params.
//
//   node productions/lapsus/work/verify/score1.mjs turska 1.35 xcull=1
//
// sweep.mjs drives the page through ?inspect=1 and forwards nothing, so a
// one-variable experiment cannot be run through it — three "different" runs
// came back byte-identical before I noticed. This is the knob-turning tool.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, fromRepo } from '../../../../tools/harness/index.mjs';
const W=640,H=480,N=W*H;
const part=process.argv[2], local=parseFloat(process.argv[3]);
const extra=process.argv.slice(4).filter((a)=>a.includes('='));
const prod=JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'),'utf8'));
const cap=prod.captures[0], MKV=fromRepo(cap.path);
const offsets=cap.visualTrackOffsetsMs??cap.trackOffsetsMs;
const PH={1:{off:offsets['data/mjuusik/1.mp3']/1000,p:{empt:1,flu2:14,pene:23,krediili:31,silli:47,syrjakyla:55,paleksi:64.531,pehko:74.062,hulluolli:83.593}},
          2:{off:offsets['data/mjuusik/2.mp3']/1000,p:{kuubiotekniikka:0,diskojea:13.8,kartonki:22.3,hairball:29.7,higherbiing:36.7,viherio:50.7,morko:61.16,turska:64.7,rad_out:72.2,kaivoalieni:86.2,made:99.7,hedi:105.2}}};
const ph = PH[1].p[part]!==undefined?PH[1]:PH[2];
const capture = ph.off + ph.p[part] + local;
const TMP=path.join(process.env.TMPDIR??'/tmp','lapsus-score1'); fs.mkdirSync(TMP,{recursive:true});
const gray=(p,o)=>{execFileSync('ffmpeg',['-v','error','-y','-i',p,'-vf',`scale=${W}:${H},format=gray`,'-f','rawvideo',o]);return fs.readFileSync(o);};
const stats=(a,b)=>{let ma=0,mb=0;for(let i=0;i<N;i++){ma+=a[i];mb+=b[i];}ma/=N;mb/=N;
  let d=0,sa=0,sb=0,se=0;for(let i=0;i<N;i++){const u=a[i]-ma,v=b[i]-mb;d+=u*v;sa+=u*u;sb+=v*v;se+=(a[i]-b[i])**2;}
  const va=sa/N,vb=sb/N;
  const r=(va<0.25&&vb<0.25)?(Math.abs(ma-mb)<=1?1:0):d/Math.sqrt(sa*sb||1);
  return {r, rmse:Math.sqrt(se/N), meanOurs:ma, meanRef:mb};};
await withPage({root:'productions/lapsus',path:'/web/index.html',
  query:`?scene=${part}&t=${local}${extra.length?'&'+extra.join('&'):''}`,
  width:W,height:H,viewport:{width:W,height:H}}, async ({page})=>{
  await page.waitForFunction('window.__lapsusReady === true',{timeout:60000});
  const e=await page.evaluate(()=>window.__lapsusError??null); if(e) throw new Error(e);
  fs.writeFileSync(`${TMP}/o.png`, await shootCanvas(page,{canvasSelector:'#c',warmupFrames:2}));
});
execFileSync('ffmpeg',['-v','error','-y','-ss',String(capture),'-i',MKV,'-frames:v','1',`${TMP}/r.png`]);
const s=stats(gray(`${TMP}/o.png`,`${TMP}/o.raw`), gray(`${TMP}/r.png`,`${TMP}/r.raw`));
console.log(`  ${part} @${local}  ${extra.join(' ')||'(baseline)'}`);
console.log(`    r ${s.r.toFixed(4)}   RMSE ${s.rmse.toFixed(2)}   luma ${s.meanOurs.toFixed(1)} vs ${s.meanRef.toFixed(1)}`);
