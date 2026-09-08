/* Pure, timestamp-based activity model. No DOM, storage, or strength mutations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Forge90ConditioningCore = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const MINUTE = 60000;
  const terminal = a => ['Completed', 'Stopped Early', 'Skipped'].includes(a.status);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
  const create = (minutes, extra = {}) => ({targetMs: minutes * MINUTE, elapsedMs: 0, runningSince: null, status: 'Not Started', reason: null, events: [], ...extra});
  const actual = (a, now) => Math.min(a.targetMs, Math.max(0, a.elapsedMs + (a.status === 'Running' ? Math.max(0, now - a.runningSince) : 0)));
  function settle(a, now) {
    if (a.status === 'Running' && actual(a, now) >= a.targetMs) {
      a.elapsedMs = a.targetMs; a.runningSince = null; a.status = 'Completed';
    }
    return a;
  }
  function action(a, command, now, reason = null) {
    settle(a, now);
    if (terminal(a)) return false;
    if (command === 'start' && a.status === 'Not Started') { a.runningSince = now; a.status = 'Running'; }
    else if (command === 'pause' && a.status === 'Running') { a.elapsedMs = actual(a, now); a.runningSince = null; a.status = 'Paused'; }
    else if (command === 'resume' && a.status === 'Paused' && !a.safetyHold) { a.runningSince = now; a.status = 'Running'; }
    else if (command === 'stop' && ['Running', 'Paused'].includes(a.status)) { a.elapsedMs = actual(a, now); a.runningSince = null; a.status = 'Stopped Early'; a.reason = reason; }
    else if (command === 'skip') { a.elapsedMs = actual(a, now); a.runningSince = null; a.status = 'Skipped'; a.reason = reason; }
    else if (command === 'complete' && a.kind === 'warmup' && ['Running', 'Paused'].includes(a.status) && !a.safetyHold) { a.elapsedMs = actual(a, now); a.runningSince = null; a.status = 'Completed'; }
    else return false;
    a.events.push({command, at: now, reason});
    return true;
  }
  function adjust(a, deltaMinutes, now, minimum = 5) {
    settle(a, now);
    if (terminal(a) || a.safetyHold) return false;
    a.elapsedMs = actual(a, now);
    if (a.status === 'Running') a.runningSince = now;
    a.targetMs = Math.max(a.elapsedMs, clamp(a.targetMs / MINUTE + deltaMinutes, minimum, 120) * MINUTE);
    settle(a, now);
    return true;
  }
  function discomfort(a, now) {
    if (terminal(a)) return false;
    action(a, 'pause', now);
    a.safetyHold = true;
    a.events.push({command: 'back-discomfort', at: now});
    return true;
  }
  function phases(targetMs) {
    const edge = Math.min(3 * MINUTE, targetMs / 3);
    return [{name: 'Easy start', from: 0, to: edge}, {name: 'Moderate', from: edge, to: targetMs - edge}, {name: 'Cooldown', from: targetMs - edge, to: targetMs}];
  }
  const phase = (a, now) => phases(a.targetMs).find(p => actual(a, now) < p.to)?.name || 'Completed';
  function phaseTimes(a, now) { const elapsed = actual(a, now); return Object.fromEntries(phases(a.targetMs).map(p => [p.name, Math.max(0, Math.min(elapsed, p.to) - p.from)])); }
  // Gross MET estimate: duration always measured; RPE is NOT treated as MET.
  function calories(a, kg, now) {
    const elapsed = actual(a, now), segments = [...(a.segments || []), {machine:a.machine,untilMs:elapsed}];
    let from = 0, metMs = 0;
    for (const segment of segments) {
      const end = Math.max(from, Math.min(elapsed, segment.untilMs));
      const met = ({treadmill:4.3,bike:4,recumbent:3.5,elliptical:5})[segment.machine] || 4;
      for (const p of phases(a.targetMs)) metMs += Math.max(0,Math.min(end,p.to)-Math.max(from,p.from)) * (p.name === 'Moderate' ? met : 2.5);
      from = end;
    }
    return Math.round(metMs / MINUTE * 3.5 * clamp(kg, 30, 300) / 200);
  }
  function recommend(workout, fatigue = 'normal', history = []) {
    const legKeys = ['legPress', 'legExtension', 'legCurl', 'stepUp', 'calfRaise'];
    const legs = workout.logs.filter(l => legKeys.includes(l.key));
    const plannedLegSets = legs.reduce((n, l) => n + l.sets.length, 0);
    const completedLegSets = legs.reduce((n, l) => n + l.sets.filter(s => s.done).length, 0);
    const completedSets = workout.logs.reduce((n, l) => n + l.sets.filter(s => s.done).length, 0);
    const lower = plannedLegSets > 0;
    const conditioning = /conditioning/i.test(workout.focus || '') || (lower && workout.index === (workout.mode === 'five' ? 4 : 3));
    const tired = fatigue === 'high';
    const heavy = plannedLegSets >= 16 || completedLegSets >= 12;
    const highWorkload = completedSets >= 28;
    let minutes = lower ? (heavy || conditioning || tired ? 15 : 20) : 20;
    const recent = history.filter(s => s.lower === lower && s.cardio).slice(-3);
    const ready = recent.length === 3 && recent.every(s => s.cardio.status === 'Completed' && Number(s.cardio.rpe) > 0 && Number(s.cardio.rpe) <= (lower ? 5 : 6) && !s.cardio.events.some(e => e.command === 'back-discomfort') && s.fatigue !== 'high');
    let progression = 'Build consistency first. Progress duration before machine settings, then intensity.';
    if (ready && !tired && !heavy && !conditioning && !highWorkload) {
      const last = recent.at(-1).cardio.targetMs / MINUTE;
      minutes = Math.min(lower ? 20 : 25, Math.max(minutes, last + 5));
      progression = minutes > last ? 'Three comfortable completed sessions: consider 5 more minutes.' : 'Duration ceiling reached: optionally raise incline or resistance one small step, keeping the same RPE. No automatic intensity increase.';
    }
    const machine = lower || tired ? 'recumbent' : 'treadmill';
    return {minutes, machine, lower, rpe: lower || tired ? 'about 5/10' : '5–6/10', plannedLegSets, completedLegSets, completedSets,
      reason: tired ? 'High fatigue: choose lower-impact, moderate cardio.' : heavy ? 'Heavy leg session: shorter moderate bike work.' : conditioning ? 'Lower-body conditioning day: keep cardio moderate and shorter.' : lower ? 'Lower-body day: moderate bike or elliptical.' : 'Upper-body day: incline walking or elliptical.', progression};
  }
  const movement = (id, name, minutes, purpose, muscles, equipment, steps, extra = {}) => ({id, name, minutes, purpose, muscles, equipment, sets: 1, reps: null, steps, ...extra});
  function warmups(workout) {
    const lower = workout.logs.some(l => l.key === 'legPress');
    const pull = workout.mode === 'five' && workout.index === 1;
    const prep = workout.logs.find(l => l.key === (lower ? 'legPress' : pull ? 'pulldown' : 'inclinePress')) || workout.logs[0];
    const known = prep?.sets.map(s => Number(s.weight)).filter(n => n > 0) || [];
    const weight = known.length ? Math.round(Math.max(...known) * 0.4 * 2) / 2 : null;
    const list = [movement('easy', lower ? 'Easy recumbent cycling' : 'Easy walking', lower ? 4 : 3, 'Gradually raise body temperature.', lower ? 'Hips, knees and ankles' : 'Whole body', lower ? 'Recumbent bike' : 'Flat treadmill or clear walking space', ['Begin slowly with an upright, comfortable posture.', 'Keep the effort easy; you should be able to talk.', 'Increase pace gently only if comfortable.'])];
    if (lower) {
      list.push(movement('ankles', 'Supported ankle rocks', 2, 'Prepare ankle motion for leg work.', 'Ankles and calves', 'Wall or stable support', ['Hold the support with both feet flat.', 'Gently move one knee forward over the toes without lifting the heel.', 'Return and alternate within a comfortable range.'], {reps: '8–10 / side'}));
      list.push(movement('hips', 'Supported hip marching', 2, 'Prepare controlled hip movement.', 'Hip flexors, glutes and trunk', 'Stable support', ['Stand upright holding support.', 'Lift one knee a small comfortable distance without leaning.', 'Lower slowly and alternate.'], {reps: '8–10 / side'}));
      list.push(movement('band', 'Light band side steps', 1, 'Prepare side-hip control.', 'Glute medius and hips', 'Resistance band, optional support', ['Place a light band above the knees.', 'Take small side steps with knees comfortably aligned.', 'Keep the trunk steady; use no band if needed.'], {reps: '6–8 steps / direction', band: 'Light'}));
    } else {
      list.push(movement('shoulders', pull ? 'Supported shoulder-blade retractions' : 'Gentle shoulder circles', 1, 'Prepare shoulder movement without loading the spine.', 'Shoulders and shoulder blades', 'Bodyweight', ['Stand or sit tall with relaxed ribs.', pull ? 'Draw shoulder blades gently back and down.' : 'Make small slow circles with the shoulders.', 'Relax and repeat without forcing the range.'], {reps: '8–10'}));
      list.push(movement('band', pull ? 'Light band rows' : 'Light band external rotations', 1, 'Prepare controlled shoulder loading.', pull ? 'Upper back and rear shoulders' : 'Rotator cuff and shoulders', 'Resistance band', ['Use a light band and keep your torso still.', pull ? 'Pull elbows gently back close to your sides.' : 'Keep elbows at your sides and rotate forearms gently outward.', 'Return slowly and avoid shoulder shrugging.'], {reps: '10–12', band: 'Light'}));
    }
    list.push(movement('prep', `Light preparation: ${prep?.name || 'first exercise'}`, 2, 'Rehearse today’s first working movement with a light load.', lower ? 'Quadriceps, glutes and knees' : pull ? 'Lats, shoulders and elbows' : 'Chest, shoulders and elbows', lower ? 'Leg press' : pull ? 'Lat pulldown machine' : 'Chest press machine / usual equipment', ['Use the same supported setup as your working exercise.', 'Choose a comfortable light load, approximately 30–50% of your usual working weight.', 'Perform controlled repetitions; stop before fatigue.'], {reps: '10–12', load: weight, loadKey: prep?.key}));
    if(lower && workout.logs.some(l=>l.key==='shoulderPress')) list.splice(1,0,movement('shoulders','Gentle shoulder circles',1,'Prepare the shoulder work included today.','Shoulders and upper back','Bodyweight',['Sit or stand comfortably tall.','Circle the shoulders slowly within a comfortable range.','Keep the trunk relaxed and still.'],{reps:'8–10'}));
    return list;
  }
  const machines = {
    treadmill: {name: 'Incline treadmill walking', defaults: {speed: 4, incline: 2}, guidance: 'Walk at a comfortable 3–5 km/h; start flat, then consider 1–3% incline. Keep an upright posture and adjust to the RPE target. Never auto-switch to running.'},
    bike: {name: 'Stationary bike', defaults: {resistance: 2, rpm: 60}, guidance: 'Set the seat for a comfortable slight knee bend. Start at a low machine level and pedal smoothly; approximately 50–70 RPM if comfortable. Levels vary by machine.'},
    recumbent: {name: 'Recumbent bike', defaults: {resistance: 2, rpm: 60}, guidance: 'Adjust the seat so your back is supported and knees remain slightly bent at full reach. Begin at a low level; use a smooth, comfortable cadence. Levels vary by machine.'},
    elliptical: {name: 'Elliptical', defaults: {resistance: 2}, guidance: 'Start at a low level with short, smooth strides and an upright posture. Use the handles for balance. Levels vary by machine.'}
  };
  return {MINUTE, create, actual, settle, action, adjust, discomfort, terminal, phases, phase, phaseTimes, calories, recommend, warmups, machines};
});
