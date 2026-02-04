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
		'ACCIDENT_ROPE_3_5': { 
			min: 3, max: 5, average: 4,
			affectsAll: false,  // Only affects one player
			ropeImmune: true    // Can be negated by rope
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
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @returns {Object} Event damage data with scenarios
	 */
	calculate(sectors, loadout = {}, players = [], worstCaseExclusions = null, sectorProbabilities = null) {
		if (!sectors || sectors.length === 0) {
			return this._emptyResult();
		}

		const playerCount = players.length || 1;

		// Calculate occurrences with source tracking for each event type
		const occurrenceWithSources = this._calculateOccurrencesWithSources(sectors, loadout, sectorProbabilities);

		// Build per-sector damage distributions, then convolve
		const damageResult = this._calculateDamageWithConvolution(sectors, loadout, playerCount, worstCaseExclusions, sectorProbabilities);

		// Build damage instances for per-player distribution
		const damageInstances = this._buildDamageInstances(occurrenceWithSources, playerCount, worstCaseExclusions);

		// Legacy occurrence format (without sources)
		const occurrence = {};
		for (const eventType of Object.keys(occurrenceWithSources)) {
			occurrence[eventType] = occurrenceWithSources[eventType].occurrence;
		}

		return {
			occurrence,
			damage: damageResult,
			damageInstances,  // Per-scenario damage instances with sources
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
	 * Calculates damage using proper per-sector convolution.
	 * Each sector can only produce ONE event, so we build sector damage distributions.
	 * 
	 * For pessimist and worst case: excludes sectors where fight damage "wins"
	 * (since fight and event are mutually exclusive - we count fight damage there instead).
	 * For optimist and average: uses full distribution.
	 * 
	 * @param {Array<string>} sectors - Sector names
	 * @param {Object} loadout - Player loadout
	 * @param {number} playerCount - Number of players
	 * @param {Set<string>} fightWinExclusions - Sectors where fight damage > event damage
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @private
	 */
	_calculateDamageWithConvolution(sectors, loadout, playerCount, fightWinExclusions = null, sectorProbabilities = null) {
		const distributions = [];

		for (const sectorName of sectors) {
			// If fight "wins" for this sector, event damage should be 0
			// The sector still participates (with its probability), but contributes 0 damage
			const zeroDamage = fightWinExclusions && fightWinExclusions.has(sectorName);
			const dist = this._buildSectorDamageDistribution(sectorName, loadout, playerCount, sectorProbabilities, zeroDamage);
			distributions.push(dist);
		}

		if (distributions.length === 0) {
			return this._emptyDamageResult();
		}

		// Combined distribution with zero damage for excluded sectors
		const fullCombined = DistributionCalculator.convolveAll(distributions);
		const fullScenarios = DistributionCalculator.getScenarios(fullCombined, false);

		// Get worst case value (max damage in distribution)
		const sortedEntries = [...fullCombined.entries()].sort((a, b) => b[0] - a[0]);
		const worstCase = sortedEntries[0]?.[0] || 0;

		return {
			pessimist: fullScenarios.pessimist,
			median: fullScenarios.median,
			average: fullScenarios.average,  // Keep for backward compatibility
			optimist: fullScenarios.optimist,
			worstCase,
			pessimistProb: fullScenarios.pessimistProb,
			medianProb: fullScenarios.medianProb,
			optimistProb: fullScenarios.optimistProb,
			worstCaseProb: fullScenarios.worstProb,
			distribution: fullCombined
		};
	},

	/**
	 * Builds damage distribution for a single sector.
	 * Considers all damage events as mutually exclusive outcomes.
	 * @param {string} sectorName - The sector to analyze
	 * @param {Object} loadout - Player loadout
	 * @param {number} playerCount - Number of players
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @param {boolean} zeroDamage - If true, all damage events contribute 0 damage (fight "wins" for this sector)
	 * @private
	 */
	_buildSectorDamageDistribution(sectorName, loadout, playerCount, sectorProbabilities = null, zeroDamage = false) {
		const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
		const dist = new Map();
		let totalDamageProb = 0;

		for (const [eventName, prob] of probs) {
			const eventInfo = this.EVENT_DAMAGES[eventName];
			if (!eventInfo) continue;  // Not a damage event

			// If fight "wins" for this sector, damage events contribute 0 damage
			// but their probability is still accounted for
			if (zeroDamage) {
				dist.set(0, (dist.get(0) || 0) + prob);
				totalDamageProb += prob;
				continue;
			}

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
	 * Calculates occurrence counts for each event type with source tracking.
	 * @private
	 */
	_calculateOccurrencesWithSources(sectors, loadout, sectorProbabilities = null) {
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5'];
		const result = {};

		for (const eventType of eventTypes) {
			result[eventType] = this._calculateEventOccurrenceWithSources(sectors, loadout, eventType, sectorProbabilities);
		}

		return result;
	},

	/**
	 * Calculates occurrence for a specific event type with source tracking.
	 * @private
	 */
	_calculateEventOccurrenceWithSources(sectors, loadout, eventType, sectorProbabilities = null) {
		const distributions = [];
		const sectorsWithEvent = [];

		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
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
				sectorsWithEvent.push({
					sectorName,
					probability: eventProb
				});
			}
		}

		if (distributions.length === 0) {
			return { 
				occurrence: { pessimist: 0, average: 0, optimist: 0, distribution: new Map([[0, 1]]) },
				sectors: []
			};
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		const scenarios = DistributionCalculator.getScenarios(combined, false);

		return {
			occurrence: {
				...scenarios,
				distribution: combined,
				maxPossible: distributions.length
			},
			sectors: sectorsWithEvent
		};
	},

	/**
	 * Builds damage instances for each scenario with source information.
	 * @private
	 */
	_buildDamageInstances(occurrenceWithSources, playerCount, worstCaseExclusions = null) {
		const damageInstances = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};

		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'];
		const scenarios = ['pessimist', 'average', 'optimist'];

		for (const eventType of eventTypes) {
			const eventData = occurrenceWithSources[eventType];
			if (!eventData) continue;

			const { occurrence, sectors } = eventData;
			const eventInfo = this.EVENT_DAMAGES[eventType];
			if (!eventInfo) continue;

			// Filter sectors for worst case (exclude sectors where fight wins)
			const worstCaseSectors = worstCaseExclusions 
				? sectors.filter(s => !worstCaseExclusions.has(s.sectorName))
				: sectors;

			for (const scenario of scenarios) {
				const eventCount = Math.round(occurrence[scenario]);
				if (eventCount <= 0) continue;

				// Get damage for this scenario
				const damagePerInstance = this._getDamageForScenario(eventType, scenario);
				
				// Assign sources to instances
				const sources = this._assignSourcesToInstances(eventCount, sectors);

				damageInstances[scenario].push({
					type: eventType,
					count: eventCount,
					damagePerInstance: damagePerInstance,
					sources: sources
				});
			}

			// Worst case: max possible events from non-excluded sectors
			const worstCaseCount = worstCaseSectors.length;
			if (worstCaseCount > 0) {
				const worstCaseDamage = this._getDamageForScenario(eventType, 'worstCase');
				const sources = this._assignSourcesToInstances(worstCaseCount, worstCaseSectors);

				damageInstances.worstCase.push({
					type: eventType,
					count: worstCaseCount,
					damagePerInstance: worstCaseDamage,
					sources: sources
				});
			}
		}

		return damageInstances;
	},

	/**
	 * Gets damage value for a specific event type and scenario.
	 * @private
	 */
	_getDamageForScenario(eventType, scenario) {
		const eventInfo = this.EVENT_DAMAGES[eventType];
		if (!eventInfo) return 0;

		if (eventInfo.min === eventInfo.max) {
			return eventInfo.min;  // Fixed damage
		}

		// Variable damage: use scenario-appropriate value
		switch (scenario) {
			case 'optimist':
				return eventInfo.min;
			case 'average':
				return eventInfo.average;
			case 'pessimist':
			case 'worstCase':
				return eventInfo.max;
			default:
				return eventInfo.average;
		}
	},

	/**
	 * Assigns source sectors to event instances.
	 * @private
	 */
	_assignSourcesToInstances(count, availableSectors) {
		const sources = [];
		for (let i = 0; i < count; i++) {
			if (i < availableSectors.length) {
				sources.push({
					sectorName: availableSectors[i].sectorName,
					probability: availableSectors[i].probability
				});
			} else {
				// More instances than sectors - shouldn't happen but handle gracefully
				sources.push({
					sectorName: availableSectors[i % availableSectors.length]?.sectorName || 'UNKNOWN',
					probability: availableSectors[i % availableSectors.length]?.probability || 0
				});
			}
		}
		return sources;
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
