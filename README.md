# Forge90 Workout

Forge90 is an adaptive fitness and workout tracking application focused on personalized training, workout logging, progression, weight monitoring, recovery insights, and AI-assisted fitness assessment.

## Repository role

This repository is the source-control home for Forge90. The production workflow is designed to be:

`feature branch -> test -> review/approval -> merge to main -> Netlify production deploy -> production verification`

## Production safety rule

`main` is the production branch. Do not merge a change into `main` until the change has been tested and approved.

The existing Netlify production site is `forge90-workout`. During the initial migration, the live Netlify upload-based deployment remains authoritative until the complete deployed source has been reconciled into GitHub and verified without loss of existing browser workout data.

## Data preservation

Forge90 currently preserves user workout information on the device/browser. Deployment and migration work must not clear, rename, or overwrite established local data keys without an explicit migration path and verification.

## Migration status

- GitHub repository established: yes
- Production branch: `main`
- Netlify production project: `forge90-workout`
- Current Netlify deployment mode: upload/API deployment
- GitHub-to-Netlify continuous deployment: pending complete-source reconciliation
- Production safety gate: active

See `docs/DEPLOYMENT_WORKFLOW.md` for the release process.
