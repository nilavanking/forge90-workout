/* Additive Warm-Up + Cardio integration; existing workout records remain intact. */
(() => {
  'use strict';
  const C = window.Forge90ConditioningCore, storage = window.Forge90Storage;
  const KEY = 'forge90_conditioning_v1';
  const $ = id => document.getElementById(id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = ms => { const sec = Math.floor(Math.max(0, ms) / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
  const reasons = ['', 'Time shortage', 'Fatigue', 'Back discomfort', 'Knee discomfort', 'Hip discomfort', 'Machine unavailable', 'Other'];
  let data;
  try { data = JSON.parse(storage.getItem(KEY) || 'null'); } catch { data = null; }
  data ||= {version: 1, sessions: {}, preferences: {machines: {}, sound: false, vibration: false}};
  let session = null, workout = null, signature = '', audioContext = null;
  const save = () => storage.setItem(KEY, JSON.stringify(data));
  const activities = () => session ? [...session.warmup, session.cardio, session.recovery] : [];
  const activeMs = (phase, now) => session.times[phase] + (session.clock?.phase === phase ? Math.max(0, now - session.clock.since) : 0);
  function closeClock(now = Date.now()) {
    if (session?.clock) { session.times[session.clock.phase] += Math.max(0, now - session.clock.since); session.clock = null; }
  }
  function notify(key, activity = session) {
    activity.alerted ||= [];
    if (activity.alerted.includes(key)) return;
    activity.alerted.push(key);
    try { if (data.preferences.vibration) navigator.vibrate?.([100, 50, 100]); } catch { /* Optional API. */ }
    try {
      if (data.preferences.sound) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        audioContext ||= new Audio();
        Promise.resolve(audioContext.resume()).then(() => {
          const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
          gain.gain.value = 0.08; oscillator.frequency.value = 660;
          oscillator.connect(gain); gain.connect(audioContext.destination);
          oscillator.start(); oscillator.stop(audioContext.currentTime + 0.2);
        }).catch(() => {});
      }
    } catch { /* No error UI for optional alerts. */ }
  }
  function attach() {
    workout = window.Forge90App.getActive();
    if (!workout) { session = null; return; }
    if (session && session.id !== workout.id) {
      closeClock(); activities().forEach(a => C.action(a, 'pause', Date.now())); save();
    }
    if (!data.sessions[workout.id]) {
      const history = Object.values(data.sessions).filter(s => s.finishedAt);
      const rec = C.recommend(workout, 'normal', history);
      data.sessions[workout.id] = {id: workout.id, mode: workout.mode, index: workout.index, lower: rec.lower, createdAt: Date.now(), finishedAt: null,
        fatigue: 'normal', recommendation: rec, originalRecommendation: copy(rec),
        warmup: C.warmups(workout).map(m => C.create(m.minutes, {kind: 'warmup', ...m})),
        cardio: C.create(rec.minutes, {kind: 'cardio', machine: rec.machine, settings: copy(data.preferences.machines[rec.machine] || C.machines[rec.machine].defaults), rpe: '', segments: []}),
        recovery: C.create(3, {kind: 'recovery'}), times: {strength: 0, core: 0}, clock: null, events: []};
      save();
    }
    session = data.sessions[workout.id];
    if (signature !== session.id) { signature = session.id; render(); }
    else place();
    tick();
  }
  function place() {
    const view = $('workoutView'), exercises = $('exerciseCards'), bar = view.querySelector('.live-bar');
    if (!$('f90c-warmup') || !bar) return;
    if (exercises.previousElementSibling !== $('f90c-warmup')) view.insertBefore($('f90c-warmup'), exercises);
    const addons = $('forge90-gym-addons');
    if (addons && addons.nextElementSibling !== $('f90c-cardio')) addons.after($('f90c-cardio'));
    else if (!addons && exercises.nextElementSibling !== $('f90c-cardio')) exercises.after($('f90c-cardio'));
    if ($('f90c-cardio').nextElementSibling !== $('f90c-cooldown')) $('f90c-cardio').after($('f90c-cooldown'));
    if ($('f90c-cooldown').nextElementSibling !== bar) $('f90c-cooldown').after(bar);
  }
  function button(action, label, kind, index = '', extra = '') { return `<button type="button" class="ghost-btn f90c-button" data-c-action="${action}" data-kind="${kind}" data-index="${index}" ${extra}>${label}</button>`; }
  function controlRow(kind, index = '') {
    return `<div class="f90c-controls">${button('start', 'Start', kind, index)}${button('pause', 'Pause', kind, index)}${button('resume', 'Resume', kind, index)}${kind === 'warmup' ? button('complete', 'Complete', kind, index) : ''}${button('stop', 'Stop', kind, index)}${button('plus', kind === 'cardio' ? '+5 MIN' : '+1 MIN', kind, index)}${button('minus', kind === 'cardio' ? '−5 MIN' : '−1 MIN', kind, index)}${button('skip', 'Skip', kind, index)}${button('safety', 'Back discomfort?', kind, index)}</div>`;
  }
  function render() {
    if (!session) return;
    ['f90c-warmup','f90c-cardio','f90c-cooldown'].forEach(id => $(id)?.remove());
    const warm = document.createElement('section'); warm.id = 'f90c-warmup'; warm.className = 'card f90c-section';
    warm.innerHTML = `<span class="eyebrow">WARM-UP</span><h2>Prepare for ${esc(workout.name)}</h2><p class="muted">${session.lower ? '10–12' : '7–8'} minutes, easy and controlled. Preparation weights stay separate from strength volume.</p><div class="f90c-session"><strong>Total session <span data-c-total>0:00</span></strong>${button('session-pause', 'Pause session', 'session')}${button('session-resume', 'Resume session', 'session')}<span data-c-session-state></span></div><p class="fine-print">Time includes measured warm-up, strength/rest, core/rest, cardio and recovery. Explicit pauses and time between timed activities are excluded. Running timers continue in the background.</p><details><summary>Optional completion alerts</summary><label><input data-c-pref="sound" type="checkbox" ${data.preferences.sound ? 'checked' : ''}> Sound</label> <label><input data-c-pref="vibration" type="checkbox" ${data.preferences.vibration ? 'checked' : ''}> Vibration</label></details><div class="f90c-movements"></div>`;
    warm.querySelector('.f90c-movements').insertAdjacentHTML('beforebegin',`<p data-c-warmup-summary role="status"></p>${button('skip-all','Skip remaining warm-up','warmup-all')}`);
    session.warmup.forEach((a, i) => {
      const card = document.createElement('article'); card.className = 'f90c-movement'; card.dataset.warmupIndex = i;
      card.innerHTML = `<span class="eyebrow">WARM-UP ${i + 1}</span><h3>${esc(a.name)}</h3><p>${esc(a.purpose)}</p><p class="muted">${esc(a.muscles)} · ${esc(a.equipment)}</p><p>${a.sets} set · ${a.reps ? esc(a.reps) + ' · ' : ''}${a.minutes} min preparation window</p><details><summary>How to do it</summary><ol>${a.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>${a.band ? `<label>Band level <select class="select" data-c-band="${i}">${['Light','Medium','Heavy'].map(b => `<option ${a.band === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>` : ''}${a.loadKey ? `<label>Light preparation load (kg, optional)<input class="input" type="number" min="0" max="1000" step="0.5" data-c-load="${i}" value="${a.load ?? ''}"></label><p class="fine-print">${a.load != null ? `Suggested ${a.load} kg from 40% of the entered working load.` : 'Use a light load; approximately 30–50% of your normal working weight. No working weight is assumed.'}</p>` : ''}<p class="f90c-status" data-c-status="warmup:${i}" role="status"></p>${controlRow('warmup', i) + button('substitute','Substitute movement','warmup',i)}`;
      warm.querySelector('.f90c-movements').append(card);
    });
    const cardio = document.createElement('section'); cardio.id = 'f90c-cardio'; cardio.className = 'card f90c-section';
    cardio.innerHTML = `<span class="eyebrow">CARDIO</span><h2>Cardio Recommendation for Today</h2><p data-c-recommendation></p><p class="fine-print">Original recommendation: ${session.originalRecommendation.minutes} min · ${esc(C.machines[session.originalRecommendation.machine].name)}. You can choose another machine.</p><label>How tired do your legs feel?<select class="select" id="f90c-fatigue"><option value="normal" ${session.fatigue === 'normal' ? 'selected' : ''}>Normal / not specified</option><option value="high" ${session.fatigue === 'high' ? 'selected' : ''}>High fatigue</option></select></label>${button('recommendation', 'Use today’s recommendation', 'cardio')}<label>Cardio machine<select class="select" id="f90c-machine">${Object.entries(C.machines).map(([k,m]) => `<option value="${k}" ${session.cardio.machine === k ? 'selected' : ''}>${m.name}</option>`).join('')}</select></label><p class="muted">Purpose: build moderate aerobic endurance after strength and core work.</p><p id="f90c-how"></p><div id="f90c-settings" class="form-grid"></div><label>Actual effort (RPE 1–10, optional)<input class="input" id="f90c-rpe" type="number" min="1" max="10" step="1" value="${session.cardio.rpe}"></label><div class="report-grid" id="f90c-cardio-metrics"></div><p class="f90c-status" data-c-status="cardio:" role="status"></p>${controlRow('cardio')}${button('substitute', 'Machine unavailable / Substitute', 'cardio')}<p id="f90c-notice" role="status"></p>`;
    const cool = document.createElement('section'); cool.id = 'f90c-cooldown'; cool.className = 'card f90c-section';
    cool.innerHTML = `<span class="eyebrow">COOLDOWN</span><h2>Ease down before finishing</h2><p data-c-phase-plan></p><p data-c-cooldown role="status"></p><p class="muted">The final cardio phase is included in cardio actual time. Reduce speed or resistance gradually. Optional recovery below is additional; gentle walking or seated breathing is enough.</p><h3>Optional 3–5 minute recovery</h3><p class="f90c-status" data-c-status="recovery:" role="status"></p>${controlRow('recovery')}`;
    $('exerciseCards').before(warm); $('workoutView').append(cardio,cool);
    settings(); place(); tick();
  }
  function settings() {
    const a = session.cardio, treadmill = a.machine === 'treadmill';
    $('f90c-how').textContent = C.machines[a.machine].guidance;
    const fields = treadmill ? [['speed','Speed (km/h)',0.5,8,0.1],['incline','Incline (%)',0,15,0.5]] : [['resistance','Resistance / level',1,100,1], ...(a.machine !== 'elliptical' ? [['rpm','Cadence (RPM, optional)',0,200,1]] : [])];
    $('f90c-settings').innerHTML = fields.map(([key,label,min,max,step]) => `<label>${label}<input class="input" type="number" data-c-setting="${key}" min="${min}" max="${max}" step="${step}" value="${a.settings[key] ?? ''}"></label>`).join('');
  }
  function getActivity(kind, index) { return kind === 'warmup' ? session.warmup[Number(index)] : session[kind]; }
  function recommendation() {
    workout = window.Forge90App.getActive();
    return C.recommend(workout, session.fatigue, Object.values(data.sessions).filter(s => s.finishedAt));
  }
  function summary(now = Date.now()) {
    if (!session) return null;
    const warmupMs = session.warmup.reduce((n,a) => n + C.actual(a,now),0), cardioMs = C.actual(session.cardio,now), recoveryMs = C.actual(session.recovery,now);
    const strengthMs = activeMs('strength',now), coreMs = activeMs('core',now);
    const statuses = session.warmup.map(a => a.status);
    const warmupStatus = statuses.every(s => s === 'Completed') ? 'Completed' : statuses.every(s => s === 'Skipped') ? 'Skipped' : statuses.includes('Running') ? 'Running' : statuses.includes('Paused') ? 'Paused' : statuses.every(s => s === 'Not Started') ? 'Not Started' : 'Partial';
    const cardioCalories = C.calories(session.cardio, workout.bodyWeight, now);
    const warmupCalories = Math.round(warmupMs / C.MINUTE * 2.5 * 3.5 * workout.bodyWeight / 200);
    const otherCalories = Math.round(((strengthMs + coreMs) * 5 + recoveryMs * 2) / C.MINUTE * 3.5 * workout.bodyWeight / 200);
    return {version:1, warmupMs,strengthMs,coreMs,cardioTargetMs:session.cardio.targetMs,cardioMs,cardioCooldownMs:C.phaseTimes(session.cardio,now).Cooldown,recoveryMs,
      totalMs:warmupMs+strengthMs+coreMs+cardioMs+recoveryMs, warmupStatus,cardioStatus:session.cardio.status,cardioMachine:session.cardio.machine,cardioSettings:copy(session.cardio.settings),
      cardioCalories,warmupCalories,totalCalories:cardioCalories+warmupCalories+otherCalories,recommendation:copy(session.originalRecommendation),fatigue:session.fatigue,
      warmup:copy(session.warmup),cardio:copy(session.cardio),recovery:copy(session.recovery),events:copy(session.events)};
  }
  function text(id, value) { const el = document.querySelector(id); if (el && el.textContent !== value) el.textContent = value; }
  function tick() {
    if (!session || session.finishedAt) return;
    const now = Date.now(); let changed = false;
    activities().forEach(a => {
      const old = a.status; C.settle(a,now);
      if (a.status !== old) { notify(a.kind === 'warmup' ? 'movement-complete' : 'complete',a); changed = true; }
    });
    const a = session.cardio;
    if (a.status === 'Running') {
      const currentPhase = C.phase(a,now);
      if (!a.alerted?.includes(currentPhase)) { notify(currentPhase,a); changed = true; }
      if (a.targetMs-C.actual(a,now) <= 5*C.MINUTE && !a.alerted?.includes('final-five')) { notify('final-five',a); changed = true; }
    }
    if (session.warmup.every(a => a.status === 'Completed') && !session.alerted?.includes('warmup-complete')) { notify('warmup-complete'); changed = true; }
    if (changed) save();
    const s = summary(now), r = recommendation();
    text('[data-c-total]', fmt(s.totalMs));
    text('[data-c-warmup-summary]', `${s.warmupStatus} · ${fmt(s.warmupMs)} warm-up completed`);
    text('[data-c-session-state]', session.paused ? 'Session paused' : session.clock ? `${session.clock.phase === 'core' ? 'Core / hips / glutes' : 'Strength'} timing` : 'Activity timing');
    text('[data-c-recommendation]', `${r.minutes} min · ${C.machines[r.machine].name} · RPE ${r.rpe}. ${r.reason} Completed workload: ${r.completedSets} sets (${r.completedLegSets} leg sets). ${r.progression}`);
    activities().forEach((item,index) => {
      const kind = index < session.warmup.length ? 'warmup' : item.kind, i = kind === 'warmup' ? index : '';
      text(`[data-c-status="${kind}:${i}"]`, `${item.status}${item.safetyHold ? ' · Safety pause' : ''} · ${fmt(C.actual(item,now))} actual / ${fmt(item.targetMs)} target · ${fmt(item.targetMs-C.actual(item,now))} remaining`);
    });
    const phasePlan = C.phases(a.targetMs).map(p => `${fmt(p.to-p.from)} ${p.name.toLowerCase()}`).join(' → ');
    text('[data-c-phase-plan]', phasePlan);
    text('[data-c-cooldown]', a.status === 'Not Started' ? 'Cooldown starts in the final cardio phase.' : `Cardio phase: ${C.phase(a,now)} · ${fmt(s.cardioCooldownMs)} cooldown completed`);
    const metrics = [['Target',fmt(s.cardioTargetMs)],['Actual',fmt(s.cardioMs)],['Remaining',fmt(s.cardioTargetMs-s.cardioMs)],['RPE target',r.rpe],['Estimated calories',`${s.cardioCalories} kcal`],['Phase',C.phase(a,now)]];
    const html = metrics.map(([k,v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join('');
    if ($('f90c-cardio-metrics')?.innerHTML !== html) $('f90c-cardio-metrics').innerHTML = html;
    document.querySelectorAll('[data-c-action]').forEach(b => {
      const cmd=b.dataset.cAction, item=getActivity(b.dataset.kind,b.dataset.index);
      let disabled=false;
      if (cmd === 'skip-all') disabled=session.warmup.every(C.terminal);
      else if (cmd === 'session-pause') disabled=!!session.paused || (!session.clock && !activities().some(x=>x.status==='Running'));
      else if (cmd === 'session-resume') disabled=!session.paused || activities().some(x=>x.safetyHold);
      else if (cmd === 'recommendation') disabled=a.status!=='Not Started';
      else if (item) {
        disabled=C.terminal(item);
        if(cmd==='start') disabled=item.status!=='Not Started'||!!session.paused||!!item.safetyHold;
        if(cmd==='pause') disabled=item.status!=='Running';
        if(cmd==='safety') disabled=!['Running','Paused'].includes(item.status);
        if(cmd==='resume') disabled=item.status!=='Paused'||!!session.paused||!!item.safetyHold;
        if(cmd==='stop'||cmd==='complete') disabled=!['Running','Paused'].includes(item.status)||(cmd==='complete'&&item.safetyHold);
        if(cmd==='minus') disabled ||= item.targetMs <= (item.kind==='cardio'?5:item.kind==='recovery'?3:1)*C.MINUTE || item.targetMs<=C.actual(item,now);
        if(cmd==='plus'&&item.kind==='recovery') disabled ||= item.targetMs>=5*C.MINUTE;
        if(item.kind==='recovery'&&cmd==='start') disabled ||= !C.terminal(session.cardio);
      }
      b.disabled=!!disabled;
    });
    if ($('f90c-machine')) $('f90c-machine').disabled=a.status==='Running'||C.terminal(a);
    document.querySelectorAll('[data-c-setting]').forEach(el => {el.disabled = C.terminal(a);});
  }
  function notice(message) { if ($('f90c-notice')) $('f90c-notice').textContent = message; }
  function canStart(item) {
    if (activities().some(a => a !== item && a.status === 'Running')) { notice('Pause or finish the current activity first.'); return false; }
    if (activities().some(a => a.safetyHold)) { notice('Resolve the safety pause deliberately before continuing.'); return false; }
    if (window.Forge90Session.getState().activeSet) { notice('Complete the active strength set before starting another activity.'); return false; }
    closeClock(); window.Forge90Session.pauseForActivity(); return true;
  }
  function reasonDialog(item, cmd) {
    // Capture stop/skip at the tap, not after the optional reason form.
    C.action(item,cmd,Date.now()); item.safetyHold=false; session.paused=false; save(); tick();
    $('f90c-reason-dialog')?.remove();
    const dialog=document.createElement('dialog'); dialog.id='f90c-reason-dialog'; dialog.className='dialog';
    dialog.innerHTML=`<form class="dialog-card"><h2>${cmd==='skip'?'Skip':'Stop'} activity</h2><p>Reason is optional.</p><label>Reason<select class="select" name="reason">${reasons.map(r=>`<option value="${r}">${r||'No reason given'}</option>`).join('')}</select></label><label>Other details (optional)<input class="input" name="details" maxlength="160"></label><div class="f90c-controls"><button class="primary-btn" type="submit">${cmd==='skip'?'Confirm skip':'Confirm stop'}</button><button class="ghost-btn" type="button" data-cancel>Cancel</button></div></form>`;
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const reason={code:dialog.querySelector('[name=reason]').value||null,details:dialog.querySelector('[name=details]').value.trim()||null}; item.reason=reason;item.events.push({command:'reason',reason,at:Date.now()});save(); dialog.close(); tick();};
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close(); document.body.append(dialog);dialog.showModal();
  }
  function safety(item) {
    C.discomfort(item,Date.now());closeClock();window.Forge90Session.pauseForActivity();save();tick();
    $('f90c-safety-dialog')?.remove();const d=document.createElement('dialog');d.id='f90c-safety-dialog';d.className='dialog';
    d.innerHTML=`<div class="dialog-card"><h2>Activity paused — back discomfort</h2><p>Stop the activity if you have sharp back pain, radiating leg pain, new numbness, tingling or new weakness. Do not push through these symptoms.</p><p>This app cannot diagnose the cause. A substitution does not make these symptoms safe to continue.</p><div class="f90c-controls"><button class="ghost-btn danger" data-stop>Stop activity</button><button class="ghost-btn" data-sub>Substitute</button><button class="ghost-btn" data-continue>I choose to continue</button><button class="ghost-btn" data-stay>Stay paused</button></div></div>`;
    d.querySelector('[data-stop]').onclick=()=>{C.action(item,item.status==='Not Started'?'skip':'stop',Date.now(),{code:'Back discomfort',details:null});item.safetyHold=false;session.paused=false;save();d.close();tick();};
    d.querySelector('[data-sub]').onclick=()=>{d.close();substitute(item,true);};
    d.querySelector('[data-continue]').onclick=()=>{item.safetyHold=false;item.events.push({command:'deliberate-safety-continue',at:Date.now()});session.paused=false;C.action(item,item.status==='Not Started'?'start':'resume',Date.now());save();d.close();tick();};
    d.querySelector('[data-stay]').onclick=()=>d.close();document.body.append(d);d.showModal();
  }
  function substitute(item, safetyHold=false) {
    C.action(item,'pause',Date.now());closeClock();save();
    $('f90c-sub-dialog')?.remove();const d=document.createElement('dialog');d.id='f90c-sub-dialog';d.className='dialog';
    d.innerHTML=`<form class="dialog-card"><h2>Choose a substitute</h2>${item.kind==='cardio'?`<label>Available machine<select class="select" name="machine">${Object.entries(C.machines).map(([k,m])=>`<option value="${k}">${m.name}</option>`).join('')}</select></label>`:'<p>Use gentle seated marching with back support, no added resistance, only within a comfortable range.</p>'}<p>The activity stays paused. Resume only when you deliberately choose to continue.</p><button class="primary-btn" type="submit">Use substitute</button><button class="ghost-btn" type="button" data-cancel>Cancel</button></form>`;
    d.querySelector('form').onsubmit=e=>{e.preventDefault();item.events.push({command:'substitute',reason:safetyHold?'Back discomfort':'Machine unavailable',from:item.machine||item.name,at:Date.now(),elapsedMs:C.actual(item,Date.now())});
      if(item.kind==='cardio'){item.segments.push({machine:item.machine,settings:copy(item.settings),untilMs:C.actual(item,Date.now())});item.machine=d.querySelector('[name=machine]').value;item.settings=copy(data.preferences.machines[item.machine]||C.machines[item.machine].defaults);}
      else {item.name='Gentle supported seated marching';item.equipment='Stable chair';item.steps=['Sit upright with back support.','Lift one foot a small comfortable distance.','Lower gently and alternate; stop if discomfort returns.'];item.loadKey=null;item.band=null;item.load=null;}
      save();d.close();render();if(safetyHold)notice('Safety pause remains active. Use Back discomfort? to choose Stop or deliberately continue.');};
    d.querySelector('[data-cancel]').onclick=()=>d.close();document.body.append(d);d.showModal();tick();
  }
  function onAction(e) {
    const b=e.target.closest('[data-c-action]');if(!b||!session||b.disabled)return;
    const cmd=b.dataset.cAction,item=getActivity(b.dataset.kind,b.dataset.index),now=Date.now();
    if(cmd==='skip-all'){session.warmup.filter(a=>!C.terminal(a)).forEach(a=>{C.action(a,'skip',now,a.safetyHold?{code:'Back discomfort',details:'Warm-up skipped'}:null);a.safetyHold=false;});save();tick();return;}
    if(cmd==='safety')return safety(item);
    if(cmd==='skip'||cmd==='stop')return reasonDialog(item,cmd);
    if(cmd==='substitute')return substitute(item);
    if(cmd==='session-pause') {session.resumeClock=session.clock?.phase||null;closeClock(now);session.resumeActivity=activities().findIndex(a=>a.status==='Running');activities().forEach(a=>C.action(a,'pause',now));session.paused=true;window.Forge90Session.pauseAll();}
    else if(cmd==='session-resume') {session.paused=false;window.Forge90Session.resumeAll();if(session.resumeClock)session.clock={phase:session.resumeClock,since:now};const a=activities()[session.resumeActivity];if(a)C.action(a,'resume',now);session.resumeClock=null;session.resumeActivity=-1;}
    else if(cmd==='recommendation') {const r=recommendation();session.recommendation=r;item.targetMs=r.minutes*C.MINUTE;item.machine=r.machine;item.settings=copy(data.preferences.machines[r.machine]||C.machines[r.machine].defaults);save();render();return;}
    else if(cmd==='plus'||cmd==='minus')C.adjust(item,(cmd==='plus'?1:-1)*(item.kind==='cardio'?5:1),now,item.kind==='cardio'?5:item.kind==='recovery'?3:1);
    else {if((cmd==='start'||cmd==='resume')&&!canStart(item))return;C.action(item,cmd,now);if(cmd==='start')notify('start',item);}
    save();tick();
  }
  document.addEventListener('click',onAction);
  document.addEventListener('change',e=>{
    if(!session)return;const el=e.target,a=session.cardio;
    if(el.dataset.cPref){data.preferences[el.dataset.cPref]=el.checked;save();return;}
    if(el.id==='f90c-fatigue')session.fatigue=el.value;
    else if(el.id==='f90c-machine'&&!el.disabled){a.events.push({command:'machine-change',from:a.machine,to:el.value,at:Date.now()});a.segments.push({machine:a.machine,settings:copy(a.settings),untilMs:C.actual(a,Date.now())});a.machine=el.value;a.settings=copy(data.preferences.machines[a.machine]||C.machines[a.machine].defaults);settings();}
    else if(el.dataset.cSetting){if(!el.checkValidity()){el.value=a.settings[el.dataset.cSetting]??'';return;}a.settings[el.dataset.cSetting]=el.value===''?null:Number(el.value);data.preferences.machines[a.machine]=copy(a.settings);}
    else if(el.id==='f90c-rpe'){if(!el.checkValidity()){el.value=a.rpe;return;}a.rpe=el.value===''?'':Number(el.value);}
    else if(el.dataset.cBand!==undefined)session.warmup[Number(el.dataset.cBand)].band=el.value;
    else if(el.dataset.cLoad!==undefined){if(!el.checkValidity())return;session.warmup[Number(el.dataset.cLoad)].load=el.value===''?null:Number(el.value);}
    else return;
    save();tick();
  });
  function onStrengthStart(name, addon) {
    if(!session)attach();if(!session)return true;
    if(session.paused||activities().some(a=>a.safetyHold||a.status==='Running')) {notice('Pause the current activity or resolve the safety pause before starting a set.');return false;}
    const phase=addon||/dead bug|cable crunch/i.test(name)?'core':'strength';
    if(session.clock?.phase!==phase){closeClock();session.clock={phase,since:Date.now()};save();}
    return true;
  }
  function canFinish() {
    if(!session)return true;
    if(activities().some(a=>a.safetyHold)){notice('Resolve the safety pause with Stop before finishing.');return false;}
    const old=window.Forge90Session.getState();
    if(activities().some(a=>a.status==='Running'||a.status==='Paused')||old.activeSet||old.timer) return confirm('An activity, set or rest timer is active. Finish now and record only actual completed time?');
    return true;
  }
  function finish(record) {
    if(!session)return;
    const now=Date.now();closeClock(now);activities().forEach(a=>{C.settle(a,now);if(['Running','Paused'].includes(a.status))C.action(a,'stop',now,{code:null,details:'Workout finished'});});
    record.conditioning=summary(now);record.duration=Math.round(record.conditioning.totalMs/C.MINUTE*100)/100;
    record.cardioMinutes=record.conditioning.cardioMs/C.MINUTE;record.calories=record.conditioning.totalCalories;
    session.finishedAt=now;save();signature='';
  }
  function report(record) {
    $('f90c-report')?.remove();if(!record.conditioning)return;
    const s=record.conditioning,box=document.createElement('section');box.id='f90c-report';box.className='report-section';
    const rows=[['Warm-up duration',fmt(s.warmupMs)],['Strength-training duration',fmt(s.strengthMs)],['Core / Hip / Glute duration',fmt(s.coreMs)],['Cardio target duration',fmt(s.cardioTargetMs)],['Cardio actual duration',fmt(s.cardioMs)],['Cooldown within cardio',fmt(s.cardioCooldownMs)],['Additional recovery',fmt(s.recoveryMs)],['Total session duration',fmt(s.totalMs)],['Strength-training volume',`${record.volume} kg`],['Cardio estimated calories',`${s.cardioCalories} kcal`],['Total estimated workout calories',`${s.totalCalories} kcal`],['Warm-up status',s.warmupStatus],['Cardio status',s.cardioStatus],['Cardio machine',C.machines[s.cardioMachine]?.name||s.cardioMachine],['Cardio settings',Object.entries(s.cardioSettings).filter(([,v])=>v!=null).map(([k,v])=>`${k}: ${v}`).join(', ')],['Skip / stop reason',[...s.warmup,s.cardio,s.recovery].filter(a=>a.reason).map(a=>`${a.name||a.kind}: ${a.reason.code||'Not specified'}${a.reason.details?' — '+a.reason.details:''}`).join('; ')||'None recorded']];
    box.innerHTML=`<h3>Warm-up, cardio & session timing</h3><div class="report-grid">${rows.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div><p class="fine-print">Cooldown within cardio is included once in cardio actual time. Calories are approximate gross MET estimates using measured duration; machine levels and RPE are not calorie measurements.</p>`;
    $('reportDetails').before(box);
  }
  window.Forge90Conditioning={attach,onStrengthStart,canFinish,finish,report,getSummary:()=>summary(),getSession:()=>session?copy(session):null};
  window.addEventListener('forge90-workout-render',attach);
  window.addEventListener('pagehide',()=>{if(session)save();});
  document.addEventListener('visibilitychange',()=>{tick();});
  new MutationObserver(()=>{if(session)place();}).observe($('workoutView'),{childList:true});
  setInterval(tick,500);attach();
})();
