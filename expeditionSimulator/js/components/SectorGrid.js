/**
 * SectorGrid Component
 * 
 * Displays the grid of available sectors that can be added to an expedition.
 * Includes header with toggle button for diplomacy mode.
 */
class SectorGrid extends Component {
	/**
	 * @param {Object} options
	 * @param {Array<Object>} options.sectors - Sector configs, each with at least { sectorName }
	 * @param {Function} [options.onSectorClick] - Called with (sectorName)
	 * @param {Function} [options.onDiplomacyToggle] - Called with (isActive)
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 * @param {Function} [options.getSectorAvailability] - Returns { shouldDisable, tooltipText }
	 */
	constructor(options = {}) {
		super(options);
		this.sectors = options.sectors || [];
		this.onSectorClick = options.onSectorClick || null;
		this.onDiplomacyToggle = options.onDiplomacyToggle || null;
		this.getResourceURL = options.getResourceURL || ((path) => path);
		this.getSectorAvailability = options.getSectorAvailability || null;

		this._diplomacyToggle = null;
		this._gridElement = null;
	}

	render() {
		this.element = this.createElement('div', { className: 'section-selector' });

		const header = this._createHeader();
		this.element.appendChild(header);

		this._gridElement = this._createGrid();
		this.element.appendChild(this._gridElement);

		return this.element;
	}
	_createHeader() {
		const header = this.createElement('div', { className: 'sectors-header' });

		const title = this.createElement('h4', { 'data-i18n': 'sectors.available' }, I18n.t('sectors.available'));
		header.appendChild(title);

		const buttonsContainer = this.createElement('div', { className: 'sectors-buttons' });

		if (!this._diplomacyToggle) {
			this._diplomacyToggle = new ToggleButton({
				id: 'diplomacy-toggle-btn',
				className: 'diplomacy-toggle-btn',
				icon: this.getResourceURL('pictures/abilities/human/diplomacy.png'),
				alt: '',
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
		}
		this._diplomacyToggle.render();
		buttonsContainer.appendChild(this._diplomacyToggle.element);

		header.appendChild(buttonsContainer);
		return header;
	}

	_createGrid() {
		const grid = this.createElement('div', {
			className: 'sector-grid',
			id: 'sector-grid'
		});

		const uniqueSectors = [...new Set(this.sectors.map(s => s.sectorName))];

		uniqueSectors.forEach(sectorName => {
			const sectorItem = this._createSectorItem(sectorName);
			grid.appendChild(sectorItem);
		});

		return grid;
	}

	_createSectorItem(sectorName) {
		const sectorDiv = this.createElement('div', {
			className: 'sector-item',
			dataset: { sector: sectorName }
		});

		const img = this.createElement('img', {
			src: this.getResourceURL(`pictures/sectors/${sectorName.toLowerCase()}.png`),
			alt: sectorName,
			className: 'sector-main-img'
		});
		sectorDiv.appendChild(img);

		// Fight icon if sector has fight events
		if (SectorData.hasFightEvents(sectorName)) {
			const fightImg = this.createElement('img', {
				src: this.getResourceURL('pictures/ui/fight.png'),
				alt: '',
				className: 'fight-icon'
			});
			sectorDiv.appendChild(fightImg);
		}

		// Click handler
		this.addEventListener(sectorDiv, 'click', () => {
			if (!sectorDiv.classList.contains('sector-disabled')) {
				this.onSectorClick?.(sectorName);
			}
		});

		return sectorDiv;
	}
	/**
	 * Updates sector availability (disabled states)
	 */
	updateSectorAvailability() {
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

		});
	}

	/**
	 * Gets the diplomacy toggle state
	 * @returns {boolean}
	 */
	isDiplomacyActive() {
		return this._diplomacyToggle?.getActive() || false;
	}

	/**
	 * Sets the diplomacy toggle state
	 * @param {boolean} active
	 */
	setDiplomacyActive(active) {
		this._diplomacyToggle?.setActive(active, true);
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.SectorGrid = SectorGrid;
}
