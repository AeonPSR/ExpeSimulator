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
			displayName: 'Fatigue',
			cssClass: 'neutral',
			// Damage distribution: 100% chance of 2 damage
			getDamageDistribution: (playerCount) => new Map([[2 * playerCount, 1]])
		},
		'ACCIDENT_3_5': { 
			min: 3, max: 5, average: 4,
			affectsAll: false,  // Only affects one player
			displayName: 'Accident',
			cssClass: 'warning',
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
			displayName: 'Accident (rope)',
			cssClass: 'warning',
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
			displayName: 'Disaster',
			cssClass: 'danger',
			// Damage distribution: equal chance of 3, 4, or 5 damage × playerCount
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
		const eventTypes = Object.keys(this.EVENT_DAMAGES);
		const occurrenceWithSources = {};
		for (const eventType of eventTypes) {
			occurrenceWithSources[eventType] = OccurrenceCalculator.calculateForType(sectors, loadout, eventType, sectorProbabilities);
		}

		// Reference to this for closures
		const self = this;

		// Build full damage distribution via shared engine
		const { damage: damageResult, damageInstances, damageDistribution, sampledPaths } = DamageDistributionEngine.calculate({
			sectors,
			loadout,
			sectorProbabilities,
			worstCaseExclusions,
			getSectorDamageDist: (sectorName, probs) => {
				const dist = new Map();
				let totalProb = 0;
				for (const eventType of eventTypes) {
					const eventProb = probs.get(eventType) || 0;
					if (eventProb <= 0) continue;
					totalProb += eventProb;
					const eventInfo = self.EVENT_DAMAGES[eventType];
					if (!eventInfo || !eventInfo.getDamageDistribution) continue;
					const damageDist = eventInfo.getDamageDistribution(playerCount);
					for (const [damageVal, damageProb] of damageDist) {
						dist.set(damageVal, (dist.get(damageVal) || 0) + eventProb * damageProb);
					}
				}
				return { dist, totalProb };
			},
			// Detailed outcomes for path sampling - includes event types
			getDetailedSectorOutcomes: (sectorName, probs) => {
				const outcomes = [];
				let totalProb = 0;
				for (const eventType of eventTypes) {
					const eventProb = probs.get(eventType) || 0;
					if (eventProb <= 0) continue;
					totalProb += eventProb;
					const eventInfo = self.EVENT_DAMAGES[eventType];
					if (!eventInfo || !eventInfo.getDamageDistribution) continue;
					const damageDist = eventInfo.getDamageDistribution(playerCount);
					for (const [damageVal, damageProb] of damageDist) {
						outcomes.push({
							eventType: eventType,
							damage: damageVal,
							probability: eventProb * damageProb
						});
					}
				}
				// Add "no event" case
				const noEventProb = Math.max(0, 1 - totalProb);
				if (noEventProb > 0.0001) {
					outcomes.push({ eventType: null, damage: 0, probability: noEventProb });
				}
				return outcomes;
			},
			logLabel: 'EventDamage'
		});

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
			sampledPaths,  // Sampled explaining paths for each scenario
			playerCount,
			// Legacy format for backward compatibility
			// Combine both accident types for display
			tired: occurrence.TIRED_2?.average || 0,
			accident: (occurrence.ACCIDENT_3_5?.average || 0) + (occurrence.ACCIDENT_ROPE_3_5?.average || 0),
			disaster: occurrence.DISASTER_3_5?.average || 0,
			worstCaseExclusions: worstCaseExclusions ? Array.from(worstCaseExclusions) : []
		};
	},

	/**
	 * Returns empty result structure.
	 * @private
	 */
	_emptyResult() {
		return {
			occurrence: {},
			damage: DamageDistributionEngine.emptyDamageResult(),
			damageInstances: DamageDistributionEngine.emptyDamageInstances(),
			playerCount: 0,
			tired: 0,
			accident: 0,
			disaster: 0
		};
	}
};

// Export
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.EventDamageCalculator = EventDamageCalculator;
