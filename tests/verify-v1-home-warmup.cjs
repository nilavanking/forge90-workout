const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s);};
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.FORGE90_CHROMIUM_PATH});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.type()==='prompt'?d.dismiss():d.accept());
  const origin='http://127.0.0.1:4173';
  const openCard=async card=>{if(await card.locator('.f90v2-toggle').getAttribute('aria-expanded')==='false')await card.locator('.f90v2-toggle').click();};
  const phase=async key=>{const head=page.locator('[data-c-phase-status="'+key+'"]');if(await head.getAttribute('aria-expanded')==='false')await head.click();};
  const movement=async i=>{await phase('warmup');const head=page.locator('[data-c-activity-status="warmup:'+i+'"]');if(await head.getAttribute('aria-expanded')==='false')await head.click();};
  const warm=async(cmd,i=0)=>{await movement(i);await page.locator('[data-c-action="'+cmd+'"][data-kind=warmup][data-index="'+i+'"]').click();};
  const state=()=>page.evaluate(()=>window.Forge90Conditioning.getSession());
  try{
    await page.goto(origin);await page.waitForFunction(()=>window.Forge90Conditioning);await page.selectOption('#homeWeekMode','five');await page.getByRole('button',{name:'Start Home Core Day',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('#forge90-home-core-overlay .f90v2-toggle').length===8);
    const card=name=>page.locator('#forge90-home-core-overlay .f90x-ex').filter({has:page.locator('.exercise-head strong',{hasText:name})});
    const bird=()=>card('Bird Dog');await openCard(bird());
    assert.equal(await page.locator('#forge90-home-core-overlay input[type=checkbox]').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1;}).length),0);
    assert.equal(await bird().locator('[data-measure=load]').count(),0);assert.equal(await bird().locator('[data-measure=leftReps]').count(),3);pass('five-day Home Core has typed sides and no visible legacy checkboxes');
    await bird().getByRole('button',{name:'+ Add Set',exact:true}).click();await openCard(bird());assert.equal(await bird().locator('.f90v2-start').count(),4);
    await bird().getByRole('button',{name:'Remove Set',exact:true}).click();await openCard(bird());assert.equal(await bird().locator('.f90v2-start').count(),3);pass('Home Core add/remove keeps shared controls');
    await bird().getByRole('button',{name:'Guide',exact:true}).click();assert.match(await page.locator('#f90v1-guide').innerText(),/hands and knees/);await page.locator('#f90v1-guide button').click();
    await bird().locator('[data-measure=leftReps]').first().fill('12');await bird().locator('[data-measure=rightReps]').first().fill('10');await bird().locator('.f90v2-start').first().click();
    await page.reload();await page.waitForFunction(()=>document.querySelector('#forge90-home-core-overlay .f90v2-toggle'));
    await openCard(bird());assert.equal(await bird().locator('.f90v2-start').first().innerText(),'Complete');assert.equal(await bird().locator('[data-measure=rightReps]').first().inputValue(),'10');await bird().locator('.f90v2-start').first().click();pass('Home Core active set and independent sides survive refresh');
    const plank=card('Front Plank');await openCard(plank);assert.equal(await plank.locator('[data-measure=duration]').count(),3);await plank.locator('[data-measure=duration]').first().fill('27');await plank.locator('.f90v2-start').first().click();await plank.locator('.f90v2-start').first().click();
    await page.getByRole('button',{name:'Finish Home Core',exact:true}).click();await page.waitForSelector('#reportDialog[open]');assert.match(await page.locator('#reportDetails').innerText(),/L12 \/ R10 reps/);assert.match(await page.locator('#reportDetails').innerText(),/27 sec/);pass('Home Core sides and duration reach the saved report');await page.locator('#closeReportBtn').click();
    await page.click('[data-view=homeView]');await page.click('#startWorkoutBtn');await page.selectOption('#workoutSelect','0');await page.waitForSelector('#f90c-warmup');
    await page.clock.install();await warm('start');await page.clock.fastForward(47000);await warm('pause');const paused=(await state()).warmup[0];await page.reload();await page.waitForFunction(()=>window.Forge90Conditioning?.getSession());assert.equal((await state()).warmup[0].status,'Paused');assert.equal((await state()).warmup[0].elapsedMs,paused.elapsedMs);pass('paused warm-up survives refresh without restart');
    await warm('resume');await warm('plus');const target=(await state()).warmup[0].targetMs;await warm('minus');assert.equal((await state()).warmup[0].targetMs,target-15000);pass('warm-up adjustments use exactly fifteen seconds');
    await movement(1);await page.locator('[data-c-action=start][data-kind=warmup][data-index="1"]').click();assert.equal((await state()).warmup.filter(a=>a.status==='Running').length,1);assert.equal((await state()).warmup[0].status,'Stopped Early');pass('Stop & Start enforces one active warm-up timer');
    await warm('complete',1);assert.equal((await state()).warmup[1].status,'Completed');assert.equal(await page.locator('[data-c-activity-status="warmup:1"]').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('[data-c-activity-status="warmup:2"]').getAttribute('aria-expanded'),'true');pass('warm-up completion opens the next movement');
    await warm('skip',2);await page.locator('#f90c-reason-dialog [name=details]').fill('Synthetic skipped movement');await page.getByRole('button',{name:'Confirm skip',exact:true}).click();assert.equal((await state()).warmup[2].elapsedMs,0);assert.equal((await state()).warmup[2].status,'Skipped');
    await warm('skip',3);await page.getByRole('button',{name:'Confirm skip',exact:true}).click();assert.equal(await page.locator('[data-c-phase-status=warmup]').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('[data-v1-phase=strength]').getAttribute('aria-expanded'),'true');pass('skipped stays distinct and finished warm-up flows to Strength');
    assert.deepEqual(errors,[]);pass('Home Core and warm-up have no page errors');fs.writeFileSync('test-results/v1-home-warmup.json',JSON.stringify({checks},null,2));
  }catch(e){console.error('PAGE_ERRORS',errors);await page.screenshot({path:'test-results/v1-home-warmup-failure.png',fullPage:true,timeout:5000}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
