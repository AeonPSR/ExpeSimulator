/**
 * Settings Panel
 *
 * Entry point for the Settings panel.
 */
class SettingsApp {
	constructor() {
		this._panel = null;
		this._init();
	}

	_init() {
		this._panel = new Panel({
			id: 'settings-panel',
			panelClass: 'settings-panel',
			titleKey: 'settings.title',
			title: I18n.t('settings.title'),
			tongueIcon: getResourceURL('pictures/abilities/aeon icons/Aeonian creative.png'),
			tongueAlt: '',
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);

		// When switching to click mode, pin the settings panel if it isn't already.
		// When switching back to hover mode, unpin it.
		document.addEventListener('settings:navmode-change', (e) => {
			if (e.detail.navmode === 'click' && !this._panel._pinned) {
				this._panel._togglePin(this._panel._pinBtn);
			} else if (e.detail.navmode === 'hover' && this._panel._pinned) {
				this._panel._togglePin(this._panel._pinBtn);
			}
		});

		this._page = new SettingsPage();
		this._page.mount(this._panel.getContentArea());
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.SettingsApp = SettingsApp;
