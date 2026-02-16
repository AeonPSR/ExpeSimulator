/**
 * TabContainer Component
 * 
 * A tabbed container that switches between multiple content panels.
 * Each tab has a label and a content area; only one is visible at a time.
 * 
 * Features:
 * - Horizontal tab bar with active indicator
 * - Smooth tab switching
 * - Lazy content — tab panels are always in the DOM, just hidden
 * - Returns panel elements so parent can mount components into them
 */
class TabContainer extends Component {
	/**
	 * @param {Object} options
	 * @param {Array<{id: string, label: string}>} options.tabs - Tab definitions
	 * @param {string} [options.activeTab] - ID of initially active tab (defaults to first)
	 */
	constructor(options = {}) {
		super(options);
		this.tabs = options.tabs || [];
		this.activeTab = options.activeTab || (this.tabs[0]?.id ?? null);

		this._tabButtons = {};
		this._tabPanels = {};
	}

	/**
	 * Creates the tab container DOM structure
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'tab-container' });

		// Tab bar
		const tabBar = this.createElement('div', { className: 'tab-bar' });
		for (const tab of this.tabs) {
			const btn = this.createElement('button', {
				className: 'tab-btn' + (tab.id === this.activeTab ? ' active' : ''),
				dataset: { tab: tab.id }
			}, tab.label);

			this.addEventListener(btn, 'click', () => this._switchTab(tab.id));
			tabBar.appendChild(btn);
			this._tabButtons[tab.id] = btn;
		}
		this.element.appendChild(tabBar);

		// Tab panels
		for (const tab of this.tabs) {
			const panel = this.createElement('div', {
				className: 'tab-panel' + (tab.id === this.activeTab ? ' active' : ''),
				dataset: { tabPanel: tab.id }
			});
			this.element.appendChild(panel);
			this._tabPanels[tab.id] = panel;
		}

		return this.element;
	}

	/**
	 * Switches to the given tab
	 * @private
	 * @param {string} tabId
	 */
	_switchTab(tabId) {
		if (tabId === this.activeTab) return;

		// Deactivate old tab
		if (this._tabButtons[this.activeTab]) {
			this._tabButtons[this.activeTab].classList.remove('active');
		}
		if (this._tabPanels[this.activeTab]) {
			this._tabPanels[this.activeTab].classList.remove('active');
		}

		// Activate new tab
		this.activeTab = tabId;
		if (this._tabButtons[tabId]) {
			this._tabButtons[tabId].classList.add('active');
		}
		if (this._tabPanels[tabId]) {
			this._tabPanels[tabId].classList.add('active');
		}
	}

	/**
	 * Gets the content panel element for a given tab ID.
	 * Use this to mount components into a specific tab.
	 * @param {string} tabId
	 * @returns {HTMLElement|null}
	 */
	getTabPanel(tabId) {
		return this._tabPanels[tabId] || null;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.TabContainer = TabContainer;
}
