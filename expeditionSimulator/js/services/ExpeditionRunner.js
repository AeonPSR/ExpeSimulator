/**
 * ExpeditionRunner
 *
 * Pure orchestration of one full expedition calculation.
 * No DOM access; depends only on globals loaded by manifest / importScripts.
 *
 * Extracted from calculation-worker.js so the logic can be:
 *   - tested directly (no Web-Worker infrastructure required)
 *   - called from the worker via importScripts
 *   - called from any future non-worker entry point
 *
 * @module services/ExpeditionRunner
 */
const ExpeditionRunner = {

	/**
	 * Runs the full expedition calculation pipeline.
	 *
	 * Steps:
	 *  1. Filter players to those who can participate (OxygenService)
	 *  2. Build loadout from participating players (LoadoutBuilder)
	 *  3. Split sectors into sectorCounts + alwaysInclude (special sectors)
	 *  4. Branch: sampling (calculateWithSampling) or full (calculate)
	 *  5. Distribute damage to players (DamageSpreader)
	 *  6. Apply Survival / Armor reductions per scenario
	 *  7. Calculate final player health
	 *  8. Attach participationStatus and planetResources
	 *
	 * @param {Object} params
	 * @param {Array<string>} params.sectors        - All sector names on the planet
	 * @param {Array<Object>} params.allPlayers     - All players (pre-oxygen-filter)
	 * @param {boolean}       params.antigravActive - Whether Antigrav project is active
	 * @param {number}        params.exploredCount  - How many sectors the team can visit
	 * @param {boolean}       [params.diplomacy]    - Whether to apply diplomacy for planet resources
	 * @returns {Object|null} Complete results object, or null for empty sectors
	 */
	run({ sectors, allPlayers, antigravActive, exploredCount, diplomacy = false }) {
		if (!sectors || sectors.length === 0) return null;

		const participatingPlayers = OxygenService.getParticipatingPlayers(allPlayers, sectors);

		const loadout = LoadoutBuilder.build(participatingPlayers, { antigravActive });

		// Split sectors: special ones (LANDING, LOST) are always included, others are sampled
		const sectorCounts = {};
		const alwaysInclude = [];
		for (const sector of sectors) {
			if (SectorData.isSpecialSector(sector)) {
				alwaysInclude.push(sector);
			} else {
				sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
			}
		}

		const totalExplorableSectors = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

		let results;
		if (exploredCount < totalExplorableSectors) {
			results = ExpeditionPipeline.calculateWithSampling(
				sectorCounts, exploredCount, loadout, participatingPlayers, { alwaysInclude }
			);
		} else {
			results = ExpeditionPipeline.calculate(sectors, loadout, participatingPlayers);
		}

		// Damage distribution & player health
		if (participatingPlayers.length > 0 && results) {
			const fightInstances = results.combat?.damageInstances || {};
			const eventInstances = results.eventDamage?.damageInstances || {};

			const damageByScenario = DamageSpreader.distributeAllScenarios(
				fightInstances, eventInstances, participatingPlayers
			);

			const scenarios = Constants.SCENARIO_KEYS;
			const finalHealth = {};
			const effectsByScenario = {};

			for (const scenario of scenarios) {
				const scenarioResult = damageByScenario[scenario];
				const playerEffects = scenarioResult.appliedEffects.map(arr => [...arr]);

				const reductionSteps = [
					{
						apply: (players, breakdown) => DamageSpreader.applySurvivalReduction(players, breakdown),
						hasEffect: player => player.abilities?.some(a => a && filenameToId(a) === 'SURVIVAL'),
						effectType: 'SURVIVAL'
					},
					{
						apply: (players, breakdown) => DamageSpreader.applyArmorReduction(players, breakdown),
						hasEffect: player => player.items?.some(item => item && filenameToId(item) === 'PLASTENITE_ARMOR'),
						effectType: 'PLASTENITE_ARMOR'
					}
				];

				let modifiedBreakdown = scenarioResult.breakdown;
				for (const step of reductionSteps) {
					const beforeBreakdown = modifiedBreakdown;
					modifiedBreakdown = step.apply(participatingPlayers, beforeBreakdown);
					for (let i = 0; i < participatingPlayers.length; i++) {
						if (step.hasEffect(participatingPlayers[i])) {
							const beforeDamage = beforeBreakdown[i]?.reduce((sum, inst) => sum + inst.damage, 0) || 0;
							const afterDamage = modifiedBreakdown[i]?.reduce((sum, inst) => sum + inst.damage, 0) || 0;
							const damageReduced = beforeDamage - afterDamage;
							if (damageReduced > 0) {
								playerEffects[i].push({ type: step.effectType, reductions: damageReduced });
							}
						}
					}
				}

				const damagePerPlayer = modifiedBreakdown.map(breakdown =>
					breakdown.reduce((sum, inst) => sum + inst.damage, 0)
				);

				finalHealth[scenario] = DamageSpreader.calculateFinalHealth(participatingPlayers, damagePerPlayer);
				effectsByScenario[scenario] = playerEffects;
			}

			results.healthByScenario = finalHealth;
			results.effectsByScenario = effectsByScenario;
		}

		results.participationStatus = OxygenService.getParticipationStatus(allPlayers, sectors);

		// Planet-level resources (always computed over all sectors, independent of exploredCount).
		// Diplomacy toggle applied here only.
		const planetLoadout = (diplomacy && !loadout.abilities.includes('DIPLOMACY'))
			? { ...loadout, abilities: [...loadout.abilities, 'DIPLOMACY'] }
			: loadout;

		if (exploredCount < totalExplorableSectors) {
			const fullSectors = [];
			for (const [type, count] of Object.entries(sectorCounts)) {
				for (let i = 0; i < count; i++) fullSectors.push(type);
			}
			for (const s of alwaysInclude) fullSectors.push(s);
			results.planetResources = ResourceCalculator.calculate(fullSectors, planetLoadout, participatingPlayers);
			results.fightResourceBonus = ResourceCalculator.computeFightResourceBonus(fullSectors, planetLoadout, participatingPlayers);
		} else {
			results.planetResources = ResourceCalculator.calculate(sectors, planetLoadout, participatingPlayers);
			results.fightResourceBonus = ResourceCalculator.computeFightResourceBonus(sectors, planetLoadout, participatingPlayers);
		}

		return results;
	}
};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ExpeditionRunner = ExpeditionRunner;
