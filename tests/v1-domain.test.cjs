const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../forge90-measurements.js');
const P=require('../forge90-progression-core.js');
const now=Date.UTC(2026,8,9);
const set=(reps=10,extra={})=>({exerciseKey:'press',equipment:'Dumbbells',status:'completed',weight:20,reps,...extra});
const session=(id,reps=10,extra={})=>({id,finishedAt:new Date(now-(4-Number(id))*86400000).toISOString(),sets:Array.from({length:3},()=>set(reps)),...extra});
const run=(sessions,extra={})=>P.calculate({sessions,prescription:'3 × 8–10',equipment:'Dumbbells',exerciseKey:'press',availableLoads:[10,15,20,25,30],now,...extra});
test('Rule 1: one set cannot satisfy three prescribed working sets',()=>assert.equal(run([session('1',10,{sets:[set()]})]).kind,'hold'));
test('Rules 2 and 9: severity policy holds or excludes unsafe baselines',()=>{
  for(const [severity,kind] of [['Mild','caution'],['Moderate','hold'],['Stop / Pain','hold']]){
    const latest=session('3');latest.sets[2].discomfort={severity};
    if(severity==='Stop / Pain')latest.sets[2].status='interrupted';
    const result=run([session('1'),session('2'),latest]);assert.equal(result.kind,kind);assert.notEqual(result.kind,'increase-load');
  }
});
test('Rule 3: prescriptions distinguish counts, ranges, seconds and sides',()=>{
  for(const [text,count,min,max,metric,sides] of [['3 × 8–10',3,8,10,'reps',false],['3 × 12 / leg',3,12,12,'reps',true],['3 × 30 sec',3,30,30,'duration',false],['3 × 20 sec / side',3,20,20,'duration',true]])assert.deepEqual(M.prescription(text),{count,min,max,metric,sides,tempo:null});
});
test('Rule 4: warmups cannot establish Last or target',()=>{
  const a=session('1'),b=session('2');a.sets.unshift(set(100,{setType:'warmup',weight:100}));b.sets.unshift(set(100,{type:'warm-up',weight:100}));
  assert.equal(run([a,b]).sets[0].load,25);
});
test('Rules 5 and 13: configuration and one-step load guard',()=>{
  assert.deepEqual(P.increments('Dumbbells'),[]);
  assert.equal(run([session('1'),session('2')],{availableLoads:[]}).kind,'hold');
  assert.equal(run([session('1'),session('2')]).sets[0].load,25);
});
test('Rule 6: automatic load increases need two consistent sessions',()=>{
  assert.notEqual(run([session('1')]).kind,'increase-load');
  assert.equal(run([session('1'),session('2')]).kind,'increase-load');
});
test('Rule 7: uncommitted prefills and abandoned sets do not count',()=>{
  for(const status of ['notStarted','active','skipped','abandoned'])assert.notEqual(run([session('1'),session('2',10,{sets:[set(10,{status}),set(),set()]})]).kind,'increase-load');
});
test('Rule 8: repeated decline reduces one configured increment',()=>{const t=run([session('1',10),session('2',9),session('3',8)]);assert.equal(t.kind,'deload');assert.equal(t.sets[0].load,15);});
test('Rule 9: plateau increases reps within prescription before load',()=>{const t=run([session('1',8),session('2',8),session('3',8)]);assert.equal(t.sets[0].load,20);assert.equal(t.sets[0].reps,9);});
test('Rule 10: actual override takes precedence over target',()=>{
  const a=session('1'),b=session('2');for(const s of [...a.sets,...b.sets])s.target={load:100,reps:8};assert.equal(run([a,b]).sets[0].load,25);
});
test('Rule 11: duration, independent sides, bodyweight and distance',()=>{
  for(const [fields,prescription,actual,expected] of [[['duration'],'3 × 30 sec',{duration:30},35],[['leftReps','rightReps'],'3 × 12 / side',{leftReps:12,rightReps:12},13],[['distance'],'3 × 20 m',{distance:20},25]]){
    const sessions=['1','2'].map(id=>session(id,10,{sets:Array.from({length:3},()=>set(10,{actual}))}));
    assert.equal(run(sessions,{fields,prescription}).sets[0][fields[0]],expected);
  }
});
test('Rule 12: progression never mutates historical input',()=>{const a=[session('1'),session('2')],before=structuredClone(a);run(a);assert.deepEqual(a,before);});
test('Rule 14: exercise and equipment histories are independent',()=>{
  const a=session('1'),b=session('2');b.sets.forEach(s=>s.equipment='Machine');assert.notEqual(run([a,b]).kind,'increase-load');
  b.sets.forEach(s=>{s.equipment='Dumbbells';s.exerciseKey='other-press';});assert.notEqual(run([a,b]).kind,'increase-load');
});
test('Rule 15: gap keeps Last and returns conservative restart',()=>{const a=session('1',10,{finishedAt:new Date(now-40*86400000).toISOString()});const t=run([a]);assert.equal(t.kind,'restart');assert.equal(t.sets[0].load,15);assert.equal(a.sets[0].weight,20);});
test('Rule 16: explicit valid reset excludes earlier sessions',()=>{
  assert.notEqual(run([session('1'),session('2')],{baselineId:'2'}).kind,'increase-load');
  const bad=session('3');bad.sets[0].discomfort={severity:'Moderate'};assert.equal(run([session('1'),session('2'),bad],{baselineId:'3'}).baselineId,'2');
});
test('Explanations, deterministic confidence and safety precedence',()=>{
  for(const [n,confidence] of [[1,'Low'],[2,'Medium'],[3,'High']]){const t=run(Array.from({length:n},(_,i)=>session(String(i+1))));assert.equal(t.confidence,confidence);assert.ok(t.explanation.length>20);}
  const a=session('1');a.sets[0].discomfort={severity:'Moderate'};assert.equal(run([a],{baselineId:'1'}).kind,'hold');
});
test('Measurement inputs, units, missing values and validation',()=>{
  assert.deepEqual(M.fields('Bird Dog','3 × 12 / side','Bodyweight'),['leftReps','rightReps']);
  assert.deepEqual(M.fields('Cable Pallof Hold','3 × 30 sec / side','Cable Machine'),['load','leftDuration','rightDuration']);
  assert.deepEqual(M.normalize({weight:'',reps:''}),{});
  assert.equal(M.format({load:15,leftDuration:30,rightDuration:30}),'15 kg × 30 sec/side');
  assert.equal(M.format({leftReps:12,rightReps:10}),'L12 / R10 reps');
  for(const actual of [{duration:-1},{duration:'abc'},{duration:''}])assert.equal(M.validate(actual,['duration'],true).valid,false);
  assert.equal(M.validate({tempo:'3-1-X-0'},['tempo'],true).valid,true);
  assert.equal(M.validate({tempo:'fast'},['tempo'],true).valid,false);
  assert.equal(M.validate({leftReps:1.5,rightReps:10},['leftReps','rightReps'],true).valid,false);
});
