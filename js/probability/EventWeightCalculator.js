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
	 * @returns {Object} Complete results data structure
	 */
	calculate(sectors, loadout = {}) {
		if (!sectors || sectors.length === 0) {
			return null;
		}

		// Build sector counts
		const sectorCounts = {};
		for (const sector of sectors) {
			sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
		}

		// Aggregate events across all sectors
		const aggregated = this._aggregateEvents(sectors, loadout);

		// Build sector breakdown
		const sectorBreakdown = this._buildSectorBreakdown(sectorCounts, loadout);

		return {
			resources: {
				fruits: aggregated.fruits,
				steaks: aggregated.steaks,
				fuel: aggregated.fuel,
				oxygen: aggregated.oxygen,
				artefacts: aggregated.artefacts
			},
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
	 * @private - Aggregates events across all sectors
	 */
	_aggregateEvents(sectors, loadout) {
		const result = {
			fruits: 0, steaks: 0, fuel: 0, oxygen: 0, artefacts: 0,
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
		// Resources
		if (eventName.startsWith('HARVEST_')) {
			const amount = parseInt(eventName.split('_')[1]) || 1;
			result.fruits += prob * amount;
		} else if (eventName.startsWith('PROVISION_')) {
			const amount = parseInt(eventName.split('_')[1]) || 1;
			result.steaks += prob * amount;
		} else if (eventName.startsWith('FUEL_')) {
			const amount = parseInt(eventName.split('_')[1]) || 1;
			result.fuel += prob * amount;
		} else if (eventName.startsWith('OXYGEN_')) {
			const amount = parseInt(eventName.split('_')[1]) || 1;
			result.oxygen += prob * amount;
		} else if (eventName === 'ARTEFACT') {
			result.artefacts += prob;
		}
		// Combat
		else if (eventName.startsWith('FIGHT_')) {
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
	},

	// ========================================
	// Test Methods (console output only)
	// ========================================

	/**
	 * Runs tests and outputs to console.
	 */
	runTests() {
		console.log('═══════════════════════════════════════════════════════');
		console.log('EventWeightCalculator - Tests');
		console.log('═══════════════════════════════════════════════════════');

		const testSectors = ['FOREST', 'CAVE', 'RUINS', 'WRECK', 'DESERT'];
		
		for (const sectorName of testSectors) {
			const probs = this.getModifiedProbabilities(sectorName, {});
			console.log(`\n${sectorName} sector probabilities:`);
			let total = 0;
			for (const [event, prob] of probs) {
				console.log(`  ${event}: ${(prob * 100).toFixed(1)}%`);
				total += prob;
			}
			console.log(`  Total: ${total.toFixed(4)} ${Math.abs(total - 1) < 0.0001 ? '✓' : '✗'}`);
		}

		console.log('\n═══════════════════════════════════════════════════════');
	},

	/**
	 * Runs modifier tests.
	 */
	runModifierTests() {
		console.log('═══════════════════════════════════════════════════════');
		console.log('Event Modifier Tests');
		console.log('═══════════════════════════════════════════════════════');

		// Test Pilot
		console.log('\n▶ PILOT (LANDING):');
		const landingOrig = this.getModifiedProbabilities('LANDING', {});
		const landingMod = this.getModifiedProbabilities('LANDING', { abilities: ['PILOT'] });
		console.log('  Original events:', landingOrig.size, '→ Modified:', landingMod.size);

		// Test Diplomacy
		console.log('\n▶ DIPLOMACY (INTELLIGENT):');
		const intOrig = this.getModifiedProbabilities('INTELLIGENT', {});
		const intMod = this.getModifiedProbabilities('INTELLIGENT', { abilities: ['DIPLOMACY'] });
		const origFights = [...intOrig.keys()].filter(k => k.startsWith('FIGHT_'));
		const modFights = [...intMod.keys()].filter(k => k.startsWith('FIGHT_'));
		console.log('  Fights before:', origFights.join(', ') || 'none');
		console.log('  Fights after:', modFights.join(', ') || 'none');

		// Test Tracker
		console.log('\n▶ TRACKER (LOST):');
		const lostOrig = this.getModifiedProbabilities('LOST', {});
		const lostMod = this.getModifiedProbabilities('LOST', { abilities: ['TRACKER'] });
		console.log('  KILL_LOST before:', lostOrig.has('KILL_LOST') ? 'present' : 'absent');
		console.log('  KILL_LOST after:', lostMod.has('KILL_LOST') ? 'present' : 'REMOVED ✓');

		console.log('\n═══════════════════════════════════════════════════════');
	}
};

// Export
if (typeof window !== 'undefined') {
	window.EventWeightCalculator = EventWeightCalculator;
}
