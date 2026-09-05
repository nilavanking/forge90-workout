(() => {
  'use strict';
  const STORAGE_KEY = 'forge90.v1';
  const storage = window.Forge90Storage;
  const DEFAULT_STATE = {
    settings: { weekMode: 'four', bodyWeight: 116 },
    activeWorkout: null,
    workouts: [],
    progress: []
  };

  const guides = {
    inclinePress:{equipment:'Incline chest-press machine or adjustable bench with dumbbells.',muscles:'Upper chest, front shoulders and triceps.',setup:'Adjust the seat or bench so the pressing path lines up with the upper chest. Keep feet flat and back supported.',steps:['Grip the handles firmly.','Keep shoulder blades gently back and down.','Press forward/up until the arms are almost straight.','Lower slowly under control to the starting position.'],avoid:'Do not bounce the weight, shrug the shoulders, aggressively lock the elbows or excessively arch the lower back.',alt:'Incline dumbbell press or Smith-machine incline press.'},
    flatPress:{equipment:'Chest-press machine, bench press station or dumbbells.',muscles:'Chest, front shoulders and triceps.',setup:'Set the handles around mid-chest level. Keep feet planted and shoulder blades supported.',steps:['Start with elbows comfortably bent.','Press the handles forward.','Stop just before hard elbow lockout.','Return slowly until you feel a controlled chest stretch.'],avoid:'Do not flare the elbows excessively or let the shoulders roll forward.',alt:'Dumbbell bench press or push-ups.'},
    pecDeck:{equipment:'Pec-deck machine or cable crossover station.',muscles:'Chest, especially the pectorals.',setup:'Adjust the seat so elbows or handles are approximately chest height.',steps:['Sit tall with back against the pad.','Bring the arms together in a smooth arc.','Pause briefly when the chest is contracted.','Return slowly without overstretching the shoulders.'],avoid:'Do not use momentum or allow the weight stack to slam.',alt:'Cable fly or light dumbbell fly.'},
    shoulderPress:{equipment:'Shoulder-press machine or dumbbells.',muscles:'Shoulders and triceps.',setup:'Set the seat so handles begin around shoulder level. Keep the back supported.',steps:['Brace the torso.','Press upward until arms are almost straight.','Pause briefly.','Lower slowly to shoulder level.'],avoid:'Avoid excessive lower-back arching or dropping the weight too low.',alt:'Seated dumbbell shoulder press.'},
    lateralRaise:{equipment:'Dumbbells, cable station or lateral-raise machine.',muscles:'Side deltoids.',setup:'Stand or sit tall with light resistance and elbows slightly bent.',steps:['Raise the arms out to the sides.','Stop around shoulder height.','Pause briefly.','Lower slowly.'],avoid:'Do not swing the body or shrug the shoulders.',alt:'Cable lateral raise.'},
    tricepsPush:{equipment:'Cable station with rope or straight-bar attachment.',muscles:'Triceps.',setup:'Stand tall with elbows tucked close to the sides.',steps:['Start with forearms bent.','Push the attachment downward.','Straighten the elbows without moving the upper arms.','Return under control.'],avoid:'Do not lean heavily over the cable or let elbows drift forward.',alt:'Overhead cable extension.'},
    overheadTri:{equipment:'Cable station or one dumbbell.',muscles:'Triceps, especially the long head.',setup:'Keep the ribs controlled and elbows pointing mostly forward.',steps:['Begin with elbows bent.','Extend the arms until nearly straight.','Pause briefly.','Lower slowly behind the head.'],avoid:'Avoid excessive back arching.',alt:'Rope pushdown.'},
    pulldown:{equipment:'Lat-pulldown cable machine.',muscles:'Latissimus dorsi, upper back and biceps.',setup:'Secure the thighs under the pad. Use a comfortable grip slightly wider than shoulder width.',steps:['Sit tall with chest slightly lifted.','Pull the shoulders down.','Drive the elbows downward and bring the bar toward the upper chest.','Return slowly until the arms extend.'],avoid:'Do not pull behind the neck, swing the torso or jerk the bar.',alt:'Assisted pull-up.'},
    cableRow:{equipment:'Seated cable-row machine.',muscles:'Mid-back, lats, rear shoulders and biceps.',setup:'Sit tall with neutral spine and feet supported.',steps:['Start with arms extended.','Pull the handle toward the lower ribs.','Squeeze the shoulder blades gently together.','Return slowly without rounding forward.'],avoid:'Do not rock the torso back and forth.',alt:'Chest-supported row.'},
    chestRow:{equipment:'Chest-supported row machine or incline bench with dumbbells.',muscles:'Upper and mid-back, lats and rear delts.',setup:'Keep the chest supported against the pad.',steps:['Reach forward under control.','Pull elbows back toward the ribs.','Pause briefly.','Lower slowly.'],avoid:'Do not lift the chest away from the support to create momentum.',alt:'Seated cable row.'},
    straightPulldown:{equipment:'Cable station with straight bar or rope.',muscles:'Lats and upper back.',setup:'Stand facing the cable with arms nearly straight and torso slightly inclined.',steps:['Brace the torso.','Pull the bar down toward the thighs using the lats.','Pause at the bottom.','Return slowly overhead.'],avoid:'Do not turn it into a triceps pushdown by excessively bending the elbows.',alt:'Machine pullover.'},
    rearFly:{equipment:'Reverse pec-deck machine or cables.',muscles:'Rear deltoids and upper back.',setup:'Set handles around shoulder height.',steps:['Keep chest supported.','Move arms outward and back.','Pause briefly.','Return slowly.'],avoid:'Do not shrug or use excessive weight.',alt:'Face pull.'},
    dumbbellCurl:{equipment:'Pair of dumbbells.',muscles:'Biceps.',setup:'Stand or sit tall with arms hanging naturally.',steps:['Keep elbows close to the body.','Curl the dumbbells upward.','Squeeze briefly.','Lower fully under control.'],avoid:'Do not swing the hips or shoulders.',alt:'Cable curl.'},
    hammerCurl:{equipment:'Pair of dumbbells.',muscles:'Biceps, brachialis and forearms.',setup:'Use a neutral grip with palms facing inward.',steps:['Keep elbows close to the body.','Curl the dumbbells upward.','Pause briefly.','Lower slowly.'],avoid:'Avoid swinging or leaning backward.',alt:'Rope hammer curl.'},
    legPress:{equipment:'45-degree or horizontal leg-press machine.',muscles:'Quadriceps, hamstrings and glutes.',setup:'Place feet around shoulder width. Keep the back and hips supported.',steps:['Release the safety handles.','Lower the platform by bending the knees.','Stop before the hips curl away from the pad.','Push through the feet to return.'],avoid:'Do not hard-lock the knees or allow them to collapse inward.',alt:'Hack squat machine.'},
    legExtension:{equipment:'Leg-extension machine.',muscles:'Quadriceps.',setup:'Align the machine pivot with the knee joint and place the pad above the ankles.',steps:['Sit fully back.','Extend the knees smoothly.','Pause briefly at the top.','Lower under control.'],avoid:'Do not kick explosively or use more weight than you can control.',alt:'Bodyweight split squat.'},
    legCurl:{equipment:'Seated or lying leg-curl machine.',muscles:'Hamstrings.',setup:'Adjust the pad to sit just above the heels or ankles.',steps:['Brace the torso.','Curl the pad toward the body.','Pause briefly.','Return slowly.'],avoid:'Do not lift the hips or jerk the weight.',alt:'Swiss-ball hamstring curl.'},
    stepUp:{equipment:'Stable step or low bench; optional dumbbells.',muscles:'Quadriceps, glutes and stabilizers.',setup:'Choose a height that lets you step up without excessive hip or back strain.',steps:['Place the whole foot on the step.','Drive through that foot to stand.','Control the descent.','Repeat before changing legs.'],avoid:'Do not push strongly off the trailing foot.',alt:'Supported split squat.'},
    calfRaise:{equipment:'Calf-raise machine, leg press or stable platform.',muscles:'Calves.',setup:'Keep the balls of the feet supported with heels free to move.',steps:['Lower the heels under control.','Rise onto the toes.','Pause at the top.','Lower slowly.'],avoid:'Do not bounce through the repetitions.',alt:'Standing bodyweight calf raise.'},
    cableCrunch:{equipment:'Cable station with rope.',muscles:'Abdominals.',setup:'Kneel facing the cable with the rope beside the head.',steps:['Brace the abdomen.','Curl the ribs toward the pelvis.','Pause briefly.','Return without letting the lower back overextend.'],avoid:'Do not pull mainly with the arms.',alt:'Machine abdominal crunch.'},
    deadBug:{equipment:'Exercise mat.',muscles:'Deep core and trunk stabilizers.',setup:'Lie on the back with hips and knees bent to roughly 90 degrees.',steps:['Brace the abdomen.','Slowly extend the opposite arm and leg.','Keep the lower back controlled.','Return and alternate sides.'],avoid:'Stop the range if the lower back lifts excessively.',alt:'Bird dog.'},
    facePull:{equipment:'Cable station with rope.',muscles:'Rear deltoids, upper back and rotator-cuff muscles.',setup:'Set the cable around face height.',steps:['Grip the rope with both hands.','Pull toward the face while separating the rope ends.','Pause with shoulder blades controlled.','Return slowly.'],avoid:'Do not shrug or excessively arch the lower back.',alt:'Reverse pec-deck.'}
  };

  const E=(name,key,target,sets)=>({name,key,target,sets});
  const plans={
    four:[
      {day:'Monday',name:'Upper A',focus:'Chest · Back · Shoulders · Arms',items:[E('Incline Chest Press','inclinePress','3 × 8–10',3),E('Lat Pulldown','pulldown','3 × 8–12',3),E('Flat Chest Press','flatPress','3 × 8–12',3),E('Seated Cable Row','cableRow','3 × 8–12',3),E('Shoulder Press','shoulderPress','3 × 8–10',3),E('Lateral Raise','lateralRaise','3 × 12–15',3),E('Triceps Pushdown','tricepsPush','2 × 10–12',2),E('Hammer Curl','hammerCurl','2 × 10–12',2)]},
      {day:'Thursday',name:'Lower A',focus:'Legs · Core',items:[E('Leg Press','legPress','4 × 8–12',4),E('Leg Extension','legExtension','3 × 12–15',3),E('Leg Curl','legCurl','4 × 10–12',4),E('Step-Up','stepUp','3 × 8/leg',3),E('Calf Raise','calfRaise','4 × 12–15',4),E('Cable Crunch','cableCrunch','3 × 12–15',3),E('Dead Bug','deadBug','3 × 8–10/side',3)]},
      {day:'Friday',name:'Upper B',focus:'Chest · Back · Shoulders · Arms',items:[E('Incline Chest Press','inclinePress','3 × 8–10',3),E('Chest-Supported Row','chestRow','3 × 10–12',3),E('Flat Chest Press','flatPress','3 × 10–12',3),E('Lat Pulldown','pulldown','3 × 8–10',3),E('Rear-Delt Fly','rearFly','3 × 12–15',3),E('Lateral Raise','lateralRaise','3 × 12–15',3),E('Triceps Pushdown','tricepsPush','2 × 12',2),E('Dumbbell Curl','dumbbellCurl','2 × 12',2)]},
      {day:'Saturday',name:'Lower B + Conditioning',focus:'Legs · Shoulders · Conditioning',items:[E('Leg Press','legPress','3 × 10',3),E('Leg Curl','legCurl','3 × 10–12',3),E('Leg Extension','legExtension','3 × 12',3),E('Calf Raise','calfRaise','3 × 15',3),E('Shoulder Press','shoulderPress','3 × 10',3),E('Lateral Raise','lateralRaise','3 × 15',3),E('Face Pull','facePull','3 × 15',3)]}
    ],
    five:[
      {day:'Tuesday',name:'Push',focus:'Chest · Shoulders · Triceps',items:[E('Incline Chest Press','inclinePress','4 × 8–10',4),E('Flat Chest Press','flatPress','3 × 8–12',3),E('Pec Deck / Cable Fly','pecDeck','3 × 12–15',3),E('Shoulder Press','shoulderPress','3 × 8–10',3),E('Lateral Raise','lateralRaise','4 × 12–15',4),E('Triceps Pushdown','tricepsPush','3 × 10–12',3),E('Overhead Triceps Extension','overheadTri','2 × 12–15',2)]},
      {day:'Wednesday',name:'Pull',focus:'Back · Biceps',items:[E('Lat Pulldown','pulldown','4 × 8–12',4),E('Seated Cable Row','cableRow','4 × 8–12',4),E('Chest-Supported Row','chestRow','3 × 10–12',3),E('Straight-Arm Pulldown','straightPulldown','3 × 12–15',3),E('Rear-Delt Fly','rearFly','3 × 12–15',3),E('Dumbbell Curl','dumbbellCurl','3 × 10–12',3),E('Hammer Curl','hammerCurl','3 × 10–12',3)]},
      {day:'Thursday',name:'Legs + Core',focus:'Legs · Core',items:[E('Leg Press','legPress','4 × 8–12',4),E('Leg Extension','legExtension','3 × 12–15',3),E('Leg Curl','legCurl','4 × 10–12',4),E('Step-Up','stepUp','3 × 8/leg',3),E('Calf Raise','calfRaise','4 × 12–15',4),E('Cable Crunch','cableCrunch','3 × 12–15',3),E('Dead Bug','deadBug','3 × 8–10/side',3)]},
      {day:'Friday',name:'Upper Shape',focus:'Chest · Back emphasis',items:[E('Incline Chest Press','inclinePress','3 × 8–10',3),E('Lat Pulldown','pulldown','3 × 8–10',3),E('Flat Chest Press','flatPress','3 × 10–12',3),E('Seated Cable Row','cableRow','3 × 10–12',3),E('Lateral Raise','lateralRaise','3 × 12–15',3),E('Rear-Delt Fly','rearFly','3 × 12–15',3),E('Triceps Pushdown','tricepsPush','2 × 12',2),E('Hammer Curl','hammerCurl','2 × 12',2)]},
      {day:'Saturday',name:'Lower + Shoulders',focus:'Legs · Shoulders · Conditioning',items:[E('Leg Press','legPress','3 × 10',3),E('Leg Curl','legCurl','3 × 10–12',3),E('Leg Extension','legExtension','3 × 12',3),E('Calf Raise','calfRaise','3 × 15',3),E('Shoulder Press','shoulderPress','3 × 10',3),E('Lateral Raise','lateralRaise','3 × 15',3),E('Face Pull','facePull','3 × 15',3)]}
    ]
  };

  const $ = id => document.getElementById(id);
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  const fmtDate = iso => new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${iso}T12:00:00`));
  const fmtNum = n => Math.round(n).toLocaleString();

  let state = loadState();
  let deferredInstall = null;

  function loadState(){
    try{
      const raw = storage.getItem(STORAGE_KEY);
      if(!raw) return clone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        settings:{...DEFAULT_STATE.settings,...(parsed.settings||{})},
        activeWorkout:parsed.activeWorkout||null,
        workouts:Array.isArray(parsed.workouts)?parsed.workouts:[],
        progress:Array.isArray(parsed.progress)?parsed.progress:[]
      };
    }catch(err){
      console.warn('Forge90 storage recovery:',err);
      return clone(DEFAULT_STATE);
    }
  }
  function saveState(){ storage.setItem(STORAGE_KEY,JSON.stringify(state)); }

  function showView(id){
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
    if(id==='homeView') renderHome();
    if(id==='workoutView') renderWorkout();
    if(id==='progressView') renderProgress();
    if(id==='historyView') renderHistory();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function chooseTodayWorkout(mode){
    const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today=days[new Date().getDay()];
    return plans[mode].findIndex(w=>w.day===today) >= 0 ? plans[mode].findIndex(w=>w.day===today) : 0;
  }

  function renderHome(){
    $('homeWeekMode').value=state.settings.weekMode;
    const idx=chooseTodayWorkout(state.settings.weekMode);
    const w=plans[state.settings.weekMode][idx];
    $('todayFocus').textContent=`${w.day} · ${w.name} — ${w.focus}`;
    const last=state.workouts[0];
    $('homeLastVolume').textContent=last?`${fmtNum(last.volume)} kg`:'—';
    $('homeLastCalories').textContent=last?`${last.calories} kcal`:'—';
    const now=new Date(); const weekStart=new Date(now); weekStart.setDate(now.getDate()-((now.getDay()+6)%7)); weekStart.setHours(0,0,0,0);
    const weekDone=state.workouts.filter(x=>new Date(x.completedAt)>=weekStart).length;
    $('homeWeekDone').textContent=`${weekDone}/${plans[state.settings.weekMode].length}`;
    $('homeStreak').textContent=String(calculateStreak());
    const wrap=$('weekCards'); wrap.innerHTML='';
    plans[state.settings.weekMode].forEach(item=>{
      const div=document.createElement('div'); div.className='week-day';
      div.innerHTML=`<div><strong>${item.day}</strong><span>${item.name}</span></div><span>${item.focus}</span>`;
      wrap.appendChild(div);
    });
  }

  function calculateStreak(){
    if(!state.workouts.length) return 0;
    const dates=[...new Set(state.workouts.map(w=>w.date))].sort().reverse();
    let streak=1;
    for(let i=1;i<dates.length;i++){
      const a=new Date(`${dates[i-1]}T12:00:00`), b=new Date(`${dates[i]}T12:00:00`);
      const diff=Math.round((a-b)/86400000);
      if(diff<=3) streak++; else break;
    }
    return streak;
  }

  function createWorkout(mode,index){
    const w=plans[mode][index];
    return {
      id:`w_${Date.now()}`,
      mode,index,date:todayISO(),startedAt:new Date().toISOString(),
      bodyWeight:Number(state.settings.bodyWeight)||116,duration:90,cardioMinutes:15,cardioIntensity:6,
      logs:w.items.map(item=>({name:item.name,key:item.key,target:item.target,sets:Array.from({length:item.sets},()=>({weight:'',reps:'',done:false}))}))
    };
  }

  function ensureActiveWorkout(){
    if(!state.activeWorkout){
      const index=chooseTodayWorkout(state.settings.weekMode);
      state.activeWorkout=createWorkout(state.settings.weekMode,index); saveState();
    }
  }

  function renderWorkout(){
    ensureActiveWorkout();
    const aw=state.activeWorkout;
    $('weekMode').value=aw.mode;
    $('bodyWeight').value=aw.bodyWeight;
    $('duration').value=aw.duration;
    $('cardioMinutes').value=aw.cardioMinutes;
    $('cardioIntensity').value=String(aw.cardioIntensity);
    const sel=$('workoutSelect'); sel.innerHTML='';
    plans[aw.mode].forEach((w,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${w.day} — ${w.name}`;sel.appendChild(o);});
    sel.value=String(aw.index);
    const w=plans[aw.mode][aw.index];
    $('workoutFocus').textContent=`${w.day}: ${w.name} — ${w.focus}`;
    const wrap=$('exerciseCards'); wrap.innerHTML='';
    aw.logs.forEach((log,exerciseIndex)=>{
      const card=document.createElement('article'); card.className='exercise-card';
      const head=document.createElement('div'); head.className='exercise-head';
      const title=document.createElement('div'); title.innerHTML=`<strong>${escapeHtml(log.name)}</strong><div class="target">Target: ${escapeHtml(log.target)}</div>`;
      const guide=document.createElement('button'); guide.type='button'; guide.className='ghost-btn guide-btn'; guide.textContent='How to do it'; guide.addEventListener('click',()=>openGuide(log.key,log.name));
      head.append(title,guide); card.appendChild(head);
      const table=document.createElement('div'); table.className='set-table';
      log.sets.forEach((set,setIndex)=>{
        const row=document.createElement('div'); row.className='set-row';
        const n=document.createElement('div');n.className='set-index';n.textContent=setIndex+1;
        const wl=document.createElement('label');wl.className='mini-label';wl.textContent='kg';
        const wi=document.createElement('input');wi.className='mini-input';wi.type='number';wi.min='0';wi.max='1000';wi.step='0.5';wi.inputMode='decimal';wi.value=set.weight;wi.addEventListener('input',()=>{set.weight=wi.value;persistActiveInputs();renderLiveTotals();});wl.appendChild(wi);
        const rl=document.createElement('label');rl.className='mini-label';rl.textContent='reps';
        const ri=document.createElement('input');ri.className='mini-input';ri.type='number';ri.min='0';ri.max='200';ri.step='1';ri.inputMode='numeric';ri.value=set.reps;ri.addEventListener('input',()=>{set.reps=ri.value;persistActiveInputs();renderLiveTotals();});rl.appendChild(ri);
        const done=document.createElement('input');done.type='checkbox';done.className='done-check';done.checked=set.done;done.setAttribute('aria-label',`${log.name} set ${setIndex+1} complete`);done.addEventListener('change',()=>{set.done=done.checked;saveState();renderLiveTotals();});
        row.append(n,wl,rl,done);table.appendChild(row);
      });
      card.appendChild(table);
      const actions=document.createElement('div');actions.className='exercise-actions';
      const add=document.createElement('button');add.type='button';add.className='ghost-btn';add.textContent='+ Add Set';add.addEventListener('click',()=>{if(log.sets.length<10){log.sets.push({weight:'',reps:'',done:false});saveState();renderWorkout();}});
      const remove=document.createElement('button');remove.type='button';remove.className='ghost-btn';remove.textContent='Remove Set';remove.disabled=log.sets.length<=1;remove.addEventListener('click',()=>{if(log.sets.length>1){log.sets.pop();saveState();renderWorkout();}});
      actions.append(add,remove);card.appendChild(actions);wrap.appendChild(card);
    });
    renderLiveTotals();
  }

  function persistActiveInputs(){
    const aw=state.activeWorkout;
    aw.bodyWeight=clamp(Number($('bodyWeight').value)||aw.bodyWeight,30,300);
    aw.duration=clamp(Number($('duration').value)||90,1,240);
    aw.cardioMinutes=clamp(Number($('cardioMinutes').value)||0,0,120);
    aw.cardioIntensity=clamp(Number($('cardioIntensity').value)||6,3,10);
    state.settings.bodyWeight=aw.bodyWeight;
    saveState();
  }
  function clamp(n,min,max){return Math.min(max,Math.max(min,n));}

  function totals(aw=state.activeWorkout){
    let sets=0,reps=0,volume=0,completedExercises=0;
    aw.logs.forEach(log=>{
      let exerciseDone=false;
      log.sets.forEach(s=>{if(s.done){const w=Math.max(0,Number(s.weight)||0);const r=Math.max(0,Number(s.reps)||0);sets++;reps+=r;volume+=w*r;exerciseDone=true;}});
      if(exerciseDone)completedExercises++;
    });
    return {sets,reps,volume,completedExercises};
  }
  function renderLiveTotals(){
    const t=totals(); $('liveSets').textContent=t.sets;$('liveReps').textContent=t.reps;$('liveVolume').textContent=`${fmtNum(t.volume)} kg`;
  }

  function calorieEstimate(aw){
    const kg=clamp(Number(aw.bodyWeight)||70,30,300);
    const totalMin=clamp(Number(aw.duration)||90,1,240);
    const cardioMin=clamp(Number(aw.cardioMinutes)||0,0,totalMin);
    const strengthMin=Math.max(0,totalMin-cardioMin);
    const strengthMET=5;
    const cardioMET=clamp(Number(aw.cardioIntensity)||6,3,10);
    return Math.round(strengthMET*3.5*kg/200*strengthMin + cardioMET*3.5*kg/200*cardioMin);
  }

  function finishWorkout(){
    persistActiveInputs();
    const aw=state.activeWorkout; const t=totals(aw); const plan=plans[aw.mode][aw.index];
    if(t.sets===0){alert('Complete at least one set before finishing the workout.');return;}
    const record={
      id:aw.id,date:aw.date,completedAt:new Date().toISOString(),mode:aw.mode,day:plan.day,name:plan.name,focus:plan.focus,
      bodyWeight:aw.bodyWeight,duration:aw.duration,cardioMinutes:aw.cardioMinutes,cardioIntensity:aw.cardioIntensity,
      sets:t.sets,reps:t.reps,volume:Math.round(t.volume),calories:calorieEstimate(aw),completedExercises:t.completedExercises,totalExercises:aw.logs.length,
      exercises:aw.logs.map(log=>({name:log.name,target:log.target,sets:log.sets.filter(s=>s.done).map(s=>({weight:Number(s.weight)||0,reps:Number(s.reps)||0}))})).filter(x=>x.sets.length)
    };
    state.workouts.unshift(record); state.activeWorkout=null; saveState(); openReport(record); renderHome(); renderHistory();
  }

  function openGuide(key,name){
    const g=guides[key]; if(!g)return;
    $('guideTitle').textContent=name;$('guideEquipment').textContent=g.equipment;$('guideMuscles').textContent=g.muscles;$('guideSetup').textContent=g.setup;$('guideAvoid').textContent=g.avoid;$('guideAlt').textContent=g.alt;
    const ol=$('guideSteps');ol.innerHTML='';g.steps.forEach(s=>{const li=document.createElement('li');li.textContent=s;ol.appendChild(li);});
    $('guideDialog').showModal();
  }

  function openReport(record){
    $('reportTitle').textContent=`${record.day} — ${record.name}`;$('reportDuration').textContent=`${record.duration} min`;$('reportExercises').textContent=`${record.completedExercises}/${record.totalExercises}`;$('reportSets').textContent=record.sets;$('reportReps').textContent=record.reps;$('reportVolume').textContent=`${fmtNum(record.volume)} kg`;$('reportCalories').textContent=`${record.calories} kcal`;
    const details=$('reportDetails');details.innerHTML='';record.exercises.forEach(ex=>{
      const vol=ex.sets.reduce((a,s)=>a+s.weight*s.reps,0);const best=ex.sets.reduce((b,s)=>s.weight>b.weight?s:b,ex.sets[0]);
      const d=document.createElement('div');d.className='history-item';d.innerHTML=`<strong>${escapeHtml(ex.name)}</strong><div class="history-meta">${ex.sets.length} sets · ${fmtNum(vol)} kg volume · best ${best.weight} kg × ${best.reps}</div>`;details.appendChild(d);
    });
    $('reportGuidance').textContent=record.completedExercises===record.totalExercises?'If technique stayed controlled and you reached the top of the target rep range, increase the load slightly next time. Otherwise keep the same weight and aim for one or two more clean reps.':'Complete the missing planned exercises next time before increasing overall training volume.';
    $('reportDialog').showModal();
  }

  function renderHistory(){
    const wrap=$('historyList');wrap.innerHTML='';
    if(!state.workouts.length){wrap.innerHTML='<div class="empty-state">No completed workouts yet.</div>';return;}
    state.workouts.forEach(record=>{
      const item=document.createElement('article');item.className='history-item';
      const top=document.createElement('div');top.className='history-top';top.innerHTML=`<div><strong>${escapeHtml(record.day)} — ${escapeHtml(record.name)}</strong><div class="history-meta">${fmtDate(record.date)} · ${record.duration} min</div></div><strong>${fmtNum(record.volume)} kg</strong>`;
      const meta=document.createElement('div');meta.className='history-meta';meta.textContent=`${record.sets} sets · ${record.reps} reps · ${record.calories} kcal estimated · ${record.completedExercises}/${record.totalExercises} exercises`;
      const actions=document.createElement('div');actions.className='history-actions';
      const view=document.createElement('button');view.className='small-btn';view.type='button';view.textContent='View report';view.addEventListener('click',()=>openReport(record));
      const del=document.createElement('button');del.className='small-btn danger';del.type='button';del.textContent='Delete';del.addEventListener('click',()=>{if(confirm('Delete this workout from this device?')){state.workouts=state.workouts.filter(w=>w.id!==record.id);saveState();renderHistory();renderHome();}});
      actions.append(view,del);item.append(top,meta,actions);wrap.appendChild(item);
    });
  }

  function renderProgress(){
    $('progressDate').value=todayISO();$('progressWeight').value=state.settings.bodyWeight;
    $('progressCount').textContent=`${state.progress.length} record${state.progress.length===1?'':'s'}`;
    const wrap=$('progressHistory');wrap.innerHTML='';
    if(!state.progress.length){$('progressSummary').className='progress-summary empty-state';$('progressSummary').textContent='Add your first check-in.';wrap.innerHTML='<div class="empty-state">No body check-ins yet.</div>';return;}
    const latest=state.progress[0], first=state.progress[state.progress.length-1];
    $('progressSummary').className='progress-summary';
    $('progressSummary').innerHTML=`<div class="delta-grid"><div><span>Weight change</span><strong>${signed(latest.weight-first.weight,' kg',true)}</strong></div><div><span>Waist change</span><strong>${signed(latest.waist-first.waist,' cm',true)}</strong></div><div><span>Hip change</span><strong>${signed(latest.hip-first.hip,' cm',true)}</strong></div><div><span>Chest change</span><strong>${signed(latest.chest-first.chest,' cm',true)}</strong></div></div>`;
    state.progress.forEach(p=>{
      const item=document.createElement('article');item.className='history-item';item.innerHTML=`<div class="history-top"><div><strong>${fmtDate(p.date)}</strong><div class="history-meta">${escapeHtml(p.notes||'Body check-in')}</div></div><strong>${p.weight.toFixed(1)} kg</strong></div><div class="history-meta">Waist ${p.waist.toFixed(1)} cm · Hip ${p.hip.toFixed(1)} cm · Chest ${p.chest.toFixed(1)} cm</div>`;
      const actions=document.createElement('div');actions.className='history-actions';const del=document.createElement('button');del.type='button';del.className='small-btn danger';del.textContent='Delete';del.addEventListener('click',()=>{if(confirm('Delete this check-in?')){state.progress=state.progress.filter(x=>x.id!==p.id);saveState();renderProgress();}});actions.appendChild(del);item.appendChild(actions);wrap.appendChild(item);
    });
  }
  function signed(n,suffix,lowerBetter){
    const v=Number(n)||0;const str=`${v>0?'+':''}${v.toFixed(1)}${suffix}`;const good=lowerBetter?v<0:v>0;return `<span class="${good?'positive':v===0?'':'negative'}">${str}</span>`;
  }

  function saveProgress(e){
    e.preventDefault();
    const rec={id:`p_${Date.now()}`,date:$('progressDate').value,weight:Number($('progressWeight').value),waist:Number($('progressWaist').value),hip:Number($('progressHip').value),chest:Number($('progressChest').value),notes:$('progressNotes').value.trim()};
    if(!rec.date||[rec.weight,rec.waist,rec.hip,rec.chest].some(v=>!Number.isFinite(v)||v<=0)){alert('Please enter valid date, weight, waist, hip and chest measurements.');return;}
    state.progress.unshift(rec);state.progress.sort((a,b)=>b.date.localeCompare(a.date));state.settings.bodyWeight=rec.weight;saveState();$('progressNotes').value='';renderProgress();renderHome();
  }

  function resetWorkout(){
    if(!state.activeWorkout || confirm('Reset the current workout and clear the entered sets?')){state.activeWorkout=null;saveState();renderWorkout();}
  }

  function changeWorkoutMode(mode){
    state.settings.weekMode=mode;state.activeWorkout=createWorkout(mode,0);saveState();renderWorkout();renderHome();
  }

  function exportBackup(){
    const payload={app:'Forge90',version:1,exportedAt:new Date().toISOString(),data:state};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`forge90-backup-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }

  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
  $('startWorkoutBtn').addEventListener('click',()=>{const mode=state.settings.weekMode;const index=chooseTodayWorkout(mode);state.activeWorkout=createWorkout(mode,index);saveState();showView('workoutView');});
  $('quickProgressBtn').addEventListener('click',()=>showView('progressView'));
  $('homeWeekMode').addEventListener('change',e=>{state.settings.weekMode=e.target.value;saveState();renderHome();});
  $('weekMode').addEventListener('change',e=>{if(confirm('Changing week mode will reset the current workout. Continue?')) changeWorkoutMode(e.target.value);else e.target.value=state.activeWorkout.mode;});
  $('workoutSelect').addEventListener('change',e=>{if(confirm('Changing workout will reset the current entries. Continue?')){state.activeWorkout=createWorkout(state.activeWorkout.mode,Number(e.target.value));saveState();renderWorkout();}else e.target.value=String(state.activeWorkout.index);});
  ['bodyWeight','duration','cardioMinutes','cardioIntensity'].forEach(id=>$(id).addEventListener('change',persistActiveInputs));
  $('finishWorkoutBtn').addEventListener('click',finishWorkout);$('resetWorkoutBtn').addEventListener('click',resetWorkout);$('progressForm').addEventListener('submit',saveProgress);$('closeReportBtn').addEventListener('click',()=>$('reportDialog').close());$('exportBtn').addEventListener('click',exportBackup);

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').classList.remove('hidden');});
  $('installBtn').addEventListener('click',async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('installBtn').classList.add('hidden');});
  if('serviceWorker' in navigator){
    const registerServiceWorker=()=>navigator.serviceWorker.register('sw.js').catch(err=>console.warn('SW registration failed',err));
    if(document.readyState==='complete')registerServiceWorker();
    else window.addEventListener('load',registerServiceWorker,{once:true});
  }

  renderHome();
})();
