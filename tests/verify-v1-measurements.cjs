const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const M=require('../forge90-measurements.js');
const cases=[
  ['Shoulder Press','1 × 8–10',{load:20,reps:10}],
  ['Bodyweight Squat','1 × 12',{reps:12}],
  ['Front Plank','1 × 30 sec',{duration:27}],
  ['Weighted Hold','1 × 30 sec',{load:15,duration:27}],
  ['Bird Dog','1 × 12 / side',{leftReps:12,rightReps:10}],
  ['Modified Side Plank','1 × 30 sec / side',{leftDuration:30,rightDuration:27}],
  ['Distance Walk','1 × 100 m',{distance:90}],
  ['Farmer Carry','1 × 20 m',{load:15,distance:20}],
  ['Treadmill','1 × 5 min',{duration:300,distance:400}],
  ['Goblet Squat','1 × 10 tempo 3-1-X-0',{load:15,reps:10,tempo:'3-1-X-0'}],
  ['Assisted Pull-up','1 × 8',{assistance:20,reps:8}]
];
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.FORGE90_CHROMIUM_PATH});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.type()==='prompt'?d.dismiss():d.accept());
  try{
    await page.addInitScript(cases=>{if(localStorage.getItem('measurement-fixture'))return;localStorage.setItem('measurement-fixture','1');localStorage.setItem('forge90.v1',JSON.stringify({settings:{weekMode:'five',bodyWeight:80},workouts:[],progress:[],activeWorkout:{id:'typed-fixture',mode:'five',index:0,date:'2026-09-12',startedAt:new Date().toISOString(),bodyWeight:80,duration:60,cardioMinutes:0,cardioIntensity:5,logs:cases.map(([name,target])=>({name,target,key:name,sets:[{weight:'',reps:'',done:false}]}))}}));},cases);
    await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.Forge90Conditioning&&document.querySelectorAll('.exercise-card .f90v2-start').length===11);
    for(let i=0;i<cases.length;i++){
      const [name,,actual]=cases[i],card=page.locator('.exercise-card').nth(i);
      if(await card.locator('.f90v2-toggle').getAttribute('aria-expanded')==='false')await card.locator('.f90v2-toggle').click();
      const keys=await card.locator('[data-measure]').evaluateAll(els=>els.map(el=>el.dataset.measure));assert.deepEqual(keys,Object.keys(actual),name+' fields');
      for(const [key,value] of Object.entries(actual))await card.locator('[data-measure="'+key+'"]').fill(String(value));
      await card.locator('.f90v2-start').click();await card.locator('.f90v2-start').click();
      const record=await page.evaluate(i=>window.Forge90App.getActive().logs[i].sets[0],i);assert.deepEqual(record.actual,actual);assert.deepEqual(record.target,{});assert.deepEqual(record.units,Object.fromEntries(keys.map(k=>[k,M.units[k]])));
      console.log('PASS typed family '+(i+1)+': '+name+' — '+M.format(actual));
    }
    await page.click('#finishWorkoutBtn');await page.waitForSelector('#reportDialog[open]');
    const saved=await page.evaluate(()=>JSON.parse(window.Forge90Storage.getItem('forge90.v1')).workouts[0]);
    const report=await page.locator('#reportDetails').innerText();
    for(const [name,,actual] of cases){assert.deepEqual(saved.exercises.find(e=>e.name===name).sets[0].actual,actual);assert.ok(report.includes(M.format(actual)),name+' report formatting');}
    const history=await page.evaluate(()=>JSON.parse(window.Forge90Storage.getItem('forge90_session_history_v2')).at(-1));assert.equal(history.sets.length,11);
    for(const [name,,actual] of cases)assert.deepEqual(history.sets.find(s=>s.exercise===name).actual,actual);
    assert.deepEqual(errors,[]);fs.writeFileSync('test-results/v1-measurements.json',JSON.stringify({families:cases.map(([name,,actual])=>({name,actual,formatted:M.format(actual)})),errors},null,2));console.log('V1_TYPED_MEASUREMENTS=PASS');
  }catch(e){console.error('PAGE_ERRORS',errors);await page.screenshot({path:'test-results/v1-measurements-failure.png',fullPage:true,timeout:5000}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
