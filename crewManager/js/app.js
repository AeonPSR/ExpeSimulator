/**
 * Crew Manager Panel
 *
 * Entry point for the Crew Manager panel.
 */
class CrewManagerApp {
	constructor() {
		this._panel = null;
		this._skillCardInjector = null;
		this._init();
	}

	_init() {
		this._panel = new Panel({
			id: 'crew-manager-panel',
			panelClass: 'crew-manager-panel',
			titleKey: 'crewmanager.title',
			title: I18n.t('crewmanager.title'),
			tongueIcon: getResourceURL('pictures/abilities/aeon icons/Aeonian shrink.png'),
			tongueAlt: '',
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);

		this._page = new CrewManagerPage();
		this._page.mount(this._panel.getContentArea());

		this._page.setRoleCharacters('admin', [
			'janice.png', 'terrence.png', 'eleesha.png', 'raluca.png', 'finola.png', 'andie.png',
			'frieda.png', 'ian.png', 'stephen.png', 'paola.png', 'jin_su.png', 'hua.png',
			'kuan_ti.png', 'gioele.png', 'chun.png', 'roland.png', 'chao.png', 'derek.png'
		]);
		this._page.setRoleCharacters('commandant', [
			'jin_su.png', 'chao.png', 'gioele.png', 'stephen.png', 'frieda.png', 'kuan_ti.png',
			'hua.png', 'derek.png', 'roland.png', 'raluca.png', 'finola.png', 'paola.png',
			'terrence.png', 'eleesha.png', 'andie.png', 'ian.png', 'janice.png', 'chun.png'
		]);
		this._page.setRoleCharacters('comm', [
			'paola.png', 'eleesha.png', 'andie.png', 'stephen.png', 'janice.png', 'roland.png',
			'hua.png', 'derek.png', 'jin_su.png', 'kuan_ti.png', 'gioele.png', 'chun.png',
			'ian.png', 'finola.png', 'terrence.png', 'frieda.png', 'chao.png', 'raluca.png'
		]);

		this._skillCardInjector = new CrewSkillCardInjector({
			onImport: (filename, abilities) => this.importAvatarAbilities(filename, abilities)
		});
		this._skillCardInjector.start();
	}

	getAvatarGroups() {
		return this._page?.getAvatarGroups?.() || null;
	}

	getAvatarAbilities(filename) {
		return this._page?.getAvatarAbilities?.(filename) || [];
	}

	getAvatarHealth(filename) {
		return this._page?.getAvatarHealth?.(filename) ?? null;
	}

	importAvatarAbilities(filename, abilities) {
		this._page?.importAvatarAbilities?.(filename, abilities);
		const panel = this._panel.element;
		const wasAlreadyOpen = panel.getBoundingClientRect().left >= 0;
		panel.classList.add('import-open');
		document.querySelectorAll('.app-panel').forEach(p => p.classList.remove('panel-on-top'));
		panel.classList.add('panel-on-top');

		const runAnimation = () => {
			this._page?.scrollAndHighlight?.(filename);
			setTimeout(() => panel.classList.remove('import-open'), 1600);
		};
		if (wasAlreadyOpen) {
			runAnimation();
		} else {
			setTimeout(runAnimation, 350);
		}
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewManagerApp = CrewManagerApp;
