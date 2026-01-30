/**
 * Static Data: Sectors
 * 
 * Sector configurations for the expedition simulator.
 * This is a placeholder - in production, this would come from PlanetSectorConfigData.
 */
const SectorData = {
	/**
	 * List of all available sectors with their configuration
	 * Pulled from PlanetSectorConfigData
	 */
	get sectors() {
		if (typeof PlanetSectorConfigData !== 'undefined') {
			return PlanetSectorConfigData.map(sector => ({
				sectorName: sector.sectorName,
				maxPerPlanet: sector.maxPerPlanet,
				weightAtPlanetGeneration: sector.weightAtPlanetGeneration
			}));
		}
		// Fallback data if config not loaded
		return [
			{ sectorName: 'CAVE', maxPerPlanet: 4, weightAtPlanetGeneration: 4 },
			{ sectorName: 'MOUNTAIN', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'FOREST', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'DESERT', maxPerPlanet: 4, weightAtPlanetGeneration: 12 },
			{ sectorName: 'OCEAN', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'SWAMP', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'RUINS', maxPerPlanet: 4, weightAtPlanetGeneration: 2 },
			{ sectorName: 'WRECK', maxPerPlanet: 4, weightAtPlanetGeneration: 2 },
			{ sectorName: 'CRISTAL_FIELD', maxPerPlanet: 1, weightAtPlanetGeneration: 2 },
			{ sectorName: 'FRUIT_TREES', maxPerPlanet: 4, weightAtPlanetGeneration: 3 },
			{ sectorName: 'RUMINANT', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'PREDATOR', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'INTELLIGENT', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'INSECT', maxPerPlanet: 4, weightAtPlanetGeneration: 10 },
			{ sectorName: 'MANKAROG', maxPerPlanet: 1, weightAtPlanetGeneration: 2 },
			{ sectorName: 'SEISMIC_ACTIVITY', maxPerPlanet: 4, weightAtPlanetGeneration: 3 },
			{ sectorName: 'VOLCANIC_ACTIVITY', maxPerPlanet: 4, weightAtPlanetGeneration: 3 },
			{ sectorName: 'COLD', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'HOT', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'STRONG_WIND', maxPerPlanet: 4, weightAtPlanetGeneration: 8 },
			{ sectorName: 'OXYGEN', maxPerPlanet: 1, weightAtPlanetGeneration: 8 },
			{ sectorName: 'HYDROCARBON', maxPerPlanet: 2, weightAtPlanetGeneration: 5 },
			{ sectorName: 'LANDING', maxPerPlanet: 1, weightAtPlanetGeneration: 0 },
			{ sectorName: 'LOST', maxPerPlanet: 15, weightAtPlanetGeneration: 0 }
		];
	},

	/**
	 * Sectors that have fight events
	 */
	sectorsWithFight: [
		'RUINS', 'WRECK', 'CRISTAL_FIELD', 'RUMINANT',
		'PREDATOR', 'INTELLIGENT', 'INSECT', 'MANKAROG'
	],

	/**
	 * Special sectors that don't count towards the 20 sector limit
	 */
	specialSectors: [
		'LANDING', 'LOST'
	],

	/**
	 * Gets unique sector names
	 * @returns {Array<string>}
	 */
	getUniqueSectorNames() {
		return [...new Set(this.sectors.map(s => s.sectorName))];
	},

	/**
	 * Checks if a sector has fight events
	 * @param {string} sectorName
	 * @returns {boolean}
	 */
	hasFightEvents(sectorName) {
		return this.sectorsWithFight.includes(sectorName);
	},

	/**
	 * Gets the maximum number of times a sector can appear on a planet
	 * @param {string} sectorName
	 * @returns {number}
	 */
	getMaxPerPlanet(sectorName) {
		const sector = this.sectors.find(s => s.sectorName === sectorName);
		return sector ? sector.maxPerPlanet : 4; // Default to 4 if not found
	},

	/**
	 * Gets full sector configuration by name
	 * @param {string} sectorName
	 * @returns {Object|null}
	 */
	getSectorConfig(sectorName) {
		return this.sectors.find(s => s.sectorName === sectorName) || null;
	},

	/**
	 * Checks if a sector is special (doesn't count towards the 20 sector limit)
	 * @param {string} sectorName
	 * @returns {boolean}
	 */
	isSpecialSector(sectorName) {
		return this.specialSectors.includes(sectorName);
	}
};

// Export
if (typeof window !== 'undefined') {
	window.SectorData = SectorData;
}
