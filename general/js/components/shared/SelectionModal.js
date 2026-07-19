/**
 * SelectionModal Component
 * 
 * A modal that displays a grid of selectable options (characters, abilities, items).
 * Extends the base Modal with selection-specific functionality.
 */
class SelectionModal extends Modal {
	/**
	 * @param {Object} options
	 * @param {Array<Object>} options.items - Selectable items with { id, image, label? }
	 * @param {Array<Object>} [options.sections] - Optional grouped sections with { items, backgroundImage? }
	 * @param {string} [options.selectedId] - Currently selected item id
	 * @param {string} [options.gridClassName] - Extra CSS class for the grid
	 * @param {number} [options.columns=6] - Number of grid columns
	 * @param {Function} [options.onSelect] - Called with (item)
	 * @param {string} [options.itemSize='normal'] - Item size variant
	 */
	constructor(options = {}) {
		super(options);
		this.items = options.items || [];
		// Optional grouped rendering: array of { items: [...] } rendered as
		// separate grids separated by a divider. Falls back to flat `items`.
		this.sections = options.sections || null;
		this.selectedId = options.selectedId || null;
		this.gridClassName = options.gridClassName || '';
		this.columns = options.columns || 6;
		this.onSelect = options.onSelect || null;
		this.itemSize = options.itemSize || 'normal';
	}

	render() {
		super.render();

		if (this.sections) {
			this.sections.forEach((section, i) => {
				if (i > 0) {
					this._bodyContainer.appendChild(
						this.createElement('hr', { className: 'selection-divider' })
					);
				}
				this._bodyContainer.appendChild(this._createGrid(section.items, section.backgroundImage));
			});
		} else {
			this._bodyContainer.appendChild(this._createGrid(this.items));
		}

		return this.element;
	}

	_createGrid(items, backgroundImage) {
		const gridClasses = ['character-grid', this.gridClassName].filter(Boolean).join(' ');
		const grid = this.createElement('div', { className: gridClasses });

		(items || this.items).forEach(item => {
			const option = this._createOption(item);
			grid.appendChild(option);
		});

		if (!backgroundImage) {
			return grid;
		}

		// Wrap the grid so a centered, faded background image can sit behind it
		// without taking visual space or interfering with the grid's own layout.
		const wrapper = this.createElement('div', { className: 'character-grid-section' });
		const bgImg = this.createElement('img', {
			className: 'character-grid-section-bg',
			src: backgroundImage,
			alt: ''
		});
		wrapper.appendChild(bgImg);
		wrapper.appendChild(grid);
		return wrapper;
	}

	_createOption(item) {
		const isSelected = item.id === this.selectedId;
		const sizeClass = this.itemSize === 'large' ? 'character-option--large' : '';
		const debugClass = item.debug ? 'debug' : '';
		const classes = ['character-option', sizeClass, debugClass, isSelected ? 'selected' : ''].filter(Boolean).join(' ');

		const option = this.createElement('div', {
			className: classes,
			dataset: { id: item.id }
		});

		if (item.image) {
			const img = this.createElement('img', {
				src: item.image,
				alt: item.label || item.id
			});
			option.appendChild(img);
		}

		this.addEventListener(option, 'click', () => this._handleSelect(item));

		return option;
	}

	_handleSelect(item) {
		const previousSelected = this.element.querySelector('.character-option.selected');
		if (previousSelected) {
			previousSelected.classList.remove('selected');
		}

		const newSelected = this.element.querySelector(`[data-id="${item.id}"]`);
		if (newSelected) {
			newSelected.classList.add('selected');
		}

		this.selectedId = item.id;

		// Fire callback
		if (this.onSelect) {
			this.onSelect(item);
		}

		// Close modal with result
		this.close(item);
	}

	/**
	 * Gets the currently selected item
	 * @returns {Object|null}
	 */
	getSelectedItem() {
		return this.items.find(item => item.id === this.selectedId) || null;
	}

	/**
	 * Updates the items list and re-renders the grid
	 * @param {Array<Object>} items - New items array
	 */
	setItems(items) {
		this.items = items;
		if (this._bodyContainer) {
			this._bodyContainer.innerHTML = '';
			const grid = this._createGrid();
			this._bodyContainer.appendChild(grid);
		}
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.SelectionModal = SelectionModal;
}
