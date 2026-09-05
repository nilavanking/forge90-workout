/* Forge90 approved enhancements — 2026-09-01
   Scope:
   1) Add gym-equipment core/hips/glutes/adductor/abductor work to existing 4-day and 5-day plans.
   2) Add 1 home-core session in 5-day mode, 2 in 4-day mode.
   3) Preserve all original exercises, sets/reps, localStorage data, completed workouts and reports.
   4) After original Finish & Report saves, return to Home.
*/
(() => {
  'use strict';

  const VERSION = '2026-09-01.1';
  const PLAN_KEY = 'forge90_enhancement_plan_mode_v1';
  const LOG_KEY = 'forge90_addon_active_logs_v1';
  const HISTORY_KEY = 'forge90_addon_history_v1';
  const RETURN_HOME_KEY = 'forge90_return_home_after_finish_v1';

  const GYM = {
    5: {
      1: [
        { name: 'Cable Pallof Press', equipment: 'Cable machine', sets: 3, reps: '10–12 / side', target: 'Deep core • anti-rotation' },
        { name: 'Hip Abductor Machine', equipment: 'Hip abductor machine', sets: 3, reps: '12–15', target: 'Outer hips • glute medius' }
      ],
      2: [
        { name: 'Cable Pallof Hold', equipment: 'Cable machine', sets: 3, reps: '20–30 sec / side', target: 'Core stability' },
        { name: 'Cable Glute Kickback', equipment: 'Cable machine + ankle strap', sets: 3, reps: '12 / leg', target: 'Glutes' }
      ],
      3: [
        { name: 'Hip Adductor Machine', equipment: 'Hip adductor machine', sets: 3, reps: '12–15', target: 'Inner thighs • adductors' },
        { name: 'Hip Abductor Machine', equipment: 'Hip abductor machine', sets: 3, reps: '12–15', target: 'Outer hips • glute medius' },
        { name: 'Glute Drive / Hip-Thrust Machine', equipment: 'Glute drive / hip-thrust machine', sets: 3, reps: '10–12', target: 'Glutes • hips' }
      ],
      4: [
        { name: 'Cable Hip Abduction', equipment: 'Cable machine + ankle strap', sets: 3, reps: '12 / leg', target: 'Side glutes • hips' },
        { name: 'Cable Hip Adduction', equipment: 'Cable machine + ankle strap', sets: 3, reps: '12 / leg', target: 'Inner thighs • adductors' },
        { name: 'Cable Pallof Press', equipment: 'Cable machine', sets: 3, reps: '10 / side', target: 'Core stability' }
      ],
      5: [
        { name: 'Glute Drive / Hip-Thrust Machine', equipment: 'Glute drive / hip-thrust machine', sets: 3, reps: '10–12', target: 'Glutes • hips' },
        { name: 'Hip Adductor Machine', equipment: 'Hip adductor machine', sets: 3, reps: '12–15', target: 'Inner thighs • adductors' },
        { name: 'Hip Abductor Machine', equipment: 'Hip abductor machine', sets: 3, reps: '12–15', target: 'Outer hips • glute medius' },
        { name: 'Cable Anti-Rotation Hold', equipment: 'Cable machine', sets: 2, reps: '20–30 sec / side', target: 'Deep core • anti-rotation' }
      ]
    },
    4: {
      1: [
        { name: 'Cable Pallof Press', equipment: 'Cable machine', sets: 3, reps: '10–12 / side', target: 'Deep core • anti-rotation' },
        { name: 'Hip Abductor Machine', equipment: 'Hip abductor machine', sets: 3, reps: '12–15', target: 'Outer hips • glute medius' }
      ],
      2: [
        { name: 'Cable Pallof Hold', equipment: 'Cable machine', sets: 3, reps: '20–30 sec / side', target: 'Core stability' },
        { name: 'Cable Glute Kickback', equipment: 'Cable machine + ankle strap', sets: 3, reps: '12 / leg', target: 'Glutes' },
        { name: 'Hip Adductor Machine', equipment: 'Hip adductor machine', sets: 3, reps: '12–15', target: 'Inner thighs • adductors' }
      ],
      3: [
        { name: 'Glute Drive / Hip-Thrust Machine', equipment: 'Glute drive / hip-thrust machine', sets: 3, reps: '10–12', target: 'Glutes • hips' },
        { name: 'Hip Adductor Machine', equipment: 'Hip adductor machine', sets: 3, reps: '12–15', target: 'Inner thighs • adductors' },
        { name: 'Hip Abductor Machine', equipment: 'Hip abductor machine', sets: 3, reps: '12–15', target: 'Outer hips • glute medius' }
      ],
      4: [
        { name: 'Cable Hip Abduction', equipment: 'Cable machine + ankle strap', sets: 3, reps: '12 / leg', target: 'Side glutes • hips' },
        { name: 'Cable Hip Adduction', equipment: 'Cable machine + ankle strap', sets: 3, reps: '12 / leg', target: 'Inner thighs • adductors' },
        { name: 'Cable Pallof Press', equipment: 'Cable machine', sets: 3, reps: '10–12 / side', target: 'Core stability' }
      ]
    }
  };

  const HOME = {
    5: [{
      id: 'home-core', title: 'Home Core Day', subtitle: 'Full spine-conscious core session', exercises: [
        { name: 'Dead Bug', sets: 3, reps: '8–10 / side' },
        { name: 'Bird Dog', sets: 3, reps: '8–10 / side' },
        { name: 'Modified Side Plank', sets: 3, reps: '20–30 sec / side' },
        { name: 'Front Plank', sets: 3, reps: '20–40 sec' },
        { name: 'Heel Slide', sets: 3, reps: '10 / side' },
        { name: 'Supine March', sets: 3, reps: '10 / side' },
        { name: 'Glute Bridge', sets: 3, reps: '12–15' },
        { name: 'Resistance-Band Pallof Press', sets: 3, reps: '10–12 / side' }
      ]
    }],
    4: [
      { id: 'home-core-a', title: 'Home Core Day A', subtitle: 'Main core stability session', exercises: [
        { name: 'Dead Bug', sets: 3, reps: '8–10 / side' },
        { name: 'Bird Dog', sets: 3, reps: '8–10 / side' },
        { name: 'Modified Side Plank', sets: 3, reps: '20–30 sec / side' },
        { name: 'Front Plank', sets: 3, reps: '20–40 sec' },
        { name: 'Heel Slide', sets: 3, reps: '10 / side' },
        { name: 'Supine March', sets: 3, reps: '10 / side' },
        { name: 'Glute Bridge', sets: 3, reps: '12–15' },
        { name: 'Resistance-Band Pallof Press', sets: 3, reps: '10–12 / side' }
      ] },
      { id: 'home-core-b', title: 'Home Core Day B', subtitle: 'Lighter core + hip stability session', exercises: [
        { name: 'Dead Bug', sets: 2, reps: '8 / side' },
        { name: 'Bird Dog', sets: 2, reps: '8–10 / side' },
        { name: 'Modified Side Plank', sets: 2, reps: '20–30 sec / side' },
        { name: 'Supine March', sets: 3, reps: '10 / side' },
        { name: 'Glute Bridge', sets: 3, reps: '15' },
        { name: 'Side-Lying Leg Raise', sets: 3, reps: '12–15 / side' },
        { name: 'Band Hip Abduction', sets: 3, reps: '15' },
        { name: 'Band Pallof Hold', sets: 2, reps: '20 sec / side' }
      ] }
    ]
  };

  const safeParse = (text, fallback) => { try { return JSON.parse(text); } catch { return fallback; } };
  const getLogs = () => safeParse(localStorage.getItem(LOG_KEY), {});
  const setLogs = (v) => localStorage.setItem(LOG_KEY, JSON.stringify(v));
  const getHistory = () => safeParse(localStorage.getItem(HISTORY_KEY), []);
  const setHistory = (v) => localStorage.setItem(HISTORY_KEY, JSON.stringify(v));
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (el) => (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim();

  function injectStyle() {
    if (document.getElementById('forge90-enhancement-style')) return;
    const style = document.createElement('style');
    style.id = 'forge90-enhancement-style';
    style.textContent = `
      .f90x-card{margin:16px 0;padding:16px;border:1px solid rgba(148,163,184,.28);border-radius:16px;background:rgba(15,23,42,.035);font-family:inherit}
      .f90x-card h3{margin:0 0 4px;font-size:1.05rem}.f90x-muted{opacity:.72;font-size:.88rem}.f90x-list{display:grid;gap:10px;margin-top:12px}
      .f90x-ex{padding:12px;border:1px solid rgba(148,163,184,.25);border-radius:12px;background:rgba(255,255,255,.45)}
      .f90x-ex strong{display:block;margin-bottom:3px}.f90x-meta{font-size:.84rem;opacity:.75}.f90x-sets{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .f90x-set{display:flex;align-items:center;gap:6px;font-size:.82rem}.f90x-set input[type=checkbox]{width:18px;height:18px}.f90x-weight{width:72px;padding:6px 7px;border:1px solid rgba(148,163,184,.45);border-radius:8px;background:transparent;color:inherit}
      .f90x-home-grid{display:grid;gap:12px;margin:16px 0}.f90x-btn{border:0;border-radius:10px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;background:#111827;color:#fff}
      .f90x-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,23,.74);display:flex;align-items:flex-end;justify-content:center}
      .f90x-modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;color:#111827;border-radius:20px 20px 0 0;padding:18px;box-shadow:0 -20px 50px rgba(0,0,0,.3)}
      .f90x-modalhead{display:flex;align-items:center;justify-content:space-between;gap:12px}.f90x-close{border:0;background:transparent;font-size:1.5rem;cursor:pointer}
      .f90x-note{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,.10);font-size:.84rem}
    `;
    document.head.appendChild(style);
  }

  function inferPlanMode() {
    const saved = Number(localStorage.getItem(PLAN_KEY));
    if (saved === 4 || saved === 5) return saved;
    const b = text(document.body).toLowerCase();
    const four = /\b4[ -]?day\b|four[ -]?day/.test(b);
    const five = /\b5[ -]?day\b|five[ -]?day/.test(b);
    if (four && !five) return 4;
    if (five && !four) return 5;
    return 5;
  }

  function inferDay() {
    const selectors = ['h1','h2','h3','[class*=title]','[class*=heading]','main'];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const m = text(el).match(/\bDay\s*([1-5])\b/i);
        if (m) return Number(m[1]);
      }
    }
    const m = text(document.body).match(/\bDay\s*([1-5])\b/i);
    return m ? Number(m[1]) : null;
  }

  function findFinishButton() {
    const activeView = document.querySelector('.view.active');
    if (!activeView) return null;
    return [...activeView.querySelectorAll('button,a,[role="button"]')].find(el => {
      const t = text(el).toLowerCase();
      return t.includes('finish') && t.includes('report');
    }) || null;
  }

  function keyFor(plan, day, exIndex) { return `gym:${plan}:${day}:${exIndex}`; }

  function renderGymAddons() {
    const finish = findFinishButton();
    if (!finish) {
      document.getElementById('forge90-gym-addons')?.remove();
      return;
    }
    const plan = inferPlanMode();
    const day = inferDay();
    if (!day || !GYM[plan]?.[day]) return;
    const marker = `${plan}:${day}`;
    const current = document.getElementById('forge90-gym-addons');
    if (current?.dataset.marker === marker) return;
    current?.remove();

    const logs = getLogs();
    const box = document.createElement('section');
    box.id = 'forge90-gym-addons';
    box.dataset.marker = marker;
    box.className = 'f90x-card';
    box.innerHTML = `<h3>Core • Hips • Glutes Add-ons</h3><div class="f90x-muted">Added to Day ${day}. Your original Forge90 exercises remain unchanged.</div><div class="f90x-list"></div><div class="f90x-note">Keep a neutral spine and controlled range. Stop any movement that causes radiating pain, numbness, tingling or weakness.</div>`;
    const list = box.querySelector('.f90x-list');
    GYM[plan][day].forEach((ex, i) => {
      const k = keyFor(plan, day, i);
      const state = logs[k] || { sets: {} };
      const row = document.createElement('div');
      row.className = 'f90x-ex';
      row.innerHTML = `<strong>${esc(ex.name)}</strong><div class="f90x-meta">${esc(ex.equipment)} • ${ex.sets} sets × ${esc(ex.reps)} • ${esc(ex.target)}</div><div class="f90x-sets"></div>`;
      const setWrap = row.querySelector('.f90x-sets');
      for (let s = 1; s <= ex.sets; s++) {
        const st = state.sets?.[s] || {};
        const set = document.createElement('label');
        set.className = 'f90x-set';
        set.innerHTML = `<input type="checkbox" ${st.done ? 'checked' : ''} data-set="${s}"><span>S${s}</span><input class="f90x-weight" inputmode="decimal" placeholder="kg" value="${esc(st.weight ?? '')}" aria-label="${esc(ex.name)} set ${s} weight">`;
        const checkbox = set.querySelector('input[type=checkbox]');
        const weight = set.querySelector('.f90x-weight');
        const persist = () => {
          const all = getLogs();
          all[k] ||= { name: ex.name, plan, day, sets: {} };
          all[k].name = ex.name; all[k].plan = plan; all[k].day = day; all[k].reps = ex.reps;
          all[k].sets[s] = { done: checkbox.checked, weight: weight.value };
          setLogs(all);
        };
        checkbox.addEventListener('change', persist);
        weight.addEventListener('input', persist);
        setWrap.appendChild(set);
      }
      list.appendChild(row);
    });
    finish.parentElement?.insertBefore(box, finish);
  }

  function saveGymAddonHistory() {
    const finish = findFinishButton();
    if (!finish) return;
    const plan = inferPlanMode();
    const day = inferDay();
    if (!day || !GYM[plan]?.[day]) return;
    const logs = getLogs();
    const completed = GYM[plan][day].map((ex, i) => {
      const st = logs[keyFor(plan, day, i)] || { sets: {} };
      return { name: ex.name, reps: ex.reps, equipment: ex.equipment, sets: st.sets || {} };
    });
    const history = getHistory();
    history.push({ id: `gym-${Date.now()}`, type: 'gym-addon', plan, day, completedAt: new Date().toISOString(), exercises: completed });
    setHistory(history.slice(-250));
  }

  function findHomeControl() {
    const els = [...document.querySelectorAll('button,a,[role="button"],[aria-label]')];
    return els.find(el => {
      const t = text(el).trim().toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      return t === 'home' || t === 'back to home' || aria === 'home' || aria.includes('go home');
    }) || null;
  }

  function returnHome() {
    const tryHome = () => {
      const home = findHomeControl();
      if (home) { home.click(); return true; }
      return false;
    };
    if (tryHome()) { sessionStorage.removeItem(RETURN_HOME_KEY); return; }
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (tryHome()) { clearInterval(timer); sessionStorage.removeItem(RETURN_HOME_KEY); }
      else if (tries >= 12) {
        clearInterval(timer);
        sessionStorage.removeItem(RETURN_HOME_KEY);
        if (location.hash || location.search) location.href = location.origin + location.pathname;
        else location.reload();
      }
    }, 150);
  }

  function renderHomeCoreCards() {
    if (findFinishButton() || document.getElementById('forge90-home-core-section')) return;
    const plan = inferPlanMode();
    if (!HOME[plan]) return;
    const bodyText = text(document.body).toLowerCase();
    if (!/workout|forge90|forge 90/.test(bodyText)) return;

    const hostCandidates = [...document.querySelectorAll('main,section,[class*=container],[class*=content],body')];
    const host = hostCandidates.find(el => /4[ -]?day|5[ -]?day|workout plan|today|start workout/i.test(text(el))) || document.querySelector('main') || document.body;
    const section = document.createElement('section');
    section.id = 'forge90-home-core-section';
    section.className = 'f90x-card';
    section.innerHTML = `<h3>Home Core Sessions</h3><div class="f90x-muted">${plan === 5 ? '5-day mode: 1 full home core session.' : '4-day mode: 2 home core sessions.'}</div><div class="f90x-home-grid"></div>`;
    const grid = section.querySelector('.f90x-home-grid');
    HOME[plan].forEach(session => {
      const card = document.createElement('div');
      card.className = 'f90x-ex';
      card.innerHTML = `<strong>${esc(session.title)}</strong><div class="f90x-meta">${esc(session.subtitle)} • ${session.exercises.length} exercises</div><div style="margin-top:10px"><button class="f90x-btn" type="button">Start ${esc(session.title)}</button></div>`;
      card.querySelector('button').addEventListener('click', () => openHomeSession(plan, session));
      grid.appendChild(card);
    });
    host.appendChild(section);
  }

  function openHomeSession(plan, session) {
    document.getElementById('forge90-home-core-overlay')?.remove();
    const logs = getLogs();
    const overlay = document.createElement('div');
    overlay.id = 'forge90-home-core-overlay';
    overlay.className = 'f90x-overlay';
    overlay.innerHTML = `<div class="f90x-modal"><div class="f90x-modalhead"><div><h2 style="margin:0">${esc(session.title)}</h2><div class="f90x-muted">${esc(session.subtitle)}</div></div><button class="f90x-close" type="button" aria-label="Close">×</button></div><div class="f90x-list"></div><div class="f90x-note">Controlled, pain-free movement only. This home session complements the gym plan; it does not replace any gym exercise.</div><div style="display:flex;gap:10px;margin-top:16px"><button class="f90x-btn" type="button" data-finish>Finish Home Core</button></div></div>`;
    overlay.querySelector('.f90x-close').addEventListener('click', () => overlay.remove());
    const list = overlay.querySelector('.f90x-list');
    session.exercises.forEach((ex, i) => {
      const k = `home:${plan}:${session.id}:${i}`;
      const state = logs[k] || { sets: {} };
      const row = document.createElement('div'); row.className = 'f90x-ex';
      row.innerHTML = `<strong>${esc(ex.name)}</strong><div class="f90x-meta">${ex.sets} sets × ${esc(ex.reps)}</div><div class="f90x-sets"></div>`;
      const wrap = row.querySelector('.f90x-sets');
      for (let s=1; s<=ex.sets; s++) {
        const st = state.sets?.[s] || {};
        const label = document.createElement('label'); label.className='f90x-set';
        label.innerHTML = `<input type="checkbox" ${st.done ? 'checked' : ''}><span>Set ${s}</span>`;
        const cb = label.querySelector('input');
        cb.addEventListener('change', () => {
          const all = getLogs(); all[k] ||= { name: ex.name, plan, session: session.id, sets: {} };
          all[k].sets[s] = { done: cb.checked }; setLogs(all);
        });
        wrap.appendChild(label);
      }
      list.appendChild(row);
    });
    overlay.querySelector('[data-finish]').addEventListener('click', () => {
      const all = getLogs();
      const exercises = session.exercises.map((ex,i) => ({ name: ex.name, reps: ex.reps, sets: all[`home:${plan}:${session.id}:${i}`]?.sets || {} }));
      const history = getHistory();
      history.push({ id:`home-${Date.now()}`, type:'home-core', plan, sessionId:session.id, title:session.title, completedAt:new Date().toISOString(), exercises });
      setHistory(history.slice(-250));
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function capturePlanSelection(e) {
    const el = e.target.closest?.('button,a,[role="button"],label');
    if (!el) return;
    const t = text(el).toLowerCase();
    if (/\b4[ -]?day\b|four[ -]?day/.test(t)) localStorage.setItem(PLAN_KEY, '4');
    if (/\b5[ -]?day\b|five[ -]?day/.test(t)) localStorage.setItem(PLAN_KEY, '5');
  }

  function captureFinish(e) {
    const el = e.target.closest?.('button,a,[role="button"]');
    if (!el) return;
    const t = text(el).toLowerCase();
    if (!(t.includes('finish') && t.includes('report'))) return;
    saveGymAddonHistory();
    sessionStorage.setItem(RETURN_HOME_KEY, '1');
    setTimeout(returnHome, 250);
  }

  let renderTimer;
  function scheduleRender() {
    if (renderTimer) return;
    renderTimer = setTimeout(() => {
      renderTimer = null;
      renderGymAddons();
      renderHomeCoreCards();
    }, 80);
  }

  function init() {
    injectStyle();
    document.addEventListener('click', capturePlanSelection, true);
    document.addEventListener('click', captureFinish, true);
    new MutationObserver(scheduleRender).observe(document.documentElement, { childList:true, subtree:true });
    scheduleRender();
    if (sessionStorage.getItem(RETURN_HOME_KEY) === '1') setTimeout(returnHome, 300);
    console.info(`[Forge90] enhancements ${VERSION} loaded; original workout data remains untouched.`);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
