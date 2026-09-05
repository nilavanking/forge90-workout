# Phase 1 GitHub import status

The migration branch now contains the Phase 1 application shell and persistence foundation imported from the uploaded complete-site candidate:

- `index.html`
- `styles.css`
- `app.js` (self-contained Phase 1 loader)
- `forge90-storage.js` (Dexie/IndexedDB adapter)
- `manifest.webmanifest`
- `_redirects`
- `sw.js`

The existing production enhancement capture remains on the draft branch while the remaining Phase 1 runtime files are reconciled.

## Not yet release-complete

The production candidate is intentionally not marked ready until the remaining runtime files/vendor/assets are committed together with reconciliation of the 1 Sep v2 equipment/session-control behavior and the Weight Journey package. This prevents an incomplete branch from reaching Netlify production.
