const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript',
  '.json': 'application/manifest+json', '.png': 'image/png'
};

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, {'content-type': mime[path.extname(target)] || 'application/octet-stream'});
  fs.createReadStream(target).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.FORGE90_CHROMIUM_PATH ? {executablePath: process.env.FORGE90_CHROMIUM_PATH} : {})
  });
  const context = await browser.newContext({serviceWorkers: 'allow', viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  try {
    await page.goto(origin, {waitUntil: 'networkidle'});
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({waitUntil: 'networkidle'});

    const online = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const entries = {};
      for (const name of names) {
        const cache = await caches.open(name);
        entries[name] = (await cache.keys()).map(request => new URL(request.url).pathname);
      }
      return {
        controlled: Boolean(navigator.serviceWorker.controller),
        active: registration.active?.state,
        names,
        entries,
        manifest: document.querySelector('link[rel="manifest"]')?.href,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });

    assert.equal(online.controlled, true);
    assert.equal(online.active, 'activated');
    assert.equal(online.overflow, false);
    assert.ok(online.manifest.endsWith('/manifest.webmanifest'));
    assert.ok(online.names.includes('forge90-v20260902-weight-1'));
    const appManifest = await cdp.send('Page.getAppManifest');
    const installability = await cdp.send('Page.getInstallabilityErrors');
    assert.ok(appManifest.data.includes('Forge90 Personal Gym Coach'));
    assert.deepEqual(installability.installabilityErrors, []);
    const cached = online.entries['forge90-v20260902-weight-1'];
    for (const asset of ['/', '/index.html', '/styles.css', '/app.js', '/vendor/dexie.min.js',
      '/forge90-storage.js', '/forge90-base-app.js', '/forge90-session-controls.js',
      '/forge90-enhancements.js', '/forge90-weight.js', '/manifest.webmanifest',
      '/icons/forge90-logo.png', '/icons/icon-192.png', '/icons/icon-512.png']) {
      assert.ok(cached.includes(asset), `missing cached asset ${asset}`);
    }

    await context.setOffline(true);
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => document.body.innerText.includes('Forge90'));
    const offline = await page.evaluate(async () => ({
      title: document.title,
      hasStart: document.body.innerText.includes('Start Workout'),
      manifestStatus: (await fetch('./manifest.webmanifest')).status,
      storageMode: window.Forge90Storage?.getMode(),
      controlled: Boolean(navigator.serviceWorker.controller),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));
    assert.equal(offline.title, 'Forge90');
    assert.equal(offline.hasStart, true);
    assert.equal(offline.manifestStatus, 200);
    assert.equal(offline.storageMode, 'indexeddb');
    assert.equal(offline.controlled, true);
    assert.equal(offline.overflow, false);
    assert.deepEqual(errors, []);

    console.log('PWA_OFFLINE_BROWSER_REGRESSION=PASS');
    console.log(JSON.stringify({online, installability, offline}, null, 2));
  } finally {
    await context.setOffline(false).catch(() => {});
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
