/* Forge90 preservation loader — 2026-09-01
   Loads the immutable 31 Aug 2026 Forge90 app unchanged, then layers approved enhancements.
*/
(() => {
  const BASE = 'https://6a95c0aec7213e910fe6ad1d--forge90-workout.netlify.app/app.js';
  const original = document.createElement('script');
  original.src = BASE;
  original.async = false;
  original.onload = () => {
    const enhancements = document.createElement('script');
    enhancements.src = '/forge90-enhancements.js?v=20260901-1';
    enhancements.async = false;
    document.head.appendChild(enhancements);
  };
  original.onerror = () => {
    console.error('[Forge90] Could not load preserved base application.');
    const box = document.createElement('div');
    box.style.cssText = 'margin:16px;padding:16px;border:1px solid #b91c1c;border-radius:12px;background:#fff7f7;color:#7f1d1d;font-family:system-ui';
    box.textContent = 'Forge90 could not load the preserved base application. Your local workout data has not been changed.';
    document.body.prepend(box);
  };
  document.head.appendChild(original);
})();
