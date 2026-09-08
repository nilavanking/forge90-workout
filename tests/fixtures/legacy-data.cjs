/* Synthetic legacy user; no real user data. Shapes match the baseline source. */
const workout={id:'legacy-workout-1',date:'2026-08-20',completedAt:'2026-08-20T09:00:00.000Z',mode:'four',day:'Monday',name:'Upper A',focus:'Chest · Back · Shoulders · Arms',bodyWeight:100,duration:75,cardioMinutes:15,cardioIntensity:6,sets:2,reps:20,volume:800,calories:600,completedExercises:1,totalExercises:8,exercises:[{name:'Incline Chest Press',target:'3 × 8–10',sets:[{weight:40,reps:10},{weight:40,reps:10}]}]};
module.exports={
  'forge90.v1':{settings:{weekMode:'four',bodyWeight:100,customSetting:'keep-me'},activeWorkout:null,workouts:[workout,{...workout,id:'legacy-workout-2',date:'2026-08-18',completedAt:'2026-08-18T09:00:00.000Z'}],progress:[{id:'legacy-checkin',date:'2026-08-19',weight:100,waist:100,hip:105,chest:110,notes:'Synthetic preservation fixture'}]},
  'forge90_weight_v1':{unit:'kg',startWeightKg:105,targetWeightKg:90,startDate:'2026-08-01',targetDate:'2026-12-01',goals:[],entries:[{id:'legacy-morning',timestamp:'2026-08-19T06:00:00.000Z',weightKg:100,type:'morning',source:'manual',notes:'fixture',workoutId:null},{id:'legacy-post',timestamp:'2026-08-19T09:00:00.000Z',weightKg:99.5,type:'post-workout',source:'manual',notes:'fixture',workoutId:'legacy-workout-1'}]},
  'forge90_equipment_preferences_v2':{'incline-chest-press':'Barbell'},
  'forge90_equipment_weight_memory_v2':{'incline-chest-press':{'Barbell':{'0':'40','1':'40'}}},
  'forge90_addon_active_logs_v1':{'gym:4:1:0':{name:'Cable Pallof Press',plan:4,day:1,reps:'10–12 / side',sets:{1:{done:true,weight:'5'}}},'home:4:home-core-a:0':{name:'Dead Bug',plan:4,session:'home-core-a',sets:{1:{done:true}}}},
  'forge90_addon_history_v1':[{id:'legacy-home',type:'home-core',plan:4,sessionId:'home-core-a',title:'Home Core Day A',completedAt:'2026-08-19T10:00:00.000Z',exercises:[{name:'Dead Bug',reps:'8–10 / side',sets:{1:{done:true}}}]}],
  'forge90_session_history_v2':[{id:'legacy-session',totalSec:4500,activeLiftingSec:1800,completedSets:2}],
  'forge90_last_session_summary_v2':{id:'legacy-session',totalSec:4500,activeLiftingSec:1800,completedSets:2},
  'forge90_enhancement_plan_mode_v1':'4',
  'unrelated_application':{preserve:true,records:['unrelated-record']}
};
