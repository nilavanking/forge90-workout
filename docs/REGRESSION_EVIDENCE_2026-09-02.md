# Forge90 migration regression evidence — 2 September 2026

## Candidate
Local combined migration candidate assembled from the audited Phase 1 IndexedDB/Dexie package, the 1 September v2 session-controls package, the Core/Hips/Glutes preservation layer and the Weight Journey package.

Candidate ZIP SHA-256:
`8f47551553ab3bf0349d1d4a1215a9cbcaf6809bdd50cf86e00f870138dcae5d`

## Static/runtime-structure checks passed
- `node --check` passed for `app.js`, `forge90-storage.js`, `forge90-base-app.js`, `forge90-session-controls.js`, `forge90-enhancements.js`, `forge90-weight.js` and `sw.js`.
- Every local `src`/`href` referenced by `index.html` exists in the candidate.
- Every service-worker app-shell asset exists in the candidate.
- The loader uses bundled Dexie 4.0.11 and has no CDN/runtime dependency.
- The loader order is: Dexie -> storage adapter -> base app -> v2 session controls -> approved enhancements -> Weight Journey.
- `forge90-weight.js` stores its state under `forge90_weight_v1` through `window.Forge90Storage`.
- v2 session controls use `window.Forge90Storage` for persistent session/equipment/weight-memory records; `sessionStorage` is used only for the live in-progress session.

## Storage migration harness passed
A Node test harness with mocked localStorage and Dexie exercised `forge90-storage.js` and verified:
- legacy `forge90.v1` and `forge90_*` records are imported;
- unrelated localStorage keys are not imported or changed;
- new writes reach the IndexedDB records table and the safety mirror;
- deletion creates an IndexedDB tombstone and removes the mirrored value;
- database name is `forge90_local_v1`;
- the storage-ready event reports IndexedDB mode.

## Browser test environment limitation
A local Chromium DevTools run was attempted, but the managed browser environment blocked `127.0.0.1` with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore interactive browser regression is still required in an allowed preview/browser environment before production cutover.

## Release decision
**STATIC + STORAGE MIGRATION VERIFICATION: PASS**

**INTERACTIVE BROWSER / NETLIFY PREVIEW: PENDING**

Do not merge PR #1 into `main` or connect production Netlify until the remaining runtime assets are attached to GitHub and the interactive preview regression passes.
