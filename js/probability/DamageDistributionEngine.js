/**
 * DamageDistributionEngine
 * 
 * BACKEND: Shared convolution pipeline for damage calculations.
 * 
 * Both FightCalculator and EventDamageCalculator follow the same algorithm:
 *   1. For each sector, build a per-sector damage distribution
 *   2. Convolve all sector distributions into a total distribution
 *   3. Extract P25/P50/P75/P100 scenarios from the total distribution
 *   4. Package into a standard damage result + damage instances
 * 
 * This engine provides that shared pipeline. Callers supply a callback
 * that produces the per-sector damage distribution for their domain
 * (fights vs events).
 * 
 * @module probability/DamageDistributionEngine
 */
const DamageDistributionEngine = {

	/**
	 * Runs the full damage convolution pipeline.
	 * 
	 * @param {Object} options
	 * @param {Array<string>} options.sectors - Sector names
	 * @param {Object} options.loadout - Player loadout
	 * @param {Map} options.sectorProbabilities - Precomputed sector probabilities
	 * @param {Set<string>|null} options.exclusions - Sectors to exclude (mutually exclusive events)
	 * @param {Function} options.getSectorDamageDist - (sectorName, probs) => { dist: Map<damage, prob>, totalProb: number }
	 *   Called for each sector. Should return the raw damage distribution entries
	 *   and the total probability of any relevant event on that sector.
	 * @param {Function|null} options.postProcessDistribution - (distribution) => Map  (optional)
	 *   Applied to the convolved distribution before scenario extraction (e.g., grenade reduction).
	 * @param {string} options.logLabel - Label for debug logging (e.g., "FightDamage", "EventDamage")
	 * @returns {{ damage: Object, damageInstances: Object, damageDistribution: Map }}
	 */
	calculate(options) {
		const {
			sectors,
			loadout,
			sectorProbabilities = null,
			worstCaseExclusions = null,
			getSectorDamageDist,
			postProcessDistribution = null,
			logLabel = 'Damage'
		} = options;

		// Step 1: Build per-sector damage distributions
		// Excluded sectors (mutually exclusive events where the other type wins)
		// contribute 0 damage to ALL scenarios.
		const sectorDists = [];

		for (let i = 0; i < sectors.length; i++) {
			const sectorName = sectors[i];
			const isExcluded = worstCaseExclusions && worstCaseExclusions.has(sectorName);

			if (isExcluded) {
				// Excluded: 100% chance of 0 damage for this sector
				sectorDists.push(new Map([[0, 1]]));
				continue;
			}

			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);

			// Let the caller build the damage entries for this sector
			const { dist: damageEntries, totalProb } = getSectorDamageDist(sectorName, probs);

			// Build sector distribution
			const sectorDist = new Map(damageEntries);

			// Add probability of nothing happening (0 damage)
			const noEventProb = Math.max(0, 1 - totalProb);
			sectorDist.set(0, (sectorDist.get(0) || 0) + noEventProb);

			sectorDists.push(sectorDist);
		}

		// Step 2: Convolve all sector distributions
		let totalDistribution = sectorDists.length > 0
			? DistributionCalculator.convolveAll(sectorDists)
			: new Map([[0, 1]]);

		// Optional post-processing (e.g., grenade reduction)
		if (postProcessDistribution) {
			totalDistribution = postProcessDistribution(totalDistribution);
		}

		// Step 3: Extract scenarios (lower is better for damage)
		const scenarios = DistributionCalculator.getScenarios(totalDistribution, false);

		// Debug logging
		console.log(`[${logLabel}] Damage distribution scenarios: optimist=${scenarios.optimist}, average=${scenarios.average}, pessimist=${scenarios.pessimist}, worst=${scenarios.worst}`);
		console.log(`[${logLabel}] Damage distribution probabilities: optimistProb=${(scenarios.optimistProb * 100).toFixed(1)}%, averageProb=${(scenarios.averageProb * 100).toFixed(1)}%, pessimistProb=${(scenarios.pessimistProb * 100).toFixed(1)}%, worstProb=${(scenarios.worstProb * 100).toFixed(1)}%`);

		// Step 4: Build standard damage result (all 4 from one distribution)
		const damage = this.buildDamageResult(scenarios, totalDistribution);

		// Step 5: Build damage instances for display layer
		const damageInstances = this.buildDamageInstances(scenarios);

		return { damage, damageInstances, damageDistribution: totalDistribution };
	},

	/**
	 * Returns a zeroed damage result matching the shape of buildDamageResult().
	 * Probability 1 on the 0-damage bucket (certain no damage).
	 * @returns {Object}
	 */
	emptyDamageResult() {
		return {
			pessimist: 0,
			average: 0,
			optimist: 0,
			worstCase: 0,
			pessimistProb: 1,
			averageProb: 1,
			optimistProb: 1,
			worstCaseProb: 1,
			distribution: new Map([[0, 1]])
		};
	},

	/**
	 * Returns an empty damage-instances object (no instances in any scenario).
	 * @returns {Object} { pessimist: [], average: [], optimist: [], worstCase: [] }
	 */
	emptyDamageInstances() {
		return { pessimist: [], average: [], optimist: [], worstCase: [] };
	},

	/**
	 * Builds the standard damage result object from scenarios.
	 * All 4 values (optimist/average/pessimist/worstCase) come from ONE distribution
	 * that already accounts for mutual-exclusivity exclusions.
	 * 
	 * @param {Object} scenarios - From DistributionCalculator.getScenarios()
	 * @param {Map} distribution - The full damage distribution
	 * @returns {Object} Standard damage result
	 */
	buildDamageResult(scenarios, distribution) {
		return {
			optimist: scenarios.optimist,
			average: scenarios.average,
			pessimist: scenarios.pessimist,
			worstCase: scenarios.worst,
			optimistProb: scenarios.optimistProb,
			averageProb: scenarios.averageProb,
			pessimistProb: scenarios.pessimistProb,
			worstCaseProb: scenarios.worstProb,
			distribution: distribution
		};
	},

	/**
	 * Builds simplified damage instances for the display layer.
	 * Uses 'COMBINED' type since distribution-based approach doesn't track per-type counts.
	 * 
	 * @param {Object} scenarios - Scenarios from DistributionCalculator.getScenarios()
	 * @returns {Object} { pessimist: [], average: [], optimist: [], worstCase: [] }
	 */
	buildDamageInstances(scenarios) {
		const damageInstances = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};

		const scenarioKeys = ['optimist', 'average', 'pessimist'];
		for (const key of scenarioKeys) {
			if (scenarios[key] > 0) {
				damageInstances[key].push({
					type: 'COMBINED',
					count: null,
					damagePerInstance: null,
					totalDamage: scenarios[key],
					sources: []
				});
			}
		}

		if (scenarios.worst > 0) {
			damageInstances.worstCase.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: scenarios.worst,
				sources: []
			});
		}

		return damageInstances;
	}
};

// Export
if (typeof window !== 'undefined') {
	window.DamageDistributionEngine = DamageDistributionEngine;
}
