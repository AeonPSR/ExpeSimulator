# Duplication Report

> Last updated: 2025-07-23

Only remaining (unfixed) issues are listed. Fixed items have been removed.


---
## A. Hardcoded Constants Repeated Across Files
---

### A1. Default health `14`

`Constants.js` defines `DEFAULT_HEALTH`, but `PlayerCard.js` still hardcodes
`health: 14` in its constructor fallback.
`ExpeditionState.js` is fine — it reads from `Constants`.

### A2. Default avatar `'lambda_f.png'`

Three places define the same default:
- `Constants.js` → `DEFAULT_AVATAR`
- `PlayerCard.js` → inline `'lambda_f.png'` in constructor fallback
- `CharacterData.js` → `default: 'lambda_f.png'`

`ExpeditionState.js` is fine — it reads from `Constants`.

### A3. Ability slots `5` — **includes a bug**

`Constants.ABILITY_SLOTS = 5` exists, but:
- `ExpeditionState.js` hardcodes `[null,null,null,null,null]` three times.
- `PlayerCard.js` fallback has the same hardcoded array.
- **Bug:** `PlayerCard._createAbilitiesRow()` loops `i < 4` — only renders
  **4 slots** out of 5. The 5th ability is invisible.

### A4. Item slots `3`

Same pattern as A3. `Constants.ITEM_SLOTS = 3` exists but `ExpeditionState`
and `PlayerCard` use hardcoded `[null,null,null]` arrays.

### A5. MAX_PLAYERS `8`

`PlayerSection.js` has `options.maxPlayers || 8`. `app.js` already passes
`Constants.MAX_PLAYERS`, so the `|| 8` is a redundant copy of the value.

### A6. MAX_SECTORS `20`

Same pattern. `SelectedSectors.js` has `options.maxSectors || 20`.

### A7. Grenade power `3`

Three independent hardcodings:
- `FightingPowerService.getGrenadePower()` → reads config or falls back to `3`
- `FightCalculator._applyGrenadesToDistribution()` → `const grenadePower = 3`
- `DamageComparator._scoreFightEvent()` → `baseDamage - fightingPower - 3`

Neither `FightCalculator` nor `DamageComparator` calls `FightingPowerService`.

### A9. Scenario labels array

`['pessimist', 'average', 'optimist', 'worstCase']` is constructed
independently in `app.js`, `DamageSpreader.js` (×2),
`DamageDistributionEngine.js`, and `FightCalculator.js`.
Should be `Constants.SCENARIO_KEYS`.


---
## B. Duplicated Data Structures / Lookups
---

### B1. Event type string list hardcoded multiple times

`EventDamageCalculator.EVENT_DAMAGES` is the authority (keys = event types).
But `EventDamageCalculator.calculate()` also has a local
`const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', ...]` instead of reading
`Object.keys(this.EVENT_DAMAGES)`.
`DamageSpreader._distributeEventDamage()` hardcodes the same strings as
conditions in its if/else tree.

### B2. World names list

`WorldData.js` defines world configurations + `getAvailableWorlds()`.
`ExampleWorlds.js` has its own hardcoded 2D array of the same names.
Must update both files when adding/removing a world.

### B3. Event display config in ProbabilityDisplay

`ProbabilityDisplay._renderEventRisks()` has a local `eventConfig` map with
`{ name, damage, cssClass }` for each event type. The damage descriptions
(`'2 dmg to all'`, `'3-5 dmg to all'`, etc.) duplicate knowledge already in
`EventDamageCalculator.EVENT_DAMAGES` (which has `min`, `max`, `affectsAll`).


---
## D. Formatting / Transformation Duplicated
---

### D1. Filename → ID conversion — 6+ independent copies

`LoadoutBuilder.filenameToId()` is the canonical version (strips
`.png/.jpg/.gif`, uppercases). But **5 other files** do the same inline:
- `ResourceCalculator._countModifiers()`
- `FightingPowerService` (5 call sites)
- `OxygenService.playerHasSpacesuit()`
- `DamageSpreader.applySurvivalReduction()`

None of them call `LoadoutBuilder.filenameToId()`.

### D2. Extension-stripping regex — inconsistent variants

Three different regexes for the same operation:
- `/\.(png|jpg|gif)$/i` — LoadoutBuilder, ResourceCalculator, DamageSpreader, OxygenService
- `/\.(jpg|png)$/i` — FightingPowerService (×5)
- `/\.(jpg|png)$/` — FightCalculator fallback (no `i` flag, no `gif`)

The FightingPowerService and FightCalculator variants would fail silently on
`.gif` files, and the FightCalculator one is also case-sensitive.


---
## E. Lists Maintained in Multiple Places
---

### E1. World names

`WorldData.getAvailableWorlds()` returns the list, but `ExampleWorlds.js` has
its own hardcoded 2D array. Must update both when adding worlds.

### E2. Sectors-with-fight roster

`SectorData.sectorsWithFight` is a hardcoded array. The actual sector configs
in `PlanetSectorConfigData` have `FIGHT_*` events. Two sources of truth.

### E3. Damage event type list

`EventDamageCalculator.EVENT_DAMAGES` keys are the authority, but the same
strings are hardcoded in `EventDamageCalculator.calculate()` (local array)
and `DamageSpreader._distributeEventDamage()` (if/else branches).


---
## F. Structural Inconsistencies
---

### F1. ID casing split

`LoadoutBuilder` / `ModifierApplicator` / `ResourceCalculator` use UPPERCASE
identifiers (`'PILOT'`, `'WHITE_FLAG'`). `FightingPowerService` /
`OxygenService` / `DamageSpreader` use lowercase (`'pilot'`, `'space_suit'`).
Works by accident because each file converts independently.

### F2. `worst` vs `worstCase`

`DistributionCalculator.getScenarios()` returns `worst` / `worstProb`.
The rest of the app expects `worstCase` / `worstCaseProb`.
The remapping now happens once in `DamageDistributionEngine.buildDamageResult()`
— much better than before, but the interface mismatch still exists.

### F3. Dual damage instance format

`DamageDistributionEngine` produces `{type:'COMBINED', count:null, totalDamage}`.
`DamageSpreader` must branch on `count === null` to handle this vs the legacy
`{type, count, damagePerInstance}` format.

### F4. Player defaults not derived from Constants

`ExpeditionState.js` and `PlayerCard.js` hardcode array shapes instead of
using `Constants.ABILITY_SLOTS` / `Constants.ITEM_SLOTS`.

### F5. `damage` vs `scenarios` alias

`EventDamageCalculator.calculate()` returns both `damage: damageResult` and
`scenarios: damageResult` (same object under two keys). Confusing — callers
must know which key to use. The `scenarios` alias is pure backward compat.

### F6. `_fightingPowerBtn` declared twice (minor)

`PlayerSection.js` constructor declares `this._fightingPowerBtn = null` twice
(lines ~44 and ~46). Harmless but sloppy.


---
## Summary
---

Remaining items: 9 constants, 3 data structures, 6 logic blocks,
2 formatting families, 3 lists, 6 structural inconsistencies.

### Section C (Duplicated Logic) at a glance

```
C1  _hasFightEvents wrappers           Tiny    ~2 min    4 lines
C2  Grenade counting fallback          Small   ~5 min    15 lines removed
C3  Legacy fallback methods            Small   ~10 min   90 lines removed
C4  Empty result factories             Medium  ~25 min   3 files, shared base
C5  formatProb × 3                     Small   ~5 min    10 lines in 1 file
C6  Scenario row-merging copy-paste    Medium  ~40 min   100 lines in 1 file
```

C1 + C2 + C3 + C5 are quick wins (total ~20 minutes, mostly deleting code).
C4 and C6 require a bit of design but stay within one or two files each.
