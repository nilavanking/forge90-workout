# Forge90 Phase 1 package verification

Date: 2 September 2026

Candidate package: `Forge90-Phase1-IndexedDB-Dexie-2026-09-02(1).zip`

SHA-256: `5de6e093d9fc6ee9f7a74c51f737e33aa347aef12d2e7a6e64cbccde83f12cb1`

## Checks repeated during GitHub migration

- `node --check` passed for `app.js`.
- `node --check` passed for `forge90-storage.js`.
- `node --check` passed for `forge90-base-app.js`.
- `node --check` passed for `forge90-timers.js`.
- `node --check` passed for `forge90-enhancements.js`.
- `node --check` passed for `sw.js`.
- `node --check` passed for bundled `vendor/dexie.min.js`.
- All local `src`/`href` assets referenced by `index.html` were present in the ZIP.
- All assets listed in the service-worker app shell were present in the ZIP.
- The approved Core/Hips/Glutes exercise names from the 1 September patch are present in the Phase 1 enhancement layer.

## Persistence design observed

- Database: `forge90_local_v1`.
- IndexedDB is managed through bundled Dexie.
- Forge90-owned `forge90.v1` and `forge90_*` localStorage keys are collected for migration.
- A localStorage safety mirror is maintained.
- Deletions are represented as IndexedDB tombstones.
- Non-Forge90 keys are rejected by the adapter.

## Gate result

**STATIC VERIFICATION: PASS**

**PRODUCTION RELEASE: NOT YET APPROVED**

Reason: the 1 September v2 session-controls package includes equipment-selection/weight-memory and extended active-set behavior not represented in the Phase 1 timer implementation. Weight Journey is also not yet included in the migration input. These must be reconciled and runtime-tested before GitHub becomes the Netlify production source.
