/**
 * ModifierApplicator
 * 
 * Orchestrates applying all ability, item, and project modifiers
 * to a sector's event configuration.
 * 
 * @module probability/ModifierApplicator
 */
const ModifierApplicator = {

	/**
	 * Applies all relevant modifiers to a sector config based on player loadout.
	 * 
	 * @param {Object} sectorConfig - Original sector config from PlanetSectorConfigData
	 * @param {string} sectorName - The sector name (e.g., 'LANDING', 'INTELLIGENT')
	 * @param {Object} loadout - Player loadout { abilities: [], items: [], projects: [] }
	 * @returns {Object} Modified sector config (cloned, original unchanged)
	 */
	apply(sectorConfig, sectorName, loadout) {
		const config = EventModifier.cloneSectorConfig(sectorConfig);
		
		this._applyAbilities(config.explorationEvents, sectorName, loadout.abilities || []);
		this._applyItems(config.explorationEvents, sectorName, loadout.items || []);
		this._applyProjects(config.explorationEvents, sectorName, loadout.projects || []);
		
		return config;
	},

	/**
	 * Applies ability modifiers.
	 */
	_applyAbilities(events, sectorName, abilities) {
		const abilityMap = {
			'PILOT': AbilityModifiers.applyPilot,
			'DIPLOMACY': AbilityModifiers.applyDiplomacy,
			'TRACKER': AbilityModifiers.applyTracker
		};
		this._applyModifiers(events, sectorName, abilities, abilityMap);
	},

	/**
	 * Applies item modifiers.
	 */
	_applyItems(events, sectorName, items) {
		const itemMap = {
			'WHITE_FLAG': ItemModifiers.applyWhiteFlag,
			'QUAD_COMPASS': ItemModifiers.applyQuadCompass
		};
		this._applyModifiers(events, sectorName, items, itemMap);
	},

	/**
	 * Applies project modifiers.
	 */
	_applyProjects(events, sectorName, projects) {
		const projectMap = {
			'ANTIGRAV_PROPELLER': ProjectModifiers.applyAntigravPropeller
		};
		this._applyModifiers(events, sectorName, projects, projectMap);
	},

	/**
	 * Generic modifier application helper.
	 */
	_applyModifiers(events, sectorName, activeKeys, modifierMap) {
		for (const key of activeKeys) {
			const modifier = modifierMap[key];
			if (modifier) {
				modifier(events, sectorName);
			}
		}
	}
};

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ModifierApplicator = ModifierApplicator;
}
