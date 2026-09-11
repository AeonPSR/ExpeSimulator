/**
 * Project Manager Panel
 *
 * Entry point for the Project Manager panel.
 */
class ProjectManagerApp {
	constructor() {
		this._panel = null;
		this._messageInjector = null;
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

		this._messageInjector = new ProjectMessageInjector({
			onImport: projectNames => this._onImportProjects(projectNames)
		});
		window.chatMessageScanner.register(this._messageInjector);

		const applyImportButtonsVisibility = () => {
			const visible = typeof Settings === 'undefined' || Settings.isPanelVisible('project-manager-panel');
			document.body.classList.toggle('project-manager-panel-hidden', !visible);
		};
		applyImportButtonsVisibility();
		document.addEventListener('settings:panel-visibility-change', event => {
			if (event.detail.panelId === 'project-manager-panel') applyImportButtonsVisibility();
		});
	}

	_onImportProjects(projectNames) {
		this._page.replaceActiveProjects(projectNames);

		const panel = this._panel.element;
		const wasAlreadyOpen = panel.getBoundingClientRect().left >= 0;
		panel.classList.add('import-open');
		document.querySelectorAll('.app-panel').forEach(element => element.classList.remove('panel-on-top'));
		panel.classList.add('panel-on-top');

		const focusActiveProjects = () => {
			this._page.focusActiveProjects();
			setTimeout(() => panel.classList.remove('import-open'), 1600);
		};
		if (wasAlreadyOpen) {
			focusActiveProjects();
		} else {
			panel.addEventListener('transitionend', focusActiveProjects, { once: true });
		}
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.ProjectManagerApp = ProjectManagerApp;
