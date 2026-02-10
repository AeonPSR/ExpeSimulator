# Duplication Report

> Last updated: 2026-02-10

Only remaining (unfixed) issues are listed. Fixed items have been removed.
Sections C, Batch 1 (A1, A4, A5, A6, F6), Batch 2 (A2, A3, A7),
and Batch 3 (A9, B1, F2, F5) have been fully resolved.

Side effects: Batch 1 also resolved F4. Batch 2 fixed A3 loop-bound bug.
Batch 3 also resolved E3 (=B1) and simplified `DamageDistributionEngine.buildDamageInstances()`
by unifying the worst-case branch with `Constants.SCENARIO_KEYS` iteration.


---
## B. Duplicated Data Structures / Lookups
---

### B2. World names list

**Size: Medium** — 15 minutes, 1 file refactored.

`WorldData.js` defines world configurations + `getAvailableWorlds()`.
`ExampleWorlds.js` has its own hardcoded 2D array of the same names.
Must update both files when adding/removing a world.

**Fix:** Refactor `ExampleWorlds.js` to read world names from
`WorldData.getAvailableWorlds()` instead of maintaining its own list.
Same issue as E1.

### B3. Event display config in ProbabilityDisplay

**Size: Medium** — 20 minutes, 2 files. Needs some design.

`ProbabilityDisplay._renderEventRisks()` has a local `eventConfig` map with
`{ name, damage, cssClass }` for each event type. The damage descriptions
(`'2 dmg to all'`, `'3-5 dmg to all'`, etc.) duplicate knowledge already in
`EventDamageCalculator.EVENT_DAMAGES` (which has `min`, `max`, `affectsAll`).

The complication: `cssClass` and display `name` don't exist in the backend
data. Either the backend gets display hints, or a shared lookup bridges both.

**Fix:** Add `displayName` and `cssClass` to `EVENT_DAMAGES`, or build the
display config by reading `min`/`max`/`affectsAll` from the backend and
deriving the damage description string programmatically.


---
## D. Formatting / Transformation Duplicated
---

### D1. Filename → ID conversion — 6+ independent copies

**Size: Medium** — 20 minutes, 6 files, ~15 lines changed.

`LoadoutBuilder.filenameToId()` is the canonical version (strips
`.png/.jpg/.gif`, uppercases). But **5 other files** do the same inline:
- `ResourceCalculator._countModifiers()`
- `FightingPowerService` (5 call sites)
- `OxygenService.playerHasSpacesuit()`
- `DamageSpreader.applySurvivalReduction()`

None of them call `LoadoutBuilder.filenameToId()`.

The main risk is load-order: all files rely on `<script>` tag ordering
in `manifest.json`. `LoadoutBuilder` must load before any caller. Currently
it does — but this creates a cross-layer dependency (services calling a
builder utility). A cleaner option is to move `filenameToId` to `helpers.js`
(already a shared utility file that loads early).

**Fix:** Move `filenameToId()` to `helpers.js`, replace all 6+ inline
conversions with calls to it. This also resolves D2 (regex inconsistency)
and F1 (casing split) since everyone will use the same function.

### D2. Extension-stripping regex — inconsistent variants

**Size: absorbed by D1** — no separate work needed.

Three different regexes for the same operation:
- `/\.(png|jpg|gif)$/i` — LoadoutBuilder, ResourceCalculator, DamageSpreader, OxygenService
- `/\.(jpg|png)$/i` — FightingPowerService (×5)
- `/\.(jpg|png)$/` — FightCalculator fallback (no `i` flag, no `gif`)

The FightingPowerService and FightCalculator variants would fail silently on
`.gif` files, and the FightCalculator one is also case-sensitive.

**Fix:** Absorbed by D1 — all sites will use the single shared function.


---
## E. Lists Maintained in Multiple Places
---

### E1. World names

**Size: same as B2** — see B2.

`WorldData.getAvailableWorlds()` returns the list, but `ExampleWorlds.js` has
its own hardcoded 2D array. Must update both when adding worlds.

### E2. Sectors-with-fight roster

**Size: Medium** — 15 minutes, 1 file. Needs verification.

`SectorData.sectorsWithFight` is a hardcoded array. The actual sector configs
in `PlanetSectorConfigData` have `FIGHT_*` events. Two sources of truth.

**Fix:** Derive `sectorsWithFight` from `PlanetSectorConfigData` at load time
by scanning each sector's events for `FIGHT_*` keys. Delete the hardcoded
array. Risk: must verify that `PlanetSectorConfigData` is loaded before
`SectorData` references it (check `manifest.json` order).


---
## F. Structural Inconsistencies
---

### F3. Dual damage instance format

**Size: Medium** — 20 minutes, 2 files. Needs care.

`DamageDistributionEngine` produces `{type:'COMBINED', count:null, totalDamage}`.
`DamageSpreader` must branch on `count === null` to handle this vs the legacy
`{type, count, damagePerInstance}` format.

**Fix:** Standardize on one format. Either always use `totalDamage` (simpler)
or always provide `count`+`damagePerInstance` (backward compat). Touches
`DamageDistributionEngine.buildDamageInstances()` and
`DamageSpreader._spreadDamage()`.


---
## Summary
---

### Overlap map

- **B2 = E1** (world names) — fix once
- **D1 absorbs D2 + F1** (filename→ID + regex + casing) — one refactor

After deduplication: **5 unique items** remain.

### At a glance

```
ID   Description                        Size    Time     Risk     Files
──── ────────────────────────────────── ─────── ──────── ──────── ──────
B2   World names list (=E1)             Medium  ~15 min  Low      1
B3   Event display config               Medium  ~20 min  Low      2
D1   filenameToId (absorbs D2+F1)       Medium  ~20 min  Low      6
E2   Sectors-with-fight roster          Medium  ~15 min  Low      1
F3   Dual damage instance format        Medium  ~20 min  Medium   2
```

### Suggested batches

**Batch 1 — ✅ DONE** (A1, A4, A5, A6, F6 + side-effect: A3 arrays, A2 in PlayerCard, F4)

**Batch 2 — ✅ DONE** (A2 in CharacterData, A3 bug fix, A7)

**Batch 3 — ✅ DONE** (A9, B1/E3, F2, F5)

**Batch 4 — Medium refactors** (~1.5h total, need some design):
D1 (absorbs D2+F1), B2 (=E1), E2, B3, F3
