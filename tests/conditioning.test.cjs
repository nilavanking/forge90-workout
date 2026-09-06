const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../forge90-conditioning-core');
const M = C.MINUTE;
test('start / pause / resume / stop use actual timestamps and reject duplicate starts',()=>{
  const a=C.create(20,{kind:'cardio',machine:'bike'});
  assert.equal(C.action(a,'start',1000),true);
  assert.equal(C.action(a,'start',5000),false);
  C.action(a,'pause',1000+7*M);assert.equal(C.actual(a,1000+100*M),7*M);
  C.action(a,'resume',1000+10*M);C.action(a,'stop',1000+15*M,{code:'Time shortage'});
  assert.equal(a.targetMs,20*M);assert.equal(a.elapsedMs,12*M);assert.equal(a.status,'Stopped Early');
  assert.equal(C.action(a,'resume',9999999),false);assert.equal(a.reason.code,'Time shortage');
});
test('completion catches up after background/reload and never overcounts',()=>{
  const a=C.create(20);C.action(a,'start',1000);
  const reopened=JSON.parse(JSON.stringify(a));C.settle(reopened,1000+50*M);
  assert.equal(reopened.status,'Completed');assert.equal(C.actual(reopened,1000+90*M),20*M);
});
test('targets adjust before/during activity with sensible lower bounds',()=>{
  const a=C.create(20);C.adjust(a,5,0);assert.equal(a.targetMs,25*M);
  C.adjust(a,-5,0);assert.equal(a.targetMs,20*M);
  C.adjust(a,-100,0);assert.equal(a.targetMs,5*M);
  C.adjust(a,15,0);C.action(a,'start',0);C.adjust(a,-15,12*M);
  assert.equal(a.targetMs,12*M);assert.equal(a.elapsedMs,12*M);assert.equal(a.status,'Completed');
});
test('skip is distinct from completed and preserves already completed time',()=>{
  const a=C.create(20);C.action(a,'start',0);C.action(a,'skip',2*M,{code:'Fatigue'});
  assert.equal(a.status,'Skipped');assert.equal(a.elapsedMs,2*M);assert.equal(a.reason.code,'Fatigue');
});
test('safety pause survives serialization and requires deliberate clearance',()=>{
  const a=C.create(20);C.action(a,'start',0);C.discomfort(a,4*M);
  const b=JSON.parse(JSON.stringify(a));assert.equal(b.status,'Paused');assert.equal(C.action(b,'resume',10*M),false);
  assert.equal(C.actual(b,20*M),4*M);assert.equal(b.events.at(-1).command,'back-discomfort');
  b.safetyHold=false;assert.equal(C.action(b,'resume',20*M),true);
});
test('cardio calories use actual time and explicit phase boundaries',()=>{
  const a=C.create(20,{machine:'bike'});C.action(a,'start',0);C.action(a,'stop',12*M);
  assert.equal(C.calories(a,100,50*M),Math.round((3*2.5+9*4)*3.5*100/200));
  assert.deepEqual(C.phases(20*M).map(p=>(p.to-p.from)/M),[3,14,3]);
  const b=C.create(20);C.action(b,'start',0);assert.equal(C.phase(b,17*M),'Cooldown');
  assert.equal(C.phaseTimes(b,18*M).Cooldown,M);assert.equal(C.phaseTimes(b,25*M).Cooldown,3*M);
});
test('warm-up can complete repetitions early and never changes workout loads',()=>{
  const w={mode:'four',index:0,logs:[{key:'inclinePress',name:'Incline Chest Press',sets:[{weight:'50'}]}]};
  const before=JSON.stringify(w),routines=C.warmups(w);assert.equal(JSON.stringify(w),before);
  assert.equal(routines.reduce((s,a)=>s+a.minutes,0),7);assert.equal(routines.at(-1).load,20);
  const a=C.create(2,{kind:'warmup'});C.action(a,'start',0);C.action(a,'complete',M);assert.equal(a.elapsedMs,M);
});
test('upper/lower recommendations account for leg workload, conditioning and fatigue',()=>{
  const upper={mode:'five',index:0,logs:[{key:'inclinePress',sets:[{done:true}]}]};
  const lower={mode:'five',index:2,logs:[{key:'legPress',sets:Array.from({length:18},()=>({done:true}))}]};
  assert.equal(C.recommend(upper).minutes,20);assert.equal(C.recommend(upper).machine,'treadmill');
  assert.equal(C.recommend(lower).minutes,15);assert.equal(C.recommend(lower).machine,'recumbent');
  assert.equal(C.recommend(upper,'high').machine,'recumbent');
  assert.equal(C.warmups({...lower,logs:[{key:'legPress',name:'Leg Press',sets:[{}]}]}).reduce((s,a)=>s+a.minutes,0),11);
});
test('progression requires three successful comfortable sessions, duration first',()=>{
  const w={mode:'five',index:0,logs:[{key:'inclinePress',sets:[]}]};
  const history=Array.from({length:3},()=>({lower:false,fatigue:'normal',cardio:{status:'Completed',rpe:5,targetMs:20*M,events:[]}}));
  assert.equal(C.recommend(w,'normal',history).minutes,25);
  history[0].cardio.status='Stopped Early';assert.equal(C.recommend(w,'normal',history).minutes,20);
});

test('calorie segments preserve the machine used before substitution',()=>{const a=C.create(20,{machine:'bike',segments:[{machine:'treadmill',untilMs:5*M}]});C.action(a,'start',0);C.action(a,'stop',12*M);assert.equal(C.calories(a,100,12*M),Math.round((3*2.5+2*4.3+7*4)*3.5*100/200));});
