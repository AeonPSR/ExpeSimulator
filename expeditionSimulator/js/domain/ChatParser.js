/**
 * ChatParser
 *
 * Pure domain module: sector name data tables and text-based parsing
 * of expedition chat messages. No DOM, no side effects.
 *
 * Consumed by:
 *   - js/io/ChatObserver.js   (passes DOM text/icon data in)
 *   - js/io/PlanetCardInjector.js (uses SECTOR_NAME_TO_ID / DIRECTION_NORMALIZE)
 */

const SECTOR_NAMES_EN = [
	'Landing', 'Hydrocarbon Deposits', 'Oxygen', 'Insects', 'Mankarogs', 'MIA', 'Predators', 'Ruminants', 'Intelligent Life', 'Cristalite', 'Desert', 'Shipwreck', 'Forest', 'Orchard', 'Caverns', 'Swamps', 'Mountains', 'Oceanic', 'Ruins', 'Siesmic Activity', 'Low Temperatures', 'High Temperatures', 'Strong Winds', 'Volcanoes', '???'
];

const SECTOR_NAMES_FR = [
	'Atterrissage', 'Hydrocarbures', 'Oxygène', 'Insectes', 'Mankarog', 'Perdu', 'Prédateurs', 'Ruminants', 'Vie Intelligente', 'Cristalite', 'Désert', 'Épave', 'Forêt', 'Vergers', 'Grottes', 'Marais', 'Montagnes', 'Océan', 'Ruines', 'Sismique', 'Température basse', 'Température élevée', 'Vents forts', 'Volcan', '???'
];

const SECTOR_NAMES_ES = [
	'Aterrizaje', 'Hidrocarburo', 'Oxígeno', 'Insectos', 'Mankarog', 'Extraviados', 'Predador', 'Rumiante', 'Vida inteligente', 'Cristalitas', 'Desierto', 'Restos de nave', 'Jungla', 'Huerta', 'Gruta', 'Pantano', 'Montaña', 'Océano', 'Ruina', 'Sísmico', 'Temperatura baja', 'Temperatura alta', 'Viento fuerte', 'Volcán', '???'
];

const ALL_SECTOR_NAMES = [
	...SECTOR_NAMES_EN,
	...SECTOR_NAMES_FR,
	...SECTOR_NAMES_ES
];

/**
 * Maps every localized sector name to its internal sector ID.
 * All three language arrays follow the same order as this ID list.
 */
const SECTOR_ID_ORDER = [
	'LANDING', 'HYDROCARBON', 'OXYGEN', 'INSECT', 'MANKAROG', 'LOST',
	'PREDATOR', 'RUMINANT', 'INTELLIGENT', 'CRISTAL_FIELD', 'DESERT',
	'WRECK', 'FOREST', 'FRUIT_TREES', 'CAVE', 'SWAMP', 'MOUNTAIN',
	'OCEAN', 'RUINS', 'SEISMIC_ACTIVITY', 'COLD', 'HOT', 'STRONG_WIND',
	'VOLCANIC_ACTIVITY', 'UNKNOWN'
];

/**
 * Builds a lookup map from localized name → sector ID.
 * @returns {Map<string, string>}
 */
function buildSectorNameToIdMap() {
	const map = new Map();
	const langArrays = [SECTOR_NAMES_EN, SECTOR_NAMES_FR, SECTOR_NAMES_ES];
	for (const arr of langArrays) {
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] && SECTOR_ID_ORDER[i]) {
				map.set(arr[i].toLowerCase(), SECTOR_ID_ORDER[i]);
			}
		}
	}
	return map;
}

const SECTOR_NAME_TO_ID = buildSectorNameToIdMap();

// Maps every localised direction word (EN/FR/ES) to its canonical English form.
const DIRECTION_NORMALIZE = {
	'north': 'North', 'nord':  'North', 'norte': 'North',
	'east':  'East',  'est':   'East',  'este':  'East',
	'south': 'South', 'sud':   'South', 'sur':   'South',
	'west':  'West',  'ouest': 'West',  'oeste': 'West',
};

const ChatParser = {

	SECTOR_NAME_TO_ID,
	DIRECTION_NORMALIZE,
	ALL_SECTOR_NAMES,

	/**
	 * Parses sector IDs from a message text and its image alt strings.
	 *
	 * First attempts text-based matching (localized sector names with optional
	 * quantity like "(x2)"), then falls back to icon-based matching
	 * (:as_xxx: image alts from our own export format).
	 *
	 * @param {string}   text     - Full text content of the message
	 * @param {string[]} iconAlts - Alt attributes of all <img> elements in the message
	 * @returns {string[]} Array of sector IDs (repeated for quantities)
	 */
	parseSectors(text, iconAlts) {
		const sectors = [];

		// Sort names by length descending so longer names match first
		// (e.g. "Température élevée" before "Température basse")
		const sortedNames = [...ALL_SECTOR_NAMES]
			.filter(n => n.length > 0)
			.sort((a, b) => b.length - a.length);

		const escapedNames = sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		const regex = new RegExp(`(${escapedNames.join('|')})(?:\\s*\\(x(\\d+)\\))?`, 'gi');

		let match;
		while ((match = regex.exec(text)) !== null) {
			const name = match[1].toLowerCase();
			const quantity = match[2] ? parseInt(match[2], 10) : 1;
			const sectorId = SECTOR_NAME_TO_ID.get(name);
			if (sectorId) {
				for (let i = 0; i < quantity; i++) sectors.push(sectorId);
			}
		}

		// Fallback: icon-based parsing for our own export format (:as_xxx: images)
		if (sectors.length === 0) {
			const iconToId = ChatParser._getIconToIdMap();
			for (const alt of iconAlts) {
				const id = iconToId.get(alt);
				if (id && id !== 'LANDING') sectors.push(id);
			}
		}

		return sectors;
	},

	/**
	 * Extracts direction and fuel cost from a text fragment preceding a fuel icon.
	 * Matches patterns like "Ouest - 3 " or "North - 5".
	 *
	 * @param {string} text
	 * @returns {{ direction: string, fuel: number }|null}
	 */
	parseNavText(text) {
		const match = text.match(/(\S+)\s*-\s*(\d+)\s*$/);
		if (!match) return null;
		const direction = DIRECTION_NORMALIZE[match[1].toLowerCase()] || match[1];
		return { direction, fuel: parseInt(match[2], 10) };
	},

	/**
	 * Builds (and caches) a reverse map from icon code to sector ID.
	 * e.g. ':as_oxygen:' → 'OXYGEN'
	 * Depends on SectorData being available in the global scope.
	 *
	 * @returns {Map<string, string>}
	 */
	_getIconToIdMap() {
		if (!ChatParser._iconToIdMap) {
			ChatParser._iconToIdMap = new Map(
				Object.entries(SectorData.SECTOR_ICONS).map(([id, icon]) => [icon, id])
			);
		}
		return ChatParser._iconToIdMap;
	},

};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ChatParser = ChatParser;
