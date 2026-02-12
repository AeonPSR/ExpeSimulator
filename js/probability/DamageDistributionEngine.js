/**
 * DamageDistributionEngine
 * 
 * BACKEND: Shared convolution pipeline for damage calculations.
 * 
 * Both FightCalculator and EventDamageCalculator follow the same algorithm:
 *   1. For each sector, build a per-sector damage distribution
 *   2. Convolve all sector distributions into a total distribution
 *   3. Extract P25/P50/P75/P100 scenarios from the total distribution
 *   4. Sample explaining paths for each scenario (recovers provenance)
 *   5. Package into a standard damage result + damage instances with sources
 * 
 * This engine provides that shared pipeline. Callers supply callbacks
 * that produce per-sector damage distributions for their domain
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
	 * @param {Function|null} options.getDetailedSectorOutcomes - (sectorName, probs) => Array<{ eventType, damage, probability }>
	 *   Optional. If provided, returns detailed outcomes for path sampling.
	 *   Must include the "no event" case with eventType: null, damage: 0.
	 * @param {Function|null} options.postProcessDistribution - (distribution) => Map  (optional)
	 *   Applied to the convolved distribution before scenario extraction (e.g., grenade reduction).
	 * @param {string} options.logLabel - Label for debug logging (e.g., "FightDamage", "EventDamage")
	 * @returns {{ damage: Object, damageInstances: Object, damageDistribution: Map, sampledPaths: Object }}
	 */
	calculate(options) {
		const {
			sectors,
			loadout,
			sectorProbabilities = null,
			worstCaseExclusions = null,
			getSectorDamageDist,
			getDetailedSectorOutcomes = null,
			postProcessDistribution = null,
			logLabel = 'Damage'
		} = options;

		// Step 1: Build per-sector damage distributions
		// Excluded sectors (mutually exclusive events where the other type wins)
		// contribute 0 damage to ALL scenarios.
		const sectorDists = [];
		const detailedSectorOutcomes = []; // For path sampling

		for (let i = 0; i < sectors.length; i++) {
			const sectorName = sectors[i];
			const isExcluded = worstCaseExclusions && worstCaseExclusions.has(sectorName);

			if (isExcluded) {
				// Excluded: 100% chance of 0 damage for this sector
				sectorDists.push(new Map([[0, 1]]));
				detailedSectorOutcomes.push({
					sectorName,
					outcomes: [{ eventType: null, damage: 0, probability: 1 }]
				});
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

			// Collect detailed outcomes for path sampling if callback provided
			if (getDetailedSectorOutcomes) {
				const outcomes = getDetailedSectorOutcomes(sectorName, probs);
				// Ensure "no event" case is included
				const hasNoEvent = outcomes.some(o => o.damage === 0 && o.eventType === null);
				if (!hasNoEvent && noEventProb > 0.0001) {
					outcomes.push({ eventType: null, damage: 0, probability: noEventProb });
				}
				detailedSectorOutcomes.push({ sectorName, outcomes });
			}
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

		// Step 4: Sample explaining paths for each scenario (if detailed outcomes available)
		let sampledPaths = null;
		if (getDetailedSectorOutcomes && detailedSectorOutcomes.length > 0 && typeof DamagePathSampler !== 'undefined') {
			const targetTotals = [
				scenarios.optimist,
				Math.round(scenarios.average), // Average might be fractional
				scenarios.pessimist,
				scenarios.worstCase
			];
			const paths = DamagePathSampler.samplePaths(detailedSectorOutcomes, targetTotals);
			sampledPaths = {
				optimist: paths[0],
				average: paths[1],
				pessimist: paths[2],
				worstCase: paths[3]
			};

			// Console logging for debugging
			console.log(`[${logLabel}] === SAMPLED PATHS ===`);
			for (const key of ['optimist', 'average', 'pessimist', 'worstCase']) {
				const path = sampledPaths[key];
				const nonZeroSources = path.sources.filter(s => s.damage > 0);
				const sourceDesc = nonZeroSources.length > 0
					? nonZeroSources.map(s => `${s.sector}:${s.eventType}(${s.damage})`).join(' + ')
					: '(no damage)';
				console.log(`[${logLabel}] ${key} (total=${path.totalDamage}): ${sourceDesc}`);
			}
		}

		// Debug logging
		console.log(`[${logLabel}] Damage distribution scenarios: optimist=${scenarios.optimist}, average=${scenarios.average}, pessimist=${scenarios.pessimist}, worstCase=${scenarios.worstCase}`);
		console.log(`[${logLabel}] Damage distribution probabilities: optimistProb=${(scenarios.optimistProb * 100).toFixed(1)}%, averageProb=${(scenarios.averageProb * 100).toFixed(1)}%, pessimistProb=${(scenarios.pessimistProb * 100).toFixed(1)}%, worstCaseProb=${(scenarios.worstCaseProb * 100).toFixed(1)}%`);

		// Step 5: Build standard damage result (all 4 from one distribution)
		const damage = this.buildDamageResult(scenarios, totalDistribution);

		// Step 6: Build damage instances for display layer (with sources if available)
		const damageInstances = this.buildDamageInstances(scenarios, sampledPaths);

		return { damage, damageInstances, damageDistribution: totalDistribution, sampledPaths };
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
			worstCase: scenarios.worstCase,
			optimistProb: scenarios.optimistProb,
			averageProb: scenarios.averageProb,
			pessimistProb: scenarios.pessimistProb,
			worstCaseProb: scenarios.worstCaseProb,
			distribution: distribution
		};
	},

	/**
	 * Builds simplified damage instances for the display layer.
	 * If sampled paths are provided, includes source details.
	 * Otherwise uses 'COMBINED' type with no source tracking.
	 * 
	 * @param {Object} scenarios - Scenarios from DistributionCalculator.getScenarios()
	 * @param {Object|null} sampledPaths - Sampled paths from DamagePathSampler (optional)
	 * @returns {Object} { pessimist: [], average: [], optimist: [], worstCase: [] }
	 */
	buildDamageInstances(scenarios, sampledPaths = null) {
		const damageInstances = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};

		for (const key of Constants.SCENARIO_KEYS) {
			if (scenarios[key] > 0) {
				const sources = sampledPaths && sampledPaths[key]
					? sampledPaths[key].sources.filter(s => s.damage > 0).map(s => ({
						sector: s.sector,
						eventType: s.eventType,
						damage: s.damage
					}))
					: [];

				damageInstances[key].push({
					type: sampledPaths ? 'DETAILED' : 'COMBINED',
					totalDamage: scenarios[key],
					sources: sources
				});
			}
		}

		return damageInstances;
	}
};

// Export
if (typeof window !== 'undefined') {
	window.DamageDistributionEngine = DamageDistributionEngine;
}
