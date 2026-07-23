/**
 * ExpeditionStorage
 *
 * Persists expedition simulator state (sectors, players, toggle options)
 * across page reloads.
 */
const ExpeditionStorage = (() => {
	const STORAGE_KEY = 'expe-sim-expedition';

	function _normalizePlayer(p) {
		if (!p || typeof p !== 'object') return null;
		const itemSlots = (typeof Constants !== 'undefined' ? Constants.ITEM_SLOTS : 3);
		return {
			id:     typeof p.id === 'number' ? p.id : 1,
			avatar: typeof p.avatar === 'string' && p.avatar ? p.avatar : 'lambda.png',
			items:  Array.isArray(p.items)
				? [...p.items.slice(0, itemSlots), ...Array(itemSlots).fill(null)].slice(0, itemSlots)
				: Array(itemSlots).fill(null)
			// abilities: re-derived from crew manager on load (not persisted)
			// health:    re-derived from Constants.DEFAULT_HEALTH on load (not persisted)
		};
	}

	function _normalizeState(raw) {
		const rawPlayers = Array.isArray(raw?.players) ? raw.players : null;
		const players    = rawPlayers ? rawPlayers.map(_normalizePlayer).filter(Boolean) : null;
		return {
			version: 1,
			sectors: Array.isArray(raw?.sectors) && raw.sectors.length > 0
				? raw.sectors
				: ['LANDING'],
			players: players && players.length > 0 ? players : null,
			planet: {
				name:      typeof raw?.planet?.name === 'string' ? raw.planet.name : null,
				direction: typeof raw?.planet?.direction === 'string' ? raw.planet.direction : 'North',
				fuelCost:  typeof raw?.planet?.fuelCost === 'number' ? raw.planet.fuelCost : 0
			},
			options: {
				diplomacy: Boolean(raw?.options?.diplomacy),
				antigrav:  Boolean(raw?.options?.antigrav),
				base:      Boolean(raw?.options?.base),
				mode:      raw?.options?.mode === 'patrol' ? 'patrol' : 'icarus'
			}
		};
	}

	function load() {
		try {
			return _normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
		} catch (_) {
			return _normalizeState(null);
		}
	}

	function save(state) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(_normalizeState(state)));
		} catch (_) {}
	}

	return { load, save };
})();

var _global = typeof window !== 'undefined' ? window : self;
_global.ExpeditionStorage = ExpeditionStorage;
