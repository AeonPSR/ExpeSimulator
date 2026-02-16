/**
 * ChatMessageDetector Service
 * 
 * Watches the game chat for expedition-related messages.
 * Identifies messages containing both planet and fuel icons
 * and at least one sector name, then adds an import button.
 */

/**
 * Sector names per language.
 * Used to verify a chat message is an expedition log.
 * Populate each array with the sector names as they appear in-game.
 */
const SECTOR_NAMES_EN = [
	'Landing', 'Hydrocarbon Deposits', 'Oxygen', 'Insects', 'Mankarogs', 'MIA', 'Predators', 'Ruminants', 'Intelligent Life', 'Cristalite', 'Desert', 'Shipwreck', 'Forest', 'Orchard', 'Caverns', 'Swamps', 'Mountains', 'Oceanic', 'Ruins', 'Siesmic Activity', 'Low Temperatures', 'High Temperatures', 'Strong Winds', 'Volcanoes'
];

const SECTOR_NAMES_FR = [
	'Atterrissage', 'Hydrocarbures', 'Oxygène', 'Insectes', 'Mankarog', 'Perdu', 'Prédateurs', 'Ruminants', 'Vie Intelligente', 'Cristalite', 'Désert', 'Épave', 'Forêt', 'Vergers', 'Grottes', 'Marais', 'Montagnes', 'Océan', 'Ruines', 'Sismique', 'Température basse', 'Température élevée', 'Vents forts', 'Volcan'
];

const SECTOR_NAMES_ES = [
	'Aterrizaje', 'Hidrocarburo', 'Oxígeno', 'Insectos', 'Mankarog', 'Extraviados', 'Predador', 'Rumiante', 'Vida inteligente', 'Cristalitas', 'Desierto', 'Restos de nave', 'Jungla', 'Huerta', 'Gruta', 'Pantano', 'Montaña', 'Océano', 'Ruina', 'Sísmico', 'Temperatura baja', 'Temperatura alta', 'Viento fuerte', 'Volcán'
];

const ALL_SECTOR_NAMES = [
	...SECTOR_NAMES_EN,
	...SECTOR_NAMES_FR,
	...SECTOR_NAMES_ES
];

/**
 * Maps localized sector names to their internal sector IDs.
 * All three language arrays must follow the same order as this ID list.
 */
const SECTOR_ID_ORDER = [
	'LANDING', 'HYDROCARBON', 'OXYGEN', 'INSECT', 'MANKAROG', 'LOST',
	'PREDATOR', 'RUMINANT', 'INTELLIGENT', 'CRISTAL_FIELD', 'DESERT',
	'WRECK', 'FOREST', 'FRUIT_TREES', 'CAVE', 'SWAMP', 'MOUNTAIN',
	'OCEAN', 'RUINS', 'SEISMIC_ACTIVITY', 'COLD', 'HOT', 'STRONG_WIND',
	'VOLCANIC_ACTIVITY'
];

/**
 * Builds a lookup map from localized name → sector ID
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

class ChatMessageDetector {
	/**
	 * @param {Object} options
	 * @param {Function} [options.onImport] - Callback when sectors are imported: (sectorIds: string[]) => void
	 */
	constructor(options = {}) {
		this._observer = null;
		this._processedMessages = new WeakSet();
		this._onImport = options.onImport || null;
	}

	/**
	 * Starts observing the DOM for chat messages
	 */
	start() {
		// Process any messages already on the page
		this._scanExistingMessages();

		// Watch for new messages being added
		this._observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						this._checkNode(node);
					}
				}
			}
		});

		this._observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	/**
	 * Stops observing the DOM
	 */
	stop() {
		if (this._observer) {
			this._observer.disconnect();
			this._observer = null;
		}
	}

	/**
	 * Scans existing messages already present in the DOM
	 * @private
	 */
	_scanExistingMessages() {
		const messages = document.querySelectorAll('.main-message');
		for (const message of messages) {
			this._processMessage(message);
		}
	}

	/**
	 * Checks if a newly added node is or contains expedition messages
	 * @private
	 * @param {HTMLElement} node
	 */
	_checkNode(node) {
		if (node.classList && node.classList.contains('main-message')) {
			this._processMessage(node);
		}
		// Also check descendants
		const messages = node.querySelectorAll ? node.querySelectorAll('.main-message') : [];
		for (const message of messages) {
			this._processMessage(message);
		}
	}

	/**
	 * Checks if a message is expedition-related and adds the button
	 * @private
	 * @param {HTMLElement} message
	 */
	_processMessage(message) {
		if (this._processedMessages.has(message)) return;
		this._processedMessages.add(message);

		if (!this._isExpeditionMessage(message)) return;

		this._addImportButton(message);
	}

	/**
	 * Determines if a message contains both planet and fuel icons,
	 * and at least one known sector name
	 * @private
	 * @param {HTMLElement} message
	 * @returns {boolean}
	 */
	_isExpeditionMessage(message) {
		const images = message.querySelectorAll('img');
		let hasPlanet = false;
		let hasFuel = false;

		for (const img of images) {
			if (img.alt === ':planet:') hasPlanet = true;
			if (img.alt === ':fuel:') hasFuel = true;
			if (hasPlanet && hasFuel) break;
		}

		if (!hasPlanet || !hasFuel) return false;

		return this._containsSectorName(message);
	}

	/**
	 * Checks if the message text contains any known sector name
	 * @private
	 * @param {HTMLElement} message
	 * @returns {boolean}
	 */
	_containsSectorName(message) {
		const text = message.textContent;
		return ALL_SECTOR_NAMES.some(name => name.length > 0 && text.includes(name));
	}

	/**
	 * Adds an import button to the top-right of the message
	 * @private
	 * @param {HTMLElement} message
	 */
	_addImportButton(message) {
		// Ensure the message is positioned for absolute placement
		const currentPosition = window.getComputedStyle(message).position;
		if (currentPosition === 'static') {
			message.style.position = 'relative';
		}

		const button = document.createElement('button');
		button.className = 'expe-import-btn';
		button.textContent = 'Import';

		button.addEventListener('click', (e) => {
			e.stopPropagation();
			const sectors = this._parseSectorsFromMessage(message);
			if (sectors.length > 0 && this._onImport) {
				this._onImport(sectors);
			}
		});

		message.appendChild(button);
	}

	/**
	 * Parses sector names and quantities from a chat message.
	 * Expects a comma-separated list like:
	 *   "Vents forts (x2), Marais (x2), Grottes, Forêt"
	 * 
	 * @private
	 * @param {HTMLElement} message
	 * @returns {string[]} Array of sector IDs (repeated for quantities)
	 */
	_parseSectorsFromMessage(message) {
		const text = message.textContent;
		const sectors = [];

		// Sort names by length descending so longer names match first
		// (e.g. "Température élevée" before "Température basse")
		const sortedNames = [...ALL_SECTOR_NAMES]
			.filter(n => n.length > 0)
			.sort((a, b) => b.length - a.length);

		// Build a regex that captures each sector entry with optional (xN)
		// We look for known sector names followed by an optional " (xN)"
		const escapedNames = sortedNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		const namesPattern = escapedNames.join('|');
		const regex = new RegExp(`(${namesPattern})(?:\\s*\\(x(\\d+)\\))?`, 'gi');

		let match;
		while ((match = regex.exec(text)) !== null) {
			const name = match[1].toLowerCase();
			const quantity = match[2] ? parseInt(match[2], 10) : 1;
			const sectorId = SECTOR_NAME_TO_ID.get(name);

			if (sectorId) {
				for (let i = 0; i < quantity; i++) {
					sectors.push(sectorId);
				}
			}
		}

		return sectors;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ChatMessageDetector = ChatMessageDetector;
}
