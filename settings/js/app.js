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
			title: 'Settings',
			tongueIcon: getResourceURL('pictures/abilities/creatif.png'),
			tongueAlt: 'Settings',
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.SettingsApp = SettingsApp;
