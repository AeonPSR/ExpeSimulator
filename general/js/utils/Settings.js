/**
 * Settings application settings singleton.
 *
 * Manages persisted user preferences: theme and developer tools toggle.
 *
 * Events dispatched on document:
 *   'settings:theme-change': { detail: { theme } }
 *   'settings:devtools-change': { detail: { devtools } }
 *   'settings:panel-visibility-change': { detail: { panelId, visible } }
 *   'settings:navmode-change': { detail: { navmode } }
 */
const Settings = (() => {
	const THEMES = ['retro', 'default'];
	const NAVMODES = ['hover', 'click'];
	const STORAGE = {
		THEME: 'expe-sim-theme',
		DEVTOOLS: 'expe-sim-devtools',
		PANEL_VISIBILITY: 'expe-sim-panel-visibility',
		NAVMODE: 'expe-sim-navmode'
	};

	const _isFirefox = /Firefox\//.test(navigator.userAgent);

	let _theme = _isFirefox ? 'default' : 'retro';
	let _devtools = false;
	let _panelVisibility = {};
	let _navmode = 'hover';

	// Restore persisted values
	try {
		const t = localStorage.getItem(STORAGE.THEME);
		if (t && THEMES.includes(t) && !(t === 'retro' && _isFirefox)) _theme = t;
		const d = localStorage.getItem(STORAGE.DEVTOOLS);
		if (d !== null) _devtools = d === 'true';
		const panelVisibility = JSON.parse(localStorage.getItem(STORAGE.PANEL_VISIBILITY) || '{}');
		if (panelVisibility && typeof panelVisibility === 'object') _panelVisibility = panelVisibility;
		const n = localStorage.getItem(STORAGE.NAVMODE);
		if (n && NAVMODES.includes(n)) _navmode = n;
	} catch (_) { /* storage unavailable in some contexts */ }

	function _applyTheme(theme) {
		const container = document.getElementById('panels-container');
		if (container) container.classList.toggle('aeons-lab', theme === 'retro');
	}

	function _applyNavmode(navmode) {
		document.body.classList.toggle('panel-click-mode', navmode === 'click');
	}

	// Apply persisted settings immediately on load
	_applyTheme(_theme);
	_applyNavmode(_navmode);

	return {
		get theme() { return _theme; },
		get devtools() { return _devtools; },
		get navmode() { return _navmode; },
		get themes() { return [...THEMES]; },
		get isFirefox() { return _isFirefox; },

		isPanelVisible(panelId) {
			return _panelVisibility[panelId] !== false;
		},

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
		},

		setPanelVisible(panelId, visible) {
			_panelVisibility[panelId] = !!visible;
			try { localStorage.setItem(STORAGE.PANEL_VISIBILITY, JSON.stringify(_panelVisibility)); } catch (_) {}
			document.dispatchEvent(new CustomEvent('settings:panel-visibility-change', { detail: { panelId, visible: _panelVisibility[panelId] } }));
		},

		/**
		 * Switches navigation mode, persists, applies body class, and dispatches 'settings:navmode-change'.
		 * @param {'hover'|'click'} navmode
		 */
		setNavmode(navmode) {
			if (!NAVMODES.includes(navmode)) return;
			_navmode = navmode;
			try { localStorage.setItem(STORAGE.NAVMODE, navmode); } catch (_) {}
			_applyNavmode(navmode);
			document.dispatchEvent(new CustomEvent('settings:navmode-change', { detail: { navmode } }));
		}
	};
})();

var _global = typeof window !== 'undefined' ? window : self;
_global.Settings = Settings;
