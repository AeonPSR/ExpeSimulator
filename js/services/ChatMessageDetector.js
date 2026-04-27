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
 * Maps localized sector names to their internal sector IDs.
 * All three language arrays must follow the same order as this ID list.
 */
const SECTOR_ID_ORDER = [
	'LANDING', 'HYDROCARBON', 'OXYGEN', 'INSECT', 'MANKAROG', 'LOST',
	'PREDATOR', 'RUMINANT', 'INTELLIGENT', 'CRISTAL_FIELD', 'DESERT',
	'WRECK', 'FOREST', 'FRUIT_TREES', 'CAVE', 'SWAMP', 'MOUNTAIN',
	'OCEAN', 'RUINS', 'SEISMIC_ACTIVITY', 'COLD', 'HOT', 'STRONG_WIND',
	'VOLCANIC_ACTIVITY', 'UNKNOWN'
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
	 * @param {Function} [options.onImport] - Callback when sectors are imported: (sectorIds: string[], planetName: string|null) => void
	 */
	constructor(options = {}) {
		this._observer = null;
		this._processedMessages = new WeakSet();
		this._onImport = options.onImport || null;
		this._clickListener = null;
	}

	/**
	 * Starts observing the DOM for chat messages
	 */
	start() {
		// Process any messages already on the page
		this._scanExistingMessages();

		const commsPanel = document.querySelector('.comms-panel') || document.body;

		// Watch for new messages being added to the DOM
		this._observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						this._checkNode(node);
					}
				}
			}
		});

		this._observer.observe(commsPanel, {
			childList: true,
			subtree: true
		});

		// Re-scan when the user switches tabs or expands a thread,
		// since those actions reveal already-present messages without DOM insertions.
		this._clickListener = (e) => {
			const target = e.target.closest('.tab, .toggle-children');
			if (!target) return;
			setTimeout(() => this._scanExistingMessages(), 150);
		};
		commsPanel.addEventListener('click', this._clickListener);
		this._commsPanel = commsPanel;
	}

	/**
	 * Stops observing the DOM
	 */
	stop() {
		if (this._observer) {
			this._observer.disconnect();
			this._observer = null;
		}
		if (this._clickListener && this._commsPanel) {
			this._commsPanel.removeEventListener('click', this._clickListener);
			this._clickListener = null;
			this._commsPanel = null;
		}
	}

	/**
	 * Scans existing messages already present in the DOM
	 * @private
	 */
	_scanExistingMessages() {
		const messages = document.querySelectorAll('.message');
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
		if (node.classList && node.classList.contains('message')) {
			this._processMessage(node);
		}
		// Also check descendants
		const messages = node.querySelectorAll ? node.querySelectorAll('.message') : [];
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
		const text = message.textContent.toLowerCase();
		return ALL_SECTOR_NAMES.some(name => name.length > 0 && text.includes(name.toLowerCase()));
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
				const planetName = this._parsePlanetNameFromMessage(message);
				const nav = this._parseDirectionAndFuelFromMessage(message);
				this._onImport(sectors, planetName, nav);
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

	/**
	 * Extracts the direction and fuel cost from an expedition message.
	 * Looks for a text node immediately before the :fuel: image matching
	 * the pattern "Direction - N" (e.g. "Ouest - 3").
	 *
	 * @private
	 * @param {HTMLElement} message
	 * @returns {{ direction: string, fuel: number }|null}
	 */
	_parseDirectionAndFuelFromMessage(message) {
		const fuelImg = message.querySelector('img[alt=":fuel:"]');
		if (!fuelImg) return null;

		// Walk backwards through siblings looking for a text node like "Ouest - 3 "
		let node = fuelImg.previousSibling;
		while (node) {
			if (node.nodeType === Node.TEXT_NODE) {
				const match = node.textContent.match(/(\S+)\s*-\s*(\d+)\s*$/);
				if (match) {
					return { direction: match[1], fuel: parseInt(match[2], 10) };
				}
				// Non-empty text that didn't match — stop searching
				if (node.textContent.trim()) break;
			}
			node = node.previousSibling;
		}
		return null;
	}

	/**
	 * Extracts the planet name from an expedition message.
	 * The name appears in the <strong> element immediately following the :planet: image.
	 *
	 * @private
	 * @param {HTMLElement} message
	 * @returns {string|null}
	 */
	_parsePlanetNameFromMessage(message) {
		const planetImg = message.querySelector('img[alt=":planet:"]');
		if (!planetImg) return null;

		// Walk forward through siblings to find the first <strong>
		let node = planetImg.nextSibling;
		while (node) {
			if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
				const name = node.textContent.trim();
				return name || null;
			}
			node = node.nextSibling;
		}
		return null;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.ChatMessageDetector = ChatMessageDetector;
}
