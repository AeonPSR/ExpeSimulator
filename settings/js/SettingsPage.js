/**
 * SettingsPage Component
 *
 * Renders the three settings sections inside the Settings panel:
 * - Language: three flag buttons (EN / FR / ES), radio-button behaviour
 * - Theme: drop-down list (Default / Retro)
 * - Developer tools: checkbox toggle
 */
class SettingsPage extends Component {
	constructor(options = {}) {
		super(options);
		this._langBtns = {};
	}

	render() {
		this.element = this.createElement('div', { className: 'settings-page' });

		this.element.appendChild(this._renderSection('Language', this._renderLanguageControls()));
		this.element.appendChild(this._renderSection('Theme', this._renderThemeControls()));
		this.element.appendChild(this._renderSection('Developer tools', this._renderDevtoolsControls(), 'settings-section--devtools'));

		const visibilitySection = this._renderSection('Visibility', this._renderVisibilityControls(), 'settings-section--devtools');
		this.element.appendChild(visibilitySection);

		const applyDevtools = (enabled) => { visibilitySection.style.display = enabled ? '' : 'none'; };
		applyDevtools(Settings.devtools);
		this.addEventListener(document, 'settings:devtools-change', (e) => applyDevtools(e.detail.devtools));

		// Keep language buttons in sync when locale changes from any source
		this.addEventListener(document, 'i18n:change', (e) => {
			this._syncLangButtons(e.detail.locale);
		});

		return this.element;
	}

	// ─── Sections ────────────────────────────────────────────────────────────

	_renderSection(titleText, controls, extraClass = '') {
		const section = this.createElement('div', { className: ('settings-section ' + extraClass).trim() });
		const title = this.createElement('h4', {}, titleText);
		section.appendChild(title);
		section.appendChild(controls);
		return section;
	}

	// ─── Language ────────────────────────────────────────────────────────────

	_renderLanguageControls() {
		const row = this.createElement('div', { className: 'settings-lang-row' });

		I18n.supported.forEach(locale => {
			const btn = this.createElement('button', {
				className: 'panel-lang-btn' +
					(I18n.locale === locale ? ' panel-lang-btn--active' : ''),
				title: locale.toUpperCase()
			});
			const img = this.createElement('img', {
				src: getResourceURL(`pictures/ui/${locale}.png`),
				alt: locale.toUpperCase()
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

	// ─── Theme ───────────────────────────────────────────────────────────────

	_renderThemeControls() {
		const labels = { default: 'Default', retro: 'Retro' };
		const select = this.createElement('select', { className: 'settings-theme-select' });

		Settings.themes.forEach(theme => {
			const opt = this.createElement('option', { value: theme }, labels[theme] || theme);
			if (Settings.theme === theme) opt.selected = true;
			select.appendChild(opt);
		});

		this.addEventListener(select, 'change', () => Settings.setTheme(select.value));

		// Keep in sync if theme changed via the panel header button
		this.addEventListener(document, 'settings:theme-change', (e) => {
			select.value = e.detail.theme;
		});

		return select;
	}

	// ─── Developer tools ─────────────────────────────────────────────────────

	_renderDevtoolsControls() {
		const row = this.createElement('div', { className: 'settings-devtools-row' });

		const btn = this.createElement('button', {
			className: 'panel-lang-btn' + (Settings.devtools ? ' panel-lang-btn--active' : ''),
			title: 'Developer tools'
		});
		const img = this.createElement('img', {
			src: getResourceURL('pictures/abilities/technician.png'),
			alt: 'Developer tools'
		});
		btn.appendChild(img);
		this.addEventListener(btn, 'click', () => {
			Settings.setDevtools(!Settings.devtools);
			btn.classList.toggle('panel-lang-btn--active', Settings.devtools);
		});

		row.appendChild(btn);
		return row;
	}

	// ─── Visibility ──────────────────────────────────────────────────────────

	_renderVisibilityControls() {
		const row = this.createElement('div', { className: 'settings-devtools-row' });

		const btn = this.createElement('button', {
			className: 'panel-lang-btn panel-lang-btn--active',
			title: 'Expedition Simulator'
		});
		const img = this.createElement('img', {
			src: getResourceURL('pictures/ui/astrophysicist.png'),
			alt: 'Expedition Simulator'
		});
		btn.appendChild(img);
		this.addEventListener(btn, 'click', () => {
			const visible = btn.classList.toggle('panel-lang-btn--active');
			const panel = document.getElementById('expedition-simulator');
			if (panel) panel.classList.toggle('panel--hidden', !visible);
			Panel.repositionTongues();
		});

		row.appendChild(btn);
		return row;
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.SettingsPage = SettingsPage;
