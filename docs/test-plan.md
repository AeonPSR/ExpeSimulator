# Test Plan: Expedition Simulator

This document outlines unit tests organized by feature/module. Tests are prioritized by importance (🔴 Critical, 🟡 Important, 🟢 Nice-to-have) and complexity.

> **Last Review:** February 2026 — Updated to match actual codebase structure.

---

## 1. Probability Engine (Core Backend)

### 1.1 DistributionCalculator
**File:** `js/probability/DistributionCalculator.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `convolve two simple distributions` | Convolving `{0: 0.5, 1: 0.5}` with itself gives correct sum distribution |
| 🔴 | `convolveAll with multiple distributions` | Combining 3+ distributions produces expected result |
| 🔴 | `convolveAll with empty array` | Returns `{0: 1}` (certainty of zero) |
| 🔴 | `getExpectedValue calculates mean correctly` | E[X] for known distribution matches hand calculation |
| 🔴 | `getPercentile returns correct values` | P25, P50, P75, P100 for a known distribution |
| 🔴 | `getScenarios extracts all percentile scenarios` | Returns pessimist (P75), average (P50), optimist (P25), worstCase (P100) |
| 🔴 | `getScenarios calculates cumulative probabilities` | pessimistProb + averageProb + optimistProb + worstCaseProb ≈ 1.0 |
| 🟡 | `convolve handles empty distribution` | Edge case: one or both distributions empty |
| 🟡 | `mixDistributions combines weighted distributions` | Multiple compositions weighted correctly |
| 🟡 | `mixScenarios combines weighted scenario objects` | Weighted average of pessimist/average/optimist/worstCase |
| 🟡 | `validateDistribution detects valid distributions` | Sum ≈ 1.0 → valid: true |
| 🟡 | `validateDistribution detects invalid distributions` | Sum ≠ 1.0 → valid: false with error |
| 🟢 | `empty creates certainty-of-zero distribution` | Returns Map([[0, 1]]) |

### 1.2 SectorSampler
**File:** `js/probability/SectorSampler.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `binomial coefficient calculation` | C(5,2) = 10, C(10,0) = 1, C(n,n) = 1 |
| 🔴 | `binomial handles edge cases` | C(n,k) = 0 when k < 0 or k > n |
| 🔴 | `binomial uses memoization` | Second call for same params is cached (check _binomialCache) |
| 🔴 | `enumerateCompositions generates all valid combinations` | Planet with {A:2, B:2}, K=2 → all valid pairs |
| 🔴 | `enumerateCompositions respects max counts` | Can't draw more than available per type |
| 🔴 | `enumerateCompositions with K=0` | Returns single empty composition |
| 🔴 | `computeProbabilities sums to 1.0` | Normalization is correct |
| 🔴 | `computeProbabilities with uniform weights` | Reduces to standard hypergeometric |
| 🟡 | `computeProbabilities with varying weights` | Higher weights → higher probability |
| 🟡 | `getEffectiveWeights applies item multipliers` | Echo Sounder multiplies HYDROCARBON weight |
| 🟡 | `getEffectiveWeights defaults to base weight` | Missing config → defaults to 8 |
| 🟡 | `generateWeightedCompositions returns compositions with probabilities` | Used by calculateWithSampling |
| 🟡 | `expandComposition creates correct sector array` | `{FOREST: 2, DESERT: 1}` → `['FOREST', 'FOREST', 'DESERT']` |

### 1.3 OccurrenceCalculator
**File:** `js/probability/OccurrenceCalculator.js`

> **Note:** Shared utility for calculating event occurrence distributions.
> Used by FightCalculator and EventDamageCalculator.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `calculateForType with single sector` | Returns occurrence distribution and source sectors |
| 🔴 | `calculateForType with multiple sectors` | Convolves binary distributions correctly |
| 🔴 | `calculateForType returns sectors array` | Tracks which sectors can produce the event |
| 🔴 | `calculateForType with no matching events` | Returns empty distribution {0: 1} |
| 🟡 | `combineOccurrences merges multiple event types` | Creates overall occurrence distribution |
| 🟡 | `maxPossible equals number of sectors with event` | Correct maximum occurrence count |

### 1.4 EventWeightCalculator
**File:** `js/probability/EventWeightCalculator.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `calculate returns all expected keys` | resources, combat, eventDamage, negativeEvents, sectorBreakdown |
| 🔴 | `calculate with single sector` | Basic FOREST sector produces valid output |
| 🔴 | `calculate with multiple identical sectors` | 3× FOREST stacks correctly |
| 🔴 | `getSectorProbabilities returns normalized values` | Probabilities sum to 1.0 |
| 🔴 | `calculateWithSampling skips when K >= N` | Falls back to standard calculate |
| 🔴 | `calculateWithSampling mixes compositions` | Multiple compositions weighted correctly |
| 🟡 | `calculate handles empty sectors array` | Returns null or empty result gracefully |
| 🟡 | `_mixCompositionResults preserves distribution shape` | Mixed result has valid distribution properties |
| 🟡 | `_mixResourceResults correctly weights resources` | Resource scenarios weighted by composition probability |
| 🟡 | `_mixDamageResults correctly weights damage` | Damage distributions weighted by composition probability |
| 🟢 | `_sampling metadata included in result` | When sampling enabled, includes composition count and details |

### 1.5 DamageDistributionEngine
**File:** `js/probability/DamageDistributionEngine.js`

> **Note:** Shared convolution pipeline for damage calculations.
> Both FightCalculator and EventDamageCalculator delegate to this engine.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `calculate convolves per-sector damage distributions` | Combines sector damage maps correctly |
| 🔴 | `calculate handles worstCaseExclusions` | Excluded sectors contribute 0 damage |
| 🔴 | `calculate extracts P25/P50/P75/P100 scenarios` | Damage scenarios derived from full distribution |
| 🔴 | `calculate returns damageDistribution Map` | Full distribution available for analysis |
| 🟡 | `calculate applies postProcessDistribution` | Custom processing (e.g., grenade reduction) applied |
| 🟡 | `calculate collects damageInstances with sources` | Per-scenario damage breakdown |
| 🟡 | `calculate samples explaining paths` | sampledPaths shows which sectors contributed |
| 🟢 | `getDetailedSectorOutcomes callback used for path sampling` | Enables provenance tracking |

### 1.6 DamagePathSampler
**File:** `js/probability/DamagePathSampler.js`

> **Note:** Samples explaining paths to recover provenance after convolution.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `samplePath with target 0` | All sectors contributed 0 damage |
| 🔴 | `samplePath with single sector` | Simple case with one sector |
| 🔴 | `samplePath returns correct structure` | Returns { totalDamage, sources: [{ sector, eventType, damage }] } |
| 🟡 | `samplePath produces valid paths` | Sum of source damages equals targetTotal |
| 🟡 | `_buildWaysTable creates DP table` | ways[i][r] = probability weight to reach r from sectors i..n-1 |
| 🟢 | `samplePath respects outcome probabilities` | Higher probability outcomes more likely to be sampled |

### 1.7 DamageComparator
**File:** `js/probability/DamageComparator.js`

> **Note:** Determines worst-case damage events for mutual exclusivity handling.
> Critical for FIGHT vs ACCIDENT comparisons on sectors like INSECT, PREDATOR.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `getWorstEvent identifies worst event on sector` | Returns highest-scoring event |
| 🔴 | `getWorstEvent accounts for loadout abilities` | Pilot removes ACCIDENT from LANDING |
| 🔴 | `score formula: concentrated damage worse than spread` | 5 damage to 1 player > 10 spread to 4 |
| 🔴 | `_scoreFightEvent applies fighting power reduction` | Higher FP → lower damage score |
| 🔴 | `_scoreDamageEvent accounts for affectsAll` | DISASTER scores higher than ACCIDENT |
| 🟡 | `getWorstEvent returns null when no damage events` | Handles safe sectors |
| 🟡 | `grenade usage tracked in worst event calculation` | grenadesUsed returned correctly |

---

## 2. Modifier System

### 2.1 EventModifier
**File:** `js/probability/EventModifier.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `cloneSectorConfig creates deep copy` | Original unchanged after modifying clone |
| 🔴 | `removeEvents removes specified events` | Remove 'TIRED_2' from LANDING events |
| 🔴 | `removeEventsByPrefix removes all matching` | Remove 'FIGHT_*' removes all fight events |
| 🟡 | `multiplyEventWeight doubles weight` | ARTEFACT × 2 changes probability |
| 🟡 | `removeEvents handles missing events gracefully` | Removing non-existent event doesn't throw |

### 2.2 AbilityModifiers
**File:** `js/probability/AbilityModifiers.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `applyPilot removes damage from LANDING only` | TIRED_2, ACCIDENT_3_5, DISASTER_3_5 removed |
| 🔴 | `applyPilot has no effect on non-LANDING sectors` | FOREST events unchanged |
| 🔴 | `applyDiplomacy removes all FIGHT_* events` | All fight events removed from any sector |
| 🔴 | `applyTracker removes KILL_LOST from LOST sector` | KILL_LOST removed only from LOST |
| 🟡 | `applyTracker has no effect on non-LOST sectors` | Other sectors unchanged |

### 2.3 ItemModifiers
**File:** `js/probability/ItemModifiers.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `applyWhiteFlag removes fights from INTELLIGENT only` | FIGHT_* removed from INTELLIGENT |
| 🔴 | `applyWhiteFlag has no effect on other sectors` | PREDATOR fights unchanged |
| 🔴 | `applyQuadCompass removes AGAIN events` | AGAIN removed from all sectors |
| 🟡 | `applyTradModule doubles ARTEFACT in INTELLIGENT` | Weight doubled |
| 🟡 | `applyTradModule has no effect on other sectors` | Non-INTELLIGENT sectors unchanged |

### 2.4 ProjectModifiers
**File:** `js/probability/ProjectModifiers.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `applyAntigravPropeller doubles NOTHING_TO_REPORT in LANDING` | Weight multiplied by 2 |
| 🔴 | `applyAntigravPropeller has no effect on other sectors` | Non-LANDING sectors unchanged |
| 🟡 | `applyAntigravPropeller handles missing NOTHING_TO_REPORT` | No error when event not present |

### 2.5 ModifierApplicator
**File:** `js/probability/ModifierApplicator.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `apply calls correct ability modifiers` | Pilot + Diplomacy both applied |
| 🔴 | `apply calls correct item modifiers` | WHITE_FLAG + QUAD_COMPASS both applied |
| 🔴 | `apply calls correct project modifiers` | ANTIGRAV_PROPELLER applied when in loadout |
| 🔴 | `apply returns cloned config` | Original config unchanged |
| 🟡 | `apply handles empty loadout` | No errors with empty abilities/items/projects |
| 🟡 | `apply handles unknown modifiers` | Gracefully ignores unknown ability names |
| 🟡 | `_applyModifiers is generic helper` | Works for any modifier map |

---

## 3. Resource & Event Calculators

### 3.1 ResourceCalculator
**File:** `js/probability/ResourceCalculator.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `calculate returns all resource types` | fruits, steaks, fuel, oxygen, artefacts, mapFragments |
| 🔴 | `fruits calculation with FOREST sectors` | Expected harvest yield |
| 🔴 | `botanist bonus adds to harvest` | +1 per harvest event per botanist (from _countModifiers) |
| 🔴 | `driller multiplies fuel yield` | ×2 per driller (exponential: 2^drillerCount) |
| 🔴 | `survival bonus adds to provision` | +1 per provision event per survival skill |
| 🟡 | `oxygen pessimist is always 0` | Oxygen worst case is finding nothing |
| 🟡 | `_calculateWithConvolution convolves per-sector distributions` | Resource distributions convolved correctly |
| 🟡 | `_getTailScenarios extracts pessimist/average/optimist` | Conditional tail expectations for sparse distributions |
| 🟡 | `empty sectors returns zero result` | All values 0, no errors |

### 3.2 NegativeEventCalculator
**File:** `js/probability/NegativeEventCalculator.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `calculate returns all event types` | disease, playerLost, again, itemLost, killAll, killOne, mushTrap |
| 🔴 | `EVENT_TYPES maps to EventClassifier categories` | Each output key tied to correct category |
| 🔴 | `disease calculation with SWAMP sector` | Higher disease probability |
| 🔴 | `playerLost with OCEAN sector` | PLAYER_LOST event calculated |
| 🟡 | `_getTailScenarios uses conditional expectations` | Not percentiles (handles sparse distributions) |
| 🟡 | `_conditionalExpectation calculates top/bottom tails` | Fractional values even when concentrated at 0 |
| 🟡 | `multiple sectors convolve correctly` | 2× SWAMP increases disease occurrence |

### 3.3 FightCalculator
**File:** `js/probability/FightCalculator.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `FIGHT_DAMAGES has correct values` | FIGHT_12.fixed = 12, etc. |
| 🔴 | `FIGHT_DAMAGES variable fight (8_10_12_15_18_32)` | Correct values array with average = 17.5 |
| 🔴 | `calculate with PREDATOR sector` | Returns expected fight occurrence |
| 🔴 | `fighting power reduces actual damage` | Higher FP → less damage taken |
| 🔴 | `calculate returns occurrence per fight type` | occurrence['12'].distribution exists |
| 🔴 | `grenade consumption tracked` | Grenades counted separately |
| 🟡 | `_getFightDamageDistribution handles variable fights` | Equal probability across damage values |
| 🟡 | `_applyGrenadesToDistribution reduces damage` | Grenade shifts distribution left |
| 🟡 | `Diplomacy removes all fights` | No fight damage with Diplomacy ability |
| 🟡 | `worstCaseExclusions affects calculation` | Excluded sectors contribute 0 fight damage |

### 3.4 EventDamageCalculator
**File:** `js/probability/EventDamageCalculator.js`

> **Note:** Calculates damage from non-fight events (TIRED, ACCIDENT, DISASTER).

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `EVENT_DAMAGES has correct damage definitions` | TIRED_2, ACCIDENT_3_5, DISASTER_3_5 defined |
| 🔴 | `TIRED_2 affects all players` | affectsAll: true, damage = 2 × playerCount |
| 🔴 | `ACCIDENT_3_5 affects one player` | affectsAll: false, damage = 3, 4, or 5 |
| 🔴 | `DISASTER_3_5 affects all players` | affectsAll: true, damage = (3-5) × playerCount |
| 🔴 | `calculate returns damage scenarios` | pessimist, average, optimist, worstCase |
| 🟡 | `ACCIDENT_ROPE_3_5 has ropeImmune flag` | Can be negated by rope item |
| 🟡 | `getDamageDistribution returns variable damage` | Equal probability across 3, 4, 5 |
| 🟡 | `worstCaseExclusions affects calculation` | Excluded sectors contribute 0 event damage |

---

## 4. Services

### 4.1 FightingPowerService
**File:** `js/services/FightingPowerService.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `calculateBaseFightingPower with N players` | Base = N (1 per player) |
| 🔴 | `blaster adds +2 fighting power` | Player with blaster adds +2 |
| 🔴 | `grenade adds +3 fighting power each` | getGrenadePower() returns 3 |
| 🔴 | `countGrenades counts all grenades` | Multiple players' grenades summed |
| 🔴 | `calculateTotalFightingPower includes grenades` | basePower + (grenadeCount × 3) |
| 🟡 | `Centauri base boosts blaster power` | +1 per blaster with centauriActive=true |
| 🟡 | `calculateAbilityPower adds shooter bonus` | Gunman/Shooter ability adds +1 |
| 🟡 | `calculateItemPower excludes grenades` | Grenades handled separately |

### 4.2 LoadoutBuilder
**File:** `js/services/LoadoutBuilder.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `build collects all abilities` | Merges abilities from all players |
| 🔴 | `build collects all items` | Merges items from all players |
| 🔴 | `build deduplicates abilities` | Same ability on 2 players → 1 entry (Set) |
| 🔴 | `build deduplicates items` | Same item on 2 players → 1 entry |
| 🔴 | `SKILLFUL expands to DIPLOMACY + BOTANIC` | Constants.ABILITY_ALIASES expansion works |
| 🟡 | `antigravActive adds ANTIGRAV_PROPELLER to projects` | Project added when settings.antigravActive=true |
| 🟡 | `empty players returns empty loadout` | Returns { abilities: [], items: [], projects: [] } |
| 🟡 | `_collectAbilities converts filenames to IDs` | 'pilot.png' → 'PILOT' |
| 🟡 | `idToFilename converts back` | 'PILOT' → 'pilot.png' |

### 4.3 OxygenService
**File:** `js/services/OxygenService.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `planetHasOxygen detects OXYGEN sector` | Returns true when OXYGEN in sectors |
| 🔴 | `playerHasSpacesuit detects space_suit item` | Returns true with spacesuit |
| 🔴 | `canParticipate with oxygen planet` | All players can participate |
| 🔴 | `canParticipate without oxygen` | Only spacesuit players can go |
| 🟡 | `getParticipatingPlayers filters correctly` | Returns subset of players |

### 4.4 DamageSpreader
**File:** `js/services/DamageSpreader.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `distribute fight damage evenly` | Each damage point randomly assigned to players |
| 🔴 | `TIRED_2 damages all players` | Each player takes 2 damage (affectsAll) |
| 🔴 | `ACCIDENT hits single random player` | One player takes all damage (affectsAll=false) |
| 🔴 | `distribute returns breakdown structure` | { totalDamage: [], breakdown: [], appliedEffects: [] } |
| 🟡 | `rope item reduces ACCIDENT_ROPE damage` | Damage reduction applied via appliedEffects |
| 🟡 | `distributeAllScenarios processes all scenarios` | pessimist/average/optimist/worstCase all processed |
| 🟡 | `empty players returns empty result` | No errors, empty arrays |
| 🟡 | `_distributeFightDamage spreads damage points` | Each point goes to random player |
| 🟡 | `_distributeEventDamage respects affectsAll` | Different distribution strategy per event type |

### 4.5 ChatMessageDetector
**File:** `js/services/ChatMessageDetector.js`

> **Note:** Watches game chat for expedition log messages and parses sector names.
> Supports English, French, and Spanish localizations.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `SECTOR_NAME_TO_ID maps localized names correctly` | 'Landing' → 'LANDING', 'Atterrissage' → 'LANDING' |
| 🔴 | `buildSectorNameToIdMap creates lookup from all languages` | EN, FR, ES all mapped |
| 🔴 | `SECTOR_ID_ORDER matches language array lengths` | All 3 language arrays have same length as ID order |
| 🟡 | `_extractSectorNames finds sector names in text` | Parses expedition message text |
| 🟡 | `_isExpeditionMessage detects planet + fuel icons` | Message validation logic |
| 🟢 | `case-insensitive name matching` | 'landing' and 'LANDING' both work |

---

## 5. Utilities

### 5.1 EventClassifier
**File:** `js/utils/EventClassifier.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `classify FIGHT_* as fight/danger` | FIGHT_12 → { category: 'fight', cssClass: 'danger' } |
| 🔴 | `classify TIRED_*, ACCIDENT_* as warning` | Damage events classified correctly |
| 🔴 | `classify HARVEST_*, FUEL_* as positive` | Resource events classified correctly |
| 🔴 | `classify DISEASE, PLAYER_LOST correctly` | Negative events classified |
| 🟡 | `unknown events return neutral` | Edge case handling |

### 5.2 helpers.js
**File:** `js/utils/helpers.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `formatSectorName converts UPPER_SNAKE to Title Case` | 'CRISTAL_FIELD' → 'Cristal Field' |
| 🔴 | `getResourceURL returns path in non-extension context` | Fallback works |
| 🟡 | `filenameToId strips extension and uppercases` | 'pilot.png' → 'PILOT' |

### 5.3 Constants
**File:** `js/utils/constants.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `MAX_SECTORS is 20` | Limit correct |
| 🔴 | `MAX_PLAYERS is 8` | Limit correct |
| 🔴 | `ABILITY_ALIASES contains SKILLFUL` | Alias mapping exists |
| 🟡 | `SCENARIO_KEYS has all scenarios` | ['pessimist', 'average', 'optimist', 'worstCase'] |
| 🟡 | `DEFAULT_HEALTH is 14` | Player default health |

### 5.4 ValidationUtils
**File:** `js/utils/ValidationUtils.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `validateSectorLimit checks per-sector maximum` | Can't exceed maxPerPlanet |
| 🔴 | `validateTotalSectorLimit checks 20 sector max` | Excludes LANDING/LOST from count |
| 🔴 | `validateAddSector combines both checks` | Returns first failing validation |
| 🟡 | `getSectorUsageStats returns usage for all sectors` | current, max, remaining, isAtLimit, percentage |
| 🟡 | `validateSectorLimit returns correct structure` | { isValid, currentCount, maxAllowed, message } |

---

## 6. State Management

### 6.1 ExpeditionState
**File:** `js/core/ExpeditionState.js`

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `initializes with LANDING sector` | Default sectors = ['LANDING'] |
| 🔴 | `initializes with 4 players` | Default player count = 4 |
| 🔴 | `first player has Pilot ability` | players[0].abilities[0] = 'pilot.png' |
| 🔴 | `addSector adds to list` | State updated, sector appended |
| 🔴 | `removeSector removes by index` | splice(index, 1) |
| 🔴 | `clearSectors resets to LANDING only` | sectors = ['LANDING'] |
| 🟡 | `setOnChange fires callback` | _notifyChange() called on state changes |
| 🟡 | `getPlayers returns cloned array` | Original unchanged when modifying copy |
| 🟡 | `addPlayer creates default player structure` | New player has default avatar, health, ability slots |
| ⚠️ | ~~`addPlayer respects MAX_PLAYERS`~~ | **BUG: No limit enforced currently!** Consider adding validation |
| 🟡 | `setPlayerAbility updates correct slot` | abilities[slotIndex] = abilityId |
| 🟡 | `setPlayerItem updates correct slot` | items[slotIndex] = itemId |
| 🟢 | `setSectors replaces entire list` | Complete sector replacement |

---

## 7. Integration Tests

These tests verify multiple modules working together.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `Full expedition calculation pipeline` | Sectors → LoadoutBuilder → EventWeightCalculator.calculate() → results |
| 🔴 | `Pilot ability prevents LANDING damage` | End-to-end: AbilityModifiers → ModifierApplicator → EventDamageCalculator |
| 🔴 | `Diplomacy prevents all fight damage` | End-to-end: removes FIGHT_* across all sectors |
| 🔴 | `DamageComparator determines mutual exclusivity` | Worst event selection feeds into damage engines |
| 🟡 | `Movement speed sampling produces valid results` | calculateWithSampling → SectorSampler → mixed results |
| 🟡 | `Botanist bonus increases fruit yield` | Player with botanist → ResourceCalculator |
| 🟡 | `OxygenService filters participating players` | No spacesuit + no O2 sector → excluded from calculations |
| 🟡 | `DamageSpreader distributes combined damage` | FightCalculator + EventDamageCalculator → DamageSpreader |
| 🟢 | `Complex loadout with multiple modifiers` | Items + abilities + projects combined |
| 🟢 | `ExpeditionState → LoadoutBuilder → EventWeightCalculator` | Full state-to-results flow |

---

## 8. Data Layer

### 8.1 SectorData
**File:** `js/data/SectorData.js`

> **Note:** Accessor for sector configuration data from PlanetSectorConfigData.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `sectors getter returns list from PlanetSectorConfigData` | Mapped to { sectorName, maxPerPlanet, weightAtPlanetGeneration } |
| 🔴 | `sectorsWithFight getter detects sectors with FIGHT_* events` | Scans explorationEvents |
| 🔴 | `getMaxPerPlanet returns correct limit` | DESERT = 4, LANDING = 1 |
| 🔴 | `isSpecialSector identifies LANDING and LOST` | These don't count towards 20 limit |
| 🟡 | `getUniqueSectorNames returns deduplicated list` | No duplicates |
| 🟡 | `hasFightEvents checks sectorsWithFight` | Returns boolean |
| 🟡 | `getSectorConfig returns full config or null` | Lookup by name |

### 8.2 WorldData
**File:** `js/data/WorldData.js`

> **Note:** Predefined world configurations for quick loading.

| Priority | Test Case | Description |
|----------|-----------|-------------|
| 🔴 | `getWorldConfiguration returns sector array` | 'Rocky World' → ['LANDING', 'HYDROCARBON', ...] |
| 🔴 | `getWorldConfiguration returns null for unknown world` | Handles missing world names |
| 🟡 | `all predefined worlds have LANDING` | Basic validation |
| 🟡 | `getAvailableWorlds lists all world names` | Used for world selector UI |

---

## Test File Structure

Organized by feature for maintainability:
```
tests/
├── setup.js                             # Loads source files in order
├── sector-sampler-debug.html            # Manual debugging page
└── unit/
    ├── infrastructure.test.js           # (existing) Basic sanity checks
    ├── probability/
    │   ├── DistributionCalculator.test.js
    │   ├── SectorSampler.test.js
    │   ├── OccurrenceCalculator.test.js
    │   ├── EventWeightCalculator.test.js
    │   ├── DamageDistributionEngine.test.js
    │   ├── DamagePathSampler.test.js
    │   ├── DamageComparator.test.js
    │   ├── ResourceCalculator.test.js
    │   ├── NegativeEventCalculator.test.js
    │   ├── FightCalculator.test.js
    │   └── EventDamageCalculator.test.js
    ├── modifiers/
    │   ├── EventModifier.test.js
    │   ├── AbilityModifiers.test.js
    │   ├── ItemModifiers.test.js
    │   ├── ProjectModifiers.test.js
    │   └── ModifierApplicator.test.js
    ├── services/
    │   ├── FightingPowerService.test.js
    │   ├── LoadoutBuilder.test.js
    │   ├── OxygenService.test.js
    │   ├── DamageSpreader.test.js
    │   └── ChatMessageDetector.test.js
    ├── utils/
    │   ├── EventClassifier.test.js
    │   ├── helpers.test.js
    │   ├── constants.test.js
    │   └── ValidationUtils.test.js
    ├── data/
    │   ├── SectorData.test.js
    │   └── WorldData.test.js
    ├── core/
    │   └── ExpeditionState.test.js
    └── integration/
        └── expedition-pipeline.test.js
```

---

## Implementation Priority

### Phase 1 (Critical Foundation)
1. `DistributionCalculator` — core math must be correct
2. `EventClassifier` — used everywhere for categorization
3. `EventModifier` — foundation for ability/item effects
4. `Constants` + `helpers.js` — quick sanity checks
5. `ValidationUtils` — sector limit validation

### Phase 2 (Data Layer)
6. `SectorData` — sector configuration accessor
7. `WorldData` — predefined world configurations

### Phase 3 (Modifier System)
8. `AbilityModifiers`
9. `ItemModifiers`
10. `ProjectModifiers`
11. `ModifierApplicator`

### Phase 4 (Core Calculators)
12. `OccurrenceCalculator` — shared by Fight and EventDamage calculators
13. `ResourceCalculator`
14. `NegativeEventCalculator`
15. `FightCalculator`
16. `EventDamageCalculator`

### Phase 5 (Damage Pipeline)
17. `DamageDistributionEngine` — shared convolution pipeline
18. `DamagePathSampler` — provenance recovery
19. `DamageComparator` — worst-case determination

### Phase 6 (Services)
20. `FightingPowerService`
21. `LoadoutBuilder`
22. `OxygenService`
23. `DamageSpreader`
24. `ChatMessageDetector` — game chat parsing

### Phase 7 (Integration)
25. `SectorSampler`
26. `EventWeightCalculator`
27. `ExpeditionState`
28. Integration tests (full pipeline)

---

## Known Issues to Address

| Module | Issue | Resolution |
|--------|-------|------------|
| `ExpeditionState.addPlayer()` | No MAX_PLAYERS limit enforcement | Add validation or document as intentional |
| `SectorSampler._binomialCache` | Not cleared between tests | Add `clearCache()` method or test isolation |

---

## Test Execution

Run all tests:
```bash
npm test
```

Run specific test file:
```bash
npm test -- DistributionCalculator.test.js
```

Run tests with coverage:
```bash
npm test -- --coverage
```
