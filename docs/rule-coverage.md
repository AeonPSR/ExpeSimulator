# Rule-Coverage Checklist

> A flat list of **game rules** the engine implements and the test (if any) that asserts each one. Built by reading [js/probability/](../js/probability/) and [js/services/](../js/services/) directly — not by inspecting tests in isolation.
>
> A rule is "tested" only when a test asserts the *observable behavioural effect*, not merely the existence of the code path. Per-module unit tests with mocked dependencies generally do **not** count as integration coverage for cross-module rules.
>
> Status legend:
> - **✅ Tested** — at least one test asserts the rule end-to-end (or in the module that fully owns it).
> - **🟡 Partial** — the underlying mechanism is unit-tested, but the cross-module wiring is not.
> - **❌ Missing** — no test exercises this rule.
>
> Source citations: `file:Lxx` refers to the implementation. Test citations link to the asserting test.

---

## 1. Modifier rules (ability / item / project → events)

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 1.1 | **Pilot** removes `TIRED_2`, `ACCIDENT_3_5`, `DISASTER_3_5` from LANDING only | [AbilityModifiers.js#L18](../js/probability/AbilityModifiers.js#L18) | [AbilityModifiers.test.js](../tests/unit/modifiers/AbilityModifiers.test.js), [expedition-pipeline.test.js#L96](../tests/integration/expedition-pipeline.test.js#L96) | ✅ |
| 1.2 | **Diplomacy** removes all `FIGHT_*` from every sector | [AbilityModifiers.js#L29](../js/probability/AbilityModifiers.js#L29) | [AbilityModifiers.test.js](../tests/unit/modifiers/AbilityModifiers.test.js), [expedition-pipeline.test.js#L151](../tests/integration/expedition-pipeline.test.js#L151) | ✅ |
| 1.3 | **Tracker** removes `KILL_LOST` from LOST only | [AbilityModifiers.js#L41](../js/probability/AbilityModifiers.js#L41) | [AbilityModifiers.test.js](../tests/unit/modifiers/AbilityModifiers.test.js) | ✅ |
| 1.4 | **White Flag** removes `FIGHT_*` from INTELLIGENT only | [ItemModifiers.js#L13](../js/probability/ItemModifiers.js#L13) | [ItemModifiers.test.js](../tests/unit/modifiers/ItemModifiers.test.js) | ✅ |
| 1.5 | **Quad Compass** removes the `AGAIN` event from every sector | [ItemModifiers.js#L25](../js/probability/ItemModifiers.js#L25) | [ItemModifiers.test.js](../tests/unit/modifiers/ItemModifiers.test.js) | ✅ |
| 1.6 | **Trad Module** doubles `ARTEFACT` weight in INTELLIGENT only | [ItemModifiers.js#L37](../js/probability/ItemModifiers.js#L37) | [ItemModifiers.test.js](../tests/unit/modifiers/ItemModifiers.test.js) | ✅ |
| 1.7 | **Antigrav Propeller** removes `TIRED_2`, `ACCIDENT_3_5`, `DISASTER_3_5` from LANDING (same effect as Pilot — buffed; previously doubled `NOTHING_TO_REPORT`) | [ProjectModifiers.js#L19](../js/probability/ProjectModifiers.js#L19) | [ProjectModifiers.test.js](../tests/unit/modifiers/ProjectModifiers.test.js) (rewritten in this pass — stale tests asserted the old doubling behaviour) | ✅ |
| 1.8 | **Pilot + Antigrav on LANDING** — second is a no-op (both remove the same damage events); regression guard needed since the two paths share a target | rule 1.1 + 1.7 composition | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `Pilot + Antigrav (rule 1.8)` | ✅ |
| 1.9 | **Diplomacy + White Flag on INTELLIGENT** — second is a no-op (Diplomacy already removed every `FIGHT_*`) | rule 1.2 + 1.4 composition | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `Diplomacy + White Flag (rule 1.9)` | ✅ |
| 1.10 | **Skillful** ability expands to `DIPLOMACY` + `BOTANIC` via `Constants.ABILITY_ALIASES` (loadout assembly) | [LoadoutBuilder.js#L52](../js/services/LoadoutBuilder.js#L52) | [LoadoutBuilder.test.js](../tests/unit/services/LoadoutBuilder.test.js) | 🟡 (expansion is unit-tested but its propagation to `FIGHT_*` removal is not asserted end-to-end) |
| 1.11 | `ModifierApplicator` clones config before mutating (original sector data never modified) | [ModifierApplicator.js#L21](../js/probability/ModifierApplicator.js#L21) | [ModifierApplicator.test.js](../tests/unit/modifiers/ModifierApplicator.test.js) | ✅ |

---

## 2. Damage rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 2.1 | `FIGHT_n` deals max(0, n − fightingPower) damage | [FightCalculator.js#L188](../js/probability/FightCalculator.js#L188) | [FightCalculator.test.js#L266](../tests/unit/calculators/FightCalculator.test.js#L266) | ✅ |
| 2.2 | Variable fight `FIGHT_8_10_12_15_18_32` is uniform over its 6 values | [FightCalculator.js#L175](../js/probability/FightCalculator.js#L175) | [FightCalculator.test.js#L279](../tests/unit/calculators/FightCalculator.test.js#L279) | ✅ |
| 2.3 | Each grenade subtracts `getGrenadePower()` (default 3) from the damage distribution, floor 0 | [FightCalculator.js#L213](../js/probability/FightCalculator.js#L213) | [FightCalculator.test.js#L309](../tests/unit/calculators/FightCalculator.test.js#L309) | ✅ |
| 2.4 | `TIRED_2` deals 2 damage to every player (total = 2 × playerCount) | [EventDamageCalculator.js#L36](../js/probability/EventDamageCalculator.js#L36), `affectsAll: true` | [EventDamageCalculator.test.js#L134](../tests/unit/calculators/EventDamageCalculator.test.js#L134) | ✅ |
| 2.5 | `ACCIDENT_3_5` deals 3/4/5 (uniform) to ONE player | [EventDamageCalculator.js#L45](../js/probability/EventDamageCalculator.js#L45), `affectsAll: false` | [EventDamageCalculator.test.js#L143](../tests/unit/calculators/EventDamageCalculator.test.js#L143) | ✅ |
| 2.6 | `ACCIDENT_ROPE_3_5` same as ACCIDENT but `ropeImmune: true` | [EventDamageCalculator.js#L57](../js/probability/EventDamageCalculator.js#L57) | flag tested at unit level, immunity behaviour tested via `DamageSpreader` | ✅ |
| 2.7 | `DISASTER_3_5` deals 3/4/5 to every player (total = X × playerCount) | [EventDamageCalculator.js#L70](../js/probability/EventDamageCalculator.js#L70) | [EventDamageCalculator.test.js#L153](../tests/unit/calculators/EventDamageCalculator.test.js#L153) | ✅ |
| 2.8 | Player with `rope` item is fully immune to `ACCIDENT_ROPE_3_5` damage | [DamageSpreader.js#L177](../js/services/DamageSpreader.js#L177) | [expedition-pipeline.test.js#L307](../tests/integration/expedition-pipeline.test.js#L307) | ✅ |
| 2.9 | Combat damage spread randomly: 1 hit point at a time per random player | [DamageSpreader.js#L121](../js/services/DamageSpreader.js#L121) | [DamageSpreader.test.js](../tests/unit/services/DamageSpreader.test.js) `_distributeFightDamage distributes each damage point randomly` | ✅ |
| 2.10 | `affectsAll: true` event damage is divided back to per-player when distributed | [DamageSpreader.js#L164](../js/services/DamageSpreader.js#L164) | [DamageSpreader.test.js](../tests/unit/services/DamageSpreader.test.js) `_distributeEventDamage distributes affectsAll events to all players` | ✅ |
| 2.11 | **DamageComparator** picks the higher-scoring event when FIGHT vs ACCIDENT/DISASTER co-exist on a sector (INSECT, PREDATOR, LANDING, MOUNTAIN, COLD, HOT) | [DamageComparator.js#L51](../js/probability/DamageComparator.js#L51) | [DamageComparator.test.js](../tests/unit/probability/DamageComparator.test.js), [expedition-pipeline.test.js#L198](../tests/integration/expedition-pipeline.test.js#L198) | ✅ |
| 2.12 | Mutual-exclusivity excludes the "losing" event from the worst-case path in the *other* calculator (`fightExclusions` / `eventExclusions`) | [EventWeightCalculator.js#L490](../js/probability/EventWeightCalculator.js#L490) | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `evaluateExpedition produces fightExclusions/eventExclusions (rule 2.12)` | ✅ |
| 2.13 | Concentrated damage > spread damage in score formula: `maxDmgToOne × 1000 + total` | [DamageComparator.js](../js/probability/DamageComparator.js) (header comment + `_scoreFightEvent` / `_scoreDamageEvent`) | [DamageComparator.test.js](../tests/unit/probability/DamageComparator.test.js) | ✅ |
| 2.14 | Grenades are allocated to highest-fight-damage sectors first (sort by `maxFightDamage` desc) | [DamageComparator.js#L172](../js/probability/DamageComparator.js#L172) | [expedition-pipeline.test.js#L221](../tests/integration/expedition-pipeline.test.js#L221) | ✅ |
| 2.15 | **Cross-module: fight damage induces disease at 5% per player hit** (`playersHit = min(netDamage, playerCount)`, Binomial mixture) | [FightCalculator.js#L282](../js/probability/FightCalculator.js#L282) → [EventWeightCalculator.js#L533](../js/probability/EventWeightCalculator.js#L533) | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `Fight damage folds into disease (rule 2.15)` | ✅ |
| 2.16 | `_diseaseTailScenarios` produces fractional pessimist/average/optimist from the binomial mixture (consistent with `NegativeEventCalculator`) | [FightCalculator.js#L320](../js/probability/FightCalculator.js#L320) | — | ❌ |

---

## 3. Resource rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 3.1 | Fruits = HARVEST_n events; **Botanist** adds +1 per harvest per botanist (additive) | [ResourceCalculator.js#L33](../js/probability/ResourceCalculator.js#L33), `_buildSectorDistribution` | [ResourceCalculator.test.js#L183](../tests/unit/calculators/ResourceCalculator.test.js#L183), [expedition-pipeline.test.js#L341](../tests/integration/expedition-pipeline.test.js#L341) | ✅ |
| 3.2 | Steaks = PROVISION_n; **Survival** adds +1 per provision per survival skill | [ResourceCalculator.js#L34](../js/probability/ResourceCalculator.js#L34) | [ResourceCalculator.test.js](../tests/unit/calculators/ResourceCalculator.test.js) | 🟡 (unit-tested via abstracted `_calculateWithConvolution`; survival-specific integration not asserted) |
| 3.3 | Fuel = FUEL_n; **Driller** multiplies by 2 each (**multiplicative**, not additive: 2^drillerCount) | [ResourceCalculator.js#L107](../js/probability/ResourceCalculator.js#L107) | [ResourceCalculator.test.js#L255](../tests/unit/calculators/ResourceCalculator.test.js#L255) | ✅ |
| 3.4 | Oxygen pessimist is always 0 (you might find nothing) | [ResourceCalculator.js#L46](../js/probability/ResourceCalculator.js#L46) | [ResourceCalculator.test.js#L240](../tests/unit/calculators/ResourceCalculator.test.js#L240) | ✅ |
| 3.5 | Artefacts = 8/9 of `ARTEFACT` events | [ResourceCalculator.js#L165](../js/probability/ResourceCalculator.js#L165) | [ResourceCalculator.test.js#L304](../tests/unit/calculators/ResourceCalculator.test.js#L304) | ✅ |
| 3.6 | Map fragments = `STARMAP` + 1/9 of `ARTEFACT` | [ResourceCalculator.js#L196](../js/probability/ResourceCalculator.js#L196) | [ResourceCalculator.test.js#L323](../tests/unit/calculators/ResourceCalculator.test.js#L323) | ✅ |
| 3.7 | **Cross-module**: multiple botanists / drillers / survivals on different players stack correctly via `_countModifiers` | [ResourceCalculator.js](../js/probability/ResourceCalculator.js) | [ResourceCalculator.test.js#L352](../tests/unit/calculators/ResourceCalculator.test.js#L352) (counting tested) | 🟡 (counting tested; stacking-effect on yield not directly asserted) |
| 3.8 | Trad Module's `ARTEFACT` doubling (rule 1.6) actually increases the artefact-yield numbers in the result | rule 1.6 + 3.5 composition | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `Trad Module artefact doubling (rule 3.8)` | ✅ |

---

## 4. Negative event rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 4.1 | All 7 negative event types reported: disease, playerLost, again, itemLost, killAll, killOne, mushTrap | [NegativeEventCalculator.js#L29](../js/probability/NegativeEventCalculator.js#L29) | [NegativeEventCalculator.test.js#L164](../tests/unit/calculators/NegativeEventCalculator.test.js#L164) | ✅ |
| 4.2 | Per-sector binary distribution: event fires (1) or not (0), then convolved across sectors | [NegativeEventCalculator.js#L139](../js/probability/NegativeEventCalculator.js#L139) | [NegativeEventCalculator.test.js#L195](../tests/unit/calculators/NegativeEventCalculator.test.js#L195) | ✅ |
| 4.3 | Scenarios use **conditional tail expectations** (E[X \| top 25%], not P75), so sparse distributions yield fractional values | [NegativeEventCalculator.js#L106](../js/probability/NegativeEventCalculator.js#L106) | [NegativeEventCalculator.test.js#L308](../tests/unit/calculators/NegativeEventCalculator.test.js#L308) | ✅ |
| 4.4 | Event categorisation goes through `EventClassifier.classify` (single source of truth for what counts as "disease", "playerLost", etc.) | [NegativeEventCalculator.js#L155](../js/probability/NegativeEventCalculator.js#L155) | [NegativeEventCalculator.test.js#L262](../tests/unit/calculators/NegativeEventCalculator.test.js#L262) | ✅ |
| 4.5 | **Cross-module: `negativeEvents.disease` = base disease + fight-induced disease** (see also rule 2.15) | [EventWeightCalculator.js#L537](../js/probability/EventWeightCalculator.js#L537) | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `negativeEvents.disease includes fight-induced disease (rule 4.5)` | ✅ |

---

## 5. Sampling / movement-speed rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 5.1 | When `movementSpeed >= totalSectors`, fall back to standard `calculate` (no sampling) | [EventWeightCalculator.js#L37](../js/probability/EventWeightCalculator.js#L37) | [expedition-pipeline.test.js#L64](../tests/integration/expedition-pipeline.test.js#L64) | ✅ |
| 5.2 | When `movementSpeed < totalSectors`, all valid K-compositions are enumerated and weighted by Fisher's noncentral multivariate hypergeometric | [SectorSampler.js#L100](../js/probability/SectorSampler.js#L100) | [SectorSampler.test.js](../tests/unit/probability/SectorSampler.test.js) | 🟡 (math unit-tested; end-to-end pipeline mixing not asserted) |
| 5.3 | `alwaysInclude` sectors (e.g., LANDING) are appended to every sampled composition | [EventWeightCalculator.js#L67](../js/probability/EventWeightCalculator.js#L67) | — | ❌ |
| 5.4 | **Echo Sounder** (and any item with `sectorDiscoveryMultiplier`) multiplies sector weights before sampling | [SectorSampler.js#L131](../js/probability/SectorSampler.js#L131) | [SectorSampler.test.js](../tests/unit/probability/SectorSampler.test.js) `getEffectiveWeights applies item multipliers` (HYDROCARBON weight = 8×5 = 40) | ✅ |
| 5.5 | `pruneCompositions` keeps top-N covering ≥99.9% mass and renormalizes | [SectorSampler.js](../js/probability/SectorSampler.js), `pruneCompositions` | — | ❌ (no `pruneCompositions` test in SectorSampler.test.js) |
| 5.6 | **Sampling vs full enumeration parity** — for small planets where both are tractable, they should yield identical results | — | — | ❌ (no parity test exists) |
| 5.7 | Mixed compositions correctly weight negative events / damage / resources by composition probability | [EventWeightCalculator.js#L329](../js/probability/EventWeightCalculator.js#L329) (`_mixNegativeEventResults` etc.) | — | ❌ |

---

## 6. Fighting power & loadout rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 6.1 | Base fighting power = playerCount | [FightingPowerService.js#L26](../js/services/FightingPowerService.js#L26) | [FightingPowerService.test.js](../tests/unit/services/FightingPowerService.test.js) | ✅ |
| 6.2 | Each item contributes its `combatPowerBonus` (e.g., blaster +2) | [FightingPowerService.js#L75](../js/services/FightingPowerService.js#L75) | [FightingPowerService.test.js](../tests/unit/services/FightingPowerService.test.js) | ✅ |
| 6.3 | Grenades are counted separately (not in base FP); each contributes `getGrenadePower()` | [FightingPowerService.js#L55](../js/services/FightingPowerService.js#L55) | [FightingPowerService.test.js](../tests/unit/services/FightingPowerService.test.js), [expedition-pipeline.test.js#L414](../tests/integration/expedition-pipeline.test.js#L414) | ✅ |
| 6.4 | **Centauri base** adds `blasterCombatBonus` per blaster (or blaster_custom) when active | [FightingPowerService.js#L132](../js/services/FightingPowerService.js#L132) | [FightingPowerService.test.js](../tests/unit/services/FightingPowerService.test.js) `calculateItemPower applies Centauri bonus to blasters` / `to blaster_custom` / `Centauri bonus only applies to blaster` (negative case) | ✅ |
| 6.5 | Ability-based FP bonuses (Shooter / Wrestler / Gunman with gun-requirement check) | [FightingPowerService.js#L98](../js/services/FightingPowerService.js#L98) | [FightingPowerService.test.js](../tests/unit/services/FightingPowerService.test.js) `calculateAbilityPower`, `validateGunmanBonus` (5 cases incl. no-gun / `null` items) | ✅ |
| 6.6 | Loadout deduplicates abilities/items across players (Set semantics) | [LoadoutBuilder.js#L21](../js/services/LoadoutBuilder.js#L21) | [LoadoutBuilder.test.js](../tests/unit/services/LoadoutBuilder.test.js) | ✅ |
| 6.7 | `antigravActive` setting injects `ANTIGRAV_PROPELLER` into projects | [LoadoutBuilder.js#L28](../js/services/LoadoutBuilder.js#L28) | [LoadoutBuilder.test.js](../tests/unit/services/LoadoutBuilder.test.js) `adds ANTIGRAV_PROPELLER project when active` / `projects empty when antigrav not active` | ✅ |
| 6.8 | Ability aliases expand (rule 1.10) | [LoadoutBuilder.js#L52](../js/services/LoadoutBuilder.js#L52) | [LoadoutBuilder.test.js](../tests/unit/services/LoadoutBuilder.test.js) | ✅ |

---

## 7. Oxygen / participation rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 7.1 | Players without `space_suit` are excluded when the planet has no OXYGEN sector | [OxygenService.js#L42](../js/services/OxygenService.js#L42) | [OxygenService.test.js](../tests/unit/services/OxygenService.test.js), [expedition-pipeline.test.js#L254](../tests/integration/expedition-pipeline.test.js#L254) | ✅ |
| 7.2 | All players participate when OXYGEN sector is selected | [OxygenService.js#L41](../js/services/OxygenService.js#L41) | [expedition-pipeline.test.js#L267](../tests/integration/expedition-pipeline.test.js#L267) | ✅ |
| 7.3 | Filtered (non-participating) players do not contribute to fighting power, grenade count, or damage spreading | rules 7.1 + 6.x + 2.9 composition | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `Excluded player does not contribute to fighting power (rule 7.3)` | ✅ |

---

## 8. Convolution / distribution math

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 8.1 | `convolveAll` on N distributions sums per-key probabilities correctly; identity on empty | [DistributionCalculator.js](../js/probability/DistributionCalculator.js) | [DistributionCalculator.test.js](../tests/unit/probability/DistributionCalculator.test.js) | ✅ |
| 8.2 | `getScenarios` returns P25/P50/P75/P100 with cumulative probability tags summing to ~1.0 | [DistributionCalculator.js](../js/probability/DistributionCalculator.js) | [DistributionCalculator.test.js](../tests/unit/probability/DistributionCalculator.test.js) | ✅ |
| 8.3 | `mixScenarios` weights pessimist/average/optimist by composition probability | [DistributionCalculator.js](../js/probability/DistributionCalculator.js) | [DistributionCalculator.test.js](../tests/unit/probability/DistributionCalculator.test.js) | ✅ |
| 8.4 | `validateDistribution` flags non-normalised distributions | [DistributionCalculator.js](../js/probability/DistributionCalculator.js) | [DistributionCalculator.test.js](../tests/unit/probability/DistributionCalculator.test.js) | ✅ |
| 8.5 | `DamagePathSampler.samplePath` returns sources whose per-sector damages sum to the requested total | [DamagePathSampler.js](../js/probability/DamagePathSampler.js) | [DamagePathSampler.test.js](../tests/unit/probability/DamagePathSampler.test.js) | ✅ |
| 8.6 | `DamageDistributionEngine.calculate` applies `postProcessDistribution` (grenade reduction) after convolution but before scenario extraction | [DamageDistributionEngine.js](../js/probability/DamageDistributionEngine.js) | [DamageDistributionEngine.test.js](../tests/unit/probability/DamageDistributionEngine.test.js) | ✅ |

---

## 9. Pipeline orchestration (`EventWeightCalculator.calculate`)

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 9.1 | `sectorProbabilities` is computed ONCE and passed to all sub-calculators (no per-calculator recomputation) | [EventWeightCalculator.js#L463](../js/probability/EventWeightCalculator.js#L463) | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `sectorProbabilities computed once (rule 9.1)` | ✅ |
| 9.2 | Result shape contains `resources`, `combat`, `eventDamage`, `negativeEvents`, `sectorBreakdown` | [EventWeightCalculator.js#L540](../js/probability/EventWeightCalculator.js#L540) | [expedition-pipeline.test.js#L25](../tests/integration/expedition-pipeline.test.js#L25) | ✅ |
| 9.3 | `DamageComparator.evaluateExpedition` is called whenever `DamageComparator` is defined (regardless of `playerCount`); with 0 players it runs with power=0 (no exclusions generated, which is correct) | [EventWeightCalculator.js#L482](../js/probability/EventWeightCalculator.js#L482) | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `evaluateExpedition is called regardless of playerCount (rule 9.3)` | ✅ |
| 9.4 | Pipeline applies rule 2.15 disease folding (see also rule 4.5) | [EventWeightCalculator.js#L533](../js/probability/EventWeightCalculator.js#L533) | [cross-module-rules.test.js](../tests/integration/cross-module-rules.test.js) `Fight damage folds into disease (rule 2.15)` (same assertion covers 9.4) | ✅ |

---

## 10. Planet review (star rating) rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 10.1 | Six axes scored: fruits, steaks, fuel, artifacts, lethality, hazards | [PlanetReviewScorer.js#L19](../js/probability/PlanetReviewScorer.js#L19) | [PlanetReviewScorer.test.js](../tests/unit/probability/PlanetReviewScorer.test.js) | ✅ |
| 10.2 | Sectors LANDING and UNKNOWN are excluded from scoring | [PlanetReviewScorer.js#L46](../js/probability/PlanetReviewScorer.js#L46) | [PlanetReviewScorer.test.js](../tests/unit/probability/PlanetReviewScorer.test.js) `LANDING-only planet: all axes at 0 (LANDING is ignored)` | ✅ |
| 10.3 | Fixed magnitudes: ARTEFACT/DISEASE/PLAYER_LOST/ITEM_LOST/MUSH_TRAP/NOTHING_TO_REPORT/AGAIN/BACK = 1 | [PlanetReviewScorer.js#L28](../js/probability/PlanetReviewScorer.js#L28) | [PlanetReviewScorer.test.js#L56](../tests/unit/probability/PlanetReviewScorer.test.js#L56) | ✅ |
| 10.4 | Boolean tags (oxygen, cristal_field) appended to result | [PlanetReviewScorer.js#L61](../js/probability/PlanetReviewScorer.js#L61) | [PlanetReviewScorer.test.js](../tests/unit/probability/PlanetReviewScorer.test.js) `oxygen boolean: true/false`, `cristal_field boolean: true/false` | ✅ |

---

## 11. Worker / parity rules

| # | Rule | Implementation | Test | Status |
|---|---|---|---|---|
| 11.1 | [calculation-worker.js](../js/workers/calculation-worker.js) / `ExpeditionRunner.run()` returns a result of the same shape as in-process `calculate()` | [ExpeditionRunner.js](../js/services/ExpeditionRunner.js) | [calculation-worker.test.js](../tests/unit/workers/calculation-worker.test.js) `contains worker-specific fields (rule 11.1)` | ✅ |
| 11.2 | Worker computation matches main-thread computation for an identical input | [ExpeditionRunner.js](../js/services/ExpeditionRunner.js) | [calculation-worker.test.js](../tests/unit/workers/calculation-worker.test.js) `ExpeditionRunner.run matches EWC.calculate (rule 11.2)` | ✅ |

---

## Summary

*Updated after verification pass through `tests/unit/modifiers/` and `tests/unit/services/`. Several rows previously marked 🟡 turned out to be fully asserted; one was downgraded (no `pruneCompositions` test); rule 1.7 stale tests (asserting old Antigrav doubling behaviour) were rewritten in this pass to match the buffed implementation.*

| Category | ✅ | 🟡 | ❌ | Total |
|---|---|---|---|---|
| Modifiers (§1) | 10 | 1 | 0 | 11 |
| Damage (§2) | 15 | 0 | 1 | 16 |
| Resources (§3) | 6 | 2 | 0 | 8 |
| Negative events (§4) | 5 | 0 | 0 | 5 |
| Sampling (§5) | 2 | 1 | 4 | 7 |
| FP / loadout (§6) | 8 | 0 | 0 | 8 |
| Oxygen (§7) | 3 | 0 | 0 | 3 |
| Distribution math (§8) | 6 | 0 | 0 | 6 |
| Pipeline (§9) | 4 | 0 | 0 | 4 |
| Planet review (§10) | 4 | 0 | 0 | 4 |
| Worker (§11) | 2 | 0 | 0 | 2 |
| **Total** | **65** | **4** | **5** | **74** |

**Coverage at the rule level: 65 / 74 fully tested (~88%), 5 missing outright (~7%), 4 partial (~5%).**

*The remaining 5 ❌ rules (2.16, 5.3, 5.5, 5.6, 5.7) are all in the sampling tier — deferred to the batch-4 PR.*

The 16 missing rules cluster tightly around cross-module wiring — see the priority list below.

### Verification-pass delta

| Rule | Before | After | Why |
|---|---|---|---|
| 1.3 Tracker | 🟡 | ✅ | `AbilityModifiers.test.js` asserts removal on LOST and no-op on non-LOST. |
| 1.4 White Flag | 🟡 | ✅ | `ItemModifiers.test.js` asserts removal on INTELLIGENT only. |
| 1.5 Quad Compass | 🟡 | ✅ | `ItemModifiers.test.js` asserts AGAIN removal across sectors. *Rule clarified: only the exact `AGAIN` event is removed.* |
| 1.6 Trad Module | 🟡 | ✅ | `ItemModifiers.test.js` asserts doubling on INTELLIGENT and no-op elsewhere. |
| **1.7 Antigrav** | 🟡 | ✅ | **Test file was stale** — asserted the old doubling behaviour (3 failing tests confirmed). Rewrote `ProjectModifiers.test.js` (6 passing tests) to match the buffed Pilot-equivalent behaviour. |
| 1.8 Pilot + Antigrav stacking | ❌ | ✅ | `cross-module-rules.test.js` asserts idempotency: LANDING events with pilot+antigrav = LANDING events with pilot alone. |
| 1.9 Diplomacy + White Flag | ❌ | ✅ | `cross-module-rules.test.js` asserts idempotency: INTELLIGENT events with diplo+wf = diplo alone. |
| 2.12 mutual-exclusivity wiring | ❌ | ✅ | `cross-module-rules.test.js` asserts `fightExclusions`/`eventExclusions` are non-empty for PREDATOR. |
| 2.15 fight → disease | ❌ | ✅ | `cross-module-rules.test.js` asserts disease increases with PREDATOR vs control. |
| 3.8 TradModule artefact yield | ❌ | ✅ | `cross-module-rules.test.js` asserts artefact mean higher with Trad Module item. |
| 4.5 disease accumulation | ❌ | ✅ | Same test as 2.15 (both share the fight+disease wiring check). |
| 7.3 excluded player FP | ❌ | ✅ | `cross-module-rules.test.js` asserts FP with 2 players > FP with 1 (non-spacesuit excluded). |
| 9.1 sectorProbabilities once | ❌ | ✅ | `cross-module-rules.test.js` spies on `OccurrenceCalculator.getSectorProbabilities` and confirms it is called exactly once per `calculate()`. |
| 9.3 evaluateExpedition guard | ❌ | ✅ | Rule description corrected: guard is `typeof DamageComparator !== 'undefined'`, not `playerCount > 0`. Test confirms it is called with 0 players. |
| 9.4 disease folding in pipeline | ❌ | ✅ | Same test as 2.15. |
| 11.1 worker result shape | ❌ | ✅ | `calculation-worker.test.js` asserts `healthByScenario`, `effectsByScenario`, `participationStatus`, `planetResources` present. |
| 11.2 worker↔main parity | ❌ | ✅ | `calculation-worker.test.js` asserts `ExpeditionRunner.run()` combat scenarios match `EWC.calculate()` for identical input. |
| 2.9 fight spread | 🟡 | ✅ | `_distributeFightDamage distributes each damage point randomly`. |
| 2.10 affectsAll split | 🟡 | ✅ | `_distributeEventDamage distributes affectsAll events to all players`. |
| 5.4 Echo Sounder | 🟡 | ✅ | `getEffectiveWeights applies item multipliers` asserts the observable result (HYDROCARBON 8×5 = 40). |
| **5.5 pruneCompositions** | 🟡 | ❌ *(downgraded)* | No `pruneCompositions` test exists in `SectorSampler.test.js`. |
| 6.4 Centauri | ❌ | ✅ | `calculateItemPower` + `getItemPower` cover blaster, blaster_custom, and a negative case (knife). |
| 6.5 Ability FP | 🟡 | ✅ | `calculateAbilityPower` + `validateGunmanBonus` (5 cases incl. gun-requirement). |
| 6.7 Antigrav project injection | 🟡 | ✅ | `LoadoutBuilder.test.js` asserts both presence and absence based on `antigravActive`. |
| 10.2 LANDING excluded | 🟡 | ✅ | `LANDING-only planet: all axes at 0`. |
| 10.4 boolean tags | 🟡 | ✅ | 4 tests cover oxygen + cristal_field present/absent. |

Compare this to the **17 / 17 file-level coverage** previously reported — the genuine gap (16 missing rules) is mostly cross-module wiring like rule 2.15.

---

## Highest-priority gaps to close before refactoring

These are the rules whose absence could let a refactor introduce a silent regression undetected.

**Addressed in batch 1–3/5/6 (cross-module-rules.test.js + calculation-worker.test.js):**
- ✅ **2.15 / 4.5 / 9.4** — fight → disease coupling.
- ✅ **2.12 / 9.3** — mutual-exclusivity wiring between `DamageComparator` and the two damage calculators.
- ✅ **9.1** — single-computation of `sectorProbabilities`.
- ✅ **11.1 / 11.2** — worker parity (via `ExpeditionRunner`).
- ✅ **3.8 / 1.8 / 1.9 / 7.3** — multi-modifier interaction rules.

**Deferred to batch-4 PR (sampling tier):**
1. **5.3 / 5.5 / 5.6 / 5.7** — `alwaysInclude` appending, `pruneCompositions`, sampling parity, and weighted mixing.
2. **2.16** — `_diseaseTailScenarios` fractional pessimist/average/optimist.

---

## Maintenance

When any rule changes, update this file in the same PR. When a new rule is added to the engine, add a row here — `MISSING` is fine, as long as it's visible.
