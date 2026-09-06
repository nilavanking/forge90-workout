# Forge90 Warm-Up + Cardio — review and verification

Status: implementation completed; local and hosted-preview tests passed. Production deployment is NOT STARTED and production verification is NOT VERIFIED. Production release approval remains separate.

## Current source and scope

- Repository: nilavanking/forge90-workout.
- Baseline: migration/netlify-baseline at 36efdecce7cec2cf466829ef11cc6e7f502cc58a (remote head rechecked).
- Feature: feature/forge90-warmup-cardio, based on that complete current source. Existing checkout and Draft PR #1 were preserved.
- Tested preview: https://6a9d9a884d406f1c3b466640--forge90-workout.netlify.app
- Existing production: https://forge90-workout.netlify.app — not deployed or relinked by this feature task.

## Decision record

Decision: add a pure activity model and a dedicated UI/report integration module, with narrow hooks in the existing app. Store new data under forge90_conditioning_v1 through Forge90Storage. Keep the existing IndexedDB schema and original storage keys.

Reason: this preserves the current workout engine and keeps preparation loads out of strength records. Timestamps make running timers independent of JavaScript interval scheduling.

Alternatives rejected: rebuilding the application would risk existing data and workouts; representing cardio as strength sets would corrupt volume semantics; a new database schema is unnecessary. A separate deployment project would violate the requested existing-site workflow.

Impact/dependencies: app.js loads the model before the original app and the new UI after existing add-ons. Successful workout saves trigger report/add-on integration. The existing session module exposes pause/resume hooks. The static build packages only runtime assets into dist; Netlify consumes that directory.

## Implemented

- Day-specific upper/pull/lower warm-ups, 7 minutes for upper and 11–12 for lower days, including shoulder preparation on lower-plus-shoulder days. Exercise purpose, equipment, prepared muscles, instructions, reps/duration, optional light load and band categories are shown.
- Warm-up start, pause, resume, complete, stop, individual/all remaining skip, timed adjustments and substitution. Preparation loads never enter original strength logs.
- Dedicated cardio after all original strength and core/hip/glute additions, with explicit cooldown and Finish & Report afterward. Legacy manual cardio fields are suppressed; original plans contain no duplicate cardio entries.
- Treadmill, stationary bike, recumbent bike and elliptical; remembered per-machine settings; target versus actual time; RPE; original recommendation retained after adjustment.
- Conservative recommendations based on planned/completed leg work, completed set count, conditioning days, optional fatigue and successful history. Duration progresses before optional resistance/incline changes; no automatic HIIT or running.
- Timestamp-based timers persist through the storage adapter. Stop captures the tap time before the optional reason form. Skipped and Stopped Early remain distinct from Completed.
- Cardio easy/moderate/cooldown phases; optional additional 3–5-minute recovery. Cardio calories use actual phase time and preserve different machines used across substitutions.
- Safety pause, structured discomfort/substitution events, deliberate continuation and optional skip/stop reasons. Audio/vibration alerts are opt-in and fail safely.
- Extended saved reports with warm-up, strength, core, cardio target/actual, cooldown, recovery, total time, status, settings, reasons and separate estimates. Old reports remain readable.

## Timing and reporting definitions

Total session = measured warm-up + strength/rest + core/rest + actual cardio + additional recovery. Explicit session/activity pauses and untimed gaps between timed activities are excluded. Running activities continue while backgrounded or closed; completed targets cap actual time. Strength/core timing begins with the relevant set control and includes following rest until a phase change, pause or finish. Original built-in core exercises and add-ons route their elapsed time to the core category without changing their original volume calculation.

The final cardio cooldown is already part of actual cardio duration and is not counted twice. Optional recovery is additional. Calories are approximate gross MET estimates, not machine measurements; RPE and machine level are not treated as MET values. Historical reports keep their previously saved values.

Home Core A/B remain separate home sessions with their existing exercises and completion controls; gym-machine cardio is not imposed on them.

## Verification evidence

| Check | Result |
| --- | --- |
| Baseline static assets and storage migration | PASS before implementation |
| Baseline Chromium PWA/offline and set controls | PASS before implementation |
| ESLint | PASS |
| Unit tests | 10/10 PASS |
| Existing static-asset and migration tests | PASS |
| New Chromium browser suite | 26 checks PASS |
| Existing PWA/offline Chromium suite | PASS |
| Production static build | PASS — 18 runtime assets, JavaScript syntax checked |
| Hosted public asset hashes | PASS — match local tested build |
| Hosted Netlify rewrite | PASS |
| Hosted 4-day/5-day layout, controls, stop and reload | PASS |
| Hosted legacy fixture and browser console | PASS, zero errors |
| Type checking | Not applicable: existing app is plain JavaScript, no TypeScript configuration |
| Production deployment | NOT STARTED |
| Actual production feature verification | NOT VERIFIED |

The realistic synthetic old-data fixture includes completed workouts, readable reports, weights/reps, Weight Journey records, body measurements, equipment preferences, add-on/Home Core logs, session history and unrelated application data. The suite first loads the immutable baseline application with those records, then serves the updated source on the same origin. Every seeded original value is compared byte-for-byte in localStorage; owned records are also compared in real IndexedDB. No real user's data is used or cleared.

All nine gym workouts are compared with the immutable baseline for exercise names, keys, rep targets and set counts. The exact Warm-Up → Strength → Core/Hips/Glutes → Cardio → Cooldown → Finish order is asserted. Mobile screenshots were captured for the required gym examples and both Home Core days, and hosted screenshots were inspected.

## Bugs found and fixed

1. Generic button-text timer detection could start a second activity timer; new controls use explicit integration.
2. The old report used planned cardio duration; new reports use actual measured time and segment-aware calorie estimates.
3. Stop could otherwise accumulate time while a reason dialog was open; it now stops immediately.
4. Add-on logs bypassed the IndexedDB adapter; future writes use the same existing keys through the adapter.
5. Add-on history/return-home logic ran on the Finish click before a successful save; it now runs only after a saved workout.
6. The Home lookup could miss the icon-bearing native button and fall back to reload; it now uses the explicit native selector.
7. The session observer repeatedly scheduled renders and rewrote unchanged timer text; it now coalesces render work and only changes differing text.
8. Start Workout replaced active data after refresh; it now resumes an existing active workout.
9. Whole-session pause now excludes paused active-set time and separates Home Core timing from gym conditioning.

Test/setup corrections: resolved Playwright module/executable paths and sandbox browser-temp permissions; preloaded immutable baseline assets before browser navigation; corrected the build license filename; opened collapsed alert controls in the test; tested Netlify's _redirects as routing configuration rather than a served file. These failures were investigated, not hidden.

## Reproduce

Use Node.js 24 and npm ci. Install the matching Playwright browser with npx playwright install chromium, or set FORGE90_CHROMIUM_PATH to an existing compatible executable.

- npm run lint
- npm test
- npm run build
- npm run test:browser
- npm run test:pwa
- Set FORGE90_PREVIEW_URL to the existing draft preview and run node --use-system-ca tests/verify-hosted-preview.cjs if the environment uses system certificate authorities.

Detailed machine-readable results are in docs/conditioning-browser-results.json and docs/hosted-preview-results.json. Screenshots and logs are included in the review evidence ZIP, not shipped in dist.

## Release gate and limitations

The feature PR targets migration/netlify-baseline so it does not silently merge the existing migration into main. Neither Draft PR #1 nor main was changed. The tested build is ready for production release review; production is not claimed updated or verified. No GitHub-to-Netlify production configuration change was made.

Physical phone locking, device vibration hardware and OS background audio delivery were not exercised on a real phone. Timestamp recovery and unsupported-alert behavior were tested in Chromium. Browser/OS scheduling can delay an alert while an application is suspended; timestamps still recover correct elapsed time.

Safety copy follows the requested stop-on-symptoms behavior, with reference to [NHS back-pain guidance](https://www.nhs.uk/conditions/back-pain/). Gradual warm-up/cooldown guidance was checked against the [American Heart Association](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down). The programmed routine is not a medical diagnosis or an individual clinical clearance.
