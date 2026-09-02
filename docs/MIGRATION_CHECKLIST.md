# Forge90 GitHub migration checklist

## Completed
- [x] Create `nilavanking/forge90-workout` repository.
- [x] Reserve `main` as the production branch.
- [x] Create `migration/netlify-baseline` branch.
- [x] Capture the verified 1 September production preservation layer.
- [x] Audit the uploaded 1 September Core/Hips/Glutes, standard update, v2 session-controls and 2 September Phase 1 IndexedDB/Dexie packages.
- [x] Verify Phase 1 JavaScript syntax and static asset completeness.
- [x] Confirm the Phase 1 enhancement layer preserves the approved core/hips/glutes exercise set.
- [x] Receive and verify the 2 September Weight Journey package.
- [x] Reconcile Weight Journey with `window.Forge90Storage`.
- [x] Reconcile equipment selection, equipment-specific weight memory, Start Set/Complete Set timing, rest/transition controls and finish guard with IndexedDB-backed Forge90 storage.
- [x] Build a complete local self-contained migration candidate containing the base app, bundled Dexie, session controls, enhancements, Weight Journey, PWA assets and icons.
- [x] Run JavaScript syntax and static asset/service-worker completeness checks on the combined candidate.
- [x] Run a storage migration harness verifying legacy import, unrelated-key isolation, IndexedDB writes, localStorage safety mirror and tombstone deletion behavior.

## Open release gates
- [ ] Attach the remaining self-contained runtime assets to GitHub (`forge90-base-app.js`, bundled Dexie, Dexie license, and app icons/logo).
- [ ] Run interactive browser regression tests for 4-day and 5-day plans, set logging, reports, home core sessions, session controls, Weight Journey and PWA behavior.
- [ ] Verify localStorage -> IndexedDB migration using a real browser profile containing existing workout/history/weight data.
- [ ] Verify the combined candidate in a Netlify preview.
- [ ] Connect the existing Netlify `forge90-workout` project to GitHub `main`.
- [ ] Verify the first Git-triggered production deploy.
- [ ] Retire manual ZIP upload as the normal production release path.

## Current test limitation
The managed local Chromium environment blocks localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`, so interactive regression must be completed in an allowed browser/Netlify preview environment.

## Safety rule
Do not connect production Netlify to `main` until the repository can reproduce the complete approved application and all release gates pass.
