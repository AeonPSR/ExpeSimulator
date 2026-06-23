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
	 * @param {string} [options.id='expedition-simulator'] - Element id for the panel
	 * @param {string} [options.panelClass='app-panel'] - CSS class for the panel
	 * @param {string} [options.title='Expedition Simulator'] - Panel header title
	 * @param {string} [options.tongueIcon] - URL for the tongue icon image
	 * @param {string} [options.tongueAlt='Panel'] - Alt text for the tongue icon
	 * @param {Function} [options.getResourceURL] - Function to resolve resource URLs
	 */
	constructor(options = {}) {
		super(options);
		this.panelId = options.id || 'expedition-simulator';
		this.panelClass = options.panelClass || 'expedition-panel';
		this.title = options.title || I18n.t('panel.title');
		this.titleKey = options.titleKey || 'panel.title';
		this.tongueIcon = options.tongueIcon || null;
		this.tongueAlt = options.tongueAlt || 'Panel';
		this.getResourceURL = options.getResourceURL || ((path) => path);
		
		// References to key internal elements
		this._contentArea = null;
		this._tongue = null;
		this._pinBtn = null;
		this._pinned = false;
	}

	/**
	 * Creates the panel DOM structure
	 * @returns {HTMLElement}
	 */
	render() {
		// Main panel container
		this.element = this.createElement('div', {
			id: this.panelId,
			className: 'app-panel ' + this.panelClass
		});

		// Check if we're in test mode and keep panel expanded
		if (this._isTestMode()) {
			this.element.classList.add('test-mode');
		}

		// Tongue is a child of the panel — CSS :hover cascade opens the panel
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
				alt: this.tongueAlt
			});
			tongue.appendChild(img);
		}

		this.addEventListener(tongue, 'click', () => {
			// Unpin if currently pinned
			if (this._pinned) {
				this._pinned = false;
				this.element.classList.remove('pinned');
				this._pinBtn?.classList.remove('active');
			}
			// Clear any import-open that may have survived a pinned import
			this.element.classList.remove('import-open');
			// Close immediately, then restore normal hover behaviour
			this.element.classList.add('force-close');
			this.element.addEventListener('transitionend', () => {
				this.element.classList.remove('force-close');
			}, { once: true });
		});

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

		const left = this.createElement('div', { className: 'panel-header-left' });
		const brand = this.createElement('span', { className: 'panel-brand' }, "Aeon's Lab");
		const title = this.createElement('h3', { 'data-i18n': this.titleKey }, I18n.t(this.titleKey));
		left.appendChild(brand);
		left.appendChild(title);
		header.appendChild(left);

		// Pin button to lock the panel open
		this._pinBtn = this.createElement('button', {
			className: 'panel-pin-btn',
		});
		const pinImg = this.createElement('img', {
			src: this.getResourceURL('pictures/ui/pin.png'),
			alt: ''
		});
		this._pinBtn.appendChild(pinImg);
		this.addEventListener(this._pinBtn, 'click', () => this._togglePin(this._pinBtn));
		header.appendChild(this._pinBtn);

		return header;
	}

	/**
	 * Toggles the pinned state of the panel
	 * @private
	 * @param {HTMLElement} pinBtn
	 */
	_togglePin(pinBtn) {
		this._pinned = !this._pinned;
		if (this._pinned) {
			this.element.classList.add('pinned');
			pinBtn.classList.add('active');
		} else {
			this.element.classList.remove('pinned');
			pinBtn.classList.remove('active');
			// Normal hover behaviour takes over immediately — if the mouse is
			// still over the panel it stays open; if not it slides away on its own.
		}
	}

	/**
	 * Overrides Component.mount() to place panels into a shared #panels-container.
	 * nth-child CSS then handles tongue stacking automatically.
	 * @param {HTMLElement} [container]
	 * @returns {HTMLElement}
	 */
	mount(container = null) {
		let panelsContainer = document.getElementById('panels-container');
		if (!panelsContainer) {
			panelsContainer = document.createElement('div');
			panelsContainer.id = 'panels-container';
			document.body.insertBefore(panelsContainer, document.body.firstChild);
		}
		return super.mount(panelsContainer);
	}

	/**
	 * Lifecycle hook - setup after mounting
	 */
	onMount() {
		// Prevent click propagation to underlying page elements
		this._setupClickPrevention();
		// Keep the last-interacted panel on top persistently
		this.addEventListener(this.element, 'mouseenter', () => {
			document.querySelectorAll('.app-panel').forEach(p => p.classList.remove('panel-on-top'));
			this.element.classList.add('panel-on-top');
		});
		Panel.repositionTongues();
	}

	/**
	 * Recalculates and sets the vertical position of every panel tongue.
	 * Visible panels are stacked and centered; hidden panels are ignored.
	 * Call this whenever a panel is added or its visibility changes.
	 * @static
	 */
	static repositionTongues() {
		const TONGUE_HEIGHT = 60;
		const GAP = 8;
		const SLOT = TONGUE_HEIGHT + GAP; // 68px per panel slot

		const allPanels = Array.from(document.querySelectorAll('#panels-container .app-panel'));
		const visiblePanels = allPanels.filter(p => !p.classList.contains('panel--hidden'));
		const n = visiblePanels.length;

		visiblePanels.forEach((panel, i) => {
			const tongue = panel.querySelector('.panel-tongue');
			if (!tongue) return;
			// Center the stack: top of tongue i = 50% - tongueHeight/2 + (i - (n-1)/2) * SLOT
			const topPx = -(TONGUE_HEIGHT / 2) + (i - (n - 1) / 2) * SLOT;
			tongue.style.top = `calc(50% + ${topPx}px)`;
			tongue.style.transform = 'none';
		});
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

	/**
	 * Checks if we're running in test mode (test.html page)
	 * @private
	 * @returns {boolean}
	 */
	_isTestMode() {
		// Check if we're in test.html or if document title contains "Test Page"
		return window.location.pathname.includes('test.html') || 
		       document.title.includes('Test Page');
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.Panel = Panel;
}
