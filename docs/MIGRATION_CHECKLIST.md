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
- [x] Attach the remaining self-contained runtime assets to GitHub (`forge90-base-app.js`, bundled Dexie, Dexie license, and app icons/logo).
- [x] Run the interactive functional regression for 4-day/5-day plans, workout logging, reports, session controls, Core/Hips/Glutes, Home Core and Weight Journey.
- [x] Verify localStorage -> IndexedDB migration, unrelated-key isolation, the safety mirror and tombstones using a real browser profile on a draft-only stable Netlify alias.
- [x] Verify the combined candidate in an immutable Netlify preview, including phone-size layout.

## Open release gates
- [ ] Verify an offline reload with network disabled and exercise PWA installation UI in an environment that exposes those controls.
- [ ] Connect the existing Netlify `forge90-workout` project to GitHub `main`.
- [ ] Verify the first Git-triggered production deploy.
- [ ] Retire manual ZIP upload as the normal production release path.

## Current test limitation
Interactive regression was completed through a non-production Netlify preview. The
managed browser does not expose a network-offline toggle, so a true offline reload
and PWA installation flow remain not verified. See
`docs/REGRESSION_EVIDENCE_2026-09-05.md`.

## Safety rule
Do not connect production Netlify to `main` until the repository can reproduce the complete approved application and all release gates pass.
