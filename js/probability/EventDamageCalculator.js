/**
 * EventDamageCalculator
 * 
 * BACKEND: Calculates event damage arithmetically from occurrence counts.
 * Uses the same approach as FightCalculator:
 *   1. Per-type occurrence via OccurrenceCalculator
 *   2. Combined occurrence distribution → scenario percentages
 *   3. Damage = occurrenceCount × damagePerEvent × multiplier (arithmetic, no distribution)
 * 
 * This ensures percentages NEVER change with playerCount. Only damage values scale.
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
		// Delegates to OccurrenceCalculator (shared with FightCalculator)
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5'];
		const occurrenceWithSources = {};
		for (const eventType of eventTypes) {
			occurrenceWithSources[eventType] = OccurrenceCalculator.calculateForType(sectors, loadout, eventType, sectorProbabilities);
		}

		// Calculate damage arithmetically from occurrence counts (mirrors FightCalculator)
		// Percentages from combined occurrence, damage values from count × damagePerEvent × multiplier
		const { damage: damageResult, damageInstances } = this._calculateDamageWithInstances(occurrenceWithSources, playerCount, worstCaseExclusions);

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
	 * Calculates total damage for all scenarios with damage instances.
	 * Mirrors FightCalculator._calculateDamageWithInstances exactly:
	 *   - Percentages from OccurrenceCalculator.combineOccurrences()
	 *   - Damage values from arithmetic: count × damagePerEvent × multiplier
	 *   - NO damage distribution involved
	 * 
	 * @param {Object} occurrenceWithSources - Per-type occurrence data from OccurrenceCalculator
	 * @param {number} playerCount - Number of players
	 * @param {Set<string>} worstCaseExclusions - Sectors where fight damage > event damage
	 * @private
	 */
	_calculateDamageWithInstances(occurrenceWithSources, playerCount, worstCaseExclusions = null) {
		const scenarios = ['pessimist', 'average', 'optimist'];
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5'];

		const damage = {
			pessimist: 0,
			average: 0,
			optimist: 0,
			worstCase: 0,
			pessimistProb: 0,
			averageProb: 0,
			optimistProb: 0,
			worstCaseProb: 0
		};

		const damageInstances = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};

		// Build combined occurrence distribution for probability calculation
		// Uses OccurrenceCalculator to combine per-type distributions (same as fights)
		const combined = OccurrenceCalculator.combineOccurrences(occurrenceWithSources);
		damage.optimistProb = combined.scenarios.optimistProb;
		damage.averageProb = combined.scenarios.averageProb;
		damage.pessimistProb = combined.scenarios.pessimistProb;
		damage.worstCaseProb = combined.scenarios.worstProb;

		// Track per-sector worst single event for worst case AND pessimist
		// (events are mutually exclusive per sector — only ONE can happen per step)
		const sectorWorstCase = new Map();
		const sectorPessimist = new Map();

		for (const eventType of eventTypes) {
			const eventData = occurrenceWithSources[eventType];
			if (!eventData) continue;

			const { occurrence, sectors } = eventData;
			const eventInfo = this.EVENT_DAMAGES[eventType];
			if (!eventInfo) continue;

			const multiplier = eventInfo.affectsAll ? playerCount : 1;

			// Filter sectors for worst case only (exclude sectors where fight wins)
			const nonExcludedSectors = worstCaseExclusions
				? sectors.filter(s => !worstCaseExclusions.has(s.sectorName))
				: sectors;

			// Optimist and Average: no per-sector picking needed (low occurrence, minimal overlap)
			for (const scenario of ['optimist', 'average']) {
				const eventCount = Math.round(occurrence[scenario]);
				if (eventCount <= 0) continue;

				const damagePerEvent = this._getDamageForScenario(eventType, scenario);
				const totalDamage = eventCount * damagePerEvent * multiplier;
				damage[scenario] += totalDamage;

				const sources = this._assignSourcesToInstances(eventCount, sectors);
				damageInstances[scenario].push({
					type: eventType,
					count: eventCount,
					damagePerInstance: damagePerEvent * multiplier,
					totalDamage: totalDamage,
					sources: sources
				});
			}

			// Pessimist: track per-sector best event (no fight exclusions)
			// Use sectorIndex as key to handle duplicate sector names (e.g., 4x COLD)
			const pessimistDamage = this._getDamageForScenario(eventType, 'pessimist') * multiplier;
			for (const sector of sectors) {
				const current = sectorPessimist.get(sector.sectorIndex);
				if (!current || pessimistDamage > current.damage) {
					sectorPessimist.set(sector.sectorIndex, {
						damage: pessimistDamage,
						eventType: eventType,
						damagePerInstance: pessimistDamage,
						probability: sector.probability,
						sectorName: sector.sectorName
					});
				}
			}

			// Worst case: track per-sector best event (with fight exclusions)
			// Use sectorIndex as key to handle duplicate sector names
			const worstCaseDamage = this._getDamageForScenario(eventType, 'worstCase') * multiplier;

			for (const sector of nonExcludedSectors) {
				const current = sectorWorstCase.get(sector.sectorIndex);
				if (!current || worstCaseDamage > current.damage) {
					sectorWorstCase.set(sector.sectorIndex, {
						damage: worstCaseDamage,
						eventType: eventType,
						damagePerInstance: worstCaseDamage,
						probability: sector.probability,
						sectorName: sector.sectorName
					});
				}
			}
		}

		// Build pessimist from per-sector best-of picks
		// Sort sectors by probability (descending) and pick based on combined occurrence count
		const pessimistSectors = [...sectorPessimist.entries()]
			.sort((a, b) => b[1].probability - a[1].probability);
		
		// Get combined occurrence count for pessimist (how many sectors fire ANY damage event)
		const combinedPessimistCount = Math.round(combined.scenarios.pessimist || 0);
		
		// Group by event type for instances, limiting to top N sectors
		const pessimistByType = new Map();
		let sectorsUsed = 0;
		for (const [sectorIndex, info] of pessimistSectors) {
			if (sectorsUsed >= combinedPessimistCount) break;
			
			if (!pessimistByType.has(info.eventType)) {
				pessimistByType.set(info.eventType, []);
			}
			pessimistByType.get(info.eventType).push({ 
				sectorIndex, 
				sectorName: info.sectorName, 
				probability: info.probability,
				damagePerInstance: info.damagePerInstance
			});
			damage.pessimist += info.damage;
			sectorsUsed++;
		}

		for (const [eventType, sectorList] of pessimistByType) {
			damageInstances.pessimist.push({
				type: eventType,
				count: sectorList.length,
				damagePerInstance: sectorList[0].damagePerInstance,
				totalDamage: sectorList.length * sectorList[0].damagePerInstance,
				sources: sectorList.map(s => ({ sectorName: s.sectorName, probability: s.probability }))
			});
		}

		// Build worst case from per-sector best-of picks (100% fire rate)
		// Group sectors by their worst event type for instances
		const worstByType = new Map();
		for (const [sectorIndex, info] of sectorWorstCase) {
			if (!worstByType.has(info.eventType)) {
				worstByType.set(info.eventType, []);
			}
			worstByType.get(info.eventType).push({ 
				sectorIndex, 
				sectorName: info.sectorName, 
				probability: info.probability,
				damagePerInstance: info.damagePerInstance
			});
			damage.worstCase += info.damage;
		}

		for (const [eventType, sectorList] of worstByType) {
			damageInstances.worstCase.push({
				type: eventType,
				count: sectorList.length,
				damagePerInstance: sectorList[0].damagePerInstance,
				totalDamage: sectorList.length * sectorList[0].damagePerInstance,
				sources: sectorList.map(s => ({ sectorName: s.sectorName, probability: s.probability }))
			});
		}

		return { damage, damageInstances };
	},

	/**
	 * Calculates occurrence counts for each event type (for Event Risks display).
	 * @deprecated Use OccurrenceCalculator.calculateForType directly
	 * @private
	 */
	_calculateOccurrences(sectors, loadout) {
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5'];
		const occurrence = {};

		for (const eventType of eventTypes) {
			const result = OccurrenceCalculator.calculateForType(sectors, loadout, eventType);
			occurrence[eventType] = result.occurrence;
		}

		return occurrence;
	},

	/**
	 * Calculates occurrence counts for each event type with source tracking.
	 * Delegates to OccurrenceCalculator (shared with FightCalculator).
	 * @deprecated Use OccurrenceCalculator.calculateForType directly
	 * @private
	 */
	_calculateOccurrencesWithSources(sectors, loadout, sectorProbabilities = null) {
		const eventTypes = ['TIRED_2', 'ACCIDENT_3_5', 'ACCIDENT_ROPE_3_5', 'DISASTER_3_5'];
		const result = {};

		for (const eventType of eventTypes) {
			result[eventType] = OccurrenceCalculator.calculateForType(sectors, loadout, eventType, sectorProbabilities);
		}

		return result;
	},

	/**
	 * Calculates occurrence for a specific event type with source tracking.
	 * Delegates to OccurrenceCalculator.
	 * @deprecated Use OccurrenceCalculator.calculateForType directly
	 * @private
	 */
	_calculateEventOccurrenceWithSources(sectors, loadout, eventType, sectorProbabilities = null) {
		return OccurrenceCalculator.calculateForType(sectors, loadout, eventType, sectorProbabilities);
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
	 * @deprecated Use OccurrenceCalculator.calculateForType directly
	 * @private
	 */
	_calculateEventOccurrence(sectors, loadout, eventType) {
		return OccurrenceCalculator.calculateForType(sectors, loadout, eventType).occurrence;
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
