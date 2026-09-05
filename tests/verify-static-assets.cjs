const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));

const htmlAssets = [...html.matchAll(/(?:src|href)="([^"#?]+)[^"]*"/g)]
  .map(match => match[1])
  .filter(asset => !/^(?:https?:|data:)/.test(asset));
const cachedAssets = [...serviceWorker.matchAll(/'\.\/([^']*)'/g)]
  .map(match => match[1] || 'index.html');

for (const asset of new Set([...htmlAssets, ...cachedAssets])) {
  assert.ok(fs.existsSync(asset), `missing local asset: ${asset}`);
}
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
assert.match(serviceWorker, /caches\.open\(CACHE\)/);
assert.match(serviceWorker, /catch\(\(\)=>caches\.match/);
assert.doesNotMatch(serviceWorker, /indexedDB\.deleteDatabase|localStorage\.clear/);

console.log('STATIC_PWA_ASSET_REGRESSION=PASS');
