# Forge90 uploaded package audit — 2 September 2026

## Packages inspected

| Package | SHA-256 | Finding |
| --- | --- | --- |
| `Forge90-Core-Hips-Glutes-Update-2026-09-01(1).zip` | `5f0ba2137158432951dcb5dfdd08c61bd2eefb2d54e49ab81b02785163cce03b` | Preservation patch. Core/hips/glutes add-on definitions are represented in the Phase 1 package. |
| `Forge90-Workout-App-Update-2026-09-01(1).zip` | `ae8084334ee549d525d2b009a17ef121dfc2a4da156ca2e05eda582300871c33` | Earlier preservation/update layer. Superseded for migration purposes by later packages, subject to regression checks. |
| `Forge90-Workout-App-Update-2026-09-01-v2(1).zip` | `929714bbc2f510ecc5974bd379523cd5dd9285e6815c0c1c6919d30a3d395195` | Contains the extended session-controls package, including per-exercise equipment selection, equipment-specific last weight, active-set timing, notifications/vibration and expanded session metrics. |
| `Forge90-Phase1-IndexedDB-Dexie-2026-09-02(1).zip` | `5de6e093d9fc6ee9f7a74c51f737e33aa347aef12d2e7a6e64cbccde83f12cb1` | Complete self-contained site candidate. Introduces Dexie/IndexedDB primary storage with a non-destructive localStorage safety mirror and contains the core/hips/glutes add-ons plus timer package. |

## Verification performed

- JavaScript syntax check passed for `app.js`, `forge90-storage.js`, `forge90-base-app.js`, `forge90-timers.js`, `forge90-enhancements.js`, `sw.js` and bundled `vendor/dexie.min.js` in the Phase 1 package.
- All local assets referenced directly by the Phase 1 `index.html` exist in the package.
- Every asset listed by the Phase 1 service worker exists in the package.
- The core/hips/glutes exercise names from the 1 September preservation packages are present in the Phase 1 enhancement implementation.
- Phase 1 uses `Forge90Storage` instead of direct localStorage access for the storage-adapted enhancement layer.

## Important regression gate

The Phase 1 package is **not automatically treated as a complete superset of the 1 September v2 package**. The v2 `forge90-session-controls.js` contains equipment-selection and extended active-set/session-control behavior that is not present in the Phase 1 `forge90-timers.js` implementation.

Blindly replacing the v2 behavior with Phase 1 would therefore risk a feature regression. The v2 controls must be reconciled with the IndexedDB storage adapter before production release.

## Still required before production Git/Netlify cutover

1. Reconcile the v2 session-control features into the IndexedDB/Dexie baseline without restoring direct ungoverned persistence.
2. Add and reconcile the Weight Journey package.
3. Run data-preservation and workout regression tests on the combined candidate.
4. Verify a Netlify preview before connecting `main` to production.

Production remains on the existing Netlify deployment until these gates pass.
