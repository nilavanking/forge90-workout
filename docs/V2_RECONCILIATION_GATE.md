# v2 session-controls reconciliation gate

The uploaded `Forge90-Workout-App-Update-2026-09-01-v2(1).zip` contains behavior that must not be lost during the IndexedDB migration:

- exercise-specific equipment selection;
- remembered last equipment per exercise;
- remembered last weight by exercise + equipment combination;
- equipment stored per set;
- active-set timing with Start Set / Complete Set behavior;
- explicit unmeasured state when Start Set was skipped;
- notification/vibration completion signals;
- expanded final session metrics, including active lifting time and equipment used.

The uploaded Phase 1 IndexedDB/Dexie package has a different `forge90-timers.js` implementation and does not expose these features in the same way.

Therefore the migration rule is: **adapt the v2 behavior to `Forge90Storage`; do not copy its direct localStorage persistence unchanged, and do not silently drop the features.**
