/**
 * EventWeightCalculator
 * 
 * BACKEND: Pure calculation service for event probabilities.
 * Returns DATA STRUCTURES only - NO HTML generation.
 * 
 * @module probability/EventWeightCalculator
 */
const EventWeightCalculator = {

	// ========================================
	// Core Probability Methods
	// ========================================

	/**
	 * Calculates normalized probabilities for all events in a sector.
	 * 
	 * @param {Object} sectorConfig - Sector configuration from PlanetSectorConfigData
	 * @returns {Map<string, number>} Map of event names to probabilities (sum = 1.0)
	 */
	calculateProbabilities(sectorConfig) {
		if (!sectorConfig || !sectorConfig.explorationEvents) {
			return new Map();
		}

		const events = sectorConfig.explorationEvents;
		const totalWeight = this._getTotalWeight(events);
		
		if (totalWeight === 0) {
			return new Map();
		}

		const probabilities = new Map();
		for (const [eventName, weight] of Object.entries(events)) {
			probabilities.set(eventName, weight / totalWeight);
		}

		return probabilities;
	},

	/**
	 * Gets sector configuration by name.
	 * 
	 * @param {string} sectorName - Name of the sector
	 * @returns {Object|null} Sector configuration or null
	 */
	getSectorConfig(sectorName) {
		if (typeof PlanetSectorConfigData === 'undefined') {
			return null;
		}
		return PlanetSectorConfigData.find(s => s.sectorName === sectorName) || null;
	},

	/**
	 * Gets probabilities for a sector with modifiers applied.
	 * 
	 * @param {string} sectorName - Sector name
	 * @param {Object} loadout - Player loadout { abilities: [], items: [], projects: [] }
	 * @returns {Map<string, number>} Probabilities map
	 */
	getModifiedProbabilities(sectorName, loadout = {}) {
		const config = this.getSectorConfig(sectorName);
		if (!config) {
			return new Map();
		}

		if (typeof ModifierApplicator !== 'undefined' && Object.keys(loadout).length > 0) {
			const modifiedConfig = ModifierApplicator.apply(config, sectorName, loadout);
			return this.calculateProbabilities(modifiedConfig);
		}

		return this.calculateProbabilities(config);
	},

	// ========================================
	// Main Calculation Method
	// ========================================

	/**
	 * Main calculation method - returns complete results data structure.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - Combined loadout { abilities: [], items: [], projects: [] }
	 * @param {Array<Object>} players - Optional: raw player data for resource modifier counting
	 * @returns {Object} Complete results data structure
	 */
	calculate(sectors, loadout = {}, players = []) {
		if (!sectors || sectors.length === 0) {
			return null;
		}

		// Build sector counts
		const sectorCounts = {};
		for (const sector of sectors) {
			sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
		}

		// OPTIMIZATION: Precompute all sector probabilities ONCE
		// This map is passed to all sub-calculators to avoid redundant recalculation
		const sectorProbabilities = this._precomputeSectorProbabilities(sectors, loadout);

		// Calculate resources using ResourceCalculator (convolution-based)
		const resources = ResourceCalculator.calculate(sectors, loadout, players, sectorProbabilities);

		// Calculate negative events using NegativeEventCalculator (convolution-based)
		const negativeEvents = NegativeEventCalculator.calculate(sectors, loadout, sectorProbabilities);

		// Use DamageComparator to determine which sectors should have fight vs event damage
		// for worst case calculations (mutual exclusivity)
		let fightExclusions = null;  // Sectors where event damage "wins" (exclude from fight worst case)
		let eventExclusions = null;  // Sectors where fight damage "wins" (exclude from event worst case)
		
		if (typeof DamageComparator !== 'undefined' && typeof FightingPowerService !== 'undefined') {
			const playerCount = players.length;
			const fightingPower = FightingPowerService.calculateBaseFightingPower(players);
			const grenadeCount = FightingPowerService.countGrenades(players);
			
			const evaluation = DamageComparator.evaluateExpedition(
				sectors, loadout, playerCount, fightingPower, grenadeCount, sectorProbabilities
			);
			
			fightExclusions = new Set();
			eventExclusions = new Set();
			
			for (const [sectorName, result] of evaluation.sectorResults) {
				if (result.worstEvent) {
					if (result.eventType === 'event') {
						// Event damage wins - exclude this sector from fight worst case
						fightExclusions.add(sectorName);
					} else if (result.eventType === 'fight') {
						// Fight damage wins - exclude this sector from event worst case
						eventExclusions.add(sectorName);
					}
				}
			}
		}

		// Calculate fights using FightCalculator (convolution-based)
		const combat = FightCalculator.calculate(sectors, loadout, players, fightExclusions, sectorProbabilities);

		// Calculate event damage using EventDamageCalculator (convolution-based)
		const eventDamage = EventDamageCalculator.calculate(sectors, loadout, players, eventExclusions, sectorProbabilities);

		// Build sector breakdown (reuse precomputed probabilities)
		const sectorBreakdown = this._buildSectorBreakdownFromCache(sectorCounts, sectorProbabilities);

		return {
			resources: resources,
			combat: combat,  // Full fight data with occurrence + damage
			eventDamage: eventDamage,  // Full event damage data with occurrence + scenarios
			negativeEvents: negativeEvents,  // Convolution-based pessimist/average/optimist per event type
			sectorBreakdown: sectorBreakdown
		};
	},

	// ========================================
	// Private Helper Methods
	// ========================================

	/**
	 * Precomputes sector probabilities for all unique sectors.
	 * This is called ONCE at the start of calculate() and the result is passed
	 * to all sub-calculators to avoid redundant recalculation.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - Player loadout
	 * @returns {Map<string, Map<string, number>>} sectorName → (eventName → probability)
	 * @private
	 */
	_precomputeSectorProbabilities(sectors, loadout) {
		const cache = new Map();
		const uniqueSectors = [...new Set(sectors)];
		
		for (const sectorName of uniqueSectors) {
			cache.set(sectorName, this.getModifiedProbabilities(sectorName, loadout));
		}
		
		return cache;
	},

	/**
	 * Gets probabilities for a sector, using cache if available.
	 * This is the preferred method for sub-calculators to use.
	 * 
	 * @param {string} sectorName - Sector name
	 * @param {Object} loadout - Player loadout (used only if cache miss)
	 * @param {Map} sectorProbabilities - Precomputed cache (optional)
	 * @returns {Map<string, number>} eventName → probability
	 */
	getSectorProbabilities(sectorName, loadout, sectorProbabilities = null) {
		if (sectorProbabilities && sectorProbabilities.has(sectorName)) {
			return sectorProbabilities.get(sectorName);
		}
		return this.getModifiedProbabilities(sectorName, loadout);
	},

	/**
	 * @private
	 */
	_getTotalWeight(events) {
		return Object.values(events).reduce((sum, weight) => sum + weight, 0);
	},

	/**
	 * @private - Builds sector breakdown with event probabilities (using cache)
	 */
	_buildSectorBreakdownFromCache(sectorCounts, sectorProbabilities) {
		const breakdown = {};

		for (const [sectorName, count] of Object.entries(sectorCounts)) {
			const probs = sectorProbabilities.get(sectorName);
			const events = {};
			
			if (probs) {
				for (const [eventName, prob] of probs) {
					events[eventName] = prob;
				}
			}

			breakdown[sectorName] = {
				count: count,
				events: events
			};
		}

		return breakdown;
	},

	/**
	 * @private - Builds sector breakdown with event probabilities (legacy, no cache)
	 */
	_buildSectorBreakdown(sectorCounts, loadout) {
		const breakdown = {};

		for (const [sectorName, count] of Object.entries(sectorCounts)) {
			const probs = this.getModifiedProbabilities(sectorName, loadout);
			const events = {};
			
			for (const [eventName, prob] of probs) {
				events[eventName] = prob;
			}

			breakdown[sectorName] = {
				count: count,
				events: events
			};
		}

		return breakdown;
	}
};

// Export
if (typeof window !== 'undefined') {
	window.EventWeightCalculator = EventWeightCalculator;
}
