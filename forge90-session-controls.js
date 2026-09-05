/* Forge90 v2 session controls — reconciled for IndexedDB/Dexie, 2026-09-02. */
(() => {
  'use strict';
  const storage = window.Forge90Storage;
  const PREF_KEY='forge90_equipment_preferences_v2', WEIGHT_KEY='forge90_equipment_weight_memory_v2';
  const HISTORY_KEY='forge90_session_history_v2', LAST_KEY='forge90_last_session_summary_v2', ACTIVE_KEY='forge90_session_active_v2';
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
  const blank=()=>({id:`session-${now()}`,startedAt:null,finishedAt:null,activeSet:null,timer:null,warmupSec:0,cardioSec:0,liftingSec:0,setRestSec:0,transitionSec:0,sets:[],skipped:[]});
  let state=parse(sessionStorage.getItem(ACTIVE_KEY),null)||blank(), ticker=null, bypass=false;
  const persist=()=>sessionStorage.setItem(ACTIVE_KEY,JSON.stringify(state));
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
  function equipment(card){return $('.f90v2-equipment select',card)?.value||'Prescribed Equipment';}
  function addEquipment(card){if($('.f90v2-equipment',card))return;const name=exerciseName(card),key=slug(name),opts=equipmentFor(name,txt(card)),prefs=getPrefs(),selected=prefs[key]&&opts.includes(prefs[key])?prefs[key]:opts[0];const wrap=document.createElement('div');wrap.className='f90v2-equipment';wrap.innerHTML=`<label>Equipment <select>${opts.map(o=>`<option${o===selected?' selected':''}>${esc(o)}</option>`).join('')}</select></label><span>remembers equipment + weight</span>`;const head=$('.exercise-head',card)||card.firstElementChild;head?.insertAdjacentElement('afterend',wrap);const select=$('select',wrap);select.onchange=()=>{const p=getPrefs();p[key]=select.value;setPrefs(p);hydrateWeights(card);};hydrateWeights(card);}
  function hydrateWeights(card){const name=exerciseName(card),key=slug(name),eq=equipment(card),memory=getWeights()[key]?.[eq]||{};rows(card).forEach((row,i)=>{const input=$('input[type="number"]',row);if(input&&!input.value&&memory[i]!=null)input.value=memory[i];});}
  function saveWeight(card,row,i){const input=$('input[type="number"]',row);if(!input||input.value==='')return;const key=slug(exerciseName(card)),eq=equipment(card),m=getWeights();m[key]??={};m[key][eq]??={};m[key][eq][i]=input.value;setWeights(m);}
  function addSetButtons(card){rows(card).forEach((row,i)=>{if($('.f90v2-start',row))return;const check=$('input[type="checkbox"]',row);if(!check)return;const b=document.createElement('button');b.type='button';b.className='f90v2-start';b.textContent='Start Set';check.insertAdjacentElement('beforebegin',b);b.onclick=e=>{e.preventDefault();ensureStart();if(state.activeSet)finishActive('replaced');state.activeSet={exercise:exerciseName(card),exerciseKey:slug(exerciseName(card)),setIndex:i+1,equipment:equipment(card),startedAt:now()};persist();$$('.f90v2-start').forEach(x=>{x.classList.remove('active');x.textContent='Start Set'});b.classList.add('active');b.textContent='Set Running';render();};check.addEventListener('change',()=>{if(!check.checked)return;saveWeight(card,row,i);completeSet(card,row,i);});});}
  function finishActive(reason='completed'){if(!state.activeSet)return null;const a=state.activeSet,activeSec=reason==='completed'?Math.max(0,Math.round((now()-a.startedAt)/1000)):null;const rec={...a,activeSec,measured:activeSec!=null,status:reason,completedAt:new Date().toISOString()};if(activeSec!=null)state.liftingSec+=activeSec;state.activeSet=null;$$('.f90v2-start.active').forEach(x=>{x.classList.remove('active');x.textContent='Start Set'});persist();return rec;}
  function completeSet(card,row,i){ensureStart();let rec;if(state.activeSet&&state.activeSet.exerciseKey===slug(exerciseName(card))&&state.activeSet.setIndex===i+1)rec=finishActive('completed');else rec={exercise:exerciseName(card),exerciseKey:slug(exerciseName(card)),setIndex:i+1,equipment:equipment(card),activeSec:null,measured:false,status:'completed',completedAt:new Date().toISOString()};const nums=$$('input[type="number"]',row);rec.weight=nums[0]?.value||'';rec.reps=nums[1]?.value||'';state.sets.push(rec);persist();const allRows=rows(card),isFinal=allRows.every(r=>$('input[type="checkbox"]',r)?.checked);startTimer(isFinal?'transition':'set-rest',isFinal?90:60,{exercise:rec.exercise});}
  function enhance(){$$('.exercise-card,.f90x-ex').forEach(card=>{addEquipment(card);addSetButtons(card)});}
  function ensureBar(){let bar=$('#forge90-session-bar');if(bar)return bar;bar=document.createElement('div');bar.id='forge90-session-bar';bar.innerHTML='<div><small>WORKOUT</small><strong data-master>00:00</strong></div><div data-current>Ready</div><div data-actions></div>';document.body.appendChild(bar);return bar;}
  function render(){enhance();const bar=ensureBar(),master=state.startedAt?Math.floor(((state.finishedAt||now())-state.startedAt)/1000):0;$('[data-master]',bar).textContent=fmt(master);let label=state.activeSet?`${state.activeSet.exercise} • Set ${state.activeSet.setIndex} active`:state.timer?`${state.timer.kind==='transition'?'Transition':state.timer.kind==='set-rest'?'Rest':state.timer.kind} • ${fmt(timerRemaining())}`:'Ready';$('[data-current]',bar).textContent=label;const a=$('[data-actions]',bar);a.innerHTML=state.timer?`<button data-f90="toggle">${state.timer.paused?'Resume':'Pause'}</button><button data-f90="minus">−15s</button><button data-f90="plus">+15s</button><button data-f90="skip">Skip</button>`:'';bar.classList.toggle('show',!!state.startedAt);}
  function ensureTicker(){if(ticker)return;ticker=setInterval(()=>{if(state.timer&&!state.timer.paused&&timerRemaining()<=0)settleTimer('completed');render()},500);}
  function finalize(){if(!state.startedAt)return null;if(state.activeSet)finishActive('finished-uncompleted');if(state.timer)settleTimer('finished');state.finishedAt=now();const totalSec=Math.max(0,Math.round((state.finishedAt-state.startedAt)/1000));const summary={id:state.id,startedAt:new Date(state.startedAt).toISOString(),finishedAt:new Date(state.finishedAt).toISOString(),totalSec,activeLiftingSec:state.liftingSec,setRestSec:state.setRestSec,transitionRestSec:state.transitionSec,warmupSec:state.warmupSec,cardioSec:state.cardioSec,completedSets:state.sets.filter(s=>s.status==='completed').length,sets:state.sets,skipped:state.skipped};const h=parse(storage.getItem(HISTORY_KEY),[]);h.push(summary);storage.setItem(HISTORY_KEY,JSON.stringify(h.slice(-300)));storage.setItem(LAST_KEY,JSON.stringify(summary));notify('workout');sessionStorage.removeItem(ACTIVE_KEY);state=blank();render();return summary;}
  function finishGuard(e){const btn=e.target.closest?.('#finishWorkoutBtn');if(!btn||bypass)return;if(state.activeSet||state.timer){e.preventDefault();e.stopImmediatePropagation();if(confirm('A set or timer is still active. Finish anyway and save the partial timing data?')){finalize();bypass=true;btn.click();bypass=false}}else finalize();}
  function startPhases(e){if(e.target.closest?.('#startWorkoutBtn'))ensureStart();const t=txt(e.target).toLowerCase();if(/start.*warm/.test(t))startTimer('warmup',600);if(/start.*cardio/.test(t))startTimer('cardio',900);}
  function style(){if($('#forge90-v2-style'))return;const s=document.createElement('style');s.id='forge90-v2-style';s.textContent=`.f90v2-equipment{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:8px 10px;border-radius:10px;background:rgba(59,130,246,.07);font-size:.8rem}.f90v2-equipment select{padding:6px;border-radius:8px}.f90v2-equipment span{opacity:.65}.f90v2-start{margin-right:6px;border:1px solid #3b82f6;border-radius:8px;padding:5px 7px;background:transparent;color:inherit}.f90v2-start.active{background:#2563eb;color:#fff}#forge90-session-bar{position:fixed;z-index:2147482000;left:10px;right:10px;bottom:10px;display:none;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;background:rgba(15,23,42,.96);color:white;box-shadow:0 10px 35px rgba(0,0,0,.35)}#forge90-session-bar.show{display:grid}#forge90-session-bar strong{display:block}#forge90-session-bar [data-current]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#forge90-session-bar button{border:0;border-radius:8px;padding:7px 8px;margin-left:4px;background:#334155;color:#fff}@media(max-width:640px){#forge90-session-bar{grid-template-columns:1fr;gap:6px}#forge90-session-bar [data-actions]{display:flex}#forge90-session-bar button{flex:1}}`;document.head.appendChild(s);}
  document.addEventListener('click',e=>{const action=e.target.closest?.('[data-f90]')?.dataset.f90;if(action){e.preventDefault();if(action==='toggle')toggleTimer();if(action==='minus')adjustTimer(-15);if(action==='plus')adjustTimer(15);if(action==='skip')settleTimer('skipped');return}startPhases(e)},true);
  document.addEventListener('click',finishGuard,true);
  new MutationObserver(()=>setTimeout(render,30)).observe(document.documentElement,{childList:true,subtree:true});
  style();render();if(state.startedAt)ensureTicker();window.Forge90Session={version:'2026-09-02.2',finalize,getState:()=>structuredClone(state)};
})();
