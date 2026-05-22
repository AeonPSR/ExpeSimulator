/**
 * PlanetCardInjector Service
 *
 * Watches the game DOM for known planet cards (.planet:not(.unknown))
 * and injects an import button into their .actions area so the user
 * can load the planet directly into the extension without going through chat.
 */
class PlanetCardInjector {
	/**
	 * @param {Object} options
	 * @param {Function} [options.onImport] - Same callback as ChatMessageDetector:
	 *   (sectorIds: string[], planetName: string|null, nav: {direction, fuel}|null) => void
	 */
	constructor(options = {}) {
		this._onImport = options.onImport || null;
		this._observer = null;
		this._processedCards = new WeakSet();
	}

	/** Start watching the DOM for planet cards */
	start() {
		this._scanExisting();

		this._observer = new MutationObserver(() => this._scanExisting());
		this._observer.observe(document.body, { childList: true, subtree: true });
	}

	/** Stop watching */
	stop() {
		if (this._observer) {
			this._observer.disconnect();
			this._observer = null;
		}
	}

	// ── Private ────────────────────────────────────────────────────────────

	/** @private */
	_scanExisting() {
		const planets = document.querySelectorAll('.planet-container .planet:not(.unknown)');
		for (const planet of planets) {
			this._processPlanet(planet);
		}
	}

	/** @private */
	_processPlanet(planet) {
		const actionsDiv = planet.querySelector('.analysis .actions');
		if (!actionsDiv) return;
		if (this._processedCards.has(actionsDiv)) return;
		this._processedCards.add(actionsDiv);

		const button = document.createElement('button');
		button.className = 'expe-import-btn';
		button.textContent = 'Import';

		button.addEventListener('click', (e) => {
			e.stopPropagation();
			if (!this._onImport) return;
			const sectors   = this._parseSectors(planet);
			const name      = this._parsePlanetName(planet);
			const nav       = this._parseNav(planet);
			this._onImport(sectors, name, nav);
		});

		actionsDiv.appendChild(button);
	}

	/** @private */
	_parsePlanetName(planet) {
		return planet.querySelector('h3')?.textContent?.trim() || null;
	}

	/** @private — reads sector icons from the analysis list */
	_parseSectors(planet) {
		const imgs = planet.querySelectorAll('.analysis ul li img');
		const map  = ChatMessageDetector.SECTOR_NAME_TO_ID;
		const sectors = [];
		for (const img of imgs) {
			const id = map.get(img.alt?.trim().toLowerCase());
			if (id) sectors.push(id);
		}
		return sectors;
	}

	/** @private — reads direction and fuel cost from the card <p> elements */
	_parseNav(planet) {
		const ps  = planet.querySelectorAll('.card p');
		const normalize = ChatMessageDetector.DIRECTION_NORMALIZE;
		let direction = null;
		let fuel = 0;

		for (const p of ps) {
			const span = p.querySelector('span');
			if (!span) continue;
			const value = p.textContent.replace(span.textContent, '').trim();

			// Check if this <p> is the direction or fuel row
			const num = parseInt(value, 10);
			if (isNaN(num)) {
				// Non-numeric → direction
				direction = normalize[value.toLowerCase()] || value;
			} else {
				// Numeric → fuel cost
				fuel = num;
			}
		}

		return direction ? { direction, fuel } : null;
	}
}
