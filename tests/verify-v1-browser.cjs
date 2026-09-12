const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const origin=process.env.FORGE90_TEST_ORIGIN||'http://127.0.0.1:4173';
const checks=[];
const pass=name=>{checks.push(name);console.log('PASS '+name);};
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.FORGE90_CHROMIUM_PATH});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));page.on('dialog',d=>d.type()==='prompt'?d.dismiss():d.accept());
  try{
    await page.addInitScript(()=>{
      if(localStorage.getItem('v1-seeded'))return;
      localStorage.setItem('v1-seeded','1');
      const sets=equipment=>Array.from({length:3},(_,i)=>({exercise:'Shoulder Press',exerciseKey:'shoulder-press',equipment,setIndex:i+1,status:'completed',weight:equipment==='Dumbbells'?20:30,reps:10}));
      localStorage.setItem('forge90_session_history_v2',JSON.stringify([{id:'db',finishedAt:new Date().toISOString(),sets:sets('Dumbbells')},{id:'bb',finishedAt:new Date().toISOString(),sets:sets('Barbell')}]));
    });
    await page.goto(origin);await page.waitForFunction(()=>window.Forge90Conditioning);
    await page.selectOption('#homeWeekMode','five');await page.click('#startWorkoutBtn');await page.selectOption('#workoutSelect','0');
    await page.waitForFunction(()=>document.querySelectorAll('.f90v2-toggle').length>=7);
    assert.deepEqual(errors,[]);
    const card=()=>page.locator('.exercise-card').filter({has:page.locator('.exercise-head strong',{hasText:'Shoulder Press'})});
    const open=async()=>{if(await card().locator('.f90v2-toggle').getAttribute('aria-expanded')==='false')await card().locator('.f90v2-toggle').click();};
    await open();
    const model=()=>page.evaluate(()=>window.Forge90App.getActive().logs.find(l=>l.name==='Shoulder Press').sets);
    assert.equal(await card().locator('[data-measure=load]').first().inputValue(),'20');
    assert.equal((await model())[0].actual.load,20);assert.equal((await model())[0].done,false);pass('prefill updates authoritative draft without completion');
    await card().locator('.f90v2-equipment select').selectOption('Barbell');assert.equal(await card().locator('[data-measure=load]').first().inputValue(),'30');
    await card().locator('.f90v2-equipment select').selectOption('Dumbbells');assert.equal(await card().locator('[data-measure=load]').first().inputValue(),'20');
    await card().locator('.f90v2-equipment select').selectOption('Shoulder Press Machine');assert.equal(await card().locator('[data-measure=load]').first().inputValue(),'');assert.match(await card().locator('.f90v2-target').first().innerText(),/No previous record/);
    await card().locator('.f90v2-equipment select').selectOption('Dumbbells');pass('equipment round-trip and unused equipment isolation');
    await card().locator('.f90v2-start').first().click();assert.equal(await card().locator('.f90v2-start').first().innerText(),'Complete');assert.equal(await card().locator('.f90v2-equipment select').isDisabled(),true);
    const before=(await model())[0];await page.reload();await page.waitForFunction(()=>window.Forge90Session&&document.querySelectorAll('.f90v2-toggle').length>=7);await page.click('[data-view=workoutView]');
    assert.equal(await card().locator('.f90v2-start').first().innerText(),'Complete');assert.equal((await model())[0].startedAt,before.startedAt);assert.equal(await card().locator('.f90v2-equipment select').isDisabled(),true);pass('active set refresh retains timestamp, actual and equipment lock');
    await card().locator('.f90v2-start').first().click();
    for(let i=1;i<3;i++){await card().locator('.f90v2-start').nth(i).click();await card().locator('.f90v2-start').nth(i).click();}
    const completed=await model();assert.equal(completed.filter(s=>s.done).length,3);assert.equal(completed.reduce((n,s)=>n+s.actual.load*s.actual.reps,0),600);
    await open();await card().locator('.f90v2-equipment select').selectOption('Barbell');assert.equal((await model())[0].equipment,'Dumbbells');assert.equal((await model())[0].actual.load,20);pass('completed equipment and actuals remain immutable');
    for(const width of [320,360,375,390,412,430,768,1440]){
      await page.setViewportSize({width,height:844});await open();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow '+width);
      assert.ok(await card().locator('.exercise-head > div').first().evaluate(el=>el.getBoundingClientRect().width>=150),'readable exercise title width '+width);
      const outside=await card().evaluate(card=>[...card.querySelectorAll('button,input,select')].filter(el=>el.getClientRects().length&&window.getComputedStyle(el).position!=='absolute').filter(el=>{const a=el.getBoundingClientRect(),b=card.getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1;}).map(el=>el.outerHTML));assert.deepEqual(outside,[],'controls outside card '+width);
    }pass('eight required viewport widths contain workout controls');
    await page.setViewportSize({width:390,height:844});await card().screenshot({path:'test-results/v1-shoulder.png'});
    await page.click('#finishWorkoutBtn');await page.waitForSelector('#reportDialog[open]');assert.equal(await page.locator('#reportVolume').innerText(),'600 kg');assert.match(await page.locator('#reportDetails').innerText(),/20 kg × 10 reps/);
    const saved=await page.evaluate(()=>JSON.parse(window.Forge90Storage.getItem('forge90.v1')).workouts[0]);assert.equal(saved.volume,600);assert.equal(saved.exercises.find(e=>e.name==='Shoulder Press').sets[0].actual.load,20);
    const history=await page.evaluate(()=>JSON.parse(window.Forge90Storage.getItem('forge90_session_history_v2')).at(-1));assert.equal(history.sets.filter(s=>s.exerciseKey==='shoulder-press').length,3);pass('untouched 3 × 20 kg × 10 report, saved workout and session history agree');
    assert.deepEqual(errors,[]);pass('no page errors');fs.writeFileSync('test-results/v1-browser.json',JSON.stringify({checks},null,2));
  }catch(error){console.error('PAGE_ERRORS',errors);await page.screenshot({path:'test-results/v1-failure.png',fullPage:true});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
