/**
 * SettingsPage Component
 *
 * Renders the three settings sections inside the Settings panel:
 * - Language: three flag buttons (EN / FR / ES), radio-button behaviour
 * - Theme: drop-down list (Default / Retro)
 * - Visibility: icon buttons for optional panels
 * - Developer tools: checkbox toggle
 */
class SettingsPage extends Component {
	constructor(options = {}) {
		super(options);
		this._langBtns = {};
	}

	render() {
		this.element = this.createElement('div', { className: 'settings-page' });

		this.element.appendChild(this._renderSection('settings.section.language', this._renderLanguageControls()));
		this.element.appendChild(this._renderSection('settings.section.theme', this._renderThemeControls()));
		this.element.appendChild(this._renderSection('settings.section.visibility', this._renderVisibilityControls()));
		this.element.appendChild(this._renderSection('settings.section.devtools', this._renderDevtoolsControls(), 'settings-section--devtools'));

		this.element.appendChild(this._renderInfoTabs());

		// Keep language buttons in sync when locale changes from any source
		this.addEventListener(document, 'i18n:change', (e) => {
			this._syncLangButtons(e.detail.locale);
		});

		return this.element;
	}

	// Sections

	_renderSection(titleKey, controls, extraClass = '') {
		const section = this.createElement('div', { className: ('settings-section ' + extraClass).trim() });
		const title = this.createElement('h4', { 'data-i18n': titleKey }, I18n.t(titleKey));
		section.appendChild(title);
		section.appendChild(controls);
		return section;
	}

	// Language

	_renderLanguageControls() {
		const row = this.createElement('div', { className: 'settings-lang-row' });

		I18n.supported.forEach(locale => {
			const btn = this.createElement('button', {
				className: 'panel-lang-btn' +
					(I18n.locale === locale ? ' panel-lang-btn--active' : '')
			});
			const img = this.createElement('img', {
				src: getResourceURL(`pictures/ui/${locale}.png`),
				alt: ''
			});
			btn.appendChild(img);
			this.addEventListener(btn, 'click', () => I18n.setLocale(locale));
			this._langBtns[locale] = btn;
			row.appendChild(btn);
		});

		return row;
	}

	_syncLangButtons(locale) {
		Object.entries(this._langBtns).forEach(([l, btn]) => {
			btn.classList.toggle('panel-lang-btn--active', l === locale);
		});
	}

	// Theme

	_renderThemeControls() {
		const select = this.createElement('select', { className: 'settings-theme-select' });
		const optionMap = {};

		const _buildLabel = (theme) => {
			const name = I18n.t(`settings.theme.${theme}`);
			if (theme === 'retro' && Settings.isFirefox) {
				return name + ' — ' + I18n.t('settings.theme.unavailable_firefox');
			}
			return name;
		};

		Settings.themes.forEach(theme => {
			const isUnavailable = theme === 'retro' && Settings.isFirefox;
			const attrs = { value: theme };
			if (isUnavailable) attrs.disabled = true;
			const opt = this.createElement('option', attrs, _buildLabel(theme));
			if (Settings.theme === theme) opt.selected = true;
			optionMap[theme] = opt;
			select.appendChild(opt);
		});

		this.addEventListener(select, 'change', () => Settings.setTheme(select.value));

		// Keep in sync if theme changed via the panel header button
		this.addEventListener(document, 'settings:theme-change', (e) => {
			select.value = e.detail.theme;
		});

		// Re-translate labels (including the Firefox suffix) on locale change
		this.addEventListener(document, 'i18n:change', () => {
			Object.keys(optionMap).forEach(theme => {
				optionMap[theme].textContent = _buildLabel(theme);
			});
		});

		return select;
	}

	// Developer tools

	_renderDevtoolsControls() {
		const row = this.createElement('div', { className: 'settings-devtools-row' });

		const btn = this.createElement('button', {
			className: 'panel-lang-btn' + (Settings.devtools ? ' panel-lang-btn--active' : ''),
		});
		const img = this.createElement('img', {
				src: getResourceURL('pictures/abilities/human/technician.png'),
			alt: ''
		});
		btn.appendChild(img);
		this.addEventListener(btn, 'click', () => {
			Settings.setDevtools(!Settings.devtools);
			btn.classList.toggle('panel-lang-btn--active', Settings.devtools);
		});

		row.appendChild(btn);
		return row;
	}

	// Visibility
	_renderVisibilityControls() {
		const row = this.createElement('div', { className: 'settings-visibility-row' });
		row.appendChild(this._renderPanelVisibilityButton({
			panelId: 'expedition-simulator',
			iconPath: 'pictures/ui/astrophysicist.png'
		}));
		row.appendChild(this._renderPanelVisibilityButton({
			panelId: 'crew-manager-panel',
			iconPath: 'pictures/abilities/aeon icons/Aeonian shrink.png'
		}));
		return row;
	}

	_renderPanelVisibilityButton({ panelId, iconPath }) {
		const panel = document.getElementById(panelId);
		const isVisible = Settings.isPanelVisible(panelId) && !panel?.classList.contains('panel--hidden');
		const btn = this.createElement('button', {
			className: 'panel-lang-btn' + (isVisible ? ' panel-lang-btn--active' : ''),
		});
		const img = this.createElement('img', {
			src: getResourceURL(iconPath),
			alt: ''
		});
		btn.appendChild(img);
		this.addEventListener(btn, 'click', () => {
			const visible = btn.classList.toggle('panel-lang-btn--active');
			Settings.setPanelVisible(panelId, visible);
			const panel = document.getElementById(panelId);
			panel?.classList.toggle('panel--hidden', !visible);
			Panel.repositionTongues();
		});
		return btn;
	}

	// Info Tabs

	_renderInfoTabs() {
		const tabs = new TabContainer({
			tabs: [
				{ id: 'informations', label: I18n.t('settings.tab.informations'), i18nKey: 'settings.tab.informations' },
				{ id: 'patch_notes',  label: I18n.t('settings.tab.patch_notes'),  i18nKey: 'settings.tab.patch_notes'  }
			]
		});
		tabs.render();

		const infoPanel = tabs.getTabPanel('informations');
		this._appendCredits(infoPanel);

		const patchPanel = tabs.getTabPanel('patch_notes');
		this._appendPatchNotes(patchPanel);

		return tabs.element;
	}

	_appendCredits(container) {
		const rebuild = () => {
			const url   = I18n.t('credits.wiki.url');
			const label = I18n.t('credits.wiki.label');
			const credits = new InfoPanel({
				title:    'Aeon\'s Lab - Version 1.1',
				subtitle: I18n.t('credits.subtitle'),
				sections: [
					{
						content: `<p>${I18n.t('credits.warning')} <a href="${url}" target="_blank">${label}</a></p>`
					},
					{
						title:   I18n.t('credits.author.title'),
						content: `<p>${I18n.t('credits.contact')}</p>`
					}
				]
			});
			container.innerHTML = '';
			container.appendChild(credits.render());
		};
		rebuild();
		this.addEventListener(document, 'i18n:change', rebuild);
	}

	_appendPatchNotes(container) {
		const rebuild = () => {
			const notes = new InfoPanel({
				sections: [
					{
						title:   'Version 1.1',
						content: `<p>- ${I18n.t('patch_notes.v1_1.line1')}</p><p>- ${I18n.t('patch_notes.v1_1.line2')}</p><p>- ${I18n.t('patch_notes.v1_1.line3')}</p>`
					},
					{
						title:   'Version 1.0',
						content: `<p>${I18n.t('patch_notes.v1_0.content')}</p>`
					}
				]
			});
			container.innerHTML = '';
			container.appendChild(notes.render());
		};
		rebuild();
		this.addEventListener(document, 'i18n:change', rebuild);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.SettingsPage = SettingsPage;
