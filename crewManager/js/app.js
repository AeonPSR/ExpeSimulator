/**
 * Crew Manager Panel
 *
 * Entry point for the Crew Manager panel. Empty for now — content will
 * be added later.
 */
class CrewManagerApp {
	constructor() {
		this._panel = null;
		this._init();
	}

	_init() {
		this._panel = new Panel({
			id: 'crew-manager-panel',
			panelClass: 'crew-manager-panel',
			titleKey: 'crewmanager.title',
			title: I18n.t('crewmanager.title'),
			tongueIcon: getResourceURL('pictures/abilities/shrink.png'),
			tongueAlt: '',
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewManagerApp = CrewManagerApp;
