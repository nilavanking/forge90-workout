/* Forge90 Weight Journey — accurate trend-first weight tracking. */
(() => {
  'use strict';
  const KEY='forge90_weight_v1', storage=window.Forge90Storage;
  const $=id=>document.getElementById(id), day=ts=>new Date(ts).toISOString().slice(0,10);
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initial={unit:'kg',startWeightKg:null,targetWeightKg:98,startDate:day(Date.now()),targetDate:null,goals:[],entries:[]};
  let data=load(), filterDays=90;
  function load(){try{return {...initial,...JSON.parse(storage.getItem(KEY)||'{}'),entries:Array.isArray(JSON.parse(storage.getItem(KEY)||'{}').entries)?JSON.parse(storage.getItem(KEY)||'{}').entries:[]};}catch(_){return {...initial,entries:[]};}}
  function save(){storage.setItem(KEY,JSON.stringify(data));render();}
  const valid=n=>Number.isFinite(Number(n))&&Number(n)>=30&&Number(n)<=300;
  function add(weight,type,notes='',workoutId=null,timestamp=new Date().toISOString()){
    if(!valid(weight))return false;
    data.entries.push({id:`w_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,timestamp,weightKg:Number(weight),type,source:'manual',notes,workoutId});
    data.entries.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
    if(!valid(data.startWeightKg)&&type!=='post-workout'){data.startWeightKg=Number(weight);data.startDate=day(timestamp);}
    save(); return true;
  }
  function official(){
    const rank={'morning':4,'manual':3,'check-in':3,'imported':2,'pre-workout':1};
    const chosen=new Map(); data.entries.filter(e=>e.type!=='post-workout').forEach(e=>{const d=day(e.timestamp),old=chosen.get(d);if(!old||(rank[e.type]||0)>(rank[old.type]||0)||((rank[e.type]||0)===(rank[old.type]||0)&&e.timestamp>old.timestamp))chosen.set(d,e);});
    return [...chosen.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  }
  const avg=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
  function metrics(){
    const o=official(), latest=o[o.length-1], recent=o.slice(-7), trend=avg(recent.map(e=>e.weightKg));
    const start=Number(data.startWeightKg),target=Number(data.targetWeightKg),lost=valid(start)&&trend!=null?start-trend:null,remaining=valid(target)&&trend!=null?trend-target:null;
    const denominator=start-target,progress=lost!=null&&denominator>0?Math.max(0,Math.min(100,lost/denominator*100)):null;
    const cutoff=Date.now()-42*864e5, regression=o.filter(e=>new Date(e.timestamp)>=cutoff);
    let weekly=null;
    if(regression.length>=3){const x=regression.map(e=>(new Date(e.timestamp)-new Date(regression[0].timestamp))/864e5),y=regression.map(e=>e.weightKg),xm=avg(x),ym=avg(y),den=x.reduce((s,v)=>s+(v-xm)**2,0);if(den)weekly=x.reduce((s,v,i)=>s+(v-xm)*(y[i]-ym),0)/den*7;}
    const span=regression.length?(new Date(regression.at(-1).timestamp)-new Date(regression[0].timestamp))/864e5:0;
    const confidence=o.length>=20&&span>=28?'High':o.length>=8&&span>=14?'Medium':'Low';
    const weeks=remaining>0&&weekly<-.05&&span>=14?remaining/-weekly:null;
    const eta=weeks?new Date(Date.now()+weeks*7*864e5):null;
    const last14=o.filter(e=>new Date(e.timestamp)>=Date.now()-14*864e5); const plateau=last14.length>=6&&Math.abs((last14.at(-1)?.weightKg||0)-(last14[0]?.weightKg||0))<.3;
    return {o,latest,trend,start,target,lost,remaining,progress,weekly,confidence,weeks,eta,plateau};
  }
  function fmt(n,d=1){return n==null||!Number.isFinite(n)?'—':`${n.toFixed(d)} kg`;}
  function inject(){
    const bodyGoal=[...document.querySelectorAll('#homeView .card')].find(x=>x.querySelector('h2')?.textContent==='Body goal');
    if(bodyGoal&&!$('weightJourneyCard')){const c=document.createElement('section');c.id='weightJourneyCard';c.className='card weight-hero';c.setAttribute('role','button');c.tabIndex=0;c.innerHTML='<span class="eyebrow">WEIGHT JOURNEY</span><div id="weightHomeContent"></div><p class="muted">View Weight Progress →</p>';bodyGoal.replaceWith(c);c.onclick=()=>openWeight();c.onkeydown=e=>{if(e.key==='Enter')openWeight();};}
    if(!$('weightPanel')){const p=document.createElement('div');p.id='weightPanel';p.innerHTML=`
      <section class="card"><div class="section-head"><div><span class="eyebrow">WEIGHT PROGRESS</span><h2>Weight Journey</h2></div><button id="weightGoalBtn" class="ghost-btn" type="button">Goal settings</button></div><div id="weightMetrics"></div></section>
      <form id="weightEntryForm" class="card"><h2>Add weight</h2><div class="form-grid"><label>Weight (kg)<input id="weightEntryKg" class="input" type="number" min="30" max="300" step="0.1" required></label><label>Measurement type<select id="weightEntryType" class="select"><option value="morning">Morning (preferred)</option><option value="manual">Manual</option><option value="pre-workout">Pre-workout</option><option value="post-workout">Post-workout</option><option value="imported">Imported</option></select></label><label>Notes<input id="weightEntryNotes" class="input" maxlength="100" placeholder="Optional"></label></div><button class="primary-btn full" type="submit">Save weight</button></form>
      <section class="card"><div class="section-head"><h2>Trend graph</h2><span id="weightConfidence" class="weight-badge"></span></div><div id="weightFilters" class="weight-tabs"><button class="small-btn" data-days="7">7D</button><button class="small-btn" data-days="28">28D</button><button class="small-btn" data-days="90">90D</button><button class="small-btn" data-days="0">All</button></div><div id="weightChart"></div><p class="fine-print">The green line is the rolling trend. Post-workout readings are excluded from body-fat progress and used for hydration context only.</p></section>
      <section class="card"><h2>Progress intelligence</h2><div id="weightAdvice"></div></section><section class="card"><div class="section-head"><h2>Measurement history</h2><span id="weightCount" class="muted"></span></div><div id="weightHistory" class="history-list"></div></section>`;
      $('progressView').prepend(p); $('progressForm').insertAdjacentHTML('beforebegin','<div class="weight-note">Body measurements remain below. Weight Journey uses its own standardized trend engine.</div>');
      $('weightEntryForm').onsubmit=e=>{e.preventDefault();if(add($('weightEntryKg').value,$('weightEntryType').value,$('weightEntryNotes').value.trim())){$('weightEntryNotes').value='';}};
      $('weightGoalBtn').onclick=editGoal;$('weightFilters').onclick=e=>{const b=e.target.closest('[data-days]');if(b){filterDays=Number(b.dataset.days);render();}};
    }
  }
  function openWeight(){document.querySelector('[data-view="progressView"]')?.click();setTimeout(()=>$('weightPanel')?.scrollIntoView({behavior:'smooth'}),50);}
  function editGoal(){
    const s=prompt('Starting weight (kg)',valid(data.startWeightKg)?data.startWeightKg:'');if(s===null)return;
    const t=prompt('Target weight (kg)',valid(data.targetWeightKg)?data.targetWeightKg:'98');if(t===null)return;
    if(!valid(s)||!valid(t)||Number(t)>=Number(s)){alert('Enter valid weights. For a weight-loss goal, target must be below starting weight.');return;}
    if(valid(data.startWeightKg)&&(Number(s)!==Number(data.startWeightKg)||Number(t)!==Number(data.targetWeightKg)))data.goals.push({startWeightKg:data.startWeightKg,targetWeightKg:data.targetWeightKg,startDate:data.startDate,closedAt:new Date().toISOString()});
    data.startWeightKg=Number(s);data.targetWeightKg=Number(t);data.startDate=data.startDate||day(Date.now());save();
  }
  function chart(entries){
    if(entries.length<2)return '<div class="empty-state">Add at least two standardized measurements to show the trend.</div>';
    const raw=entries.map(e=>e.weightKg), trends=entries.map((_,i)=>avg(entries.slice(Math.max(0,i-6),i+1).map(e=>e.weightKg))),min=Math.min(...raw,...trends)-.5,max=Math.max(...raw,...trends)+.5,w=600,h=180,p=22;
    const x=i=>p+i*(w-2*p)/(entries.length-1),y=n=>h-p-(n-min)*(h-2*p)/(max-min||1),path=trends.map((n,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
    return `<svg class="weight-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Weight trend chart"><line class="grid" x1="${p}" y1="${p}" x2="${p}" y2="${h-p}"/><line class="grid" x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}"/><text x="${p+3}" y="${p+10}">${max.toFixed(1)}</text><text x="${p+3}" y="${h-p-5}">${min.toFixed(1)}</text><path class="line" d="${path}"/>${raw.map((n,i)=>`<circle class="raw" cx="${x(i)}" cy="${y(n)}" r="3"/>`).join('')}</svg>`;
  }
  function render(){
    inject(); const m=metrics();
    if($('weightHomeContent'))$('weightHomeContent').innerHTML=m.trend==null?'<div class="empty-state">Set your goal and add your first standardized weight.</div>':`<div class="weight-main">${fmt(m.trend)} <small class="muted">7-entry trend</small></div><div>${fmt(m.start)} start → ${fmt(m.target)} target</div><div class="weight-track"><i style="width:${m.progress||0}%"></i></div><div class="weight-kpis"><div><span>Reduced</span><strong>${fmt(Math.max(0,m.lost))}</strong></div><div><span>Remaining</span><strong>${fmt(Math.max(0,m.remaining))}</strong></div><div><span>Completed</span><strong>${m.progress==null?'—':m.progress.toFixed(1)+'%'}</strong></div><div><span>Recent rate</span><strong>${m.weekly==null?'—':(m.weekly>0?'+':'')+m.weekly.toFixed(2)+' kg/wk'}</strong></div></div>`;
    if(!$('weightMetrics'))return;
    $('weightMetrics').innerHTML=`<div class="weight-main">${fmt(m.trend)} <small class="muted">current trend</small></div><div>${fmt(m.start)} start → ${fmt(m.target)} target</div><div class="weight-track"><i style="width:${m.progress||0}%"></i></div><div class="weight-kpis"><div><span>Total reduced</span><strong>${fmt(m.lost)}</strong></div><div><span>Remaining</span><strong>${fmt(m.remaining)}</strong></div><div><span>Goal complete</span><strong>${m.progress==null?'—':m.progress.toFixed(1)+'%'}</strong></div><div><span>Estimated target</span><strong>${m.eta?m.eta.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Collect more data'}</strong></div></div>`;
    $('weightConfidence').textContent=`${m.confidence} confidence`; $('weightFilters').querySelectorAll('button').forEach(b=>b.classList.toggle('active',Number(b.dataset.days)===filterDays));
    const cutoff=filterDays?Date.now()-filterDays*864e5:0, visible=m.o.filter(e=>new Date(e.timestamp)>=cutoff);$('weightChart').innerHTML=chart(visible);
    const workouts=(()=>{try{return JSON.parse(storage.getItem('forge90.v1')||'{}').workouts||[];}catch(_){return [];}})().filter(w=>new Date(w.completedAt)>=Date.now()-30*864e5);
    const volume=workouts.reduce((s,w)=>s+(Number(w.volume)||0),0),session=data.entries.filter(e=>e.type==='post-workout').at(-1),pre=session?data.entries.filter(e=>e.type==='pre-workout'&&(e.workoutId===session.workoutId||day(e.timestamp)===day(session.timestamp))).at(-1):null;
    const weeklyPct=m.weekly!=null&&m.trend?m.weekly/m.trend*100:null;
    const milestone=m.progress>=100?'Target reached':m.progress>=50?'Halfway milestone reached':m.progress>=25?'25% milestone reached':m.lost>=5?'5 kg milestone reached':m.lost>=1?'First 1 kg milestone reached':null;
    $('weightAdvice').innerHTML=`<div class="weight-note">${m.weeks?`At your latest 28–42 day trend, the target may take about <strong>${Math.ceil(m.weeks)} weeks</strong>. This is an estimate, not a promise.`:'An ETA appears only after at least 14 days and 3 usable standardized readings.'}</div>${milestone?`<p class="positive"><strong>Milestone:</strong> ${milestone}.</p>`:''}${m.plateau?'<p class="weight-warning"><strong>Possible plateau:</strong> the 14-day trend changed by less than 0.3 kg. Review consistency, sleep, food and measurements before changing the plan.</p>':''}<p><strong>Last 30 days:</strong> ${workouts.length} workouts · ${Math.round(volume).toLocaleString()} kg training volume${m.weekly==null?'':` · ${m.weekly.toFixed(2)} kg/week (${weeklyPct.toFixed(2)}%) weight trend`}.</p>${pre&&session?`<p class="weight-session">Latest workout change: ${(session.weightKg-pre.weightKg).toFixed(1)} kg. Treat this mainly as hydration/sweat change, not fat loss.</p>`:''}`;
    $('weightCount').textContent=`${data.entries.length} records`;$('weightHistory').innerHTML=data.entries.length?'':'<div class="empty-state">No weight measurements yet.</div>';
    [...data.entries].reverse().forEach(e=>{const row=document.createElement('article');row.className='history-item weight-history-row';row.innerHTML=`<div><strong>${e.weightKg.toFixed(1)} kg</strong><small>${new Date(e.timestamp).toLocaleString()} · ${esc(e.type)}${e.notes?' · '+esc(e.notes):''}</small></div><div class="weight-actions"><button class="small-btn" data-edit>Edit</button><button class="small-btn danger" data-delete>Delete</button></div>`;row.querySelector('[data-edit]').onclick=()=>{const n=prompt('Correct weight (kg)',e.weightKg);if(n!==null&&valid(n)){e.weightKg=Number(n);save();}};row.querySelector('[data-delete]').onclick=()=>{if(confirm('Delete this weight measurement?')){data.entries=data.entries.filter(x=>x.id!==e.id);save();}};$('weightHistory').appendChild(row);});
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#startWorkoutBtn')){const m=metrics(),v=prompt('Pre-workout weight (kg) — optional',m.latest?.weightKg||data.startWeightKg||'');if(v!==null&&v!==''&&!add(v,'pre-workout','',`pending_${Date.now()}`))alert('Enter a weight between 30 and 300 kg.');}
    if(e.target.closest('#finishWorkoutBtn')){let app={};try{app=JSON.parse(storage.getItem('forge90.v1')||'{}');}catch(_){}const id=app.activeWorkout?.id||null,v=prompt('Post-workout weight (kg) — optional. Used for hydration context, not fat-loss progress.','');if(v!==null&&v!==''&&!add(v,'post-workout','',id))alert('Enter a weight between 30 and 300 kg.');}
  },true);
  window.addEventListener('forge90-storage-ready',render); setTimeout(render,150);
})();
