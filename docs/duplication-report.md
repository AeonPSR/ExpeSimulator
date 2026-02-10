# Duplication Report

> Last updated: 2026-02-10

## History

Round 1 (batches 1–4) resolved all A, B, C, D, E, F items. See git history
for details. Round 2 findings below (G-series).

---
## G. Remaining Duplications & Inconsistencies
---

### G1. config.js effect schemas vs hardcoded *Modifiers.js — dual source of truth

**Size: Large** — ~60 min, 4+ files. Needs design decision.

`config.js` declares detailed effect schemas for every ability and item
(`AbilityEffects`, `ItemEffects`, `ProjectEffects`): which events to remove,
which sectors are affected, multipliers, etc. But **none of the actual
calculator code reads these configs**. Instead, each modifier file hardcodes
the exact same logic:

| Config declaration                                              | Hardcoded implementation                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `AbilityEffects.pilot.sectorModifications.LANDING.removeEvents` | `AbilityModifiers.applyPilot()` removes same 3 events           |
| `AbilityEffects.diplomacy.removeCombatEvents`                   | `AbilityModifiers.applyDiplomacy()` removes `FIGHT_*`           |
| `AbilityEffects.tracker` (config says "reveal sectors")         | `AbilityModifiers.applyTracker()` removes `KILL_LOST` from LOST |
| `ItemEffects.white_flag.removeCombatEvents`                     | `ItemModifiers.applyWhiteFlag()` removes `FIGHT_*` from INTELLIGENT only (config doesn't mention sector restriction!) |
| `ItemEffects.quad_compass.removeEvents: ['AGAIN']`              | `ItemModifiers.applyQuadCompass()` removes `AGAIN`              |
| `ItemEffects.trad_module.sectorEventBonus`                      | `ItemModifiers.applyTradModule()` doubles ARTEFACT in INTELLIGENT |
| `ProjectEffects.antigrav_propeller.sectorEventModifier`         | `ProjectModifiers.applyAntigravPropeller()` doubles NOTHING_TO_REPORT in LANDING |

Two sources of truth. Updating one doesn't update the other.
Note: the Tracker config is also **wrong** — it describes "reveal unexplored
sectors" but the code actually removes `KILL_LOST` from `LOST`.

**Fix (option A — data-driven):** Make `ModifierApplicator` read from
`AbilityEffects`/`ItemEffects`/`ProjectEffects` and dynamically apply
`removeEvents`, `removeEventsByPrefix`, `multiplyEventWeight`, etc.
Delete `AbilityModifiers.js`, `ItemModifiers.js`, `ProjectModifiers.js`.

**Fix (option B — code-only):** Delete the effect schemas from `config.js`
(`AbilityEffects`, `ItemEffects`, `ProjectEffects`) and keep the modifier
files as the single source. Simpler, but loses the nice declarative config.

### G2. Skillful ability — effects scattered across two unrelated files

**Size: Small** — ~10 min, 2 files.

Skillful has two distinct effects, each hardcoded in a different place:

1. **Grants Diplomacy** — `LoadoutBuilder._collectAbilities()`:
   `if (id === 'SKILLFUL') abilities.add('DIPLOMACY')`
2. **Counts as Botanic** (fruit bonus) — `ResourceCalculator._countModifiers()`:
   `if (id === 'BOTANIC' || id === 'SKILLFUL') botanistCount++`

Neither reads from config. Skillful doesn't have an entry in `AbilityEffects`
at all. Adding a third side-effect means hunting through unrelated files.

**Fix:** Centralize Skillful's "alias" effects in one place (e.g. an
`ABILITY_ALIASES` map: `{ SKILLFUL: ['DIPLOMACY', 'BOTANIC'] }`) and have
both `LoadoutBuilder` and `ResourceCalculator` read it.

### G3. `ACCIDENT_ROPE_3_5` — phantom event type with no source data

**Size: Small** — ~10 min, 2 files.

`EventDamageCalculator.EVENT_DAMAGES` defines `ACCIDENT_ROPE_3_5` (with
`ropeImmune: true`). `ProbabilityDisplay._renderEventRisks()` references it
in its sort order. But **no sector in `PlanetSectorConfigData`** ever emits
this event — all sectors use plain `ACCIDENT_3_5`. The rope item's config
uses `sectorSpecificImmunity` (sector-level filtering) instead.

Result: `ACCIDENT_ROPE_3_5` is dead code. It will never appear in any
occurrence distribution.

**Fix:** Remove `ACCIDENT_ROPE_3_5` from `EVENT_DAMAGES` and the display
sort order. If rope immunity needs separate tracking, implement it via the
config's `sectorSpecificImmunity` approach or add the event to sector configs.

### G4. Rope item — config declares `sectorSpecificImmunity`, no code reads it

**Size: Medium** — ~20 min, 2+ files.

`ItemEffects.rope.effects.sectorSpecificImmunity` says rope removes
`ACCIDENT_3_5` from `SEISMIC_ACTIVITY`, `CAVE`, and `MOUNTAIN`. But:
- `ItemModifiers.js` has **no `applyRope()` function**.
- `ModifierApplicator._applyItems()` doesn't list `'ROPE'` in its item map.

The rope effect is declared in config but completely unimplemented.

**Fix:** Implement `applyRope()` in `ItemModifiers.js` and wire it into
`ModifierApplicator`, or remove the config entry if rope immunity isn't
meant to affect probability output.

### G5. Plastenite Armor / Sprint / Traitor — configured but not implemented

**Size: Medium** — ~25 min, 3+ files.

These items/abilities have config entries in `config.js` but zero
calculation code:

| Config entry                                         | Expected effect                    | Implemented? |
| ---------------------------------------------------- | ---------------------------------- | ------------ |
| `ItemEffects.plastenite_armor.fightDamageReduction=1` | Reduce fight damage per player     | No           |
| `AbilityEffects.sprint.additionalSectors=1`          | Extra sector explored              | No           |
| `AbilityEffects.traitor.doubleNegativeEvents=true`   | Double all negative event weights  | No           |

The `NegativeEvents` array in `config.js` exists to support Traitor but is
never referenced by any code.

These are either TODO features or orphaned config. Either way, a developer
might think these effects are working when they aren't.

**Fix:** Either implement them, or mark them clearly as
`// NOT YET IMPLEMENTED` in config and delete any supporting dead code
(e.g., the `NegativeEvents` array if Traitor isn't planned).

### G6. Event categorization logic duplicated in backend and frontend

**Size: Small** — ~15 min, 2 files.

Both methods classify events by prefix using near-identical if/else chains:

- `EventWeightCalculator._categorizeEvent()` (backend) routes event names
  into buckets (fights, tired, accident, disease, playerLost, etc.).
- `ProbabilityDisplay._getEventColorClass()` (frontend) maps the same
  prefixes to CSS classes (`positive`, `warning`, `danger`, `neutral`).

Same classification tree in two places. Adding a new event type means
updating both.

**Fix:** Create a shared `EventClassifier` utility that returns
`{ category, cssClass }` for any event name. Both files call it.

### G7. PlayerCard instantiation — identical options block in `app.js`

**Size: Small** — ~10 min, 1 file.

`_renderInitialPlayers()` and `_onAddPlayer()` in `app.js` both create
`new PlayerCard({...})` with the exact same 6-line callback wiring block.
Only the `player` source differs.

**Fix:** Extract a `_createPlayerCard(player)` factory method and call it
from both sites.

### G8. `SectorData.sectors` fallback duplicates `PlanetSectorConfigData`

**Size: Small** — ~5 min, 1 file.

`SectorData.js` has a `get sectors()` that reads `PlanetSectorConfigData`
when available but keeps a 24-entry hardcoded fallback array with the same
sector names, `maxPerPlanet`, and `weightAtPlanetGeneration` values. Same for
`sectorsWithFight` (8-entry fallback). These fallbacks will silently drift
if config.js is updated.

**Fix:** Since `PlanetSectorConfigData` is always loaded before `SectorData`
(by manifest.json order), remove the fallback arrays and throw/warn if the
config is missing.

### G9. `_calculateExpeditionResults()` called twice per state change

**Size: Small** — ~5 min, 1 file.

Every state change triggers `_updateDisplays()` which calls both
`_updateProbabilityDisplay()` and `_updateResultsDisplay()`. Each of those
independently calls `_calculateExpeditionResults()` — running the full
probability engine **twice** for the same inputs.

**Fix:** Call `_calculateExpeditionResults()` once in `_updateDisplays()`,
store the result, and pass it to both display update methods.


---
## Summary
---

### At a glance

```
ID   Description                               Size     Time     Risk
──── ───────────────────────────────────────── ──────── ──────── ────────
G1   config.js vs *Modifiers.js dual truth     Large    ~60 min  Medium
G2   Skillful effects scattered                Small    ~10 min  Low
G3   ACCIDENT_ROPE_3_5 phantom event           Small    ~10 min  Low
G4   Rope item config unimplemented            Medium   ~20 min  Medium
G5   Plastenite/Sprint/Traitor unimplemented   Medium   ~25 min  Low
G6   Event categorization duplicated           Small    ~15 min  Low
G7   PlayerCard factory duplicated in app.js   Small    ~10 min  Low
G8   SectorData fallback duplicates config     Small    ~5 min   Low
G9   Double calculation per state change       Small    ~5 min   Low
```

### Overlap map

- **G1 partially absorbs G4 + G5** — if option A (data-driven) is chosen,
  rope/plastenite/sprint/traitor implementation naturally follows from
  making the engine read config. If option B (code-only) is chosen, G4/G5
  become separate items.
- **G3 relates to G4** — the phantom `ACCIDENT_ROPE_3_5` event was likely
  an attempt to implement rope that went a different direction.

### Suggested batch order

**Batch 5 — Quick wins (G7, G8, G9):** ~20 min, low risk, immediate value.

**Batch 6 — Dead code cleanup (G3, G6):** ~25 min, low risk.

**Batch 7 — Skillful + config decision (G2, G1):** ~70 min. G1 requires a
design decision (option A vs B) before starting. G2 can be done independently.

**Batch 8 — Unimplemented effects (G4, G5):** ~45 min. Depends on G1 decision.
