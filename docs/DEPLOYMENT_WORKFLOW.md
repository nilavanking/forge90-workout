# Forge90 Deployment Workflow

## Target workflow

1. Create a feature branch from `main`.
2. Implement only the approved Forge90 change.
3. Run functional and data-preservation tests.
4. Review the change and confirm the test evidence.
5. Merge the approved branch into `main`.
6. Netlify automatically deploys `main` to the production project `forge90-workout`.
7. Verify the production deployment after Netlify reports success.

## Mandatory pre-merge checks

At minimum, verify the affected flows and confirm that existing browser/device data survives the update. For workout-related changes, include relevant checks for:

- 4-day and 5-day workout selection
- exercise rendering and workout navigation
- set completion, weight and rep logging
- Finish & Report behavior
- workout history/report preservation
- core/hips/glutes supplemental work when affected
- home-core sessions when affected
- weight tracking when affected
- IndexedDB/Dexie migration when affected
- PWA/service-worker behavior when affected
- mobile layout and interaction

## Production data protection

Never clear localStorage, IndexedDB, Cache Storage, or other browser data as a deployment shortcut. Schema changes require an explicit forward migration and verification. Do not silently reset a user's workout history or weight history.

## Initial migration gate

The existing Netlify site was previously deployed by upload/API rather than Git continuous deployment. The current 1 Sep production patch also depends on an immutable 31 Aug Forge90 base deployment. Therefore GitHub must not replace production until the full deployed source is captured and reconciled.

The migration is complete only when:

- the full production source exists in GitHub;
- the app runs without relying on an undocumented external deployment dependency, or that dependency is intentionally documented and accepted;
- current production behavior is regression-tested;
- existing local browser data is preserved;
- a preview deployment passes;
- Netlify is connected to this repository with `main` as the production branch.

## Branch policy

- `main`: production-ready only
- `migration/*`: source reconciliation and initial migration
- `feature/*`: normal feature development
- `fix/*`: bug fixes

Normal development should not use manual ZIP deployment after Git continuous deployment is activated. ZIP packages may still be retained as backup/release artifacts.
