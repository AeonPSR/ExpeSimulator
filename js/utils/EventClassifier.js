/**
 * EventClassifier — Shared event classification utility
 * 
 * Single source of truth for categorizing event names into
 * semantic categories and CSS color classes.
 * Used by both EventWeightCalculator (backend) and ProbabilityDisplay (frontend).
 */
const EventClassifier = {

	/**
	 * Classifies an event name into a category and CSS class.
	 * @param {string} eventName - The event identifier (e.g. 'FIGHT_12', 'ACCIDENT_3_5')
	 * @returns {{ category: string, cssClass: string }}
	 */
	classify(eventName) {
		// Combat
		if (eventName.startsWith('FIGHT_')) {
			return { category: 'fight', cssClass: 'danger' };
		}

		// Damage events
		if (eventName.startsWith('TIRED_')) {
			return { category: 'tired', cssClass: 'warning' };
		}
		if (eventName.startsWith('ACCIDENT_')) {
			return { category: 'accident', cssClass: 'warning' };
		}
		if (eventName.startsWith('DISASTER_')) {
			return { category: 'disaster', cssClass: 'danger' };
		}

		// Lethal events
		if (eventName === 'KILL_ALL') {
			return { category: 'killAll', cssClass: 'danger' };
		}
		if (eventName === 'KILL_RANDOM' || eventName === 'KILL_LOST') {
			return { category: 'killOne', cssClass: 'danger' };
		}

		// Negative events
		if (eventName === 'DISEASE') {
			return { category: 'disease', cssClass: 'warning' };
		}
		if (eventName === 'PLAYER_LOST') {
			return { category: 'playerLost', cssClass: 'danger' };
		}
		if (eventName === 'ITEM_LOST') {
			return { category: 'itemLost', cssClass: 'warning' };
		}
		if (eventName === 'MUSH_TRAP') {
			return { category: 'mushTrap', cssClass: 'danger' };
		}

		// Neutral events
		if (eventName === 'AGAIN') {
			return { category: 'again', cssClass: 'neutral' };
		}
		if (eventName === 'NOTHING_TO_REPORT') {
			return { category: 'nothing', cssClass: 'neutral' };
		}

		// Resource events
		if (eventName.startsWith('HARVEST_') || eventName.startsWith('PROVISION_') ||
			eventName.startsWith('FUEL_') || eventName.startsWith('OXYGEN_') ||
			eventName === 'ARTEFACT' || eventName === 'STARMAP' || eventName === 'FIND_LOST') {
			return { category: 'resource', cssClass: 'positive' };
		}

		// Misc
		if (eventName === 'BACK') {
			return { category: 'back', cssClass: 'neutral' };
		}

		return { category: 'unknown', cssClass: 'neutral' };
	},

	/**
	 * Convenience: returns just the CSS class for an event name.
	 * @param {string} eventName
	 * @returns {string}
	 */
	getCssClass(eventName) {
		return this.classify(eventName).cssClass;
	},

	/**
	 * Convenience: returns just the category for an event name.
	 * @param {string} eventName
	 * @returns {string}
	 */
	getCategory(eventName) {
		return this.classify(eventName).category;
	}
};

// Export
if (typeof window !== 'undefined') {
	window.EventClassifier = EventClassifier;
}
