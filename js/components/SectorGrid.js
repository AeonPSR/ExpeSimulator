/**
 * SectorGrid Component
 * 
 * Displays the grid of available sectors that can be added to an expedition.
 * Includes header with toggle buttons for traitor and diplomacy modes.
 * 
 * Features:
 * - 5-column grid of sector icons
 * - Fight icon overlay for combat sectors
 * - Negative level icon overlay (when traitor active)
 * - Disabled state for unavailable sectors
 * - Traitor and Diplomacy toggle buttons
 */
class SectorGrid extends Component {
	/**
	 * @param {Object} options
	 * @param {Array<Object>} options.sectors - Array of sector configs
	 *   Each: { sectorName: string, ... }
	 * @param {Function} [options.onSectorClick] - Callback: (sectorName) => void
	 * @param {Function} [options.onTraitorToggle] - Callback: (isActive) => void
	 * @param {Function} [options.onDiplomacyToggle] - Callback: (isActive) => void
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 * @param {Function} [options.getSectorAvailability] - Returns { shouldDisable, tooltipText }
	 * @param {Array<string>} [options.sectorsWithFight] - Sectors that have fight events
	 */
	constructor(options = {}) {
		super(options);
		this.sectors = options.sectors || [];
		this.onSectorClick = options.onSectorClick || null;
		this.onTraitorToggle = options.onTraitorToggle || null;
		this.onDiplomacyToggle = options.onDiplomacyToggle || null;
		this.getResourceURL = options.getResourceURL || ((path) => path);
		this.getSectorAvailability = options.getSectorAvailability || null;
		this.sectorsWithFight = options.sectorsWithFight || [
			'RUINS', 'WRECK', 'CRISTAL_FIELD', 'RUMINANT', 
			'PREDATOR', 'INTELLIGENT', 'INSECT', 'MANKAROG'
		];

		// Toggle button instances
		this._traitorToggle = null;
		this._diplomacyToggle = null;
		this._gridElement = null;
	}

	/**
	 * Creates the sector grid section
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'section-selector' });

		// Header with title and toggle buttons
		const header = this._createHeader();
		this.element.appendChild(header);

		// Sector grid
		this._gridElement = this._createGrid();
		this.element.appendChild(this._gridElement);

		return this.element;
	}

	/**
	 * Creates the header with title and toggle buttons
	 * @private
	 * @returns {HTMLElement}
	 */
	_createHeader() {
		const header = this.createElement('div', { className: 'sectors-header' });

		// Title
		const title = this.createElement('h4', {}, 'Available Sectors');
		header.appendChild(title);

		// Buttons container
		const buttonsContainer = this.createElement('div', { className: 'sectors-buttons' });

		// Traitor toggle
		this._traitorToggle = new ToggleButton({
			id: 'sectors-toggle-btn',
			className: 'sectors-toggle-btn',
			icon: this.getResourceURL('abilities/traitor.png'),
			alt: 'Toggle Traitor',
			activeColor: 'pink',
			onToggle: (isActive) => {
				if (isActive) {
					document.body.classList.add('traitor-active');
				} else {
					document.body.classList.remove('traitor-active');
				}
				this.onTraitorToggle?.(isActive);
			}
		});
		this._traitorToggle.render();
		buttonsContainer.appendChild(this._traitorToggle.element);

		// Diplomacy toggle
		this._diplomacyToggle = new ToggleButton({
			id: 'diplomacy-toggle-btn',
			className: 'diplomacy-toggle-btn',
			icon: this.getResourceURL('abilities/diplomacy.png'),
			alt: 'Toggle Diplomacy',
			activeColor: 'blue',
			onToggle: (isActive) => {
				if (isActive) {
					document.body.classList.add('diplomacy-active');
				} else {
					document.body.classList.remove('diplomacy-active');
				}
				this.onDiplomacyToggle?.(isActive);
			}
		});
		this._diplomacyToggle.render();
		buttonsContainer.appendChild(this._diplomacyToggle.element);

		header.appendChild(buttonsContainer);
		return header;
	}

	/**
	 * Creates the sector grid
	 * @private
	 * @returns {HTMLElement}
	 */
	_createGrid() {
		const grid = this.createElement('div', {
			className: 'sector-grid',
			id: 'sector-grid'
		});

		// Get unique sector names
		const uniqueSectors = [...new Set(this.sectors.map(s => s.sectorName))];

		uniqueSectors.forEach(sectorName => {
			const sectorItem = this._createSectorItem(sectorName);
			grid.appendChild(sectorItem);
		});

		return grid;
	}

	/**
	 * Creates a single sector item
	 * @private
	 * @param {string} sectorName
	 * @returns {HTMLElement}
	 */
	_createSectorItem(sectorName) {
		const sectorDiv = this.createElement('div', {
			className: 'sector-item',
			dataset: { sector: sectorName }
		});

		// Main sector image
		const img = this.createElement('img', {
			src: this.getResourceURL(`astro/${sectorName.toLowerCase()}.png`),
			alt: sectorName,
			title: formatSectorName(sectorName),
			className: 'sector-main-img'
		});
		sectorDiv.appendChild(img);

		// Fight icon if sector has fight events
		if (this._hasFightEvents(sectorName)) {
			const fightImg = this.createElement('img', {
				src: this.getResourceURL('others/fight.png'),
				alt: 'Fight',
				className: 'fight-icon'
			});
			sectorDiv.appendChild(fightImg);
		}

		// Negative level icon placeholder (shown/hidden via CSS based on traitor-active)
		const negativeImg = this.createElement('img', {
			src: this.getResourceURL('abilities/traitor.png'),
			alt: 'Negative Level',
			className: 'negative-level-icon'
		});
		sectorDiv.appendChild(negativeImg);

		// Click handler
		this.addEventListener(sectorDiv, 'click', () => {
			if (!sectorDiv.classList.contains('sector-disabled')) {
				this.onSectorClick?.(sectorName);
			}
		});

		return sectorDiv;
	}

	/**
	 * Checks if a sector has fight events
	 * @private
	 * @param {string} sectorName
	 * @returns {boolean}
	 */
	_hasFightEvents(sectorName) {
		return this.sectorsWithFight.includes(sectorName);
	}

	/**
	 * Updates sector availability (disabled states)
	 */
	updateAvailability() {
		if (!this._gridElement || !this.getSectorAvailability) return;

		const sectorItems = this._gridElement.querySelectorAll('.sector-item');
		sectorItems.forEach(sectorDiv => {
			const sectorName = sectorDiv.dataset.sector;
			const { shouldDisable, tooltipText } = this.getSectorAvailability(sectorName);

			if (shouldDisable) {
				sectorDiv.classList.add('sector-disabled');
				sectorDiv.style.pointerEvents = 'none';
			} else {
				sectorDiv.classList.remove('sector-disabled');
				sectorDiv.style.pointerEvents = 'auto';
			}

			// Update tooltip
			const img = sectorDiv.querySelector('.sector-main-img');
			if (img && tooltipText) {
				img.title = tooltipText;
			}
		});
	}

	/**
	 * Gets the traitor toggle state
	 * @returns {boolean}
	 */
	isTraitorActive() {
		return this._traitorToggle?.getActive() || false;
	}

	/**
	 * Gets the diplomacy toggle state
	 * @returns {boolean}
	 */
	isDiplomacyActive() {
		return this._diplomacyToggle?.getActive() || false;
	}

	/**
	 * Sets the traitor toggle state
	 * @param {boolean} active
	 */
	setTraitorActive(active) {
		this._traitorToggle?.setActive(active);
	}

	/**
	 * Sets the diplomacy toggle state
	 * @param {boolean} active
	 */
	setDiplomacyActive(active) {
		this._diplomacyToggle?.setActive(active);
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.SectorGrid = SectorGrid;
}
