(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Forge90ProgressionCore=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const numeric=v=>v!==''&&v!=null&&Number.isFinite(Number(v));
  function repRange(text){
    const values=String(text||'').match(/\d+(?:\.\d+)?/g)?.map(Number)||[];
    if(!values.length)return null;
    const reps=values.length>2?values.slice(-2):values;
    return {min:reps[0],max:reps[1]||reps[0]};
  }
  function increments(equipment,configured){
    if(Array.isArray(configured)&&configured.length)return [...new Set(configured.map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
    const name=String(equipment||'').toLowerCase();
    if(name.includes('dumbbell'))return [1,2,3,4,5,6,7.5,8,9,10,12.5,15,17.5,20,22.5,25,27.5,30,32.5,35,37.5,40,42.5,45,47.5,50];
    if(name.includes('barbell')||name.includes('smith'))return Array.from({length:40},(_,i)=>(i+1)*2.5);
    return [];
  }
  function nextLoad(weight,equipment,configured){return increments(equipment,configured).find(value=>value>Number(weight))??null;}
  function target(lastSets,prescription,equipment,configured){
    const range=repRange(prescription);
    const last=(lastSets||[]).filter(s=>numeric(s.reps)).map(s=>({weight:numeric(s.weight)?Number(s.weight):null,reps:Number(s.reps),type:s.type||'working'})).filter(s=>s.type!=='warmup');
    if(!range||!last.length)return {kind:'new',range,sets:[],explanation:'No previous record. Choose a comfortable starting weight and use controlled form.'};
    const commonWeight=last.every(s=>s.weight===last[0].weight)?last[0].weight:null;
    const allTop=last.length>0&&last.every(s=>s.reps>=range.max)&&commonWeight!=null;
    if(allTop){
      const load=nextLoad(commonWeight,equipment,configured);
      if(load!=null)return {kind:'increase-load',range,sets:last.map(()=>({weight:load,reps:range.min})),explanation:`You reached ${range.max} reps on all working sets. The next available ${equipment||'equipment'} load is ${load} kg, so the target returns to ${range.min} reps.`};
    }
    return {kind:'improve-reps',range,sets:last.map(s=>({weight:s.weight,reps:Math.min(range.max,Math.max(range.min,s.reps+(s.reps<range.max?1:0)))})),explanation:`Keep the same load and improve incomplete sets toward ${range.max} controlled reps before increasing weight.`};
  }
  function loadMeaning(equipment){const name=String(equipment||'').toLowerCase();if(name.includes('dumbbell'))return 'Weight is per dumbbell / each hand.';if(name.includes('barbell')||name.includes('smith'))return 'Weight is the total loaded barbell weight.';if(name.includes('machine')||name.includes('press')||name.includes('cable'))return 'Weight is the selected machine resistance/load.';return 'Record the load shown or used for this equipment.';}
  return {repRange,increments,nextLoad,target,loadMeaning};
});
