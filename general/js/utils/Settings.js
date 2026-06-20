/**
 * Settings — Application settings singleton.
 *
 * Manages persisted user preferences: theme and developer tools toggle.
 *
 * Usage:
 *   Settings.theme                       → current theme ('default' | 'retro')
 *   Settings.setTheme('retro')           → apply theme + persist + fire event
 *   Settings.devtools                    → boolean
 *   Settings.setDevtools(true)           → persist + fire event
 *
 * Events dispatched on document:
 *   'settings:theme-change'   → { detail: { theme } }
 *   'settings:devtools-change' → { detail: { devtools } }
 */
const Settings = (() => {
	const THEMES = ['retro', 'default'];
	const STORAGE = {
		THEME: 'expe-sim-theme',
		DEVTOOLS: 'expe-sim-devtools'
	};

	const _isFirefox = /Firefox\//.test(navigator.userAgent);

	let _theme = _isFirefox ? 'default' : 'retro';
	let _devtools = false;

	// Restore persisted values
	try {
		const t = localStorage.getItem(STORAGE.THEME);
		if (t && THEMES.includes(t) && !(t === 'retro' && _isFirefox)) _theme = t;
		const d = localStorage.getItem(STORAGE.DEVTOOLS);
		if (d !== null) _devtools = d === 'true';
	} catch (_) { /* storage unavailable in some contexts */ }

	function _applyTheme(theme) {
		document.body.classList.toggle('retro-theme', theme === 'retro');
	}

	// Apply persisted theme immediately on load
	_applyTheme(_theme);

	return {
		get theme() { return _theme; },
		get devtools() { return _devtools; },
		get themes() { return [...THEMES]; },
		get isFirefox() { return _isFirefox; },

		/**
		 * Switches the active theme, persists, and dispatches 'settings:theme-change'.
		 * @param {string} theme - 'default' or 'retro'
		 */
		setTheme(theme) {
			if (!THEMES.includes(theme)) return;
			if (theme === 'retro' && _isFirefox) return;
			_theme = theme;
			try { localStorage.setItem(STORAGE.THEME, theme); } catch (_) {}
			_applyTheme(theme);
			document.dispatchEvent(new CustomEvent('settings:theme-change', { detail: { theme } }));
		},

		/**
		 * Toggles developer tools mode, persists, and dispatches 'settings:devtools-change'.
		 * @param {boolean} enabled
		 */
		setDevtools(enabled) {
			_devtools = !!enabled;
			try { localStorage.setItem(STORAGE.DEVTOOLS, String(_devtools)); } catch (_) {}
			document.dispatchEvent(new CustomEvent('settings:devtools-change', { detail: { devtools: _devtools } }));
		}
	};
})();

var _global = typeof window !== 'undefined' ? window : self;
_global.Settings = Settings;
