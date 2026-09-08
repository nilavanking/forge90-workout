const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright'),fixture=require('./fixtures/legacy-data.cjs');
const url=process.env.FORGE90_PREVIEW_URL;
if(!url||!new URL(url).hostname.endsWith('--forge90-workout.netlify.app'))throw Error('Use an existing Forge90 draft-preview URL; this fixture test never seeds production.');
const evidence=path.resolve('test-results');fs.mkdirSync(evidence,{recursive:true});
(async()=>{
  const expected=JSON.parse(fs.readFileSync('dist/asset-checksums.json','utf8'));
  for(const [asset,hash] of Object.entries(expected).filter(([asset])=>asset!=='_redirects')){const response=await fetch(new URL(asset,url+'/'));assert.equal(response.status,200);assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),hash,asset);}
  const rewritten=await fetch(new URL('/preview-route-check',url));assert.equal(crypto.createHash('sha256').update(Buffer.from(await rewritten.arrayBuffer())).digest('hex'),expected['index.html']);
  console.log('PASS all public hosted assets match the tested build; Netlify rewrite works');
  const browser=await chromium.launch({headless:true,...(process.env.FORGE90_CHROMIUM_PATH?{executablePath:process.env.FORGE90_CHROMIUM_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
    await page.addInitScript(data=>{if(!localStorage.getItem('preview-fixture')){for(const [k,v] of Object.entries(data))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));localStorage.setItem('preview-fixture','1');}},fixture);
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.Forge90Conditioning);
    for(const [key,value] of Object.entries(fixture)){assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),typeof value==='string'?value:JSON.stringify(value));}
    await page.click('#startWorkoutBtn');await page.waitForSelector('#f90c-warmup');
    for(const mode of ['four','five']){
      if(await page.inputValue('#weekMode')!==mode)await page.selectOption('#weekMode',mode);
      await page.waitForTimeout(250);
      const order=await page.evaluate(()=>{const nodes=[document.getElementById('f90c-warmup'),document.getElementById('exerciseCards'),document.getElementById('forge90-gym-addons'),document.getElementById('f90c-cardio'),document.getElementById('f90c-cooldown'),document.querySelector('#workoutView .live-bar')];return nodes.every((n,i)=>n&&(!i||Boolean(nodes[i-1].compareDocumentPosition(n)&window.Node.DOCUMENT_POSITION_FOLLOWING)));});assert.equal(order,true);
      await page.locator('#f90c-warmup').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'hosted-'+mode+'-warmup.png')});
      await page.locator('#f90c-cardio').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'hosted-'+mode+'-cardio.png')});
      for(const action of ['start','pause','resume','stop','plus','minus','skip'])assert.equal(await page.locator('[data-c-action="'+action+'"][data-kind=cardio]').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      console.log('PASS hosted '+mode+'-day workout, original strength, add-ons, cardio controls, cooldown and finish order');
    }
    await page.locator('[data-c-action=start][data-kind=cardio]').click();await page.locator('[data-c-action=pause][data-kind=cardio]').click();await page.locator('[data-c-action=resume][data-kind=cardio]').click();await page.locator('[data-c-action=stop][data-kind=cardio]').click();await page.getByRole('button',{name:'Confirm stop',exact:true}).click();assert.equal(await page.evaluate(()=>window.Forge90Conditioning.getSession().cardio.status),'Stopped Early');
    await page.reload({waitUntil:'networkidle'});await page.click('#startWorkoutBtn');await page.waitForSelector('#f90c-cardio');assert.equal(await page.evaluate(()=>window.Forge90Conditioning.getSession().cardio.status),'Stopped Early');
    assert.equal(await page.evaluate(()=>JSON.parse(window.Forge90Storage.getItem('forge90.v1')).workouts.length),2);
    assert.deepEqual(errors,[]);await context.close();
    fs.writeFileSync(path.join(evidence,'hosted-preview-results.json'),JSON.stringify({url,result:'PASS',assets:Object.keys(expected).length,modes:['four','five'],legacyFixturePreserved:true,stopAndReload:true,errors},null,2));
    console.log('HOSTED_PREVIEW_BROWSER=PASS');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
