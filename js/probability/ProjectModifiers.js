/**
 * ProjectModifiers
 * 
 * Applies project effects that modify event probabilities.
 * Each project has its own dedicated function.
 * 
 * @module probability/ProjectModifiers
 */
const ProjectModifiers = {

	/**
	 * Applies Antigrav Propeller: Removes damage events from LANDING sector.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} sectorName - Current sector name
	 * @returns {Object} The modified events object
	 */
	applyAntigravPropeller(events, sectorName) {
		if (sectorName !== 'LANDING') {
			return events;
		}
		return EventModifier.removeEvents(events, ['TIRED_2', 'ACCIDENT_3_5', 'DISASTER_3_5']);
	}
};

// Export for use in other modules
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ProjectModifiers = ProjectModifiers;
