/**
 * Static Data: Combat Rewards
 *
 * Drop tables for each sector that can yield a combat reward.
 * Keyed by sector name (must match sectorName values in config.js).
 *
 * Structure:
 *   tables[SECTOR_NAME].lots  — array of possible reward lots
 *   lot.weight                — relative probability weight
 *   lot.items                 — array of { id, qty } reward items
 *
 * Item IDs reference consumable assets in pictures/consumables/.
 */
const CombatRewardData = {

	/**
	 * Item IDs referenced by the drop tables below.
	 * Central place to update if the game ever renames an item.
	 */
	ITEMS: {
		ALIEN_STEAK: 'ALIEN_STEAK',
		FRUIT:       'FRUIT',
		ARTEFACT:    'ARTEFACT',
		STARMAP:     'STARMAP',
	},

	tables: {

		// 3, 4 or 5 steaks — equal probability
		RUMINANT: {
			lots: [
				{ weight: 1, items: [{ id: 'ALIEN_STEAK', qty: 3 }] },
				{ weight: 1, items: [{ id: 'ALIEN_STEAK', qty: 4 }] },
				{ weight: 1, items: [{ id: 'ALIEN_STEAK', qty: 5 }] },
			]
		},

		// 1 fruit
		INSECT: {
			lots: [
				{ weight: 1, items: [{ id: 'FRUIT', qty: 1 }] },
			]
		},

		// 1 steak
		PREDATOR: {
			lots: [
				{ weight: 1, items: [{ id: 'ALIEN_STEAK', qty: 1 }] },
			]
		},

		// 1 artifact
		INTELLIGENT: {
			lots: [
				{ weight: 1, items: [{ id: 'ARTEFACT', qty: 1 }] },
			]
		},

		// 1 artifact
		WRECK: {
			lots: [
				{ weight: 1, items: [{ id: 'ARTEFACT', qty: 1 }] },
			]
		},

		// 1 artifact (66%) or 2 artifacts (33%)
		RUINS: {
			lots: [
				{ weight: 2, items: [{ id: 'ARTEFACT', qty: 1 }] },
				{ weight: 1, items: [{ id: 'ARTEFACT', qty: 2 }] },
			]
		},

		// 1 crystal map shard
		CRISTAL_FIELD: {
			lots: [
				{ weight: 1, items: [{ id: 'STARMAP', qty: 1 }] },
			]
		},

		// 1 crystal map shard (33%) or 3 artifacts (66%)
		MANKAROG: {
			lots: [
				{ weight: 1, items: [{ id: 'STARMAP',   qty: 1 }] },
				{ weight: 2, items: [{ id: 'ARTEFACT',  qty: 3 }] },
			]
		},
	},
};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.CombatRewardData = CombatRewardData;
