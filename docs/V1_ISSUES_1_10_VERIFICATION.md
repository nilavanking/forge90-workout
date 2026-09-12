# V1 Issues 1–10 verification

Date: 2026-09-13. Branch: `codex/v1-issues-1-10-completion`.
Scope: approved Issues 1–10 implementation and local acceptance. No merge or deployment.

## Results

| Check | Result | Evidence covered |
| --- | --- | --- |
| `npm.cmd run lint` | PASS | Runtime and test source lint |
| `npm.cmd test` | PASS | 32 tests; all 16 progression rules, typed measurements, conditioning; static PWA assets and storage migration |
| `node tests/verify-v1-browser.cjs` | PASS | Authoritative prefills, equipment isolation and lock, refreshed active timestamp, immutable completed actuals, 8 viewport widths, saved/report/history agreement |
| `node tests/verify-v1-home-warmup.cjs` | PASS | Home Core typed sides, add/remove, refresh persistence, reports; warm-up pause, exact 15-second adjustments, Stop & Start, completion flow and distinct skip |
| `node tests/verify-v1-measurements.cjs` | PASS | All 11 measurement families through controls, stored actuals and reports |
| `node tests/verify-v1-state.cjs` | PASS | Equipment setup notes, tab close/reopen, discomfort correction without actual changes or leakage, Stop/Pain interruption, stale notice, orientation and enlarged text, report totals |
| `npm.cmd run test:browser` | PASS | Original workout prescriptions and section order, legacy localStorage/IndexedDB preservation, old reports, Home Core, timers, cardio, recovery, safety, audio/vibration fallback; no blocking browser errors |
| `npm.cmd run test:pwa` | PASS | Isolated persistent Chromium profile; installability errors `[]`, activated/controlling worker, offline manifest and app, IndexedDB, contained 82 × 44 set controls and rest controls |
| `npm.cmd run build` | PASS | Production static build: 20 runtime assets, syntax validated |
| `git diff --check` | PASS | No whitespace errors |

Browser checks use Playwright Chromium with `FORGE90_CHROMIUM_PATH` and the local server (`npm.cmd run serve`, port 4173). PWA uses its own local server and disposable persistent profile, not a private context or the user's profile. Generated JSON and screenshots remain under ignored `test-results/`.

## Final failure corrections and retests

The outstanding state test exposed a single-element selector used as a collection during equipment switching. It now updates every measurement input, allowing setup notes to refresh correctly. The state test and full browser suite passed afterward.

The final mobile visual review exposed a squeezed exercise title. The existing wrapping header now reserves a readable title width. The eight-width acceptance test includes an explicit minimum title-width assertion. Browser acceptance, state/enlarged-text, PWA, lint and production build passed after this correction. A whitespace-only end-of-file issue was also removed.

Cache version: `forge90-v20260913-v1-corrections-1`; session-controls loader version: `20260913-1`.

## Acceptance boundaries

No unresolved failure remains in these local acceptance and regression suites. Installability is verified through Chromium's installability check and persistent-profile offline behavior; no physical-device installation or hosted deployment is claimed. Existing production and main-branch status are outside this change.
