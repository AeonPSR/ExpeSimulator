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
	 * Maps each sector ID to its in-game chat icon code.
	 * Used when exporting a planet summary to clipboard.
	 */
	SECTOR_ICONS: {
		'CAVE':               ':as_cave:',
		'COLD':               ':as_cold:',
		'CRISTAL_FIELD':      ':as_cristalite:',
		'DESERT':             ':as_desert:',
		'FOREST':             ':as_forest:',
		'HYDROCARBON':        ':as_fuel:',
		'HOT':                ':as_hot:',
		'INSECT':             ':as_insect:',
		'INTELLIGENT':        ':as_intelligent:',
		'LOST':               ':as_lost:',
		'MANKAROG':           ':as_mankarog:',
		'MOUNTAIN':           ':as_mountain:',
		'OCEAN':              ':as_ocean:',
		'FRUIT_TREES':        ':as_orchard:',
		'OXYGEN':             ':as_oxygen:',
		'PREDATOR':           ':as_predator:',
		'RUINS':              ':as_ruins:',
		'RUMINANT':           ':as_ruminant:',
		'SEISMIC_ACTIVITY':   ':as_seismic:',
		'SWAMP':              ':as_swamp:',
		'UNKNOWN':            ':as_unknown:',
		'VOLCANIC_ACTIVITY':  ':as_volcano:',
		'STRONG_WIND':        ':as_wind:',
		'WRECK':              ':as_wreck:',
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
