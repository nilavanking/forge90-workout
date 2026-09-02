/* Forge90 Phase 1 deployment loader — 2026-09-02
   Local-first storage, original app, approved timers, then additive enhancements.
*/
(() => {
  'use strict';
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  (async () => {
    try {
      await load('./vendor/dexie.min.js?v=4.0.11');
      await load('./forge90-storage.js?v=20260902-1');
      await window.Forge90Storage.init();
      await load('./forge90-base-app.js?v=20260902-1');
      await load('./forge90-timers.js?v=20260902-1');
      await load('./forge90-enhancements.js?v=20260902-1');
    } catch (error) {
      console.error('[Forge90] Combined application failed to load.', error);
      const box = document.createElement('div');
      box.style.cssText = 'margin:16px;padding:16px;border:1px solid #b91c1c;border-radius:12px;background:#fff7f7;color:#7f1d1d;font-family:system-ui';
      box.textContent = 'Forge90 could not load. Your locally saved workout data has not been changed.';
      document.body.prepend(box);
    }
  })();
})();
