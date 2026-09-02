# Forge90 Production Baseline

## Live site
- Netlify project: `forge90-workout`
- Site ID: `3271c276-0600-443e-a9fd-790d85529e94`
- Production URL: `https://forge90-workout.netlify.app`

## Current deployed release before Git cutover
- Deploy ID: `6a96f304d5810c17173f3788`
- Status: `ready`
- Deployment method: upload/API deployment, not Git-based
- Deployed 1 September 2026

The live release uses a preservation loader that references the immutable 31 August deployment for the original application and layers the approved enhancement patch over it.

## Migration evidence received 2 September 2026
A complete Phase 1 IndexedDB/Dexie site candidate was received and statically verified. Three 1 September update packages were also audited, including the v2 session-controls package.

The Phase 1 package removes the JavaScript dependency on the immutable 31 August base by including `forge90-base-app.js`, but it is not yet approved as production because the v2 equipment/active-set controls must be reconciled and the Weight Journey package is still pending.

## Production rule
The existing live Netlify deployment remains untouched until the GitHub candidate is demonstrably feature-complete, data-safe and preview-tested. The production Netlify project must not be connected to `main` before that release gate passes.
