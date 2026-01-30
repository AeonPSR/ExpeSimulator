/**
 * Static Data: World Configurations
 * 
 * Predefined world sector configurations for the expedition simulator.
 */
const WorldData = {
	/**
	 * Gets sector configuration for a predefined world
	 * @param {string} worldName - The name of the world
	 * @returns {Array<string>} Array of sector names
	 */
	getWorldConfiguration(worldName) {
		const configurations = {
			'Rocky World': [
				'LANDING', 'HYDROCARBON', 'CRISTAL_FIELD', 'MOUNTAIN', 'MOUNTAIN'
			],
			
			'Fugubos': [
				'LANDING', 'INSECT', 'FOREST', 'INTELLIGENT', 'INTELLIGENT', 'DESERT', 
				'OXYGEN', 'RUMINANT', 'COLD', 'FRUIT_TREES', 'OCEAN', 'PREDATOR', 'STRONG_WIND'
			],
			
			'Vie Heureuse': [
				'LANDING', 'HYDROCARBON', 'MANKAROG', 'HOT', 'INSECT', 'INTELLIGENT', 'INTELLIGENT',
				'SEISMIC_ACTIVITY', 'STRONG_WIND', 'SWAMP', 'COLD', 'COLD', 'OXYGEN', 'FOREST',
				'DESERT', 'DESERT', 'VOLCANIC_ACTIVITY', 'FOREST', 'RUINS'
			],
			
			',̶ ̶\'̶ ̶,̶ ̶|̶ ̶,̶\'̶_̶\'̶': [
				'LANDING', 'STRONG_WIND', 'STRONG_WIND', 'STRONG_WIND', 'STRONG_WIND',
				'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT',
				'FOREST', 'FOREST', 'FOREST', 'FOREST',
				'COLD', 'COLD', 'COLD', 'COLD',
				'OCEAN', 'OCEAN', 'OCEAN', 'CRISTAL_FIELD'
			],
			
			'Nurgle\'s Throne': [
				'LANDING', 'INSECT', 'INSECT', 'INSECT', 'INSECT',
				'FOREST', 'FOREST', 'FOREST', 'FOREST',
				'SWAMP', 'SWAMP', 'SWAMP', 'SWAMP'
			],
			
			'Thousands Cuts': [
				'LANDING', 'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN',
				'CAVE', 'CAVE', 'CAVE', 'CAVE',
				'RUMINANT', 'RUMINANT', 'RUMINANT', 'RUMINANT',
				'PREDATOR', 'PREDATOR', 'PREDATOR', 'PREDATOR',
				'INSECT', 'INSECT', 'INSECT', 'INSECT'
			],
			
			'Polyphemus': [
				'LANDING', 'SEISMIC_ACTIVITY', 'SEISMIC_ACTIVITY', 'SEISMIC_ACTIVITY', 'SEISMIC_ACTIVITY',
				'VOLCANIC_ACTIVITY', 'VOLCANIC_ACTIVITY', 'VOLCANIC_ACTIVITY', 'VOLCANIC_ACTIVITY',
				'OCEAN', 'OCEAN', 'OCEAN', 'OCEAN', 'MANKAROG', 'RUMINANT', 'RUMINANT', 'CRISTAL_FIELD',
				'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST',
				'LOST', 'LOST', 'LOST', 'LOST', 'LOST'
			],
			
			'Museum': [
				'LANDING', 'CAVE', 'CAVE', 'CAVE', 'CAVE',
				'WRECK', 'WRECK', 'WRECK', 'WRECK',
				'RUINS', 'RUINS', 'RUINS', 'RUINS',
				'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT',
				'MANKAROG', 'CRISTAL_FIELD'
			],
			
			'America\'s Dream': [
				'LANDING', 'HYDROCARBON', 'HYDROCARBON',
				'WRECK', 'WRECK', 'WRECK', 'WRECK',
				'CAVE', 'CAVE', 'CAVE', 'CAVE',
				'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN'
			]
		};
		
		return configurations[worldName] || [];
	},

	/**
	 * Gets all available world names
	 * @returns {Array<string>} Array of world names
	 */
	getAvailableWorlds() {
		return [
			'Rocky World', 'Fugubos', 'Vie Heureuse',
			',̶ ̶\'̶ ̶,̶ ̶|̶ ̶,̶\'̶_̶\'̶', 'Nurgle\'s Throne', 'Thousands Cuts',
			'Polyphemus', 'Museum', 'America\'s Dream'
		];
	}
};

// Export
if (typeof window !== 'undefined') {
	window.WorldData = WorldData;
}