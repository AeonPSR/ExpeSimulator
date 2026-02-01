/**
 * EventDamageCalculator
 * 
 * BACKEND: Calculates event damage using convolution.
 * 
 * Key insight: Each sector produces exactly ONE event, so damage events
 * are mutually exclusive within a sector. We must build per-sector damage
 * distributions first, then convolve them.
 * 
 * Event types:
 * - TIRED_2: Fixed 2 damage to ALL players
 * - ACCIDENT_3_5: Variable 3-5 damage to ONE player
 * - DISASTER_3_5: Variable 3-5 damage to ALL players
 * 
 * @module probability/EventDamageCalculator
 */
const EventDamageCalculator = {

	/**
	 * Damage values for each event type
	 */
	EVENT_DAMAGES: {
		'TIRED_2': { 
			min: 2, max: 2, average: 2,
			affectsAll: true
		},
		'ACCIDENT_3_5': { 
			min: 3, max: 5, average: 4,
			affectsAll: false  // Only affects one player
		},
		'DISASTER_3_5': { 
			min: 3, max: 5, average: 4,
			affectsAll: true
		}
	},

	/**
	 * Calculates all event damage data for an expedition.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - { abilities: [], items: [], projects: [] }
	 * @param {Array<Object>} players - Raw player data
	 * @param {Set<string>} worstCaseExclusions - Sectors to exclude from worst case (where fight damage "wins")
	 * @returns {Object} Event damage data with scenarios
	 */
	calculate(sectors, loadout = {}, players = [], worstCaseExclusions = null) {
		if (!sectors || sectors.length === 0) {
			return this._emptyResult();
		}

		const playerCount = players.length || 1;

		// Build per-sector damage distributions, then convolve
		const damageResult = this._calculateDamageWithConvolution(sectors, loadout, playerCount, worstCaseExclusions);

		// Also calculate occurrence for legacy compatibility (Event Risks display)
		const occurrence = this._calculateOccurrences(sectors, loadout);

		return {
			occurrence,
			damage: damageResult,
			playerCount,
			// Legacy format for backward compatibility
			tired: occurrence.TIRED_2?.average || 0,
			accident: occurrence.ACCIDENT_3_5?.average || 0,
			disaster: occurrence.DISASTER_3_5?.average || 0,
			scenarios: damageResult,  // Alias for display
			worstCaseExclusions: worstCaseExclusions ? Array.from(worstCaseExclusions) : []
		};
	},

	/**
	 * Calculates damage using proper per-sector convolution.
	 * Each sector can only produce ONE event, so we build sector damage distributions.
	 * @param {Array<string>} sectors - Sector names
	 * @param {Object} loadout - Player loadout
	 * @param {number} playerCount - Number of players
	 * @param {Set<string>} worstCaseExclusions - Sectors to exclude from worst case
	 * @private
	 */
	_calculateDamageWithConvolution(sectors, loadout, playerCount, worstCaseExclusions = null) {
		const distributions = [];
		const worstCaseDistributions = [];

		for (const sectorName of sectors) {
			const dist = this._buildSectorDamageDistribution(sectorName, loadout, playerCount);
			distributions.push(dist);
			
			// For worst case, skip excluded sectors (where fight damage "wins")
			if (!worstCaseExclusions || !worstCaseExclusions.has(sectorName)) {
				worstCaseDistributions.push(dist);
			}
		}

		if (distributions.length === 0) {
			return this._emptyDamageResult();
		}

		// Convolve all sector damage distributions
		const combined = DistributionCalculator.convolveAll(distributions);
		
		// For damage: lower = better (optimist), so higherIsBetter = false
		const scenarios = DistributionCalculator.getScenarios(combined, false);

		// For worst case, use the filtered distributions
		let worstCase = 0;
		let worstCaseProb = 1;
		
		if (worstCaseDistributions.length > 0) {
			const worstCaseCombined = DistributionCalculator.convolveAll(worstCaseDistributions);
			const sortedEntries = [...worstCaseCombined.entries()].sort((a, b) => b[0] - a[0]);
			worstCase = sortedEntries[0]?.[0] || 0;
			worstCaseProb = sortedEntries[0]?.[1] || 0;
		}

		// Get probabilities for pessimist/optimist values
		const pessimistProb = combined.get(scenarios.pessimist) || 0;
		const optimistProb = combined.get(scenarios.optimist) || 0;

		return {
			pessimist: scenarios.pessimist,
			average: scenarios.average,
			optimist: scenarios.optimist,
			worstCase,
			pessimistProb,
			optimistProb,
			worstCaseProb,
			distribution: combined
		};
	},

	/**
	 * Builds damage distribution for a single sector.
	 * Considers all damage events as mutually exclusive outcomes.
	 * @private
	 */
	_buildSectorDamageDistribution(sectorName, loadout, playerCount) {
		const probs = EventWeightCalculator.getModifiedProbabilities(sectorName, loadout);
		const dist = new Map();
		let totalDamageProb = 0;

		for (const [eventName, prob] of probs) {
			const eventInfo = this.EVENT_DAMAGES[eventName];
			if (!eventInfo) continue;  // Not a damage event

			// Calculate damage for this event
			// For "affectsAll" events, multiply by player count
			const multiplier = eventInfo.affectsAll ? playerCount : 1;

			// For variable damage events, we need to consider the range
			// We'll use average for the distribution, but track min/max for scenarios
			const avgDamage = eventInfo.average * multiplier;
			const minDamage = eventInfo.min * multiplier;
			const maxDamage = eventInfo.max * multiplier;

			// Add to distribution
			// For simplicity with convolution, use average damage value
			// (More sophisticated: split prob across min/avg/max)
			if (eventInfo.min === eventInfo.max) {
				// Fixed damage
				dist.set(avgDamage, (dist.get(avgDamage) || 0) + prob);
			} else {
				// Variable damage: split probability across possible values
				// Assume uniform distribution between min and max
				const damageValues = [minDamage, avgDamage, maxDamage];
				const probPerValue = prob / 3;
				for (const dmg of damageValues) {
					dist.set(dmg, (dist.get(dmg) || 0) + probPerValue);
				}
			}

			totalDamageProb += prob;
		}

		// Add probability of 0 damage (non-damage events)
		const zeroDamageProb = 1 - totalDamageProb;
		if (zeroDamageProb > 0.0001) {
			dist.set(0, (dist.get(0) || 0) + zeroDamageProb);
		}

		// Handle empty distribution
		if (dist.size === 0) {
			return new Map([[0, 1]]);
		}

		return dist;
	},

	/**
	 * Calculates occurrence counts for each event type (for Event Risks display).
	 * @private
	 */
	_calculateOccurrences(sectors, loadout) {
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'];
		const occurrence = {};

		for (const eventType of eventTypes) {
			occurrence[eventType] = this._calculateEventOccurrence(sectors, loadout, eventType);
		}

		return occurrence;
	},

	/**
	 * Calculates occurrence for a specific event type.
	 * @private
	 */
	_calculateEventOccurrence(sectors, loadout, eventType) {
		const distributions = [];

		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getModifiedProbabilities(sectorName, loadout);
			let eventProb = 0;

			for (const [eventName, prob] of probs) {
				if (eventName === eventType) {
					eventProb = prob;
					break;
				}
			}

			if (eventProb > 0) {
				distributions.push(new Map([
					[0, 1 - eventProb],
					[1, eventProb]
				]));
			}
		}

		if (distributions.length === 0) {
			return { pessimist: 0, average: 0, optimist: 0, distribution: new Map([[0, 1]]) };
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		const scenarios = DistributionCalculator.getScenarios(combined, false);

		return {
			...scenarios,
			distribution: combined,
			maxPossible: distributions.length
		};
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
