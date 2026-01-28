/**
 * Panel Component
 * 
 * The main container for the Expedition Simulator.
 * Creates the sliding panel with tongue (tab) and content area.
 * 
 * Structure:
 * - panel-tongue: Clickable tab to expand/collapse
 * - panel-main: Main panel body
 *   - panel-header: Title bar
 *   - panel-content: Scrollable content area (child components go here)
 */
class Panel extends Component {
	/**
	 * @param {Object} options
	 * @param {string} [options.title='Expedition Simulator'] - Panel header title
	 * @param {string} [options.tongueIcon] - URL for the tongue icon image
	 * @param {Function} [options.getResourceURL] - Function to resolve resource URLs
	 */
	constructor(options = {}) {
		super(options);
		this.title = options.title || 'Expedition Simulator';
		this.tongueIcon = options.tongueIcon || null;
		this.getResourceURL = options.getResourceURL || ((path) => path);
		
		// References to key internal elements
		this._contentArea = null;
		this._tongue = null;
	}

	/**
	 * Creates the panel DOM structure
	 * @returns {HTMLElement}
	 */
	render() {
		// Main panel container
		this.element = this.createElement('div', {
			id: 'expedition-simulator',
			className: 'expedition-panel'
		});

		// Panel tongue (expand tab)
		this._tongue = this._createTongue();
		this.element.appendChild(this._tongue);

		// Main panel body
		const panelMain = this._createPanelMain();
		this.element.appendChild(panelMain);

		return this.element;
	}

	/**
	 * Creates the tongue (tab) element
	 * @private
	 * @returns {HTMLElement}
	 */
	_createTongue() {
		const tongue = this.createElement('div', { className: 'panel-tongue' });

		if (this.tongueIcon) {
			const img = this.createElement('img', {
				src: this.tongueIcon,
				alt: 'Expedition'
			});
			tongue.appendChild(img);
		}

		return tongue;
	}

	/**
	 * Creates the main panel body
	 * @private
	 * @returns {HTMLElement}
	 */
	_createPanelMain() {
		const panelMain = this.createElement('div', { className: 'panel-main' });

		// Header
		const header = this._createHeader();
		panelMain.appendChild(header);

		// Content area
		this._contentArea = this.createElement('div', { className: 'panel-content' });
		panelMain.appendChild(this._contentArea);

		return panelMain;
	}

	/**
	 * Creates the header element
	 * @private
	 * @returns {HTMLElement}
	 */
	_createHeader() {
		const header = this.createElement('div', { className: 'panel-header' });
		
		const title = this.createElement('h3', {}, this.title);
		header.appendChild(title);

		return header;
	}

	/**
	 * Lifecycle hook - setup after mounting
	 */
	onMount() {
		// Prevent click propagation to underlying page elements
		this._setupClickPrevention();
	}

	/**
	 * Prevents clicks from propagating to underlying page
	 * @private
	 */
	_setupClickPrevention() {
		const stopPropagation = (event) => event.stopPropagation();
		
		this.addEventListener(this.element, 'click', stopPropagation);
		this.addEventListener(this.element, 'mousedown', stopPropagation);
		this.addEventListener(this.element, 'mouseup', stopPropagation);
	}

	/**
	 * Gets the content area element where child components should be mounted
	 * @returns {HTMLElement}
	 */
	getContentArea() {
		return this._contentArea;
	}

	/**
	 * Adds a section to the panel content
	 * @param {HTMLElement|Component} content - Element or component to add
	 */
	addContent(content) {
		if (!this._contentArea) {
			throw new Error('Panel must be rendered before adding content');
		}

		if (content instanceof Component) {
			content.mount(this._contentArea);
		} else if (content instanceof HTMLElement) {
			this._contentArea.appendChild(content);
		}
	}

	/**
	 * Clears all content from the panel
	 */
	clearContent() {
		if (this._contentArea) {
			this._contentArea.innerHTML = '';
		}
	}

	/**
	 * Sets the panel title
	 * @param {string} title
	 */
	setTitle(title) {
		this.title = title;
		const titleElement = this.querySelector('.panel-header h3');
		if (titleElement) {
			titleElement.textContent = title;
		}
	}

	/**
	 * Programmatically collapse the panel
	 */
	collapse() {
		this.element?.classList.add('collapsed');
	}

	/**
	 * Programmatically expand the panel
	 */
	expand() {
		this.element?.classList.remove('collapsed');
	}

	/**
	 * Check if panel is collapsed
	 * @returns {boolean}
	 */
	isCollapsed() {
		return this.element?.classList.contains('collapsed') || false;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.Panel = Panel;
}
