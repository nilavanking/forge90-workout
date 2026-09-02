# Forge90 Production Baseline Record

Baseline capture date: 2 Sep 2026

## Existing Netlify production

Project: `forge90-workout`

Site ID: `3271c276-0600-443e-a9fd-790d85529e94`

Current production deploy observed during migration:

- Deploy ID: `6a96f304d5810c17173f3788`
- State: ready
- Context: production
- Deploy source: API/upload
- Git commit reference: none
- Deployment title: `Deploy triggered by upload`
- Source ZIP present in Netlify deploy metadata: yes

## Known production patch architecture

The current 1 Sep patch preserves the 31 Aug Forge90 application by loading the immutable base `app.js` from:

`https://6a95c0aec7213e910fe6ad1d--forge90-workout.netlify.app/app.js`

It then loads `forge90-enhancements.js` from the current origin.

Known enhancement scope:

- core/hips/glutes/adductor/abductor gym add-ons for 4-day and 5-day plans
- home core sessions
- supplemental add-on history
- Finish & Report return-to-home behavior
- local workout-data preservation

## Migration warning

This record is intentionally stored before enabling Git-based production deployment. Connecting an incomplete repository to Netlify could publish a partial app. The full uploaded production source must be reconciled before the GitHub-to-Netlify production link is enabled.
