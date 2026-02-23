/**
 * EventModifier
 * 
 * Core utility functions for modifying sector event weights.
 * Pure functions - no side effects, operates on copies of data.
 * 
 * @module probability/EventModifier
 */
const EventModifier = {

	/**
	 * Deep clones a sector config to avoid mutating original data.
	 * 
	 * @param {Object} sectorConfig - Original sector configuration
	 * @returns {Object} Deep copy of the sector config
	 */
	cloneSectorConfig(sectorConfig) {
		return JSON.parse(JSON.stringify(sectorConfig));
	},

	/**
	 * Removes specific events from a sector's exploration events.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {Array<string>} eventsToRemove - Event names to remove
	 * @returns {Object} The modified events object
	 */
	removeEvents(events, eventsToRemove) {
		for (const eventName of eventsToRemove) {
			delete events[eventName];
		}
		return events;
	},

	/**
	 * Removes all events matching a prefix (e.g., 'FIGHT_').
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} prefix - The prefix to match (e.g., 'FIGHT_')
	 * @returns {Object} The modified events object
	 */
	removeEventsByPrefix(events, prefix) {
		const toRemove = Object.keys(events).filter(e => e.startsWith(prefix));
		return this.removeEvents(events, toRemove);
	},

	/**
	 * Multiplies the weight of a specific event.
	 * 
	 * @param {Object} events - The explorationEvents object (will be mutated)
	 * @param {string} eventName - The event to modify
	 * @param {number} multiplier - The multiplier to apply
	 * @returns {Object} The modified events object
	 */
	multiplyEventWeight(events, eventName, multiplier) {
		if (events[eventName] !== undefined) {
			events[eventName] *= multiplier;
		}
		return events;
	}
};

// Export for use in other modules
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.EventModifier = EventModifier;
