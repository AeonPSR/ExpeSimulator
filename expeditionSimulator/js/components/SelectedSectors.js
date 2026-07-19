/**
 * SelectedSectors Component
 * 
 * Displays the currently selected sectors for the expedition.
 * Includes a clear all button.
 */
class SelectedSectors extends Component {
	/**
	 * @param {Object} options
	 * @param {number} [options.maxSectors=20] - Maximum regular sectors allowed
	 * @param {Function} [options.onSectorRemove] - Called with (index)
	 * @param {Function} [options.onClearAll] - Called with no arguments
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 */
	constructor(options = {}) {
		super(options);
		this.maxSectors = options.maxSectors;
		this.onSectorRemove = options.onSectorRemove || null;
		this.onClearAll = options.onClearAll || null;
		this.getResourceURL = options.getResourceURL || ((path) => path);

		this._selectedSectors = [];
		this._headerElement = null;
		this._gridElement = null;
	}

	render() {
		this.element = this.createElement('div', { className: 'selected-sectors' });

		this._headerElement = this.createElement('h4', {
			id: 'selected-header'
		}, this._getHeaderText());
		this.element.appendChild(this._headerElement);

		this._gridElement = this.createElement('div', {
			className: 'selected-grid',
			id: 'selected-grid'
		});
		this.element.appendChild(this._gridElement);

		const clearBtn = this.createElement('button', {
			id: 'clear-all',
			className: 'clear-btn',
			'data-i18n': 'sectors.clear_all',
			onClick: () => this.onClearAll?.()
		}, I18n.t('sectors.clear_all'));
		this.element.appendChild(clearBtn);

		return this.element;
	}

	_getHeaderText() {
		// Count only regular sectors (excluding LANDING and LOST) for the X/20 limit
		const regularCount = this._selectedSectors.filter(sectorName => 
			!SectorData.isSpecialSector(sectorName)
		).length;
		const totalCount = this._selectedSectors.length;
		
		const baseText = I18n.t('sectors.header', { regular: regularCount, max: this.maxSectors });
		const specialCount = totalCount - regularCount;
		
		return specialCount > 0
			? `${baseText} ${I18n.t('sectors.special_suffix', { count: specialCount })}`
			: baseText;
	}

	/**
	 * @param {Array<string>} sectors
	 */
	update(sectors) {
		this._selectedSectors = sectors || [];

		if (this._headerElement) {
			this._headerElement.textContent = this._getHeaderText();
		}

		if (this._gridElement) {
			this._gridElement.innerHTML = '';

			this._selectedSectors.forEach((sectorName, index) => {
				const sectorItem = this._createSelectedItem(sectorName, index);
				this._gridElement.appendChild(sectorItem);
			});
		}
	}

	_createSelectedItem(sectorName, index) {
		const sectorDiv = this.createElement('div', {
			className: 'selected-sector-item',
			dataset: { index: index.toString() },
		});

		const img = this.createElement('img', {
			src: this.getResourceURL(`pictures/sectors/${sectorName.toLowerCase()}.png`),
			alt: sectorName
		});
		sectorDiv.appendChild(img);

		// Fight icon if applicable
		if (SectorData.hasFightEvents(sectorName)) {
			const fightImg = this.createElement('img', {
				src: this.getResourceURL('pictures/ui/fight.png'),
				alt: '',
				className: 'fight-icon'
			});
			sectorDiv.appendChild(fightImg);
		}


		this.addEventListener(sectorDiv, 'click', () => {
			this.onSectorRemove?.(index);
		});

		return sectorDiv;
	}

	/**
	 * @returns {Array<string>} Copy of the selected sectors.
	 */
	getSelectedSectors() {
		return [...this._selectedSectors];
	}

	/**
	 * @returns {number}
	 */
	getCount() {
		return this._selectedSectors.length;
	}

	/**
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
