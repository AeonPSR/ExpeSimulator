/**
 * EventDamageCalculator
 * 
 * BACKEND: Calculates event damage using full damage distribution convolution.
 * 
 * NEW APPROACH (v2):
 *   1. For each sector, build a damage distribution combining:
 *      - Probability of each event type occurring
 *      - Damage distribution of that event type (e.g., accident = {3: 1/3, 4: 1/3, 5: 1/3})
 *      - Player count multiplier for "affects all" events
 *   2. Convolve damage distributions across all sectors
 *   3. Extract P25/P50/P75/P100 scenarios from the DAMAGE distribution (not occurrence)
 * 
 * This gives accurate probabilities that account for variable damage within events,
 * so "Average Scenario" probability reflects the actual chance of that damage range.
 * 
 * Event types:
 * - TIRED_2: Fixed 2 damage to ALL players
 * - ACCIDENT_3_5: Variable 3-5 damage to ONE player
 * - ACCIDENT_ROPE_3_5: Variable 3-5 damage to ONE player (rope immune)
 * - DISASTER_3_5: Variable 3-5 damage to ALL players
 * 
 * @module probability/EventDamageCalculator
 */
const EventDamageCalculator = {

	/**
	 * Damage values for each event type.
	 * For variable damage events, we assume uniform distribution over the range.
	 */
	EVENT_DAMAGES: {
		'TIRED_2': { 
			min: 2, max: 2, average: 2,
			affectsAll: true,
			// Damage distribution: 100% chance of 2 damage
			getDamageDistribution: (playerCount) => new Map([[2 * playerCount, 1]])
		},
		'ACCIDENT_3_5': { 
			min: 3, max: 5, average: 4,
			affectsAll: false,  // Only affects one player
			// Damage distribution: equal chance of 3, 4, or 5 damage
			getDamageDistribution: (playerCount) => new Map([
				[3, 1/3],
				[4, 1/3],
				[5, 1/3]
			])
		},
		'ACCIDENT_ROPE_3_5': { 
			min: 3, max: 5, average: 4,
			affectsAll: false,  // Only affects one player
			ropeImmune: true,   // Can be negated by rope
			// Damage distribution: equal chance of 3, 4, or 5 damage
			getDamageDistribution: (playerCount) => new Map([
				[3, 1/3],
				[4, 1/3],
				[5, 1/3]
			])
		},
		'DISASTER_3_5': { 
			min: 3, max: 5, average: 4,
			affectsAll: true,
			// Damage distribution: equal chance of 3, 4, or 5 damage Ã— playerCount
			getDamageDistribution: (playerCount) => new Map([
				[3 * playerCount, 1/3],
				[4 * playerCount, 1/3],
				[5 * playerCount, 1/3]
			])
		}
	},

	/**
	 * Calculates all event damage data for an expedition.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - { abilities: [], items: [], projects: [] }
	 * @param {Array<Object>} players - Raw player data
	 * @param {Set<string>} worstCaseExclusions - Sectors to exclude from worst case (where fight damage "wins")
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @returns {Object} Event damage data with scenarios
	 */
	calculate(sectors, loadout = {}, players = [], worstCaseExclusions = null, sectorProbabilities = null) {
		if (!sectors || sectors.length === 0) {
			return this._emptyResult();
		}

		const playerCount = players.length;

		// Calculate occurrences with source tracking for each event type
		// Delegates to OccurrenceCalculator (shared with FightCalculator)
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5'];
		const occurrenceWithSources = {};
		for (const eventType of eventTypes) {
			occurrenceWithSources[eventType] = OccurrenceCalculator.calculateForType(sectors, loadout, eventType, sectorProbabilities);
		}

		// NEW: Build full damage distribution and derive scenarios from it
		const { damage: damageResult, damageInstances, damageDistribution } = this._calculateDamageFromDistribution(
			sectors,
			loadout,
			playerCount,
			worstCaseExclusions,
			sectorProbabilities
		);

		// Legacy occurrence format (without sources)
		const occurrence = {};
		for (const eventType of Object.keys(occurrenceWithSources)) {
			occurrence[eventType] = occurrenceWithSources[eventType].occurrence;
		}

		return {
			occurrence,
			damage: damageResult,
			damageInstances,  // Per-scenario damage instances with sources
			damageDistribution,  // Full damage distribution for advanced analysis
			playerCount,
			// Legacy format for backward compatibility
			// Combine both accident types for display
			tired: occurrence.TIRED_2?.average || 0,
			accident: (occurrence.ACCIDENT_3_5?.average || 0) + (occurrence.ACCIDENT_ROPE_3_5?.average || 0),
			disaster: occurrence.DISASTER_3_5?.average || 0,
			scenarios: damageResult,  // Alias for display
			worstCaseExclusions: worstCaseExclusions ? Array.from(worstCaseExclusions) : []
		};
	},

	/**
	 * NEW: Calculates damage scenarios from full damage distribution.
	 * 
	 * This builds a complete probability distribution over total damage values
	 * by convolving per-sector damage distributions. The scenarios (P25/P50/P75/P100)
	 * are then extracted from this damage distribution, giving accurate probabilities
	 * that account for variable damage within events.
	 * 
	 * For each sector:
	 *   - Get probability of each event type
	 *   - Get damage distribution of each event type (e.g., accident = {3: 1/3, 4: 1/3, 5: 1/3})
	 *   - Combine into sector damage distribution (weighted by event probabilities)
	 *   - Include "0 damage" with probability (1 - sum of event probs)
	 * 
	 * Then convolve all sector distributions to get total damage distribution.
	 * 
	 * @param {Array<string>} sectors - Sector names
	 * @param {Object} loadout - Player loadout
	 * @param {number} playerCount - Number of players
	 * @param {Set<string>} worstCaseExclusions - Sectors to exclude from worst case
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities
	 * @returns {{ damage: Object, damageInstances: Object, damageDistribution: Map }}
	 * @private
	 */
	_calculateDamageFromDistribution(sectors, loadout, playerCount, worstCaseExclusions = null, sectorProbabilities = null) {
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5'];
		
		// Build per-sector damage distributions
		const sectorDamageDistributions = [];
		const sectorDamageDistributionsWorstCase = [];
		
		for (let i = 0; i < sectors.length; i++) {
			const sectorName = sectors[i];
			const isExcluded = worstCaseExclusions && worstCaseExclusions.has(sectorName);
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
			
			// Build this sector's damage distribution
			// Start with: P(0 damage) = 1 - sum(event probs)
			const sectorDist = new Map();
			const sectorDistWorstCase = new Map();
			let totalEventProb = 0;
			
			for (const eventType of eventTypes) {
				const eventProb = probs.get(eventType) || 0;
				if (eventProb <= 0) continue;
				
				totalEventProb += eventProb;
				
				const eventInfo = this.EVENT_DAMAGES[eventType];
				if (!eventInfo || !eventInfo.getDamageDistribution) continue;
				
				// Get the damage distribution for this event type
				const damageDist = eventInfo.getDamageDistribution(playerCount);
				
				// Add to sector distribution: each damage value gets eventProb Ã— damageProb
				for (const [damageVal, damageProb] of damageDist) {
					const combinedProb = eventProb * damageProb;
					sectorDist.set(damageVal, (sectorDist.get(damageVal) || 0) + combinedProb);
					
					// For worst case, excluded sectors contribute 0 damage
					if (!isExcluded) {
						sectorDistWorstCase.set(damageVal, (sectorDistWorstCase.get(damageVal) || 0) + combinedProb);
					}
				}
			}
			
			// Add probability of no event (0 damage)
			const noEventProb = Math.max(0, 1 - totalEventProb);
			sectorDist.set(0, (sectorDist.get(0) || 0) + noEventProb);
			
			// For worst case distribution
			if (isExcluded) {
				// Excluded sector: 100% chance of 0 damage
				sectorDistWorstCase.set(0, 1);
			} else {
				sectorDistWorstCase.set(0, (sectorDistWorstCase.get(0) || 0) + noEventProb);
			}
			
			sectorDamageDistributions.push(sectorDist);
			sectorDamageDistributionsWorstCase.push(sectorDistWorstCase);
		}
		
		// Convolve all sector distributions to get total damage distribution
		const totalDamageDistribution = sectorDamageDistributions.length > 0
			? DistributionCalculator.convolveAll(sectorDamageDistributions)
			: new Map([[0, 1]]);
		
		const totalDamageDistributionWorstCase = sectorDamageDistributionsWorstCase.length > 0
			? DistributionCalculator.convolveAll(sectorDamageDistributionsWorstCase)
			: new Map([[0, 1]]);
		
		// Extract scenarios from the damage distribution (lower is better for damage)
		const scenarios = DistributionCalculator.getScenarios(totalDamageDistribution, false);
		const worstCaseScenarios = DistributionCalculator.getScenarios(totalDamageDistributionWorstCase, false);
		
		// Debug logging
		console.log(`[EventDamage] Damage distribution scenarios: optimist=${scenarios.optimist}, average=${scenarios.average}, pessimist=${scenarios.pessimist}, worst=${scenarios.worst}`);
		console.log(`[EventDamage] Damage distribution probabilities: optimistProb=${(scenarios.optimistProb * 100).toFixed(1)}%, averageProb=${(scenarios.averageProb * 100).toFixed(1)}%, pessimistProb=${(scenarios.pessimistProb * 100).toFixed(1)}%, worstProb=${(scenarios.worstProb * 100).toFixed(1)}%`);
		
		const damage = {
			optimist: scenarios.optimist,
			average: scenarios.average,
			pessimist: scenarios.pessimist,
			worstCase: worstCaseScenarios.worst,  // Use worst case from the filtered distribution
			optimistProb: scenarios.optimistProb,
			averageProb: scenarios.averageProb,
			pessimistProb: scenarios.pessimistProb,
			worstCaseProb: worstCaseScenarios.worstProb,
			// Include distribution for potential detailed display
			distribution: totalDamageDistribution
		};
		
		// Build simplified damage instances for backward compatibility
		// These are approximations since the new approach doesn't track per-type counts the same way
		const damageInstances = this._buildDamageInstancesFromDistribution(
			sectors, loadout, playerCount, scenarios, worstCaseScenarios, sectorProbabilities
		);
		
		return { damage, damageInstances, damageDistribution: totalDamageDistribution };
	},

	/**
	 * Builds damage instances for backward compatibility with the display layer.
	 * This is an approximation since we now use damage distributions rather than occurrence counts.
	 * 
	 * @private
	 */
	_buildDamageInstancesFromDistribution(sectors, loadout, playerCount, scenarios, worstCaseScenarios, sectorProbabilities) {
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5'];
		
		const damageInstances = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};
		
		// For now, provide a simplified summary
		// The damage values come from the distribution scenarios, not occurrence Ã— fixed damage
		if (scenarios.optimist > 0) {
			damageInstances.optimist.push({
				type: 'COMBINED',
				count: null,  // Unknown from distribution
				damagePerInstance: null,
				totalDamage: scenarios.optimist,
				sources: []
			});
		}
		
		if (scenarios.average > 0) {
			damageInstances.average.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: scenarios.average,
				sources: []
			});
		}
		
		if (scenarios.pessimist > 0) {
			damageInstances.pessimist.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: scenarios.pessimist,
				sources: []
			});
		}
		
		if (worstCaseScenarios.worst > 0) {
			damageInstances.worstCase.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: worstCaseScenarios.worst,
				sources: []
			});
		}
		
		return damageInstances;
	},

	/**
	 * Returns empty damage result structure.
	 * @private
	 */
	_emptyDamageResult() {
		return {
			pessimist: 0,
			average: 0,
			optimist: 0,
			worstCase: 0,
			pessimistProb: 1,
			optimistProb: 1,
			worstCaseProb: 1,
			distribution: new Map([[0, 1]])
		};
	},

	/**
	 * Returns empty result structure.
	 * @private
	 */
	_emptyResult() {
		return {
			occurrence: {},
			damage: this._emptyDamageResult(),
			damageInstances: {
				pessimist: [],
				average: [],
				optimist: [],
				worstCase: []
			},
			playerCount: 0,
			tired: 0,
			accident: 0,
			disaster: 0,
			scenarios: this._emptyDamageResult()
		};
	}
};

// Export
if (typeof window !== 'undefined') {
	window.EventDamageCalculator = EventDamageCalculator;
}
