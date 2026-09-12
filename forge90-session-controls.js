/* Forge90 v2 session controls — reconciled for IndexedDB/Dexie, 2026-09-02. */
(() => {
  'use strict';
  const storage = window.Forge90Storage;
  const PREF_KEY='forge90_equipment_preferences_v2', WEIGHT_KEY='forge90_equipment_weight_memory_v2';
  const HISTORY_KEY='forge90_session_history_v2', LAST_KEY='forge90_last_session_summary_v2', ACTIVE_KEY='forge90_session_active_v2';
  const SETUP_KEY='forge90_equipment_setup_notes_v1', NOTE_KEY='forge90_exercise_notes_v1';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const txt=e=>(e?.innerText||e?.textContent||'').replace(/\s+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parse=(s,f)=>{try{return s?JSON.parse(s):f}catch{return f}};
  const now=()=>Date.now(), clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const fmt=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`};
  const slug=s=>String(s||'exercise').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80)||'exercise';
  const RULES=[
    [/incline.*press/i,['Dumbbells','Barbell','Smith Machine','Incline Chest Press Machine']],
    [/chest press|flat press/i,['Dumbbells','Barbell','Smith Machine','Chest Press Machine']],
    [/pec deck|chest fly|cable fly/i,['Pec Deck Machine','Cable Machine','Dumbbells']],
    [/shoulder press/i,['Dumbbells','Barbell','Smith Machine','Shoulder Press Machine']],
    [/lateral raise/i,['Dumbbells','Cable Machine','Lateral Raise Machine']],
    [/lat pulldown/i,['Lat Pulldown Machine','Cable Pulldown Station','Assisted Pull-up Machine']],
    [/row/i,['Cable Row Machine','Row Machine','Dumbbells']],
    [/curl/i,['Dumbbells','EZ Curl Bar','Cable Machine','Curl Machine']],
    [/triceps|pushdown/i,['Cable Machine + Rope','Cable Machine + Bar','Dumbbell']],
    [/leg press/i,['45° Leg Press','Horizontal Leg Press','Seated Leg Press']],
    [/leg extension/i,['Leg Extension Machine']], [/leg curl/i,['Seated Leg Curl Machine','Lying Leg Curl Machine']],
    [/calf raise/i,['Calf Raise Machine','Leg Press','Smith Machine']],
    [/pallof/i,['Cable Machine','Resistance Band']], [/hip abductor/i,['Hip Abductor Machine']],
    [/hip adductor/i,['Hip Adductor Machine']], [/hip abduction/i,['Cable Machine + Ankle Strap','Hip Abductor Machine']],
    [/hip adduction/i,['Cable Machine + Ankle Strap','Hip Adductor Machine']],
    [/glute drive|hip.?thrust/i,['Glute Drive Machine','Hip Thrust Machine','Smith Machine','Barbell']],
    [/glute kickback/i,['Cable Machine + Ankle Strap','Glute Kickback Machine']],
    [/dead bug|plank|heel slide|supine march/i,['Bodyweight','Exercise Mat']],
    [/bird dog|glute bridge|side-lying|band hip/i,['Bodyweight','Resistance Band']],
    [/treadmill|incline walk/i,['Treadmill']], [/bike|cycling/i,['Stationary Bike','Recumbent Bike','Spin Bike']],
    [/elliptical|cross trainer/i,['Elliptical / Cross Trainer']], [/rower/i,['Rowing Machine']]
  ];
  const equipmentFor=(name,body='')=>{const src=`${name} ${body}`;for(const [re,o] of RULES)if(re.test(src))return o;return /cable/i.test(src)?['Cable Machine']:/dumbbell/i.test(src)?['Dumbbells']:/machine/i.test(src)?['Prescribed Machine']:['Prescribed Equipment'];};
  const getPrefs=()=>parse(storage.getItem(PREF_KEY),{}), setPrefs=v=>storage.setItem(PREF_KEY,JSON.stringify(v));
  const getWeights=()=>parse(storage.getItem(WEIGHT_KEY),{}), setWeights=v=>storage.setItem(WEIGHT_KEY,JSON.stringify(v));
  const getHistory=()=>parse(storage.getItem(HISTORY_KEY),[]);
  const getSetup=()=>parse(storage.getItem(SETUP_KEY),{}),setSetup=v=>storage.setItem(SETUP_KEY,JSON.stringify(v));
  const getNotes=()=>parse(storage.getItem(NOTE_KEY),{}),setNotes=v=>storage.setItem(NOTE_KEY,JSON.stringify(v));
  const blank=()=>({id:`session-${now()}`,startedAt:null,finishedAt:null,activeSet:null,timer:null,warmupSec:0,cardioSec:0,liftingSec:0,setRestSec:0,transitionSec:0,sets:[],skipped:[]});
  let state=parse(storage.getItem(ACTIVE_KEY),null)||parse(sessionStorage.getItem(ACTIVE_KEY),null)||blank(), ticker=null, bypass=false;
  const persist=()=>{storage.setItem(ACTIVE_KEY,JSON.stringify(state));sessionStorage.setItem(ACTIVE_KEY,JSON.stringify(state));};
  const M=window.Forge90Measurements;
  const CONFIG_KEY='forge90_available_loads_v1', BASELINE_KEY='forge90_baselines_v1';
  const ensureStart=()=>{if(!state.startedAt){state.startedAt=now();persist();requestAlerts();}ensureTicker();};
  function requestAlerts(){try{if('Notification'in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{});}catch{}}
  function notify(kind){try{navigator.vibrate?.(kind==='workout'?[150,70,150,70,300]:kind==='transition'?[120,80,160]:[120]);}catch{};if(document.hidden&&'Notification'in window&&Notification.permission==='granted'){try{new Notification(`Forge90 — ${kind==='workout'?'Workout complete':kind==='transition'?'Next exercise ready':'Rest complete'}`);}catch{}}}
  function timerRemaining(){if(!state.timer)return 0;if(state.timer.paused)return Math.ceil(state.timer.remainingMs/1000);return Math.max(0,Math.ceil((state.timer.deadline-now())/1000));}
  function settleTimer(status='completed'){if(!state.timer)return;const t=state.timer,elapsed=Math.max(0,(t.durationSec-timerRemaining()));if(t.kind==='set-rest')state.setRestSec+=elapsed;if(t.kind==='transition')state.transitionSec+=elapsed;if(t.kind==='warmup')state.warmupSec+=elapsed;if(t.kind==='cardio')state.cardioSec+=elapsed;if(status==='skipped')state.skipped.push({kind:t.kind,at:new Date().toISOString()});const kind=t.kind;state.timer=null;persist();if(status==='completed')notify(kind);render();}
  function startTimer(kind,sec,meta={}){ensureStart();if(state.timer)settleTimer('replaced');sec=clamp(Number(sec)||60,1,3600);state.timer={kind,durationSec:sec,deadline:now()+sec*1000,paused:false,remainingMs:sec*1000,meta};persist();render();}
  function toggleTimer(){if(!state.timer)return;if(state.timer.paused){state.timer.deadline=now()+state.timer.remainingMs;state.timer.paused=false}else{state.timer.remainingMs=Math.max(0,state.timer.deadline-now());state.timer.paused=true}persist();render();}
  function adjustTimer(delta){if(!state.timer)return;const rem=clamp(timerRemaining()+delta,0,3600);state.timer.durationSec=Math.max(state.timer.durationSec,rem);state.timer.remainingMs=rem*1000;state.timer.deadline=now()+rem*1000;persist();if(rem<=0)settleTimer('skipped');else render();}
  const exerciseName=card=>txt($('.exercise-head h3,.exercise-head strong,h3,strong',card))||'Exercise';
  const rows=card=>$$('.set-row,.f90x-set',card);
  function recordKey(card,i){return (card.dataset.recordScope||(card.closest('#forge90-home-core-overlay')?'home:':'gym:'))+slug(exerciseName(card))+':'+i;}
  function getRecord(card,i){
  state.records ||= {};
  const key=recordKey(card,i);
  if(!state.records[key]){
    const base=card.dataset.exerciseIndex!=null?window.Forge90App.getActive()?.logs[Number(card.dataset.exerciseIndex)]?.sets[i]:parse(rows(card)[i]?.dataset.savedRecord,null);
    const row=rows(card)[i],inputs=$$('input[type="number"]',row);
    const allowed=M.fields(exerciseName(card),prescription(card),equipment(card));
    const legacy=base?.actual?base.actual:{load:base?.weight??inputs[0]?.value??'',reps:base?.reps??inputs[1]?.value??''};
    const check=$('input[type="checkbox"]',row),done=base?.done??check?.checked??false;
    state.records[key]={id:key,exercise:exerciseName(card),exerciseKey:slug(exerciseName(card)),setIndex:i+1,equipment:equipment(card),fields:allowed,units:Object.fromEntries(allowed.map(k=>[k,M.units[k]])),actual:M.normalize(legacy,allowed),target:{},setType:'working',status:done?'completed':'notStarted',discomfort:{severity:'None',bodyArea:'',note:''},...(base?.actual?base:{})};
  }
  return state.records[key];
}
  function commitRecord(card,i){
  const rec=getRecord(card,i);
  rec.weight=rec.actual.load??'';rec.reps=rec.actual.reps??'';rec.done=rec.status==='completed';
  if(rec.status==='active')state.activeSet=structuredClone(rec);
  const found=state.sets.findIndex(x=>x.id===rec.id);
  if(['completed','interrupted'].includes(rec.status)){if(found>=0)state.sets[found]=structuredClone(rec);else state.sets.push(structuredClone(rec));}
  if(card.dataset.exerciseIndex!=null)window.Forge90App.updateSet(Number(card.dataset.exerciseIndex),i,rec);
  const row=rows(card)[i],check=$('input[type="checkbox"]',row);
  if(check)check.checked=rec.done;
  row?.dispatchEvent(new CustomEvent('forge90-set-record',{bubbles:true,detail:structuredClone(rec)}));
  persist();
}
  function editableFields(card,row,i){
  const rec=getRecord(card,i);
  if(row.dataset.typedFields===rec.fields.join(','))return;
  row.dataset.typedFields=rec.fields.join(',');
  $$('input[type="number"],label.mini-label',row).forEach(el=>el.remove());
  let box=$('.f90v1-fields',row);if(!box){box=document.createElement('div');box.className='f90v1-fields';row.appendChild(box);}box.replaceChildren();
  rec.fields.forEach(key=>{
    const label=document.createElement('label');label.className='mini-label';
    label.append(document.createTextNode(({load:'Load (kg)',leftReps:'Left reps',rightReps:'Right reps',leftDuration:'Left (sec)',rightDuration:'Right (sec)',duration:'Duration (sec)',distance:'Distance (m)',reps:'Reps',tempo:'Tempo',assistance:'Assistance (kg)'})[key]));
    const input=document.createElement('input');input.className='mini-input';input.dataset.measure=key;input.type=key==='tempo'?'text':'number';input.min='0';input.step=/reps/i.test(key)?'1':'any';input.value=rec.actual[key]??'';input.setAttribute('aria-label',exerciseName(card)+' set '+(i+1)+' '+key);input.disabled=['completed','interrupted'].includes(rec.status);
    input.addEventListener('input',()=>{const values=Object.fromEntries($$('[data-measure]',row).map(el=>[el.dataset.measure,el.value]));const checked=M.validate(values,rec.fields);input.setCustomValidity(checked.valid?'':checked.error);if(checked.valid){rec.actual=checked.actual;commitRecord(card,i);}});
    label.appendChild(input);box.appendChild(label);
  });
}
  function discomfortControl(card,row,i){
  if($('.f90v1-discomfort',row))return;
  const rec=getRecord(card,i),box=document.createElement('details');box.className='f90v1-discomfort';
  box.innerHTML='<summary>Discomfort: <span></span></summary><label>Severity<select data-severity><option>None</option><option>Mild</option><option>Moderate</option><option>Stop / Pain</option></select></label><label>Body area (optional)<input data-area maxlength="100"></label><label>Note (optional)<input data-pain-note maxlength="300"></label><button type="button">Save discomfort</button>';
  $('[data-severity]',box).value=rec.discomfort.severity;$('[data-area]',box).value=rec.discomfort.bodyArea||'';$('[data-pain-note]',box).value=rec.discomfort.note||'';$('summary span',box).textContent=rec.discomfort.severity==='None'?'No discomfort':rec.discomfort.severity;
  $('button',box).onclick=()=>{rec.discomfort={severity:$('[data-severity]',box).value,bodyArea:$('[data-area]',box).value,note:$('[data-pain-note]',box).value};if(rec.discomfort.severity==='Stop / Pain'&&['active','completed'].includes(rec.status)){rec.status='interrupted';rec.completedAt=new Date().toISOString();if(state.activeSet?.id===rec.id)state.activeSet=null;}commitRecord(card,i);$('summary span',box).textContent=rec.discomfort.severity==='None'?'No discomfort':rec.discomfort.severity;render();};row.appendChild(box);
}
  function syncControls(card){
  const key=slug(exerciseName(card)),active=state.activeSet?.exerciseKey===key,select=$('.f90v2-equipment select',card);
  if(select){select.disabled=!!active;if(active)select.value=state.activeSet.equipment;}
  let status=$('.f90v1-exercise-status',card);if(!status){status=document.createElement('small');status.className='f90v1-exercise-status';$('.exercise-head',card)?.appendChild(status);}const records=rows(card).map((_,i)=>getRecord(card,i)),doneCount=records.filter(r=>['completed','interrupted'].includes(r.status)).length;const statusText=active?'In Progress · Active set':doneCount===records.length?'Completed · '+doneCount+'/'+records.length:records.some(r=>r.status!=='notStarted')?'In Progress · '+doneCount+'/'+records.length:'Not Started';if(status.textContent!==statusText)status.textContent=statusText;
  let notice=$('.f90v1-lock',card);if(!notice){notice=document.createElement('p');notice.className='f90v1-lock';notice.setAttribute('role','status');$('.f90v2-equipment',card)?.appendChild(notice);}const stale=active&&(now()-state.activeSet.startedAt)>(parse(storage.getItem('forge90_session_settings_v1'),{}).staleAfterHours||12)*3600000;const message=active?(stale?'Resumed session: this set has been open for a long time. Review the actuals and deliberately Complete or record Stop / Pain. ':'')+'Complete the active set before changing equipment.':'';if(notice.textContent!==message)notice.textContent=message;
  rows(card).forEach((row,i)=>{const rec=getRecord(card,i),b=$('.f90v2-start',row);if(!b)return;const done=['completed','interrupted'].includes(rec.status),label=rec.status==='active'?'Complete':rec.status==='interrupted'?'Stopped':done?'Done':'Start';if(b.textContent!==label)b.textContent=label;b.disabled=done;b.classList.toggle('active',rec.status==='active');b.classList.toggle('completed',done);$$('[data-measure]',row).forEach(input=>{input.disabled=done;});let result=$('.f90v1-actual',row);if(!result){result=document.createElement('small');result.className='f90v1-actual';row.appendChild(result);}const display=(done?rec.equipment+' — ':'Actual: ')+M.format(rec.actual);if(result.textContent!==display)result.textContent=display;});
}
  function configureLoads(card){
  if($('.f90v1-load-config',card))return;
  const box=document.createElement('details');box.className='f90v1-load-config';box.innerHTML='<summary>Available equipment loads</summary><label>Available loads in kg, separated by commas<input data-loads placeholder="e.g. 10, 15, 20, 25"></label><button type="button">Save available loads</button><p role="status"></p>';
  $('input',box).value=(parse(storage.getItem(CONFIG_KEY),{})[equipment(card)]||[]).join(', ');
  $('button',box).onclick=()=>{const values=$('input',box).value.split(',').map(v=>v.trim());if(values.some(v=>!v||!Number.isFinite(Number(v))||Number(v)<0)){$('p',box).textContent='Enter non-negative loads separated by commas.';return;}const config=parse(storage.getItem(CONFIG_KEY),{});config[equipment(card)]=values.map(Number);storage.setItem(CONFIG_KEY,JSON.stringify(config));$('p',box).textContent='Available loads saved.';updateTargets(card);};card.appendChild(box);
}
  function equipment(card){return $('.f90v2-equipment select',card)?.value||'Prescribed Equipment';}
  function completedFor(name,eq){const key=slug(name),sets=[];for(const session of [...getHistory()].reverse()){const matches=(session.sets||[]).filter(s=>s.status==='completed'&&!['warmup','warm-up'].includes(s.setType||s.type)&&s.exerciseKey===key&&s.equipment===eq);if(matches.length)return matches.sort((a,b)=>a.setIndex-b.setIndex);}return sets;}
  function prescription(card){return txt($('.target,.f90x-meta',card)).replace(/^Plan:\s*/i,'');}
  function loadDetails(card){const note=$('.f90v2-load-meaning',card);if(note)note.textContent=window.Forge90ProgressionCore.loadMeaning(equipment(card));}
  function updateTargets(card,force=false){
  const name=exerciseName(card),eq=equipment(card),history=getHistory(),all=rows(card),loads=parse(storage.getItem(CONFIG_KEY),{})[eq]||[];
  const target=window.Forge90ProgressionCore.calculate({sessions:history,prescription:prescription(card),equipment:eq,exerciseKey:slug(name),availableLoads:loads,fields:M.fields(name,prescription(card),eq),baselineId:parse(storage.getItem(BASELINE_KEY),{})[slug(name)+'|'+eq]});
  const last=completedFor(name,eq);
  all.forEach((row,i)=>{
    const rec=getRecord(card,i),terminal=['completed','interrupted'].includes(rec.status);
    if(!terminal&&rec.status!=='active'&&force){rec.equipment=eq;rec.fields=M.fields(name,prescription(card),eq);rec.units=Object.fromEntries(rec.fields.map(k=>[k,M.units[k]]));rec.actual={};rec.target={};rec.discomfort={severity:'None',bodyArea:'',note:''};}
    if(!terminal&&rec.status!=='active'){
      rec.target=structuredClone(target.sets[i]||target.sets.at(-1)||{});
      if(force||!Object.keys(rec.actual).length)rec.actual=structuredClone(rec.target);
    }
    editableFields(card,row,i);
    if(force){$$('[data-measure]',row).forEach(input=>input.value=rec.actual[input.dataset.measure]??'');const pain=$('.f90v1-discomfort',row);if(pain){$('[data-severity]',pain).value=rec.discomfort.severity;$('[data-area]',pain).value=rec.discomfort.bodyArea||'';$('[data-pain-note]',pain).value=rec.discomfort.note||'';$('summary span',pain).textContent=rec.discomfort.severity==='None'?'No discomfort':rec.discomfort.severity;}}
    let line=$('.f90v2-target',row);if(!line){line=document.createElement('div');line.className='f90v2-target';row.appendChild(line);}
    const prior=last[i];
    line.textContent='Last: '+(prior?M.format(prior):'No previous record')+' → Target: '+M.format(rec.target);
    line.title=target.explanation;
    let explain=$('.f90v1-explanation',row);if(!explain){explain=document.createElement('small');explain.className='f90v1-explanation';row.appendChild(explain);}explain.textContent=target.explanation+' Confidence: '+target.confidence;
    commitRecord(card,i);
  });loadDetails(card);
}
  function showHistory(card){
  const name=exerciseName(card),eq=equipment(card),all=getHistory(),sessions=all.map(session=>({...session,sets:(session.sets||[]).filter(x=>['completed','interrupted'].includes(x.status)&&x.exerciseKey===slug(name)&&x.equipment===eq)})).filter(x=>x.sets.length).reverse();
  let d=$('#f90v2-history-dialog');if(!d){d=document.createElement('dialog');d.id='f90v2-history-dialog';d.className='dialog';document.body.appendChild(d);}d.replaceChildren();
  const box=document.createElement('div');box.className='dialog-card';const title=document.createElement('h2');title.textContent=name+' — '+eq;box.appendChild(title);
  const close=document.createElement('button');close.textContent='Close';close.onclick=()=>d.close();box.appendChild(close);
  if(!sessions.length){const p=document.createElement('p');p.textContent='No previous record';box.appendChild(p);}
  for(const session of sessions){
    const article=document.createElement('article');article.className='history-item';const date=document.createElement('strong');date.textContent=new Date(session.finishedAt||session.startedAt).toLocaleDateString();article.appendChild(date);
    for(const set of session.sets){
      const p=document.createElement('p');p.textContent=M.format(set)+' · '+set.status+' · '+(set.discomfort?.severity||'No discomfort');article.appendChild(p);
      const edit=document.createElement('button');edit.textContent='Edit discomfort';edit.onclick=()=>{
        const form=document.createElement('div');form.innerHTML='<label>Severity<select><option>None</option><option>Mild</option><option>Moderate</option><option>Stop / Pain</option></select></label><label>Body area<input data-area maxlength="100"></label><label>Note<input data-note maxlength="300"></label><button>Save correction</button>';
        $('select',form).value=set.discomfort?.severity||'None';$('[data-area]',form).value=set.discomfort?.bodyArea||'';$('[data-note]',form).value=set.discomfort?.note||'';
        $('button',form).onclick=()=>{const rec=all.find(x=>x.id===session.id)?.sets.find(x=>x.id===set.id&&x.setIndex===set.setIndex&&x.exerciseKey===set.exerciseKey&&x.equipment===set.equipment);if(!rec)return;rec.discomfort={severity:$('select',form).value,bodyArea:$('[data-area]',form).value,note:$('[data-note]',form).value};if(rec.discomfort.severity==='Stop / Pain')rec.status='interrupted';storage.setItem(HISTORY_KEY,JSON.stringify(all));window.Forge90App.correctDiscomfort(session.id,rec);showHistory(card);};
        article.appendChild(form);
      };article.appendChild(edit);
    }
    const baseline=document.createElement('button');baseline.textContent='Use as new baseline';const eligible=session.sets.filter(x=>!['warmup','warm-up'].includes(x.setType||x.type));baseline.disabled=eligible.length<(M.prescription(prescription(card)).count||1)||eligible.some(x=>x.status!=='completed'||['Moderate','Stop / Pain'].includes(x.discomfort?.severity)||!M.validate(x,M.fields(name,prescription(card),eq),true).valid);
    baseline.onclick=()=>{const selected=parse(storage.getItem(BASELINE_KEY),{});selected[slug(name)+'|'+eq]=session.id;storage.setItem(BASELINE_KEY,JSON.stringify(selected));updateTargets(card);d.close();};article.appendChild(baseline);box.appendChild(article);
  }
  d.appendChild(box);if(!d.open)d.showModal();
}
  function addEquipment(card){if($('.f90v2-equipment',card))return;const name=exerciseName(card),key=slug(name),opts=equipmentFor(name,txt(card)),prefs=getPrefs(),selected=prefs[key]&&opts.includes(prefs[key])?prefs[key]:opts[0];const wrap=document.createElement('div');wrap.className='f90v2-equipment';wrap.innerHTML=`<label>Equipment <select aria-label="Equipment for ${esc(name)}">${opts.map(o=>`<option${o===selected?' selected':''}>${esc(o)}</option>`).join('')}</select></label><button type="button" class="f90v2-history">History</button><span class="f90v2-load-meaning"></span>`;const head=$('.exercise-head',card)||card.firstElementChild;head?.insertAdjacentElement('afterend',wrap);const select=$('select',wrap);$('.f90v2-history',wrap).onclick=()=>showHistory(card);select.onchange=()=>{const p=getPrefs();p[key]=select.value;setPrefs(p);hydrateWeights(card,true);};hydrateWeights(card);}
  function hydrateWeights(card,force=false){updateTargets(card,force);updateNotes(card);}
  function addSetButtons(card){
  rows(card).forEach((row,i)=>{
    const rec=getRecord(card,i);editableFields(card,row,i);discomfortControl(card,row,i);
    if($('.f90v2-start',row))return;
    const check=$('input[type="checkbox"]',row);if(!check)return;check.classList.add('f90v2-complete-check');check.setAttribute('aria-hidden','true');check.tabIndex=-1;
    const b=document.createElement('button');b.type='button';b.className='f90v2-start';check.insertAdjacentElement('beforebegin',b);
    b.onclick=e=>{
      e.preventDefault();if(['completed','interrupted'].includes(rec.status))return;
      if(rec.status==='active'){
        const validation=M.validate(Object.fromEntries($$('[data-measure]',row).map(input=>[input.dataset.measure,input.value])),rec.fields,true);
        if(!validation.valid){alert(validation.error);return;}rec.actual=validation.actual;
        rec.status=rec.discomfort.severity==='Stop / Pain'?'interrupted':'completed';rec.completedAt=new Date().toISOString();rec.activeSec=Math.max(0,Math.round((now()-rec.startedAt-(rec.pausedMs||0))/1000));state.liftingSec+=rec.activeSec;state.activeSet=null;commitRecord(card,i);
        const final=rows(card).every((_,j)=>['completed','interrupted'].includes(getRecord(card,j).status));
        startTimer(final?'transition':'set-rest',final?90:60,{exercise:rec.exercise});
        if(final){setExpanded(card,false);const cards=$$('.exercise-card,#forge90-gym-addons .f90x-ex,#forge90-home-core-overlay .f90x-ex'),next=cards.slice(cards.indexOf(card)+1).find(c=>rows(c).some((_,j)=>!['completed','interrupted'].includes(getRecord(c,j).status)));if(next){setExpanded(next,true);state.open['phase:'+(next.closest('#forge90-gym-addons')?'core':'strength')]=true;}else{state.open['phase:strength']=false;state.open['phase:core']=false;const head=$('#f90c-cardio > .f90c-accordion-head');if(head?.getAttribute('aria-expanded')==='false')head.click();}}
      }else{
        if(state.activeSet){alert('Complete the active set before starting another set.');return;}
        if(!card.closest('#forge90-home-core-overlay')&&window.Forge90Conditioning&&!window.Forge90Conditioning.onStrengthStart(exerciseName(card),!!card.closest('#forge90-gym-addons')))return;
        ensureStart();rec.status='active';rec.startedAt=now();rec.equipment=equipment(card);state.activeSet={...structuredClone(rec)};commitRecord(card,i);setExpanded(card,true);
      }
      render();
    };
  });syncControls(card);configureLoads(card);
}
  function finishActive(reason='completed'){if(!state.activeSet)return null;const a=state.activeSet,activeSec=reason==='completed'?Math.max(0,Math.round((now()-a.startedAt)/1000)):null;const rec={...a,activeSec,measured:activeSec!=null,status:reason,completedAt:new Date().toISOString()};if(activeSec!=null)state.liftingSec+=activeSec;state.activeSet=null;$$('.f90v2-start.active:not(.completed)').forEach(x=>{x.classList.remove('active');x.textContent='Start'});persist();return rec;}
  function updateNotes(card){let box=$('.f90v2-notes',card);if(!box){box=document.createElement('details');box.className='f90v2-notes';box.innerHTML='<summary>Discomfort / Pain · Notes · Setup Note</summary><label>Setup Note<textarea data-setup rows="2" placeholder="Equipment setup, e.g. bench angle 75°"></textarea></label><label>Workout Note<textarea data-note rows="2" placeholder="How this exercise felt today"></textarea></label><button type="button">Save notes</button>';card.appendChild(box);$('button',box).onclick=()=>{const key=slug(exerciseName(card)),eq=equipment(card),s=getSetup(),n=getNotes();s[key]??={};s[key][eq]=$('[data-setup]',box).value;n[key]=$('[data-note]',box).value;setSetup(s);setNotes(n);};}const key=slug(exerciseName(card)),eq=equipment(card);$('[data-setup]',box).value=getSetup()[key]?.[eq]||'';$('[data-note]',box).value=getNotes()[key]||'';}
  function setExpanded(card,open){
  state.open ||= {};state.open[recordKey(card,'open')]=open;persist();
  card.classList.toggle('f90v2-collapsed',!open);const b=$('.f90v2-toggle',card);if(b){b.setAttribute('aria-expanded',String(open));b.textContent=open?'▲':'▼';}
}
  function addAccordion(card,index){
  if($('.f90v2-toggle',card))return;card.id ||= 'f90-exercise-'+index;let head=$('.exercise-head',card);
  if(!head){head=document.createElement('div');head.className='exercise-head';const title=$('strong',card);if(title)head.appendChild(title);card.prepend(head);}
  const b=document.createElement('button');b.type='button';b.className='f90v2-toggle';b.setAttribute('aria-controls',card.id);b.setAttribute('aria-label','Expand or collapse '+exerciseName(card));b.onclick=()=>setExpanded(card,card.classList.contains('f90v2-collapsed'));head.appendChild(b);
  setExpanded(card,state.open?.[recordKey(card,'open')]??(state.activeSet?.exerciseKey===slug(exerciseName(card))||index===0));
}
  function strengthHeader(){const list=$('#exerciseCards');if(!list||$('#f90v2-strength-head'))return;const head=document.createElement('div');head.id='f90v2-strength-head';head.className='f90v2-phase-head';head.innerHTML='<div><strong>Strength</strong><small data-strength-progress></small></div><span>In Progress</span>';list.before(head);}
  function enhance(){
  const aw=window.Forge90App.getActive();if(aw&&state.workoutId&&state.workoutId!==aw.id){state=blank();}if(aw)state.workoutId=aw.id;
  strengthHeader();const cards=$$('.exercise-card,#forge90-gym-addons .f90x-ex,#forge90-home-core-overlay .f90x-ex');
  cards.forEach((card,i)=>{addEquipment(card);addSetButtons(card);addAccordion(card,i);addGuide(card);});phasePanels();
  const main=$$('.exercise-card'),done=main.filter(c=>rows(c).every((_,i)=>getRecord(c,i).status==='completed')).length,progress=$('[data-strength-progress]');
  if(progress){const value=done+' / '+main.length+' exercises complete';if(progress.textContent!==value)progress.textContent=value;}
}
  function phasePanels(){
  const definitions=[['strength',$('#f90v2-strength-head'),$('#exerciseCards')],['core',$('#forge90-gym-addons'),$('#forge90-gym-addons')]];
  for(const [key,head,container] of definitions){
    if(!head||!container)continue;
    let button=$('[data-v1-phase="'+key+'"]',head),body;
    if(!button){
      button=document.createElement('button');button.type='button';button.dataset.v1Phase=key;button.className='f90c-accordion-head';
      if(key==='core'){body=document.createElement('div');body.id='f90v1-core-body';while(container.firstChild)body.appendChild(container.firstChild);container.appendChild(body);head.prepend(button);}else{body=container;head.replaceChildren(button);}
      button.setAttribute('aria-controls',body.id);button.onclick=()=>{state.open||={};state.open['phase:'+key]=button.getAttribute('aria-expanded')!=='true';persist();phasePanels();};
    }
    body=document.getElementById(button.getAttribute('aria-controls'));
    const cards=$$('.exercise-card,.f90x-ex',body),records=cards.flatMap(c=>rows(c).map((_,i)=>getRecord(c,i))),done=cards.filter(c=>rows(c).every((_,i)=>['completed','interrupted'].includes(getRecord(c,i).status))).length;
    const status=done===cards.length&&cards.length?'Completed':records.some(r=>r.status!=='notStarted')?'In Progress':'Not Started',text=(key==='strength'?'Strength':'Core / Hips / Glutes')+' — '+status+' · '+done+'/'+cards.length;
    if(button.textContent!==text)button.textContent=text;
    const open=state.open?.['phase:'+key]??true;button.setAttribute('aria-expanded',String(open));body.hidden=!open;
  }
}
  function addGuide(card){
  if($('.guide-btn',card))return;
  const name=exerciseName(card),guides=[
    [/dead bug/i,['Lie on your back with arms up and hips and knees bent.','Extend one arm and the opposite leg slowly, keeping the trunk steady.','Return and alternate; record each side separately.']],
    [/bird dog/i,['Start on hands and knees with hands under shoulders.','Reach one arm and the opposite leg without rotating the trunk.','Return with control and change sides.']],
    [/side plank/i,['Lie on your side with elbow under shoulder and knees bent.','Lift hips to align shoulders, hips and knees.','Hold with steady breathing and record each side separately.']],
    [/plank/i,['Place forearms under shoulders with legs extended or knees supported.','Keep the trunk aligned and breathe steadily.','Record the duration of the controlled hold.']],
    [/heel slide/i,['Lie on your back with knees bent and feet supported.','Slowly slide one heel away while keeping your trunk steady.','Return and alternate sides without forcing the range.']],
    [/supine march/i,['Lie on your back with knees bent.','Lift one foot slightly without rocking the pelvis.','Lower it slowly and alternate sides.']],
    [/bridge|hip.thrust|glute drive/i,['Set your feet firmly with knees bent and upper body supported.','Raise hips through a controlled range without arching the lower back.','Lower slowly and keep the same setup for every repetition.']],
    [/pallof|anti.rotation/i,['Stand or sit side-on to the cable or band anchor.','Press hands forward while resisting trunk rotation.','Return slowly for repetitions or hold for the prescribed duration; record both sides.']],
    [/abduct|side.lying/i,['Use the support or machine pads to keep your torso stable.','Move the leg or knees outward with control.','Return slowly; use the prescribed bilateral or per-side measurement.']],
    [/adduct/i,['Set the machine or cable so the starting position is comfortable.','Bring the legs inward without swinging or rotating your torso.','Return slowly through the controlled range.']],
    [/kickback/i,['Face the cable support and secure the ankle attachment.','Move the working leg back while keeping the pelvis steady.','Return with control and repeat on the other side.']]
  ];
  const steps=guides.find(([re])=>re.test(name))?.[1]||['Use a stable setup for the selected equipment.','Follow the prescribed controlled movement and measurement.','Record only the repetitions or duration actually performed.'];
  const button=document.createElement('button');button.type='button';button.className='ghost-btn guide-btn';button.textContent='Guide';
  button.onclick=()=>{let d=$('#f90v1-guide');if(!d){d=document.createElement('dialog');d.id='f90v1-guide';d.className='dialog';document.body.appendChild(d);}d.innerHTML='<div class="dialog-card"><h2></h2><ol></ol><button type="button">Close</button></div>';$('h2',d).textContent=name;for(const text of steps){const li=document.createElement('li');li.textContent=text;$('ol',d).appendChild(li);}$('button',d).onclick=()=>d.close();d.showModal();};$('.exercise-head',card)?.appendChild(button);
}
  function ensureBar(){let bar=$('#forge90-session-bar');if(bar)return bar;bar=document.createElement('div');bar.id='forge90-session-bar';bar.innerHTML='<div><small>WORKOUT</small><strong data-master>00:00</strong></div><div data-current>Ready</div><div data-actions></div>';document.body.appendChild(bar);return bar;}
  const putText=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
  function render(){enhance();const bar=ensureBar(),master=state.startedAt?Math.floor(((state.finishedAt||now())-state.startedAt)/1000):0;putText($('[data-master]',bar),window.Forge90Conditioning?.getSummary()?fmt(window.Forge90Conditioning.getSummary().totalMs/1000):fmt(master));let label=state.activeSet?`${state.activeSet.exercise} • Set ${state.activeSet.setIndex} active`:state.timer?`${state.timer.kind==='transition'?'Transition':state.timer.kind==='set-rest'?'Rest':state.timer.kind} • ${fmt(timerRemaining())}`:'Ready';putText($('[data-current]',bar),label);const a=$('[data-actions]',bar);if(state.timer){if(a.dataset.mode!=='timer'){a.innerHTML='<button data-f90="toggle">Pause</button><button data-f90="minus">−15s</button><button data-f90="plus">+15s</button><button data-f90="skip">Skip</button>';a.dataset.mode='timer';}putText($('[data-f90="toggle"]',a),state.timer.paused?'Resume':'Pause');}else if(a.dataset.mode){a.replaceChildren();delete a.dataset.mode;}bar.classList.toggle('show',!!state.startedAt);}
  function ensureTicker(){if(ticker)return;ticker=setInterval(()=>{if(state.timer&&!state.timer.paused&&timerRemaining()<=0)settleTimer('completed');render()},500);}
  function finalize(){if(!state.startedAt)return null;if(state.activeSet){const rec=state.records?.[state.activeSet.id];if(rec)rec.status='abandoned';finishActive('finished-uncompleted');}if(state.timer)settleTimer('finished');state.finishedAt=now();const totalSec=Math.max(0,Math.round((state.finishedAt-state.startedAt)/1000));const summary={id:state.id,startedAt:new Date(state.startedAt).toISOString(),finishedAt:new Date(state.finishedAt).toISOString(),totalSec,activeLiftingSec:state.liftingSec,setRestSec:state.setRestSec,transitionRestSec:state.transitionSec,warmupSec:state.warmupSec,cardioSec:state.cardioSec,completedSets:state.sets.filter(s=>s.status==='completed').length,sets:state.sets.filter(s=>!s.id?.startsWith('home:')),skipped:state.skipped};const h=parse(storage.getItem(HISTORY_KEY),[]);h.push(summary);storage.setItem(HISTORY_KEY,JSON.stringify(h.slice(-300)));storage.setItem(LAST_KEY,JSON.stringify(summary));notify('workout');sessionStorage.removeItem(ACTIVE_KEY);storage.removeItem(ACTIVE_KEY);state=blank();render();return summary;}
  function pauseAll(){if(state.pausedAt)return;state.pausedAt=now();state.restWasRunning=!!state.timer&&!state.timer.paused;if(state.restWasRunning)toggleTimer();persist();}
  function resumeAll(){if(!state.pausedAt)return;if(state.activeSet){const record=state.records?.[state.activeSet.id];if(record){record.pausedMs=(record.pausedMs||0)+now()-state.pausedAt;state.activeSet=structuredClone(record);}}state.pausedAt=null;if(state.restWasRunning&&state.timer?.paused)toggleTimer();state.restWasRunning=false;persist();}
  function finishGuard(e){if(window.Forge90Conditioning)return;const btn=e.target.closest?.('#finishWorkoutBtn');if(!btn||bypass)return;if(state.activeSet||state.timer){e.preventDefault();e.stopImmediatePropagation();if(confirm('A set or timer is still active. Finish anyway and save the partial timing data?')){finalize();bypass=true;btn.click();bypass=false}}else finalize();}
  function startPhases(e){if(window.Forge90Conditioning)return;if(e.target.closest?.('#startWorkoutBtn'))ensureStart();const t=txt(e.target).toLowerCase();if(/start.*warm/.test(t))startTimer('warmup',600);if(/start.*cardio/.test(t))startTimer('cardio',900);}
  function style(){if($('#forge90-v2-style'))return;const s=document.createElement('style');s.id='forge90-v2-style';s.textContent=`.f90v2-equipment{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(59,130,246,.07);font-size:.8rem}.f90v2-equipment select,.f90v2-history{padding:7px;border:1px solid var(--border);border-radius:8px;background:#0c1219;color:inherit}.f90v2-load-meaning{width:100%;opacity:.65}.exercise-head{align-items:center}.f90v2-toggle{margin-left:auto;min-width:40px;min-height:40px;border:1px solid var(--border);border-radius:10px;background:#0c1219;color:inherit}.f90v2-collapsed>:not(.exercise-head){display:none!important}.set-row{grid-template-columns:34px minmax(0,1fr) minmax(0,1fr) 82px;position:relative;padding-bottom:36px}.f90v2-target{position:absolute;left:42px;right:0;bottom:2px;display:flex;gap:7px;align-items:center;font-size:.72rem;color:var(--muted)}.f90v2-target strong{color:#cfe6ff}.f90v2-info{margin-left:auto;border:0;background:transparent;color:#8fc5ff;min-width:32px;min-height:32px}.f90v2-complete-check{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}.f90v2-start{box-sizing:border-box;width:82px;height:44px;margin:0;border:1px solid #3b82f6;border-radius:8px;padding:0 6px;background:transparent;color:inherit;white-space:nowrap;line-height:1;font-size:.82rem}.f90v2-start.active{background:#2563eb;color:#fff}.f90v2-start.completed{border-color:#16a34a;background:#166534;color:#fff;opacity:1}.f90v2-notes{margin-top:10px}.f90v2-notes label{display:block;color:var(--muted);font-size:.78rem;margin:10px 0}.f90v2-notes textarea{display:block;width:100%;margin-top:5px;background:#0b1118;color:var(--text);border:1px solid var(--border);border-radius:10px;padding:8px}.f90v2-notes button{min-height:40px;border:1px solid var(--border);border-radius:10px;background:#111821;color:inherit}#forge90-session-bar{position:fixed;z-index:2147482000;left:10px;right:10px;bottom:10px;display:none;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;background:rgba(15,23,42,.96);color:white;box-shadow:0 10px 35px rgba(0,0,0,.35)}#forge90-session-bar.show{display:grid}#forge90-session-bar strong{display:block}#forge90-session-bar [data-current]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#forge90-session-bar button{border:0;border-radius:8px;padding:7px 8px;margin-left:4px;background:#334155;color:#fff}@media(max-width:640px){.set-row{grid-template-columns:28px minmax(0,1fr) minmax(0,1fr) 76px}.f90v2-target{left:34px}.f90v2-target span,.f90v2-target strong{font-size:.68rem}#forge90-session-bar{grid-template-columns:1fr;gap:6px}#forge90-session-bar [data-actions]{display:flex}#forge90-session-bar button{flex:1}}`;document.head.appendChild(s);}
  document.addEventListener('click',e=>{const action=e.target.closest?.('[data-f90]')?.dataset.f90;if(action){e.preventDefault();if(action==='toggle')toggleTimer();if(action==='minus')adjustTimer(-15);if(action==='plus')adjustTimer(15);if(action==='skip')settleTimer('skipped');return}startPhases(e)},true);
  document.addEventListener('click',finishGuard,true);
  let renderPending=false;new MutationObserver(()=>{if(renderPending)return;renderPending=true;setTimeout(()=>{renderPending=false;render();},30);}).observe(document.documentElement,{childList:true,subtree:true});
  function removeDraft(id){if(state.records?.[id]?.status==='notStarted'){delete state.records[id];persist();}}
  function finishHome(scope){
    const records=Object.values(state.records||{}).filter(r=>r.id.startsWith(scope));
    if(records.some(r=>r.status==='active')){alert('Complete or stop the active set before finishing Home Core.');return null;}
    const completed=records.filter(r=>['completed','interrupted'].includes(r.status));
    if(!completed.length){alert('Complete at least one set before finishing Home Core.');return null;}
    const summary={id:'home-session-'+now(),startedAt:new Date(Math.min(...completed.map(r=>r.startedAt||now()))).toISOString(),finishedAt:new Date().toISOString(),sets:structuredClone(completed)};
    const history=getHistory();history.push(summary);storage.setItem(HISTORY_KEY,JSON.stringify(history));
    if(state.timer&&records.some(r=>r.exercise===state.timer.meta?.exercise))settleTimer('finished');
    for(const record of records)delete state.records[record.id];state.sets=state.sets.filter(r=>!r.id.startsWith(scope));persist();return summary;
  }
  style();render();if(state.startedAt)ensureTicker();window.Forge90Session={version:'2026-09-10.1',finalize,finishHome,removeDraft,pauseAll,resumeAll,pauseForActivity:()=>{if(state.timer&&!state.timer.paused)toggleTimer();},getState:()=>structuredClone(state)};
})();
