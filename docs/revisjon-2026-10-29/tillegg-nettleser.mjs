import {writeFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const {chromium}=await import(pathToFileURL(resolve(process.argv[2])).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const dir=fileURLToPath(new URL('.',import.meta.url));
const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});
const page=await context.newPage();
const out={date:'2026-10-29',errors:[],motion:[],focus:[]};
page.on('console',m=>{if(m.type()==='error')out.errors.push({text:m.text(),location:m.location()});});
page.on('pageerror',e=>out.errors.push({pageerror:e.message}));
const base='http://127.0.0.1:8000';
await page.goto(base);
for(const name of ['varmeledning-partikler','overflate-og-volum','energi-som-sprer-seg']) {
 await page.goto(`${base}/modeller/naturfag/${name}/`);await page.waitForFunction(()=>!!window.undervisningsmodell);
 const canvas=page.locator('canvas:visible').first();const a=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(600);const b=await canvas.evaluate(c=>c.toDataURL());
 out.motion.push({name,reduceBeforeLoad:true,canvasChanges:a!==b});
 await page.keyboard.press('Tab');let focus=[];for(let i=0;i<22;i++){focus.push(await page.evaluate(()=>({tag:document.activeElement.tagName,id:document.activeElement.id,text:document.activeElement.textContent.trim().slice(0,70),outline:getComputedStyle(document.activeElement).outline})));await page.keyboard.press('Tab');}out.focus.push({name,sequence:focus});
 await page.setViewportSize({width:640,height:480});
 await page.screenshot({path:dir+name+'-640.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
}
await page.goto(`${base}/maler/fag/ny-modell/`);await page.waitForFunction(()=>!!window.undervisningsmodell);
await page.getByRole('radio').first().check();await page.getByRole('button',{name:'Lås gjetningen',exact:true}).click();await page.locator('#start').click();await page.waitForTimeout(400);
const before=await page.evaluate(()=>window.undervisningsmodell.hentTilstand());
await page.locator('#starttemperatur').fill('70');await page.waitForTimeout(200);
out.template={before,after:await page.evaluate(()=>window.undervisningsmodell.hentTilstand()),button:await page.locator('#start').textContent()};
await page.goto(`${base}/modeller/naturfag/varmeledning-partikler/`);await page.waitForFunction(()=>!!window.undervisningsmodell);
await page.getByRole('tab',{name:'Isbit på kloss',exact:true}).click();await page.locator('#panel-isbit .mer summary').click();await page.locator('#isbit-fart').selectOption('600');await page.getByRole('radio',{name:'Isbiten på tre',exact:true}).check();await page.getByRole('button',{name:'Lås gjetningen',exact:true}).click();await page.locator('#isbit-start').click();
try{await page.waitForFunction(()=>window.undervisningsmodell.hentTilstand().isbit.forstSmeltet!==null,null,{timeout:55000});out.ice={firstMelted:await page.evaluate(()=>window.undervisningsmodell.hentTilstand()),text:await page.locator('#isbit-forutsi').innerText()};await page.screenshot({path:dir+'isbit-forst-smeltet.png',fullPage:true});}catch(e){out.ice={timeout:e.message,state:await page.evaluate(()=>window.undervisningsmodell.hentTilstand())};}
await writeFile(dir+'tillegg-nettleser.json',JSON.stringify(out,null,2));console.log(JSON.stringify({errors:out.errors,motion:out.motion,template:out.template,ice:out.ice},null,2));await browser.close();
