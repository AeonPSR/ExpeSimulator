/**
 * Calculation Web Worker
 * 
 * Runs the expedition calculation pipeline off the main thread.
 * Dependencies are loaded on first 'calculate' message via importScripts().
 * The main thread passes the extension base URL so we can build absolute paths.
 */
let _initialized = false;

function _loadDependencies(baseURL) {
	if (_initialized) return;
	try {
		importScripts(
			baseURL + 'config.js',
			baseURL + 'js/utils/constants.js',
			baseURL + 'js/utils/helpers.js',
			baseURL + 'js/utils/EventClassifier.js',
			baseURL + 'js/data/SectorData.js',
			baseURL + 'js/data/AbilityData.js',
			baseURL + 'js/data/ItemData.js',
			baseURL + 'js/services/OxygenService.js',
			baseURL + 'js/services/LoadoutBuilder.js',
			baseURL + 'js/services/DamageSpreader.js',
			baseURL + 'js/probability/DistributionCalculator.js',
			baseURL + 'js/probability/EventModifier.js',
			baseURL + 'js/probability/AbilityModifiers.js',
			baseURL + 'js/probability/ItemModifiers.js',
			baseURL + 'js/probability/ProjectModifiers.js',
			baseURL + 'js/probability/ModifierApplicator.js',
			baseURL + 'js/probability/SectorSampler.js',
			baseURL + 'js/probability/EventWeightCalculator.js',
			baseURL + 'js/probability/DamageComparator.js',
			baseURL + 'js/probability/ResourceCalculator.js',
			baseURL + 'js/probability/NegativeEventCalculator.js',
			baseURL + 'js/probability/OccurrenceCalculator.js',
			baseURL + 'js/probability/DamagePathSampler.js',
			baseURL + 'js/probability/DamageDistributionEngine.js',
			baseURL + 'js/probability/FightCalculator.js',
			baseURL + 'js/probability/EventDamageCalculator.js'
		);
		_initialized = true;
	} catch (error) {
		self.postMessage({ type: 'error', requestId: -1, error: 'Failed to load dependencies: ' + error.message });
		throw error;
	}
}

// Listen for calculation requests
self.onmessage = function(event) {
	const { type, requestId, baseURL, ...params } = event.data;

	if (type === 'calculate') {
		try {
			_loadDependencies(baseURL);
			const results = runCalculation(params);
			self.postMessage({ type: 'result', requestId, results });
		} catch (error) {
			self.postMessage({ type: 'error', requestId, error: error.message });
		}
	}
};

/**
 * Pure calculation logic extracted from app.js _calculateExpeditionResults().
 * No DOM access needed — all dependencies are loaded via importScripts.
 *
 * Steps performed:
 * 1. Filter players to those who can participate (OxygenService.getParticipatingPlayers)
 * 2. Build loadout from participating players (LoadoutBuilder.build)
 * 3. Build sector counts map, separating special sectors (LANDING, LOST) into alwaysInclude
 * 4. Branch: if exploredCount < totalExplorableSectors, use sampling
 *    (EventWeightCalculator.calculateWithSampling), else use full calculation
 *    (EventWeightCalculator.calculate)
 * 5. Distribute damage to players via DamageSpreader.distributeAllScenarios
 * 6. For each scenario (pessimist, average, optimist, worstCase):
 *    a. Apply Survival reduction (DamageSpreader.applySurvivalReduction)
 *    b. Apply Armor reduction (DamageSpreader.applyArmorReduction)
 *    c. Track reduction effects per player (compare before/after damage)
 *    d. Calculate final health (DamageSpreader.calculateFinalHealth)
 * 7. Attach participationStatus (OxygenService.getParticipationStatus)
 * 8. Return the complete results object
 */
function runCalculation({ sectors, allPlayers, antigravActive, exploredCount }) {
	if (sectors.length === 0) return null;

	const participatingPlayers = OxygenService.getParticipatingPlayers(allPlayers, sectors);

	const loadout = LoadoutBuilder.build(participatingPlayers, { antigravActive });

	// Build sector counts map (excluding special sectors like LANDING)
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
		results = EventWeightCalculator.calculateWithSampling(
			sectorCounts, exploredCount, loadout, participatingPlayers, { alwaysInclude }
		);
	} else {
		results = EventWeightCalculator.calculate(sectors, loadout, participatingPlayers);
	}

	// Damage distribution & health calculation
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
	return results;
}
