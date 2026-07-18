/**
 * TabContainer Component
 * 
 * A tabbed container that switches between multiple content panels.
 * Each tab has a label and a content area; only one is visible at a time.
 */
class TabContainer extends Component {
	/**
	 * @param {Object} options
	 * @param {Array<{id: string, label: string, i18nKey?: string}>} options.tabs - Tab definitions
	 * @param {string} [options.activeTab] - Initially active tab id
	 */
	constructor(options = {}) {
		super(options);
		this.tabs = options.tabs || [];
		this.activeTab = options.activeTab || (this.tabs[0]?.id ?? null);

		this._tabButtons = {};
		this._tabPanels = {};
	}

	render() {
		this.element = this.createElement('div', { className: 'tab-container' });

		const tabBar = this.createElement('div', { className: 'tab-bar' });
		for (const tab of this.tabs) {
			const attrs = {
				className: 'tab-btn' + (tab.id === this.activeTab ? ' active' : ''),
				dataset: { tab: tab.id }
			};
			if (tab.i18nKey) attrs['data-i18n'] = tab.i18nKey;
			const btn = this.createElement('button', attrs, tab.label);

			this.addEventListener(btn, 'click', () => this._switchTab(tab.id));
			tabBar.appendChild(btn);
			this._tabButtons[tab.id] = btn;
		}
		this.element.appendChild(tabBar);

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

	_switchTab(tabId) {
		if (tabId === this.activeTab) return;

		if (this._tabButtons[this.activeTab]) {
			this._tabButtons[this.activeTab].classList.remove('active');
		}
		if (this._tabPanels[this.activeTab]) {
			this._tabPanels[this.activeTab].classList.remove('active');
		}

		this.activeTab = tabId;
		if (this._tabButtons[tabId]) {
			this._tabButtons[tabId].classList.add('active');
		}
		if (this._tabPanels[tabId]) {
			this._tabPanels[tabId].classList.add('active');
		}
	}

	/**
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
