/**
 * SelectionModal Component
 * 
 * A modal that displays a grid of selectable options (characters, abilities, items).
 * Extends the base Modal with selection-specific functionality.
 * 
 * Features:
 * - Grid display of options
 * - Single selection with visual highlight
 * - Current selection indicator
 * - Returns selected value on close
 */
class SelectionModal extends Modal {
	/**
	 * @param {Object} options
	 * @param {Array<Object>} options.items - Array of selectable items
	 *   Each item: { id: string, image: string, label?: string }
	 * @param {string} [options.selectedId] - Currently selected item ID
	 * @param {string} [options.gridClassName] - Additional class for the grid
	 * @param {number} [options.columns=6] - Number of grid columns
	 * @param {Function} [options.onSelect] - Callback when item selected: (item) => void
	 * @param {string} [options.itemSize='normal'] - Item size: 'normal', 'large'
	 */
	constructor(options = {}) {
		super(options);
		this.items = options.items || [];
		this.selectedId = options.selectedId || null;
		this.gridClassName = options.gridClassName || '';
		this.columns = options.columns || 6;
		this.onSelect = options.onSelect || null;
		this.itemSize = options.itemSize || 'normal';
	}

	/**
	 * Creates the modal with selection grid
	 * @returns {HTMLElement}
	 */
	render() {
		// Call parent render first
		super.render();

		// Create the selection grid
		const grid = this._createGrid();
		this._bodyContainer.appendChild(grid);

		return this.element;
	}

	/**
	 * Creates the selection grid
	 * @private
	 * @returns {HTMLElement}
	 */
	_createGrid() {
		const gridClasses = ['character-grid', this.gridClassName].filter(Boolean).join(' ');
		const grid = this.createElement('div', { className: gridClasses });

		// Apply column count via CSS variable
		grid.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`;

		// Create options
		this.items.forEach(item => {
			const option = this._createOption(item);
			grid.appendChild(option);
		});

		return grid;
	}

	/**
	 * Creates a single selectable option
	 * @private
	 * @param {Object} item - Item data
	 * @returns {HTMLElement}
	 */
	_createOption(item) {
		const isSelected = item.id === this.selectedId;
		const sizeClass = this.itemSize === 'large' ? 'character-option--large' : '';
		const classes = ['character-option', sizeClass, isSelected ? 'selected' : ''].filter(Boolean).join(' ');

		const option = this.createElement('div', {
			className: classes,
			dataset: { id: item.id }
		});

		// Image
		if (item.image) {
			const img = this.createElement('img', {
				src: item.image,
				alt: item.label || item.id
			});
			option.appendChild(img);
		}

		// Label (optional, usually shown as tooltip)
		if (item.label) {
			option.title = item.label;
		}

		// Click handler
		this.addEventListener(option, 'click', () => this._handleSelect(item));

		return option;
	}

	/**
	 * Handles item selection
	 * @private
	 * @param {Object} item - Selected item
	 */
	_handleSelect(item) {
		// Update visual selection
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
