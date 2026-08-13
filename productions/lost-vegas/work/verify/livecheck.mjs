// Runs the real productions from the real Pages URLs. Local checks proved the
// files are correct; this proves GitHub's hosting serves them in a way the
// runtimes accept — MIME types for .ixa/.xm/.as1 above all.
import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless:'new',args:['--use-angle=metal','--autoplay-policy=no-user-gesture-required']});
const fail=[];
async function page(){ const p=await b.newPage(); await p.setViewport({width:800,height:600});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('response',r=>{ if(r.status()>=400 && !r.url().endsWith('favicon.ico')) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  return [p,errs]; }

for (const [name,url,ready,sweep] of [
  ['lost-vegas-webgl','https://jasper2-0.github.io/lost-vegas-webgl/index.html?pos=0','__lvReady',
   '[0x0,0x100,0x400,0x700,0x900,0xb00,0xd00,0x1000,0x1300,0x1500,0x1900].map(p=>window.__lvRender(p).scene)'],
  ['ptct-webgl','https://jasper2-0.github.io/ptct-webgl/index.html?t=0','__ptctReady',
   '[0,20,45,70,95,120,145,160].map(t=>{window.__ptctSeek(t);return t})'],
]) {
  const [p,errs]=await page();
  await p.goto(url,{waitUntil:'networkidle0',timeout:60000});
  const ok=await p.waitForFunction(`window.${ready}===true`,{timeout:45000}).then(()=>true).catch(()=>false);
  const n=ok?(await p.evaluate(sweep).catch(()=>[])).length:0;
  console.log(`${name.padEnd(18)} boot:${ok?'ok ':'FAIL'} frames:${n}  errors:${errs.length?errs[0]:'none'}`);
  if(!ok||!n||errs.length) fail.push(name);
  await p.close();
}

{ const [p,errs]=await page();
  await p.goto('https://jasper2-0.github.io/ixalance-js/',{waitUntil:'networkidle0',timeout:60000});
  await p.evaluate(()=>new Promise(r=>setTimeout(r,900)));
  const opts=()=>p.$$eval('#prod option',o=>o.map(x=>x.textContent.trim()));
  const before=await opts();
  const clean = before.length===3 && !before.some(o=>/boost|square/i.test(o));
  await p.evaluate(()=>document.body.focus());
  await p.keyboard.type('square',{delay:30});
  await p.evaluate(()=>new Promise(r=>setTimeout(r,600)));
  const revealed=(await opts()).some(o=>/square/i.test(o));
  await p.select('#prod','./data/stash.ixa');
  await p.click('#start');
  const booted=await p.waitForFunction("document.getElementById('log').textContent.includes('runtime:')",{timeout:90000})
    .then(()=>true).catch(()=>false);
  const log=await p.$eval('#log',e=>e.textContent);
  console.log(`ixalance-js        selector:${before.length} clean:${clean} egg:${revealed} worker:${booted} noBoost:${!/boost/i.test(log)}  errors:${errs.length?errs[0]:'none'}`);
  if(!clean||!revealed||!booted||errs.length) fail.push('ixalance-js');
  await p.close(); }

console.log(fail.length?`\nFAILED: ${fail.join(', ')}`:'\nall three live sites verified');
await b.close();
