/**
 * Project Manager Panel
 *
 * Entry point for the Project Manager panel.
 */
class ProjectManagerApp {
	constructor() {
		this._panel = null;
		this._init();
	}

	_init() {
		this._panel = new Panel({
			id: 'project-manager-panel',
			panelClass: 'project-manager-panel',
			titleKey: 'projectmanager.title',
			title: I18n.t('projectmanager.title'),
			tongueIcon: getResourceURL('pictures/abilities/aeon icons/Aeonian concepteur.png'),
			tongueAlt: '',
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);

		this._page = new ProjectManagerPage();
		this._page.mount(this._panel.getContentArea());
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.ProjectManagerApp = ProjectManagerApp;
