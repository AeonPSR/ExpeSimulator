/**
 * AbilityModifiers
 * 
 * Applies ability effects that modify event probabilities.
 * Each ability has its own dedicated function.
 * 
 * @module probability/AbilityModifiers
 */
const AbilityModifiers = {

	/**
	 * Applies Pilot ability: Removes damage events from LANDING sector.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} sectorName - Current sector name
	 * @returns {Object} The modified events object
	 */
	applyPilot(events, sectorName) {
		if (sectorName !== 'LANDING') {
			return events;
		}
		console.log('[AbilityModifiers] Pilot active: removing TIRED_2, ACCIDENT_3_5, DISASTER_3_5 from LANDING');
		return EventModifier.removeEvents(events, ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5']);
	},

	/**
	 * Applies Diplomacy ability: Removes all FIGHT_* events from any sector.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} sectorName - Current sector name (unused, affects all)
	 * @returns {Object} The modified events object
	 */
	applyDiplomacy(events, sectorName) {
		return EventModifier.removeEventsByPrefix(events, 'FIGHT_');
	},

	/**
	 * Applies Tracker ability: Removes KILL_LOST from LOST sector.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} sectorName - Current sector name
	 * @returns {Object} The modified events object
	 */
	applyTracker(events, sectorName) {
		if (sectorName !== 'LOST') {
			return events;
		}
		return EventModifier.removeEvents(events, ['KILL_LOST']);
	}
};

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.AbilityModifiers = AbilityModifiers;
}
