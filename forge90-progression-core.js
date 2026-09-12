/* Deterministic policy: equipment availability and clock are explicit inputs. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./forge90-measurements.js'):root.Forge90Measurements);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.Forge90ProgressionCore=api;
})(typeof window==='object'?window:globalThis,function(M){
  'use strict';
  const precedence=['valid completed working data','severity restrictions','explicit baseline','return after gap','available increments','prescribed sets','regression','minimum history','rep plateau','load increase'];
  const repRange=text=>{const p=M.prescription(text);return p.min==null?null:{min:p.min,max:p.max};};
  const increments=(_equipment,configured)=>Array.isArray(configured)?[...new Set(configured.filter(v=>v!==''&&v!=null).map(Number).filter(v=>Number.isFinite(v)&&v>=0))].sort((a,b)=>a-b):[];
  const nextLoad=(weight,equipment,configured)=>increments(equipment,configured).find(n=>n>weight)??null;
  const severity=s=>String(s.discomfort?.severity||'None').toLowerCase();
  const complete=s=>s.status==='completed'||(!s.status&&(s.done===true||s.completed===true));
  const working=s=>!['warmup','warm-up'].includes(s.setType||s.type);
  function calculate({sessions=[],prescription='',equipment='',exerciseKey='',availableLoads=[],fields=['load','reps'],now=Date.now(),gapDays=28,baselineId=null}){
    const p=M.prescription(prescription),range=repRange(prescription),required=p.count||1;
    const matching=sessions.map(s=>({...s,sets:(s.sets||[]).filter(x=>(!exerciseKey||x.exerciseKey===exerciseKey)&&x.equipment===equipment&&working(x))})).filter(s=>s.sets.length).sort((a,b)=>new Date(a.finishedAt||a.completedAt||a.startedAt)-new Date(b.finishedAt||b.completedAt||b.startedAt));
    const valid=s=>s.sets.length>=required&&s.sets.every(x=>complete(x)&&!['moderate','stop / pain','stop/pain','stop','pain'].includes(severity(x))&&M.validate(x,fields,true).valid);
    let eligible=matching.filter(valid);
    if(baselineId){const index=eligible.findIndex(s=>s.id===baselineId);if(index>=0)eligible=eligible.slice(index);}
    const baseline=eligible.at(-1),latest=matching.at(-1);
    const last=(baseline?.sets||latest?.sets.filter(s=>complete(s)&&M.validate(s,fields,true).valid)||[]).map(s=>M.normalize(s,fields));
    const count=p.count||last.length||1,confidence=eligible.length>=3?'High':eligible.length>=2?'Medium':'Low';
    const answer=(kind,explanation,sets=last)=>({kind,range,sets:sets.map(s=>({...s})),explanation,confidence,baselineId:baseline?.id||null,precedence});
    if(!last.length)return answer('new','No previous record. Enter a comfortable starting actual; completion is always deliberate.',[]);
    const fill=()=>Array.from({length:count},(_,i)=>({...last[i]||last.at(-1)}));
    if(latest?.sets.some(s=>!complete(s)||['moderate','stop / pain','stop/pain','stop','pain'].includes(severity(s))))return answer('hold','Interrupted, incomplete or moderate-discomfort results do not establish a progression baseline.',fill());
    const date=new Date(baseline?.finishedAt||baseline?.completedAt||baseline?.startedAt).getTime();
    const loads=increments(equipment,availableLoads),loaded=fields.includes('load');
    if(Number.isFinite(date)&&(now-date)>gapDays*86400000){
      const sets=fill().map(s=>{if(loaded)s.load=loads.filter(n=>n<s.load).at(-1)??s.load;for(const k of fields.filter(k=>!['load','tempo','assistance'].includes(k)))s[k]=Math.max(1,Math.floor(s[k]*0.8));return s;});
      return answer('restart','Return after a training gap. Use a conservative restart and rebuild consistent sessions.',sets);
    }
    if(latest?.sets.some(s=>severity(s)==='mild'))return answer('caution','Mild discomfort recorded. Hold a conservative target.',fill());
    if(loaded&&!loads.length)return answer('hold','Equipment increments are unconfigured. Hold the recorded load until available loads are configured.',fill());
    if(!baseline||latest?.sets.length<count)return answer('hold','Complete all '+count+' prescribed working sets before increasing load.',fill());
    const keys=fields.filter(k=>!['load','tempo','assistance'].includes(k));
    const score=s=>s.sets.reduce((n,x)=>{const a=M.normalize(x,fields);return n+keys.reduce((v,k)=>v+(a[k]||0),0);},0);
    const recent=eligible.slice(-3);
    if(recent.length===3&&score(recent[0])>score(recent[1])&&score(recent[1])>score(recent[2]))return answer('deload','Performance declined across three valid sessions. Reduce one configured increment or hold conservatively.',fill().map(s=>({...s,...(loaded?{load:loads.filter(n=>n<s.load).at(-1)??s.load}:{})})));
    const top=s=>s.sets.length>=count&&s.sets.every(x=>{const a=M.normalize(x,fields);return keys.every(k=>a[k]>=p.max)&&(!loaded||a.load===last[0].load);});
    if(eligible.length>=2&&range&&eligible.slice(-2).every(top)){
      if(loaded){const next=nextLoad(last[0].load,equipment,loads);if(next!=null)return answer('increase-load','All '+count+' working sets reached '+p.max+' in two consistent sessions. '+next+' kg is the next configured increment.',fill().map(s=>({...s,load:next,...Object.fromEntries(keys.map(k=>[k,p.min]))})));}
      else if(fields.includes('assistance')){const next=loads.filter(n=>n<last[0].assistance).at(-1);if(next!=null)return answer('reduce-assistance','Two consistent sessions support one configured reduction in assistance.',fill().map(s=>({...s,assistance:next,...Object.fromEntries(keys.map(k=>[k,p.min]))})));}
      else return answer('increase-measurement','Two consistent completed sessions support one conservative measurement step.',fill().map(s=>({...s,...Object.fromEntries(keys.map(k=>[k,s[k]+(/duration/i.test(k)?5:k==='distance'?5:1)]))})));
    }
    const sets=fill().map(s=>({...s,...Object.fromEntries(keys.map(k=>[k,p.max==null?s[k]:Math.min(p.max,Math.max(p.min,s[k]+(/duration/i.test(k)?5:k==='distance'?5:1)))]))}));
    return answer('improve-reps',eligible.length<2?'Keep the load. At least two consistent valid sessions are required before an automatic load increase.':'Keep the load and work toward the prescribed upper target on every working set.',sets);
  }
  function target(sets,text,equipment,configured){
    const result=calculate({sessions:[{id:'legacy-last',sets:sets.map(s=>({...s,equipment})),finishedAt:new Date().toISOString()}],prescription:text,equipment,availableLoads:configured});
    return {...result,sets:result.sets.map(s=>({weight:s.load??null,reps:s.reps}))};
  }
  function loadMeaning(equipment){const n=String(equipment||'').toLowerCase();return n.includes('dumbbell')?'Weight is per dumbbell / each hand.':/barbell|smith/.test(n)?'Weight is the total loaded barbell weight.':/machine|press|cable/.test(n)?'Weight is the selected machine resistance/load.':'Record the load shown or used for this equipment.';}
  return {repRange,increments,nextLoad,target,calculate,loadMeaning,precedence};
});
