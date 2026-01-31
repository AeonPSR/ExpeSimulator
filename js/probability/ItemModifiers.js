/**
 * ItemModifiers
 * 
 * Applies item effects that modify event probabilities.
 * Each item has its own dedicated function.
 * 
 * @module probability/ItemModifiers
 */
const ItemModifiers = {

	/**
	 * Applies White Flag: Removes FIGHT_* events from INTELLIGENT sector only.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} sectorName - Current sector name
	 * @returns {Object} The modified events object
	 */
	applyWhiteFlag(events, sectorName) {
		if (sectorName !== 'INTELLIGENT') {
			return events;
		}
		return EventModifier.removeEventsByPrefix(events, 'FIGHT_');
	},

	/**
	 * Applies Quad Compass: Removes AGAIN events from any sector.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} sectorName - Current sector name (unused, affects all)
	 * @returns {Object} The modified events object
	 */
	applyQuadCompass(events, sectorName) {
		return EventModifier.removeEventsByPrefix(events, 'AGAIN');
	}
};

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ItemModifiers = ItemModifiers;
}
