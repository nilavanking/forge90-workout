# Forge90 migration regression evidence — 5 September 2026

## Scope and safety boundary

- Repository: `nilavanking/forge90-workout`
- Branch: `migration/netlify-baseline`
- Pull request: Draft PR #1 (must remain Draft)
- Tested application preview: `https://6a9bcf13167175c4ec9964b2--forge90-workout.netlify.app`
- Isolated browser-storage alias: `https://forge90-regression--forge90-workout.netlify.app`
- Production `https://forge90-workout.netlify.app` was not deployed, relinked or changed.
- No production deploy command was used.

## Candidate and runtime assets

The uploaded migration candidate ZIP used as the attachment source has SHA-256
`F07D09E8EDF69ABD49D68E02318BC3F5FDC44C5108CF004485169DBFA363855C`.

Commit `a0b24ab` attached the remaining self-contained runtime assets:

- `forge90-base-app.js`
- `vendor/dexie.min.js`
- `vendor/LICENSE.dexie.txt`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/forge90-logo.png`

## Automated verification

`tests/verify-static-assets.cjs` passed and confirms that the HTML, manifest and
service-worker assets exist locally; the manifest uses standalone display and
192/512 icons; the service worker provides an app-shell cache and offline
fallback; and no storage-clearing or IndexedDB-deletion operation is present.

`tests/verify-storage-migration.cjs` passed and confirms:

- legacy `forge90.v1` and `forge90_weight_v1` import into `forge90_local_v1`;
- unrelated localStorage keys are neither imported nor changed;
- writes reach IndexedDB and the rollback safety mirror;
- deletes remove the mirror value and create an IndexedDB tombstone;
- unowned keys are rejected; and
- the storage-ready event reports `indexeddb` mode.

All top-level JavaScript files passed `node --check`.

## Interactive application regression

The following checks passed in the immutable tested preview:

| Area | Evidence | Result |
| --- | --- | --- |
| 4-day plan | Monday, Thursday, Friday and Saturday cards rendered | VERIFIED |
| 5-day plan | Tuesday through Saturday cards rendered after plan switch | VERIFIED |
| Exercise rendering/navigation | Workout views and exercise controls rendered and could be navigated | VERIFIED |
| Weight/reps logging | A 40 kg x 10 entry was recorded | VERIFIED |
| Equipment and previous weight | Equipment switched to Barbell; refresh retained Barbell and 40 kg | VERIFIED |
| Set timing | Start Set entered active timing and Complete Set recorded the set | VERIFIED |
| Rest/transition controls | 60-second rest, Pause, +15 and Skip operated | VERIFIED |
| Finish & Report | Report showed 1 exercise, 1 set, 10 reps, 400 kg and 944 kcal | VERIFIED |
| Core/Hips/Glutes | Day-specific add-ons rendered and changed with the selected workout day | VERIFIED |
| Home Core | 4-day mode showed Day A/Day B; 5-day showed one Home Core day; completion persisted after reopen | VERIFIED |
| Weight Journey | Morning 115.5, post-workout 114.8 and pre-workout 115.3 recorded; history retained three records; morning value remained the official same-day trend; start/current/target displayed | VERIFIED |
| Refresh/reopen persistence | Workout equipment/weight, Home Core completion and Weight Journey history survived refresh/reopen | VERIFIED |
| Mobile layout | 375 x 844 viewport had no horizontal overflow; navigation and Start Workout remained present | VERIFIED |
| Browser console | The tested immutable preview emitted its enhancement load information and no preview-origin error | VERIFIED |

## Real-browser data-preservation regression

A draft-only stable Netlify alias was first deployed with a legacy browser profile,
then replaced with the Forge90 candidate on the same origin. A temporary diagnostic
page read the migrated browser database and exercised an actual write/delete cycle.
It returned `BROWSER_STORAGE_REGRESSION=PASS` with all of these checks true:

- IndexedDB mode active;
- workout legacy record imported;
- Weight Journey legacy record imported;
- unrelated key preserved in localStorage;
- unrelated key absent from Forge90 IndexedDB;
- safety mirror preserved; and
- deletion tombstone written with a null value.

Diagnostic deploy ID: `6a9c459535536d1bfacd08ce`. The diagnostic page is test-only
and is not part of the branch.

## Remaining release gate

The service-worker/manifest/cache implementation is verified statically, but this
managed browser does not expose an offline-network toggle. A true airplane-mode or
network-disabled reload is therefore **NOT VERIFIED**. PWA installation UI was also
not exercised.

## Release decision

**IMPLEMENTATION: COMPLETE**

**AUTOMATED STORAGE/STATIC TESTS: VERIFIED**

**INTERACTIVE FUNCTIONAL REGRESSION: VERIFIED**

**FULL PWA/OFFLINE ACCEPTANCE: NOT VERIFIED**

PR #1 must remain Draft. Do not merge it, connect production Netlify to GitHub, or
change production until the remaining PWA/offline acceptance check passes.
