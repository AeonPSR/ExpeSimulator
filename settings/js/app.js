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

		this._page = new SettingsPage();
		this._page.mount(this._panel.getContentArea());
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.SettingsApp = SettingsApp;
