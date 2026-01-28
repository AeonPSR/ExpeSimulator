/**
 * SelectedSectors Component
 * 
 * Displays the currently selected sectors for the expedition.
 * Includes a clear all button.
 * 
 * Features:
 * - Grid display of selected sectors
 * - Click to remove individual sectors
 * - Counter showing current/max sectors
 * - Clear all button
 * - Fight and negative level icons
 */
class SelectedSectors extends Component {
	/**
	 * @param {Object} options
	 * @param {number} [options.maxSectors=20] - Maximum sectors allowed
	 * @param {Function} [options.onSectorRemove] - Callback: (index) => void
	 * @param {Function} [options.onClearAll] - Callback: () => void
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 * @param {Array<string>} [options.sectorsWithFight] - Sectors with fight events
	 */
	constructor(options = {}) {
		super(options);
		this.maxSectors = options.maxSectors || 20;
		this.onSectorRemove = options.onSectorRemove || null;
		this.onClearAll = options.onClearAll || null;
		this.getResourceURL = options.getResourceURL || ((path) => path);
		this.sectorsWithFight = options.sectorsWithFight || [
			'RUINS', 'WRECK', 'CRISTAL_FIELD', 'RUMINANT',
			'PREDATOR', 'INTELLIGENT', 'INSECT', 'MANKAROG'
		];

		// Current selected sectors
		this._selectedSectors = [];
		this._headerElement = null;
		this._gridElement = null;
	}

	/**
	 * Creates the selected sectors section
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'selected-sectors' });

		// Header with counter
		this._headerElement = this.createElement('h4', {
			id: 'selected-header'
		}, this._getHeaderText());
		this.element.appendChild(this._headerElement);

		// Selected sectors grid
		this._gridElement = this.createElement('div', {
			className: 'selected-grid',
			id: 'selected-grid'
		});
		this.element.appendChild(this._gridElement);

		// Clear all button
		const clearBtn = this.createElement('button', {
			id: 'clear-all',
			className: 'clear-btn',
			onClick: () => this.onClearAll?.()
		}, 'Clear All');
		this.element.appendChild(clearBtn);

		return this.element;
	}

	/**
	 * Gets the header text with counter
	 * @private
	 * @returns {string}
	 */
	_getHeaderText() {
		return `Selected Expedition (${this._selectedSectors.length}/${this.maxSectors})`;
	}

	/**
	 * Updates the display with new selected sectors
	 * @param {Array<string>} sectors - Array of sector names
	 */
	update(sectors) {
		this._selectedSectors = sectors || [];

		// Update header
		if (this._headerElement) {
			this._headerElement.textContent = this._getHeaderText();
		}

		// Update grid
		if (this._gridElement) {
			this._gridElement.innerHTML = '';

			this._selectedSectors.forEach((sectorName, index) => {
				const sectorItem = this._createSelectedItem(sectorName, index);
				this._gridElement.appendChild(sectorItem);
			});
		}
	}

	/**
	 * Creates a selected sector item
	 * @private
	 * @param {string} sectorName
	 * @param {number} index
	 * @returns {HTMLElement}
	 */
	_createSelectedItem(sectorName, index) {
		const sectorDiv = this.createElement('div', {
			className: 'selected-sector-item',
			dataset: { index: index.toString() },
			title: `${formatSectorName(sectorName)} - Click to remove`
		});

		// Main image
		const img = this.createElement('img', {
			src: this.getResourceURL(`astro/${sectorName.toLowerCase()}.png`),
			alt: sectorName
		});
		sectorDiv.appendChild(img);

		// Fight icon if applicable
		if (this._hasFightEvents(sectorName)) {
			const fightImg = this.createElement('img', {
				src: this.getResourceURL('others/fight.png'),
				alt: 'Fight',
				className: 'fight-icon'
			});
			sectorDiv.appendChild(fightImg);
		}

		// Negative level icon (shown via CSS when traitor active)
		const negativeImg = this.createElement('img', {
			src: this.getResourceURL('abilities/traitor.png'),
			alt: 'Negative Level',
			className: 'negative-level-icon'
		});
		sectorDiv.appendChild(negativeImg);

		// Click to remove
		this.addEventListener(sectorDiv, 'click', () => {
			this.onSectorRemove?.(index);
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
	 * Gets the current selected sectors
	 * @returns {Array<string>}
	 */
	getSelectedSectors() {
		return [...this._selectedSectors];
	}

	/**
	 * Gets the count of selected sectors
	 * @returns {number}
	 */
	getCount() {
		return this._selectedSectors.length;
	}

	/**
	 * Checks if at max capacity
	 * @returns {boolean}
	 */
	isFull() {
		return this._selectedSectors.length >= this.maxSectors;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.SelectedSectors = SelectedSectors;
}
