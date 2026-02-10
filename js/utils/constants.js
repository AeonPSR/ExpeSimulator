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

	// CSS Classes
	CSS: {
		DIPLOMACY_ACTIVE: 'diplomacy-active',
		SECTOR_DISABLED: 'sector-disabled'
	}
};

// Export
if (typeof window !== 'undefined') {
	window.Constants = Constants;
}
