# Forge90 GitHub -> Netlify Release Workflow

## Source of truth
GitHub is the authoritative source once the initial migration release gate is complete. The production branch is `main`.

## Normal feature workflow
1. Start from the latest `main`.
2. Create a dedicated feature/fix branch.
3. Implement the requested Forge90 change.
4. Run syntax/static checks and feature-specific tests.
5. Verify existing workout/history data is preserved when persistence is touched.
6. Review the change in a Netlify deploy preview or equivalent test environment.
7. Open/update the pull request.
8. Merge only after the release checks pass.
9. Netlify deploys the merged `main` commit to production automatically.
10. Verify the production deployment and the key user flow after deploy.

## Initial migration exception
The existing Netlify production project predates the GitHub repository and is currently upload/API deployed. Until the repository reproduces the complete approved app, production stays on that deployment.

The migration branch is `migration/netlify-baseline`. Draft PR #1 is the controlled migration PR.

## Required migration release gates
- Complete self-contained application source in GitHub.
- IndexedDB/Dexie migration verified against legacy localStorage data.
- Existing workout/history data preserved.
- 4-day and 5-day workout plans preserved.
- Core/hips/glutes and Home Core additions preserved.
- v2 equipment selector, equipment-specific last weight and active-set/session-control behavior reconciled with the IndexedDB storage adapter.
- Weight Journey feature reconciled.
- Timers, reports and PWA/offline behavior verified.
- Netlify preview verified before production cutover.

## Production safety
Never use an incomplete branch as the Netlify production source. Do not clear site/browser data during migration testing. Manual ZIP deployment is retained only as an emergency rollback path after Git-based deployment becomes authoritative.
