/**
 * CrewManagerStorage
 *
 * Persists Crew Manager card data and detail options across page reloads.
 */
const CrewManagerStorage = (() => {
	const STORAGE_KEY = 'expe-sim-crew-manager';
	const DEFAULT_STATE = {
		version: 1,
		options: {
			expert: false,
			cycle: false
		},
		players: {}
	};

	function _clone(value) {
		return JSON.parse(JSON.stringify(value));
	}

	function _normalizeState(value) {
		return {
			version: 1,
			options: {
				expert: Boolean(value?.options?.expert),
				cycle: Boolean(value?.options?.cycle)
			},
			players: value?.players && typeof value.players === 'object' ? value.players : {}
		};
	}

	function load() {
		try {
			return _normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
		} catch (_) {
			return _clone(DEFAULT_STATE);
		}
	}

	function save(state) {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_normalizeState(state))); } catch (_) {}
	}

	function saveOptions(options) {
		const state = load();
		state.options = {
			...state.options,
			...options
		};
		save(state);
	}

	function savePlayers(players) {
		const state = load();
		state.players = players && typeof players === 'object' ? players : {};
		save(state);
	}

	function clearPlayers() {
		const state = load();
		state.players = {};
		save(state);
	}

	return {
		load,
		saveOptions,
		savePlayers,
		clearPlayers
	};
})();

if (typeof window !== 'undefined') {
	window.CrewManagerStorage = CrewManagerStorage;
}
