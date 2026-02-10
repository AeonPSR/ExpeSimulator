/**
 * LoadoutBuilder
 * 
 * BACKEND SERVICE: Builds loadout data from player state.
 * Converts UI identifiers (filenames) to backend identifiers.
 * 
 * @module services/LoadoutBuilder
 */
const LoadoutBuilder = {

	/**
	 * Builds a combined loadout from all players.
	 * Merges all abilities and items, converts to backend identifiers.
	 * 
	 * @param {Array<Object>} players - Array of player objects
	 * @param {Object} settings - { antigravActive: boolean }
	 * @returns {Object} { abilities: [], items: [], projects: [] }
	 */
	build(players, settings = {}) {
		const abilities = new Set();
		const items = new Set();
		const projects = [];

		for (const player of players) {
			this._collectAbilities(player, abilities);
			this._collectItems(player, items);
		}

		// Add project-based modifiers
		if (settings.antigravActive) {
			projects.push('ANTIGRAV_PROPELLER');
		}

		return {
			abilities: [...abilities],
			items: [...items],
			projects: projects
		};
	},

	/**
	 * Collects abilities from a player, converting to identifiers.
	 * Skillful expands to include DIPLOMACY effect.
	 * @private
	 */
	_collectAbilities(player, abilities) {
		for (const ability of player.abilities || []) {
			if (ability) {
				const id = this.filenameToId(ability);
				abilities.add(id);
				// Skillful grants Diplomacy effect
				if (id === 'SKILLFUL') {
					abilities.add('DIPLOMACY');
				}
			}
		}
	},

	/**
	 * Collects items from a player, converting to identifiers.
	 * @private
	 */
	_collectItems(player, items) {
		for (const item of player.items || []) {
			if (item) {
				items.add(this.filenameToId(item));
			}
		}
	},

	/**
	 * Converts a filename to a backend identifier.
	 * 'pilot.png' -> 'PILOT'
	 * 'white_flag.jpg' -> 'WHITE_FLAG'
	 * 
	 * @param {string} filename - The filename (e.g., 'pilot.png')
	 * @returns {string} The identifier (e.g., 'PILOT')
	 */
	filenameToId(filename) {
		return filenameToId(filename);
	},

	/**
	 * Converts an identifier back to a filename.
	 * 'PILOT' -> 'pilot.png'
	 * 'WHITE_FLAG' -> 'white_flag.jpg'
	 * 
	 * @param {string} id - The identifier
	 * @param {string} extension - File extension (default: 'png')
	 * @returns {string} The filename
	 */
	idToFilename(id, extension = 'png') {
		return id.toLowerCase() + '.' + extension;
	}
};

// Export
if (typeof window !== 'undefined') {
	window.LoadoutBuilder = LoadoutBuilder;
}
