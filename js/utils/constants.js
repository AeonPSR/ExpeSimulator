/**
 * Application Constants
 */
const Constants = {
	// Expedition limits
	MAX_SECTORS: 20,
	MAX_PLAYERS: 8,

	// Player defaults
	DEFAULT_HEALTH: 14,
	DEFAULT_AVATAR: 'lambda_f.png',
	ABILITY_SLOTS: 4,
	ITEM_SLOTS: 3,

	// Grid settings
	SECTOR_GRID_COLUMNS: 5,
	SELECTED_GRID_COLUMNS: 5,
	CHARACTER_GRID_COLUMNS: 6,

	// Scenario keys (used across probability and display layers)
	SCENARIO_KEYS: ['pessimist', 'average', 'optimist', 'worstCase'],

	// CSS Classes
	CSS: {
		DIPLOMACY_ACTIVE: 'diplomacy-active',
		SECTOR_DISABLED: 'sector-disabled'
	},

	// Ability aliases: abilities that grant effects of other abilities
	ABILITY_ALIASES: {
		SKILLFUL: ['DIPLOMACY', 'BOTANIC']
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.Constants = Constants;
