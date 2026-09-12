const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const fixture=require('./fixtures/legacy-data.cjs');
const root=path.resolve(__dirname,'..'),baseline='36efdecce7cec2cf466829ef11cc6e7f502cc58a';
const evidence=process.env.FORGE90_EVIDENCE_DIR||path.join(root,'test-results');fs.mkdirSync(evidence,{recursive:true});
let version='baseline';const oldFiles=new Map();
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
  const target=path.resolve(root,rel);
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404).end();return;}
  let content;
  if(version==='baseline'){if(!oldFiles.has(rel)){try{oldFiles.set(rel,execFileSync('git',['show',`${baseline}:${rel}`],{cwd:root,maxBuffer:10e6,stdio:['ignore','pipe','ignore']}));}catch{res.writeHead(404).end();return;}}content=oldFiles.get(rel);}else content=fs.readFileSync(target);
  res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});res.end(content);
});
const checks=[];const pass=name=>{checks.push(name);console.log(`PASS ${name}`);};
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  console.log('Preparing immutable baseline assets');
  for(const rel of execFileSync('git',['ls-tree','-r','--name-only',baseline],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>/\.(js|html|css|webmanifest|png)$/.test(p)&&!p.startsWith('tests/'))){
    oldFiles.set(rel,execFileSync('git',['show',`${baseline}:${rel}`],{cwd:root,maxBuffer:10e6}));
  }
  console.log('Baseline assets ready');
  let browser, page;
  try{
    browser=await chromium.launch({headless:true,...(process.env.FORGE90_CHROMIUM_PATH?{executablePath:process.env.FORGE90_CHROMIUM_PATH}:{})});
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
    page=await context.newPage();page.setDefaultTimeout(12000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('dialog',d=>d.accept());
    await page.addInitScript(records=>{if(!localStorage.getItem('fixture-seeded')){for(const [k,v] of Object.entries(records))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));localStorage.setItem('fixture-seeded','1');}},fixture);
    await page.goto(origin,{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>window.Forge90Storage?.getMode()==='indexeddb');
    assert.equal(await page.locator('#homeLastVolume').textContent(),'800 kg');pass('legacy app loaded with realistic pre-update data');
    const before=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(fixture));
    version='updated';await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.Forge90Conditioning);
    const after=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(fixture));assert.deepEqual(after,before);
    const dbAfter=await page.evaluate(async keys=>{await window.Forge90Storage.flush();const db=new Dexie('forge90_local_v1');await db.open();const rows=await db.table('records').toArray();db.close();return Object.fromEntries(rows.filter(r=>keys.includes(r.key)).map(r=>[r.key,r.value]));},Object.keys(fixture).filter(k=>k!=='unrelated_application'));
    for(const [k,v] of Object.entries(dbAfter))assert.equal(v,before[k]);assert.equal(Object.keys(dbAfter).length,Object.keys(fixture).length-1);pass('all legacy records byte-for-byte preserved in localStorage and IndexedDB');
    await page.click('[data-view=historyView]');await page.locator('#historyList .small-btn').first().click();assert.match(await page.locator('#reportDetails').innerText(),/Incline Chest Press/);assert.equal(await page.locator('#reportVolume').innerText(),'800 kg');await page.click('#closeReportBtn');pass('old workout reports remain readable');
    await page.click('[data-view=homeView]');
    for(const title of ['Home Core Day A','Home Core Day B']){
      await page.getByRole('button',{name:`Start ${title}`,exact:true}).click();await page.waitForSelector('#forge90-home-core-overlay');
      assert.equal(await page.locator('#forge90-home-core-overlay .f90x-ex').count(),8);
      await page.locator('#forge90-home-core-overlay').screenshot({path:path.join(evidence,`${title.replaceAll(' ','-')}.png`)});
      await page.locator('#forge90-home-core-overlay .f90x-close').click();pass(`${title} preserved and mobile screenshot captured`);
    }
    await page.click('#startWorkoutBtn');await page.waitForSelector('#f90c-cardio');
    const select=async(mode,index)=>{if(await page.inputValue('#weekMode')!==mode)await page.selectOption('#weekMode',mode);await page.selectOption('#workoutSelect',String(index));await page.waitForFunction(({mode,index})=>window.Forge90Conditioning?.getSession()?.mode===mode&&window.Forge90Conditioning?.getSession()?.index===index,{mode,index});await page.waitForTimeout(180);};
    // Compare every original name, target, set count and add-on definition to the immutable baseline.
    const vm=require('node:vm');const source=execFileSync('git',['show',`${baseline}:forge90-base-app.js`],{cwd:root,encoding:'utf8'});
    const planText=source.slice(source.indexOf('  const E='),source.indexOf('  const $ ='))+';plans';const plans=vm.runInNewContext(planText);
    for(const [mode,index,label] of [['five',0,'5-day-Day-1'],['five',2,'5-day-leg-day'],['four',0,'4-day-upper'],['four',1,'4-day-lower'],['five',1,'5-day-Pull'],['five',3,'5-day-Upper-Shape'],['five',4,'5-day-Lower-Shoulders'],['four',2,'4-day-Upper-B'],['four',3,'4-day-Lower-B']]){
      await select(mode,index);
      const logs=await page.evaluate(()=>window.Forge90App.getActive().logs);
      assert.deepEqual(logs.map(l=>({name:l.name,key:l.key,target:l.target,sets:l.sets.length})),JSON.parse(JSON.stringify(plans[mode][index].items)));
      const order=await page.evaluate(()=>{const p=document.getElementById('workoutView');const ids=['f90c-warmup','exerciseCards','forge90-gym-addons','f90c-cardio','f90c-cooldown'];const a=ids.map(id=>[...p.children].indexOf(document.getElementById(id)));a.push([...p.children].indexOf(p.querySelector('.live-bar')));return a;});assert.ok(order.every((v,i)=>v>=0&&(i===0||v>order[i-1])));
      assert.equal(await page.locator('#f90c-cardio').count(),1);assert.equal(await page.locator('#cardioMinutes').isVisible(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(index<3)await page.screenshot({path:path.join(evidence,`${label}.png`),fullPage:true});pass(`${label}: original exercises/sets/reps and exact section order`);
    }
    await select('five',0);await page.clock.install();
    const reveal=async locator=>locator.evaluate(el=>{const parents=[];for(let p=el.parentElement;p;p=p.parentElement)parents.unshift(p);for(const p of parents){if(p.classList.contains('f90c-accordion-body')&&p.hidden)p.previousElementSibling.click();if(p.id==='exerciseCards'&&p.hidden)document.querySelector('[data-v1-phase=strength]').click();if(p.classList.contains('f90v2-collapsed'))p.querySelector('.f90v2-toggle').click();}});
    const click=async(kind,action,index='')=>{const locator=page.locator(`[data-c-action="${action}"][data-kind="${kind}"][data-index="${index}"]`);await reveal(locator);await locator.click();};
    const state=()=>page.evaluate(()=>window.Forge90Conditioning.getSession());
    // Warm-up load cannot be interpreted as a strength set or change volume.
    await reveal(page.locator('[data-c-load]'));await page.locator('[data-c-load]').fill('20');await page.locator('[data-c-load]').dispatchEvent('change');
    await click('warmup','start','0');await page.clock.fastForward(60000);await click('warmup','pause','0');const warmPaused=(await state()).warmup[0].elapsedMs;
    await page.clock.fastForward(120000);assert.equal((await state()).warmup[0].elapsedMs,warmPaused);
    await click('warmup','resume','0');await page.clock.fastForward(30000);await click('warmup','complete','0');
    assert.equal((await state()).warmup[0].status,'Completed');assert.equal(await page.locator('#liveVolume').textContent(),'0 kg');
    assert.equal((await page.evaluate(()=>window.Forge90Session.getState())).timer,null);pass('warm-up pause/resume/complete excludes weights and avoids generic double timer');
    await click('warmup','start','1');await click('warmup','plus','1');assert.equal((await state()).warmup[1].targetMs,75000);await click('warmup','minus','1');assert.equal((await state()).warmup[1].targetMs,60000);
    await click('warmup','complete','1');await click('warmup','skip','2');await page.locator('#f90c-reason-dialog [name=reason]').selectOption('Time shortage');await page.getByRole('button',{name:'Confirm skip',exact:true}).click();assert.equal((await state()).warmup[2].status,'Skipped');pass('individual warm-up adjustments and structured skip reason');
    await click('cardio','plus');assert.equal((await state()).cardio.targetMs,25*60000);await click('cardio','minus');assert.equal((await state()).cardio.targetMs,20*60000);
    await click('cardio','start');assert.equal(await page.locator('[data-c-action=start][data-kind=cardio]').isDisabled(),true);
    await page.clock.fastForward(7*60000);await click('cardio','pause');const paused=(await state()).cardio.elapsedMs;await page.clock.fastForward(3*60000);assert.equal((await state()).cardio.elapsedMs,paused);
    await click('cardio','resume');await page.clock.fastForward(5*60000);await click('cardio','stop');const stopped=(await state()).cardio.elapsedMs;await page.clock.fastForward(2*60000);assert.equal((await state()).cardio.elapsedMs,stopped);
    await page.locator('#f90c-reason-dialog [name=reason]').selectOption('Fatigue');await page.getByRole('button',{name:'Confirm stop',exact:true}).click();const cardio=(await state()).cardio;
    assert.equal(cardio.status,'Stopped Early');assert.ok(Math.abs(cardio.elapsedMs-12*60000)<4000);assert.equal(cardio.targetMs,20*60000);pass('cardio controls and stop capture actual 12/20 minutes immediately');
    const first=page.locator('#exerciseCards .set-row').first();await reveal(first);await first.locator('input[type=number]').nth(0).fill('40');await first.locator('input[type=number]').nth(1).fill('10');
    await first.locator('.f90v2-start').click();await page.clock.fastForward(10000);await click('session','session-pause');const totalBeforePause=await page.evaluate(()=>window.Forge90Conditioning.getSummary().totalMs);await page.clock.fastForward(120000);assert.equal(await page.evaluate(()=>window.Forge90Conditioning.getSummary().totalMs),totalBeforePause);await click('session','session-resume');await page.clock.fastForward(20000);await first.locator('.f90v2-start').click();await page.click('[data-f90=skip]');
    const addon=page.locator('#forge90-gym-addons .f90v2-start').first();await reveal(addon);const addonRow=page.locator('#forge90-gym-addons .f90x-set').first();for(const input of await addonRow.locator('[data-measure]').all()){await input.fill((await input.getAttribute('data-measure'))==='load'?'0':'10');}await addon.click();await page.clock.fastForward(15000);await addon.click();await page.click('[data-f90=skip]');assert.ok((await page.evaluate(()=>window.Forge90Conditioning.getSummary())).coreMs>=15000);pass('total session pause excludes pause time and core work has separate duration');
    await page.click('#finishWorkoutBtn');await page.waitForSelector('#reportDialog[open]');
    const reportText=await page.locator('#f90c-report').innerText();for(const text of ['Warm-up duration','Strength-training duration','Core / Hip / Glute duration','Cardio actual duration','Cooldown within cardio','Total session duration','Strength-training volume','Stopped Early','Fatigue'])assert.ok(reportText.includes(text),text);
    assert.equal(await page.locator('#reportVolume').innerText(),'400 kg');pass('extended saved report includes actual metrics and preserved strength volume');
    await page.click('#closeReportBtn');await page.clock.fastForward(500);await page.click('#startWorkoutBtn');await page.waitForSelector('#f90c-cardio');
    await click('cardio','start');await page.clock.fastForward(60000);await page.reload({waitUntil:'networkidle'});await page.click('[data-view=workoutView]');await page.waitForSelector('#f90c-cardio');assert.equal((await state()).cardio.status,'Running');assert.ok((await page.evaluate(()=>window.Forge90Conditioning.getSummary())).cardioMs>=60000);pass('running session survives refresh and Start Workout resumes it');
    await click('cardio','safety');await page.waitForSelector('#f90c-safety-dialog[open]');assert.equal((await state()).cardio.status,'Paused');await page.locator('#f90c-safety-dialog [data-stay]').click();assert.equal(await page.locator('[data-c-action=resume][data-kind=cardio]').isDisabled(),true);
    await click('cardio','safety');await page.locator('#f90c-safety-dialog [data-sub]').click();await page.locator('#f90c-sub-dialog [name=machine]').selectOption('recumbent');await page.getByRole('button',{name:'Use substitute',exact:true}).click();assert.equal((await state()).cardio.safetyHold,true);
    await click('cardio','safety');await page.locator('#f90c-safety-dialog [data-continue]').click();assert.equal((await state()).cardio.status,'Running');pass('safety pause and substitution require deliberate continuation');
    await click('cardio','pause');await click('cardio','substitute');await page.locator('#f90c-sub-dialog [name=machine]').selectOption('bike');await page.getByRole('button',{name:'Use substitute',exact:true}).click();await page.locator('[data-c-setting=resistance]').fill('4');await page.locator('[data-c-setting=resistance]').dispatchEvent('change');await click('cardio','resume');pass('machine unavailable substitution and settings tracking');
    const untilCooldown=await page.evaluate(()=>{const a=window.Forge90Conditioning.getSession().cardio;return Math.max(0,a.targetMs-window.Forge90ConditioningCore.actual(a,Date.now())-2*60000);});await page.clock.fastForward(untilCooldown);assert.equal((await page.evaluate(()=>window.Forge90ConditioningCore.phase(window.Forge90Conditioning.getSession().cardio,Date.now()))),'Cooldown');await page.clock.fastForward(4*60000);assert.equal((await state()).cardio.status,'Completed');
    await click('recovery','start');await page.clock.fastForward(3*60000);assert.equal((await state()).recovery.status,'Completed');pass('cooldown phase and optional recovery complete with bounded actual duration');
    await page.click('#resetWorkoutBtn');await page.waitForTimeout(200);
    await reveal(page.getByText('Optional completion alerts',{exact:true}));await page.getByText('Optional completion alerts',{exact:true}).click();
    await page.locator('[data-c-pref=sound]').check();await page.locator('[data-c-pref=vibration]').check();
    await page.evaluate(()=>{window.AudioContext=class{constructor(){throw Error('unsupported audio');}};Object.defineProperty(navigator,'vibrate',{configurable:true,value:()=>{throw Error('unsupported vibration');}});});
    await click('cardio','start');await page.clock.fastForward(30*60000);assert.equal((await state()).cardio.status,'Completed');pass('audio and vibration failures degrade safely');
    await page.click('#resetWorkoutBtn');await page.waitForTimeout(200);while((await state()).cardio.targetMs>5*60000){const before=(await state()).cardio.targetMs;await click('cardio','minus');assert.equal((await state()).cardio.targetMs,Math.max(5*60000,before-5*60000));}assert.equal((await state()).cardio.targetMs,5*60000);assert.equal(await page.locator('[data-c-action=minus][data-kind=cardio]').isDisabled(),true);await click('cardio','skip');await page.locator('#f90c-reason-dialog [name=reason]').selectOption('Machine unavailable');await page.getByRole('button',{name:'Confirm skip',exact:true}).click();assert.equal((await state()).cardio.status,'Skipped');assert.equal((await state()).cardio.elapsedMs,0);pass('cardio minimum target and Skipped remain distinct from Completed');
    assert.deepEqual(errors,[]);pass('no blocking browser console or page errors');
    await context.close();
    fs.writeFileSync(path.join(evidence,'conditioning-browser-results.json'),JSON.stringify({baseline,checks,errors,result:'PASS'},null,2));
    console.log('CONDITIONING_BROWSER_REGRESSION=PASS');
  } catch(error) {if(page){console.log('FAILURE_STATE',JSON.stringify(await page.evaluate(()=>({active:document.querySelector('.view.active')?.id,body:document.body.innerText.slice(-3500),conditioning:window.Forge90Conditioning?.getSession(),activeWorkout:window.Forge90App?.getActive()})).catch(()=>null)));await page.screenshot({path:path.join(evidence,'failure.png')}).catch(()=>{});}throw error;} finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
