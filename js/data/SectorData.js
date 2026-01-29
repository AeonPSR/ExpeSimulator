/**
 * Static Data: Sectors
 * 
 * Sector configurations for the expedition simulator.
 * This is a placeholder - in production, this would come from PlanetSectorConfigData.
 */
const SectorData = {
	/**
	 * List of all available sectors
	 */
	sectors: [
		{ sectorName: 'CAVE' },
		{ sectorName: 'MOUNTAIN' },
		{ sectorName: 'FOREST' },
		{ sectorName: 'DESERT' },
		{ sectorName: 'OCEAN' },
		{ sectorName: 'SWAMP' },
		{ sectorName: 'RUINS' },
		{ sectorName: 'WRECK' },
		{ sectorName: 'CRISTAL_FIELD' },
		{ sectorName: 'FRUIT_TREES' },
		{ sectorName: 'RUMINANT' },
		{ sectorName: 'PREDATOR' },
		{ sectorName: 'INTELLIGENT' },
		{ sectorName: 'INSECT' },
		{ sectorName: 'MANKAROG' },
		{ sectorName: 'SEISMIC_ACTIVITY' },
		{ sectorName: 'VOLCANIC_ACTIVITY' },
		{ sectorName: 'COLD' },
		{ sectorName: 'HOT' },
		{ sectorName: 'STRONG_WIND' },
		{ sectorName: 'OXYGEN' },
		{ sectorName: 'HYDROCARBON' },
		{ sectorName: 'LANDING' },
		{ sectorName: 'LOST' }
	],

	/**
	 * Sectors that have fight events
	 */
	sectorsWithFight: [
		'RUINS', 'WRECK', 'CRISTAL_FIELD', 'RUMINANT',
		'PREDATOR', 'INTELLIGENT', 'INSECT', 'MANKAROG'
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
	}
};

// Export
if (typeof window !== 'undefined') {
	window.SectorData = SectorData;
}
