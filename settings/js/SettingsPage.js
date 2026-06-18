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
		this.element.appendChild(this._renderSection('Developer tools', this._renderDevtoolsControls()));

		// Keep language buttons in sync when locale changes from any source
		this.addEventListener(document, 'i18n:change', (e) => {
			this._syncLangButtons(e.detail.locale);
		});

		return this.element;
	}

	// ─── Sections ────────────────────────────────────────────────────────────

	_renderSection(titleText, controls) {
		const section = this.createElement('div', { className: 'settings-section' });
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
		const id = 'settings-devtools-checkbox';

		const checkbox = this.createElement('input', {
			type: 'checkbox',
			id,
			className: 'settings-devtools-checkbox'
		});
		if (Settings.devtools) checkbox.checked = true;
		this.addEventListener(checkbox, 'change', () => Settings.setDevtools(checkbox.checked));

		const label = this.createElement('label', { 'for': id, className: 'settings-devtools-label' },
			'Enable developer tools');

		row.appendChild(checkbox);
		row.appendChild(label);
		return row;
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.SettingsPage = SettingsPage;
