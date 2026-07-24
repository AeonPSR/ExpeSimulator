/**
 * Panel Component
 * 
 * The main container for the Expedition Simulator.
 * Creates the sliding panel with tongue (tab) and content area.
 */
class Panel extends Component {
	/**
	 * @param {Object} options
	 * @param {string} [options.id='expedition-simulator'] - Element id for the panel
	 * @param {string} [options.panelClass='app-panel'] - CSS class for the panel
	 * @param {string} [options.title='Expedition Simulator'] - Panel header title
	 * @param {string} [options.titleKey='panel.title'] - I18n key for the title
	 * @param {string} [options.tongueIcon] - URL for the tongue icon image
	 * @param {string} [options.tongueAlt='Panel'] - Alt text for the tongue icon
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
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
		
		this._contentArea = null;
		this._tongue = null;
		this._pinBtn = null;
		this._pinned = false;
	}

	render() {
		this.element = this.createElement('div', {
			id: this.panelId,
			className: 'app-panel ' + this.panelClass
		});

		// Check if we're in test mode and keep panel expanded
		if (this._isTestMode()) {
			this.element.classList.add('test-mode');
		}

		// Tongue is a child of the panel; CSS :hover cascade opens the panel.
		this._tongue = this._createTongue();
		this.element.appendChild(this._tongue);

		const panelMain = this._createPanelMain();
		this.element.appendChild(panelMain);

		return this.element;
	}

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
			if (typeof Settings !== 'undefined' && Settings.navmode === 'click') {
				if (this._pinned) {
					this._forceCollapse();
				} else {
					this._togglePin(this._pinBtn);
				}
			} else {
				this._forceCollapse();
			}
		});

		return tongue;
	}

	_createPanelMain() {
		const panelMain = this.createElement('div', { className: 'panel-main' });

		const header = this._createHeader();
		panelMain.appendChild(header);

		this._contentArea = this.createElement('div', { className: 'panel-content' });
		panelMain.appendChild(this._contentArea);

		return panelMain;
	}

	_createHeader() {
		const header = this.createElement('div', { className: 'panel-header' });

		const left = this.createElement('div', { className: 'panel-header-left' });
		const brand = this.createElement('span', { className: 'panel-brand' }, "Aeon's Lab");
		const bars = this.createElement('span', { className: 'brand-bars' });
		for (let i = 1; i <= 4; i++) {
			bars.appendChild(this.createElement('span', { className: `brand-bar brand-bar--${i}` }));
		}
		brand.appendChild(bars);
		const title = this.createElement('h3', { 'data-i18n': this.titleKey }, I18n.t(this.titleKey));
		left.appendChild(brand);
		left.appendChild(title);
		header.appendChild(left);

		// Collapse button, always present and prominently visible on small screens.
		const closeBtn = this.createElement('button', { className: 'panel-close-btn' }, '×');
		this.addEventListener(closeBtn, 'click', () => this._forceCollapse());
		header.appendChild(closeBtn);

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

	_forceCollapse() {
		if (this._pinned) {
			this._pinned = false;
			this.element.classList.remove('pinned');
			this._pinBtn?.classList.remove('active');
		}
		this.element.classList.remove('import-open');
		this.element.classList.add('force-close');
		this.element.addEventListener('transitionend', () => {
			this.element.classList.remove('force-close');
		}, { once: true });
	}

	_togglePin(pinBtn) {
		this._pinned = !this._pinned;
		if (this._pinned) {
			this.element.classList.add('pinned');
			pinBtn.classList.add('active');
		} else {
			this.element.classList.remove('pinned');
			pinBtn.classList.remove('active');
			// Normal hover behaviour takes over immediately; if the mouse is
			// still over the panel it stays open; if not it slides away on its own.
		}
	}

	/**
	 * Mounts panels into a shared #panels-container so tongue stacking stays centralized.
	 * @param {HTMLElement} [container]
	 * @returns {HTMLElement}
	 */
	mount(container = null) {
		let panelsContainer = document.getElementById('panels-container');
		if (!panelsContainer) {
			panelsContainer = document.createElement('div');
			panelsContainer.id = 'panels-container';
			document.body.insertBefore(panelsContainer, document.body.firstChild);
			if (typeof Settings !== 'undefined') {
				panelsContainer.classList.toggle('aeons-lab', Settings.theme === 'retro');
			}
		}
		const mounted = super.mount(panelsContainer);
		if (typeof Settings !== 'undefined') {
			this.element.classList.toggle('panel--hidden', !Settings.isPanelVisible(this.element.id));
		}
		Panel.repositionTongues();
		return mounted;
	}

	onMount() {
		// Prevent click propagation to underlying page elements
		this._setupClickPrevention();
		// Keep the last-interacted panel on top persistently
		this.addEventListener(this.element, 'mouseenter', () => {
			document.querySelectorAll('.app-panel').forEach(p => p.classList.remove('panel-on-top'));
			this.element.classList.add('panel-on-top');
		});
		// In click mode, a click anywhere outside the panel (and outside any modal) closes it
		this.addEventListener(document, 'click', () => {
			if (typeof Settings !== 'undefined' && Settings.navmode === 'click'
					&& this._pinned && !this.element.classList.contains('modal-open')) {
				this._forceCollapse();
			}
		});
		Panel.repositionTongues();
	}

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

	_setupClickPrevention() {
		const stopPropagation = (event) => event.stopPropagation();
		
		this.addEventListener(this.element, 'click', stopPropagation);
		this.addEventListener(this.element, 'mousedown', stopPropagation);
		this.addEventListener(this.element, 'mouseup', stopPropagation);
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	getContentArea() {
		return this._contentArea;
	}

	/**
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
	 * Removes all mounted content from the panel content area.
	 */
	clearContent() {
		if (this._contentArea) {
			this._contentArea.innerHTML = '';
		}
	}

	/**
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
	 * Marks the panel as collapsed.
	 */
	collapse() {
		this.element?.classList.add('collapsed');
	}

	/**
	 * Marks the panel as expanded.
	 */
	expand() {
		this.element?.classList.remove('collapsed');
	}

	/**
	 * @returns {boolean}
	 */
	isCollapsed() {
		return this.element?.classList.contains('collapsed') || false;
	}

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
