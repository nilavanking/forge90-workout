# Forge90 GitHub migration checklist

## Completed
- [x] Create `nilavanking/forge90-workout` repository.
- [x] Reserve `main` as the production branch.
- [x] Create `migration/netlify-baseline` branch.
- [x] Capture the verified 1 September production preservation layer.
- [x] Audit the uploaded 1 September Core/Hips/Glutes, standard update, v2 session-controls and 2 September Phase 1 IndexedDB/Dexie packages.
- [x] Verify Phase 1 JavaScript syntax and static asset completeness.
- [x] Confirm the Phase 1 enhancement layer preserves the approved core/hips/glutes exercise set.

## Open release gates
- [ ] Reconcile v2 equipment/session-control behavior with the Phase 1 IndexedDB/Dexie storage adapter.
- [ ] Add and reconcile the Weight Journey package.
- [ ] Build one self-contained production candidate in GitHub with no dependency on the immutable 31 August JavaScript base.
- [ ] Test 4-day and 5-day plans, set logging, reports, home core sessions, timers and PWA behavior.
- [ ] Test localStorage -> IndexedDB migration with existing workout/history data preserved.
- [ ] Test rollback/safety mirror behavior.
- [ ] Verify the combined candidate in a Netlify preview.
- [ ] Connect the existing Netlify `forge90-workout` project to GitHub `main`.
- [ ] Verify the first Git-triggered production deploy.
- [ ] Retire manual ZIP upload as the normal production release path.

## Safety rule
Do not connect production Netlify to `main` until the repository can reproduce the complete approved application and all release gates pass.
