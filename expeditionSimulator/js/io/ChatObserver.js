/**
 * ChatObserver
 *
 * I/O shell: watches the game chat DOM for expedition messages and
 * injects import buttons. All pure parsing is delegated to ChatParser.
 */
class ChatObserver {
	/**
	 * @param {Object} options
	 * @param {Function} [options.onImport] - Callback when sectors are imported:
	 *   (sectorIds: string[], planetName: string|null, nav: {direction, fuel}|null) => void
	 */
	constructor(options = {}) {
		this._observer = null;
		this._processedMessages = new WeakSet();
		this._onImport = options.onImport || null;
		this._clickListener = null;
	}

	/**
	 * Starts observing the DOM for chat messages.
	 */
	start() {
		this._scanExistingMessages();

		const commsPanel = document.querySelector('.comms-panel') || document.body;

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
	 * Stops observing the DOM.
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

	/** @private */
	_scanExistingMessages() {
		const messages = document.querySelectorAll('.message');
		for (const message of messages) {
			this._processMessage(message);
		}
	}

	/** @private */
	_checkNode(node) {
		if (node.classList && node.classList.contains('message')) {
			this._processMessage(node);
		}
		const messages = node.querySelectorAll ? node.querySelectorAll('.message') : [];
		for (const message of messages) {
			this._processMessage(message);
		}
	}

	/** @private */
	_processMessage(message) {
		if (this._processedMessages.has(message)) return;
		this._processedMessages.add(message);

		if (!this._isExpeditionMessage(message)) return;

		this._addImportButton(message);
	}

	/** @private */
	_isExpeditionMessage(message) {
		const images = message.querySelectorAll('img');
		let hasPlanet = false;
		let hasFuel = false;

		for (const img of images) {
			if (img.alt === ':planet:' || img.alt === ':ic_planet_scanned:') hasPlanet = true;
			if (img.alt === ':fuel:') hasFuel = true;
			if (hasPlanet && hasFuel) break;
		}

		// Also accept text-based codes (copy-pasted or self-exported messages)
		if (!hasPlanet || !hasFuel) {
			const text = message.textContent;
			if (!hasPlanet) hasPlanet = text.includes(':ic_planet_scanned:') || text.includes(':planet:');
			if (!hasFuel)   hasFuel   = text.includes(':fuel:');
		}

		if (!hasPlanet || !hasFuel) return false;

		return this._containsSectorName(message);
	}

	/** @private */
	_containsSectorName(message) {
		const text = message.textContent.toLowerCase();
		if (ChatParser.ALL_SECTOR_NAMES.some(name => name.length > 0 && text.includes(name.toLowerCase()))) {
			return true;
		}
		const images = message.querySelectorAll('img');
		for (const img of images) {
			if (img.alt.startsWith(':as_')) return true;
		}
		return false;
	}

	/** @private */
	_addImportButton(message) {
		const anchor = message.querySelector('.text') || message;
		const currentPosition = window.getComputedStyle(anchor).position;
		if (currentPosition === 'static') {
			anchor.style.position = 'relative';
		}

		const button = document.createElement('button');
		button.className = 'expe-import-btn expe-import-btn--overlay';
		const img = document.createElement('img');
		img.src = getResourceURL('pictures/ui/import_planet.png');
		img.alt = 'Import';
		button.appendChild(img);

		button.addEventListener('click', (e) => {
			e.stopPropagation();
			const sectors = this._parseSectorsFromMessage(message);
			if (sectors.length > 0 && this._onImport) {
				const planetName = this._parsePlanetNameFromMessage(message);
				const nav = this._parseDirectionAndFuelFromMessage(message);
				this._onImport(sectors, planetName, nav);
			}
		});

		anchor.appendChild(button);
	}

	/** @private */
	_parseSectorsFromMessage(message) {
		const text = message.textContent;
		const iconAlts = [...message.querySelectorAll('img')].map(img => img.alt);
		return ChatParser.parseSectors(text, iconAlts);
	}

	/** @private */
	_parseDirectionAndFuelFromMessage(message) {
		const fuelImg = message.querySelector('img[alt=":fuel:"]');
		if (!fuelImg) return null;

		let node = fuelImg.previousSibling;
		while (node) {
			if (node.nodeType === Node.TEXT_NODE) {
				const nav = ChatParser.parseNavText(node.textContent);
				if (nav) return nav;
				// Non-empty text that didn't match — stop searching
				if (node.textContent.trim()) break;
			}
			node = node.previousSibling;
		}
		return null;
	}

	/** @private */
	_parsePlanetNameFromMessage(message) {
		const planetImg = message.querySelector('img[alt=":planet:"], img[alt=":ic_planet_scanned:"]');
		if (!planetImg) return null;

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

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ChatObserver = ChatObserver;
