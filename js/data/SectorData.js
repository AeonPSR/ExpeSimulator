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
		if (typeof PlanetSectorConfigData === 'undefined') {
			console.warn('SectorData: PlanetSectorConfigData is not loaded. Ensure config.js is loaded before SectorData.js.');
			return [];
		}
		return PlanetSectorConfigData.map(sector => ({
			sectorName: sector.sectorName,
			maxPerPlanet: sector.maxPerPlanet,
			weightAtPlanetGeneration: sector.weightAtPlanetGeneration
		}));
	},

	/**
	 * Sectors that have fight events — derived from PlanetSectorConfigData.
	 * Falls back to a static list if PlanetSectorConfigData is unavailable.
	 */
	get sectorsWithFight() {
		if (typeof PlanetSectorConfigData === 'undefined') {
			console.warn('SectorData: PlanetSectorConfigData is not loaded. Ensure config.js is loaded before SectorData.js.');
			return [];
		}
		const set = new Set();
		for (const sector of PlanetSectorConfigData) {
			const events = sector.explorationEvents || {};
			for (const key of Object.keys(events)) {
				if (key.startsWith('FIGHT_')) {
					set.add(sector.sectorName);
					break;
				}
			}
		}
		return [...set];
	},

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
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.SectorData = SectorData;
