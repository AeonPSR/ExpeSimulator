/**
 * I18n — Lightweight internationalisation singleton.
 *
 * Usage:
 *   I18n.t('key')                       → translated string in current locale
 *   I18n.t('key', { count: 5 })         → with variable interpolation
 *   I18n.setLocale('fr')                → switch language; fires 'i18n:change'
 *   I18n.locale                         → current locale string ('en'|'fr'|'es')
 *
 * Fallback chain: requested locale → 'en' → raw key (so missing translations
 * are visible but never break the UI).
 *
 * Variable interpolation uses {varName} placeholders:
 *   Translations.en['sectors.header'] = 'Selected Expedition ({regular}/{max})'
 *   I18n.t('sectors.header', { regular: 3, max: 20 }) → 'Selected Expedition (3/20)'
 */
const I18n = (() => {
	const SUPPORTED = ['en', 'fr', 'es'];
	const STORAGE_KEY = 'expe-sim-locale';

	let _locale = 'en';

	// Restore previously chosen locale if available
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved && SUPPORTED.includes(saved)) _locale = saved;
	} catch (_) { /* storage unavailable in some contexts */ }

	return {
		get locale() { return _locale; },
		get supported() { return SUPPORTED; },

		/**
		 * Returns the translated string for key in the current locale.
		 * Falls back to English, then returns the raw key.
		 * @param {string} key
		 * @param {Object} [vars] - Variable substitution map
		 * @returns {string}
		 */
		t(key, vars = {}) {
			const dict = (typeof Translations !== 'undefined') ? Translations : {};
			const str =
				dict[_locale]?.[key] ??
				dict['en']?.[key] ??
				key;

			return str.replace(/\{(\w+)\}/g, (_, k) =>
				Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{${k}}`
			);
		},

		/**
		 * Switches the active locale and dispatches an 'i18n:change' event
		 * on document so all components can re-render their strings.
		 * @param {string} locale
		 */
		setLocale(locale) {
			if (!SUPPORTED.includes(locale)) return;
			_locale = locale;
			try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}
			document.dispatchEvent(new CustomEvent('i18n:change', { detail: { locale } }));
		},

		/**
		 * Cycles to the next supported locale (used by the toggle button).
		 */
		cycleLocale() {
			const idx = SUPPORTED.indexOf(_locale);
			this.setLocale(SUPPORTED[(idx + 1) % SUPPORTED.length]);
		}
	};
})();

// ─── DOM attribute refresh ───────────────────────────────────────────────────
// Any element with data-i18n="key" will have its textContent updated
// automatically on every locale change — no component-level listener needed
// for static labels.
document.addEventListener('i18n:change', () => {
	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.dataset.i18n;
		const vars = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : {};
		el.textContent = I18n.t(key, vars);
	});
});

if (typeof window !== 'undefined') {
	window.I18n = I18n;
}
