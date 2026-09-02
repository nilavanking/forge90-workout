# Forge90 Initial GitHub Migration Checklist

- [x] GitHub repository created
- [x] `main` established as the future production branch
- [x] Production deployment metadata recorded
- [x] Safe release workflow documented
- [ ] Capture complete current Netlify deployed source
- [ ] Reconcile 31 Aug base application into repository
- [ ] Reconcile 1 Sep core/hips/glutes enhancement patch
- [ ] Reconcile 2 Sep IndexedDB/Dexie package
- [ ] Reconcile 2 Sep Weight Journey package
- [ ] Run regression and data-preservation tests
- [ ] Create/verify Netlify preview from GitHub
- [ ] Connect existing Netlify project to GitHub `main`
- [ ] Verify first Git-triggered production deployment
- [ ] Disable normal manual ZIP deployment workflow

## Stop condition

Do not connect Netlify production to `main` while any source required to reproduce the current app is missing. This prevents a partial Git repository from replacing the working production site.
