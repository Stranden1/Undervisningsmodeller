// Revisjonsverktøy, ikke en del av modellene. Krever allerede installert Playwright.
// Kjør: node docs/revisjon-2026-10-29/nettleserproving.mjs <absolutt sti til playwright/index.mjs>
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { lagEnkeltfil } from '../../verktoy/lag-enkeltfil.js';

const { chromium } = await import(pathToFileURL(resolve(process.argv[2])).href);
const dir = fileURLToPath(new URL('.', import.meta.url));
const base = 'http://127.0.0.1:8000';
const names = ['varmeledning-partikler','overflate-og-volum','energi-som-sprer-seg'];
const results = { date: '2026-10-29', environment: 'Windows; separat Chrome uten utvidelser; ingen fysisk mobil/iPad', checks: [], console: [], externalRequests: [] };
const browser = await chromium.launch({channel:'chrome',headless:true});
results.browser = browser.version();
await mkdir(dir + 'enkeltfiler', {recursive:true});
const context = await browser.newContext({viewport:{width:1440,height:1000},locale:'nb-NO'});
const page = await context.newPage();
page.on('pageerror', e => results.console.push({url:page.url(),type:'pageerror',message:e.message}));
page.on('console', e => { if(e.type()==='error') results.console.push({url:page.url(),type:'console',message:e.text()}); });
page.on('request', r => { if(/^https?:/.test(r.url()) && !r.url().startsWith(base)) results.externalRequests.push(r.url()); });
async function check(name, fn) {
  try { const evidence=await fn(); results.checks.push({name,status:'pass',evidence}); console.log('PASS',name); }
  catch(e) { results.checks.push({name,status:'fail',error:e.message}); console.log('FAIL',name,e.message); }
  await writeFile(dir+'nettleserresultater.json',JSON.stringify(results,null,2));
}
const state=()=>page.evaluate(()=>window.undervisningsmodell.hentTilstand());
const go=async(name)=>{await page.goto(`${base}/modeller/naturfag/${name}/`);await page.waitForFunction(()=>!!window.undervisningsmodell);};
const shot=async(name,fullPage=false)=>page.screenshot({path:dir+name+'.png',fullPage});
const guess=async(name)=>{await page.getByRole('radio',{name,exact:true}).check();await page.getByRole('button',{name:'Lås gjetningen',exact:true}).click();};

await check('Katalog: alle modell-, veilednings- og nedlastingslenker',async()=>{
 await page.goto(base);const links=await page.locator('a').evaluateAll(as=>as.map(a=>a.href));
 const statuses=[];for(const url of links){const response=await context.request.get(url);statuses.push({url,status:response.status()});assert.equal(response.status(),200,url);}return statuses;
});

for(const name of names) {
 await go(name);
 await check(`${name}: start sperret før gjetning`,async()=>{assert.equal(await page.getByRole('button',{name:'Start',exact:true}).isEnabled(),false);return state();});
 for(const [label,width,height] of [['desktop',1440,1000],['nettbrett',768,1024],['mobil',390,844],['smal',320,568]]) {
  await page.setViewportSize({width,height}); await page.evaluate(()=>window.scrollTo(0,0));
  await shot(`${name}-${label}`);
  await check(`${name}: bredde ${width}`,async()=>{
   const sizes=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('button')].filter(e=>e.offsetWidth).map(e=>({text:e.textContent.trim(),top:e.getBoundingClientRect().top,height:e.getBoundingClientRect().height})),canvas:[...document.querySelectorAll('canvas')].filter(e=>e.offsetWidth).map(e=>({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
   assert.ok(sizes.scrollWidth<=sizes.width,JSON.stringify(sizes));return sizes;
  });
 }
 await page.setViewportSize({width:1440,height:1000});
 await check(`${name}: mindre bevegelse ved stillstand`,async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const canvas=page.locator('canvas:visible').first();const a=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(250);const b=await canvas.evaluate(c=>c.toDataURL());
  const evidence={prefersReducedMotion:await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),canvasChangesWhileNotRunning:a!==b};
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Målingen registreres, ikke brukt som automatisk WCAG-dom.
  return evidence;
 });
}

await go(names[0]);
await check('Varmeledning: alle materialvalg og Mer',async()=>{
 const values=['kobber','aluminium','rustfritt_stal','glass','tre','isopor'];
 const evidence=[];
 for(const value of values){await page.locator('#tapaa-venstre').selectOption(value);await page.locator('#tapaa-hoyre').selectOption(value);evidence.push(await state());}
 await page.locator('#panel-tapaa summary').filter({hasText:'Mer'}).click();
 await page.locator('#tapaa-sakte').check();await page.locator('#tapaa-sakte').uncheck();
 await page.locator('#tapaa-venstre').selectOption('aluminium');await page.locator('#tapaa-hoyre').selectOption('tre');
 await page.locator('#panel-tapaa .forenkler summary').click();return evidence;
});
await check('Varmeledning: tastaturgjetning, start, pause, fortsett og slutt',async()=>{
 await page.getByRole('radio',{name:'Høyre: Tre (furu)',exact:true}).press('Space');
 await page.getByRole('button',{name:'Lås gjetningen',exact:true}).press('Enter');
 const focus=await page.evaluate(()=>document.activeElement.textContent);
 await page.locator('#tapaa-start').press('Enter');await page.waitForTimeout(700);await page.locator('#tapaa-start').click();
 const a=await state();await page.waitForTimeout(350);const b=await state();assert.equal(a.taPaa.tid,b.taPaa.tid);
 await page.locator('#tapaa-start').click();await page.waitForFunction(()=>document.querySelector('#tapaa-start').textContent==='Ferdig',null,{timeout:55000});
 await shot('varmeledning-resultat',true);return {focus,pause:a,result:await state(),text:await page.locator('#tapaa-forutsi').innerText()};
});
await check('Varmeledning: nullstill og like materialer',async()=>{
 await page.locator('#tapaa-nullstill').click();assert.equal((await state()).taPaa.tid,0);assert.equal(await page.locator('#tapaa-start').isEnabled(),false);
 await page.locator('#tapaa-venstre').selectOption('kobber');await page.locator('#tapaa-hoyre').selectOption('kobber');await guess('De kjennes like kalde');await page.locator('#tapaa-start').click();
 await page.waitForFunction(()=>window.undervisningsmodell.hentTilstand().taPaa.kaldest!==null);const result=await state();assert.equal(result.taPaa.kaldest,'like');return result;
});
await check('Varmeledning: tastaturfaner og isbitkontroller',async()=>{
 await page.getByRole('tab',{name:'Ta på',exact:true}).press('ArrowRight');assert.equal((await state()).fane,'isbit');assert.equal((await state()).taPaa.kjorer,false);
 await page.locator('#panel-isbit .mer summary').click();
 const options=await page.locator('#isbit-fart option').evaluateAll(os=>os.map(o=>o.value));for(const v of options)await page.locator('#isbit-fart').selectOption(v);
 await guess('Isbiten på tre');await page.locator('#isbit-start').click();await page.waitForTimeout(8000);await page.locator('#isbit-start').click();const result=await state();
 await shot('isbit-underveis',true);await page.waitForTimeout(300);assert.equal((await state()).isbit.tid,result.isbit.tid);
 await page.locator('#isbit-start').click();await page.waitForTimeout(300);await page.locator('#isbit-nullstill').click();const reset=await state();assert.equal(reset.isbit.tid,0);
 return {options,result,reset,note:'Isbit prøvd underveis, full smelting av begge ikke avventet her.'};
});

await go(names[1]);
await check('Snø: alle oppdelinger, varmekilder og fart',async()=>{
 const choices=[];
 for(let i=0;i<5;i++){await page.locator('#oppdeling').fill(String(i));choices.push({state:await state(),text:await page.locator('#tall-hoved').innerText()});}
 await page.locator('#sol').check();await page.locator('#underlag').check();await page.locator('#sol').uncheck();await page.locator('#underlag').uncheck();
 await page.locator('.mer summary').click();const options=await page.locator('#fart option').evaluateAll(os=>os.map(o=>o.value));for(const v of options)await page.locator('#fart').selectOption(v);
 await page.locator('#fart').selectOption('3600');await page.locator('#oppdeling').fill('0');return {choices,options};
});
await check('Snø: automatisk observasjonspause, fortsett, nullstill',async()=>{
 await guess('Midt på sidene');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#start').textContent==='Fortsett');const paused=await state();
 await shot('sno-observasjonspause',true);await page.waitForTimeout(250);assert.equal((await state()).forsok.tid,paused.forsok.tid);
 await page.locator('#start').click();await page.waitForTimeout(300);await page.locator('#start').click();await page.locator('#nullstill').click();assert.equal((await state()).forsok.tid,0);return paused;
});
await check('Snø: varmt underlag og merkede celler ved automatisk pause',async()=>{
 await page.locator('#underlag').check();await guess('På hjørnene');await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#start').textContent==='Fortsett');
 await shot('sno-underlag-pause',true);const result={state:await state(),text:await page.locator('#beskrivelse').innerText(),answer:await page.locator('#forutsi').innerText()};await page.locator('#nullstill').click();await page.locator('#underlag').uncheck();return result;
});
await check('Snø: full kjøring, sammenligning og Tøm grafen',async()=>{
 await page.locator('#oppdeling').fill('3');await guess('Kortere tid enn én blokk');await page.locator('#start').click();await page.waitForFunction(()=>window.undervisningsmodell.hentTilstand().ferdig,null,{timeout:55000});
 await page.waitForFunction(()=>!!document.querySelector('#forutsi dl'),null,{timeout:30000});const first=await state();await shot('sno-64-ferdig',true);
 await page.locator('#oppdeling').fill('4');await page.locator('#sol').check();await page.locator('#underlag').check();await guess('Kortere tid enn én blokk');await page.locator('#start').click();await page.waitForFunction(()=>window.undervisningsmodell.hentTilstand().ferdig,null,{timeout:55000});
 const second=await state();await shot('sno-sammenligning',true);await page.locator('#tom-graf').click();const cleared=await state();return {first,second,cleared};
});

await go(names[2]);
await check('Energi: alle vannmengder, temperaturgrenser, fart og joule',async()=>{
 const options=[];for(const value of ['lite','middels','mye']) {await page.locator('#vannmengde').selectOption(value);for(const temp of ['40','90']){await page.locator('#klosst').fill(temp);options.push(await state());}}
 await page.locator('#klosst').press('Home');assert.equal((await state()).klossTemperatur,40);await page.locator('#klosst').press('End');assert.equal((await state()).klossTemperatur,90);
 await page.locator('.mer summary').click();for(const v of ['0.25','1','4'])await page.locator('#fart').selectOption(v);
 await page.locator('#joule').check();assert.equal(await page.locator('#joule-tall').isVisible(),true);await page.locator('#joule').uncheck();
 await page.locator('.forklaring summary').click();await page.locator('.forenkler summary').click();await page.locator('#vannmengde').selectOption('lite');return options;
});
await check('Energi: varm kloss start, pause, fortsett, likevekt',async()=>{
 await guess('Alt sammen');await page.locator('#start').click();await page.waitForTimeout(800);await page.locator('#start').click();const paused=await state();await page.waitForTimeout(250);assert.equal((await state()).tid,paused.tid);
 await page.locator('#start').click();await page.waitForFunction(()=>window.undervisningsmodell.hentTilstand().ferdig,null,{timeout:55000});await shot('energi-kloss-ferdig',true);const end=await state();assert.equal(end.energiIAltProsent,100);assert.equal(end.kanGjoreArbeidProsent,0);
 await page.locator('#nullstill').click();assert.equal((await state()).tid,0);return {paused,end};
});
await check('Energi: dyppekoker, strøm av, likevekt og fanebytte',async()=>{
 await page.getByRole('tab',{name:'Varm kloss',exact:true}).press('End');assert.equal((await state()).fane,'dyppekoker');assert.equal(await page.locator('#klosst').isVisible(),false);
 await guess('Fortsatt 100 % – energien er jo bevart');await page.locator('#start').click();await page.waitForFunction(()=>!window.undervisningsmodell.hentTilstand().stromPaa,null,{timeout:30000});const off=await state();
 await shot('dyppekoker-strom-av',true);await page.waitForFunction(()=>window.undervisningsmodell.hentTilstand().ferdig,null,{timeout:55000});const end=await state();assert.equal(end.energiIAltProsent,100);
 await page.getByRole('tab',{name:'Dyppekoker',exact:true}).press('Home');const back=await state();assert.equal(back.fane,'kloss');assert.equal(back.tid,0);return {off,end,back};
});

for(const name of names) {
 await check(`${name}: eksport samsvarer med kilde`,async()=>{
  const generated=await lagEnkeltfil(name);const existing=await readFile(resolve('eksport',name+'.html'),'utf8');
  await writeFile(dir+'enkeltfiler/'+name+'.html',generated);
  const norm=s=>s.replace(/\(\d{4}-\d\d-\d\d\)/g,'(DATO)').replace(/\r\n/g,'\n');
  return {identicalIgnoringDateAndLineEndings:norm(generated)===norm(existing),generatedBytes:Buffer.byteLength(generated),existingBytes:Buffer.byteLength(existing)};
 });
 await check(`${name}: eksisterende og ny enkeltfil uten nett`,async()=>{
  const evidence=[];await context.setOffline(true);
  for(const file of [resolve('eksport',name+'.html'),dir+'enkeltfiler/'+name+'.html']){
   await page.goto(pathToFileURL(file).href);await page.waitForFunction(()=>!!window.undervisningsmodell);await page.getByRole('radio').first().check();await page.getByRole('button',{name:'Lås gjetningen',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();await page.waitForTimeout(250);evidence.push({file,state:await state()});
  }await context.setOffline(false);return evidence;
 });
}

const touchContext=await browser.newContext({viewport:{width:768,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:2});
const touchPage=await touchContext.newPage();
for(const name of names)await check(`${name}: emulert berøring på nettbrett`,async()=>{
 await touchPage.goto(`${base}/modeller/naturfag/${name}/`);await touchPage.waitForFunction(()=>!!window.undervisningsmodell);
 await touchPage.getByRole('radio').first().tap();await touchPage.getByRole('button',{name:'Lås gjetningen',exact:true}).tap();await touchPage.getByRole('button',{name:'Start',exact:true}).tap();await touchPage.waitForTimeout(250);
 return touchPage.evaluate(()=>window.undervisningsmodell.hentTilstand());
});
await touchContext.close();
await browser.close();
await writeFile(dir+'nettleserresultater.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({checks:results.checks.length,failed:results.checks.filter(c=>c.status==='fail').map(c=>c.name),console:results.console,externalRequests:results.externalRequests},null,2));
