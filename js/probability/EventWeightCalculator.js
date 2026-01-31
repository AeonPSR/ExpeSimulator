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

		// Calculate resources using ResourceCalculator (with binomial distribution)
		const resources = typeof ResourceCalculator !== 'undefined'
			? ResourceCalculator.calculate(sectors, loadout, players)
			: this._legacyResourceCalculation(sectors, loadout);

		// Aggregate non-resource events
		const aggregated = this._aggregateEvents(sectors, loadout);

		// Build sector breakdown
		const sectorBreakdown = this._buildSectorBreakdown(sectorCounts, loadout);

		return {
			resources: resources,
			fights: aggregated.fights,
			eventDamage: {
				tired: aggregated.tired,
				accident: aggregated.accident,
				disaster: aggregated.disaster
			},
			negativeEvents: {
				disease: aggregated.disease,
				playerLost: aggregated.playerLost,
				again: aggregated.again,
				itemLost: aggregated.itemLost,
				killAll: aggregated.killAll,
				killOne: aggregated.killOne,
				mushTrap: aggregated.mushTrap,
				nothing: aggregated.nothing
			},
			sectorBreakdown: sectorBreakdown
		};
	},

	/**
	 * Legacy resource calculation (fallback if ResourceCalculator not loaded).
	 * @private
	 */
	_legacyResourceCalculation(sectors, loadout) {
		const zero = { pessimist: 0, average: 0, optimist: 0 };
		const result = {
			fruits: { ...zero },
			steaks: { ...zero },
			fuel: { ...zero },
			oxygen: { ...zero },
			artefacts: { ...zero },
			mapFragments: { ...zero }
		};

		for (const sectorName of sectors) {
			const probs = this.getModifiedProbabilities(sectorName, loadout);
			for (const [eventName, prob] of probs) {
				if (eventName.startsWith('HARVEST_')) {
					result.fruits.average += prob * (parseInt(eventName.split('_')[1]) || 1);
				} else if (eventName.startsWith('PROVISION_')) {
					result.steaks.average += prob * (parseInt(eventName.split('_')[1]) || 1);
				} else if (eventName.startsWith('FUEL_')) {
					result.fuel.average += prob * (parseInt(eventName.split('_')[1]) || 1);
				} else if (eventName.startsWith('OXYGEN_')) {
					result.oxygen.average += prob * (parseInt(eventName.split('_')[1]) || 1);
				} else if (eventName === 'ARTEFACT') {
					result.artefacts.average += prob * (8/9);
					result.mapFragments.average += prob * (1/9);
				} else if (eventName === 'STARMAP') {
					result.mapFragments.average += prob;
				}
			}
		}

		return result;
	},

	// ========================================
	// Private Helper Methods
	// ========================================

	/**
	 * @private
	 */
	_getTotalWeight(events) {
		return Object.values(events).reduce((sum, weight) => sum + weight, 0);
	},

	/**
	 * @private - Aggregates non-resource events across all sectors
	 */
	_aggregateEvents(sectors, loadout) {
		const result = {
			fights: {},
			tired: 0, accident: 0, disaster: 0,
			disease: 0, playerLost: 0, again: 0, itemLost: 0,
			killAll: 0, killOne: 0, mushTrap: 0, nothing: 0
		};

		for (const sectorName of sectors) {
			const probs = this.getModifiedProbabilities(sectorName, loadout);
			
			for (const [eventName, prob] of probs) {
				this._categorizeEvent(eventName, prob, result);
			}
		}

		return result;
	},

	/**
	 * @private - Categorizes a single event into the result structure
	 */
	_categorizeEvent(eventName, prob, result) {
		// Combat
		if (eventName.startsWith('FIGHT_')) {
			const fightType = eventName.replace('FIGHT_', '');
			result.fights[fightType] = (result.fights[fightType] || 0) + prob;
		}
		// Damage events
		else if (eventName.startsWith('TIRED_')) {
			result.tired += prob;
		} else if (eventName.startsWith('ACCIDENT_')) {
			result.accident += prob;
		} else if (eventName.startsWith('DISASTER_')) {
			result.disaster += prob;
		}
		// Negative events
		else if (eventName === 'DISEASE') {
			result.disease += prob;
		} else if (eventName === 'PLAYER_LOST') {
			result.playerLost += prob;
		} else if (eventName === 'AGAIN') {
			result.again += prob;
		} else if (eventName === 'ITEM_LOST') {
			result.itemLost += prob;
		} else if (eventName === 'KILL_ALL') {
			result.killAll += prob;
		} else if (eventName === 'KILL_RANDOM') {
			result.killOne += prob;
		} else if (eventName === 'MUSH_TRAP') {
			result.mushTrap += prob;
		} else if (eventName === 'NOTHING_TO_REPORT') {
			result.nothing += prob;
		}
		// Note: Resource events (HARVEST_, PROVISION_, FUEL_, OXYGEN_, ARTEFACT, STARMAP)
		// are handled by ResourceCalculator
	},

	/**
	 * @private - Builds sector breakdown with event probabilities
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
