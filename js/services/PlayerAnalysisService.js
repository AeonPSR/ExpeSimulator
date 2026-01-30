/**
 * Player Analysis Service
 * 
 * Analyzes player configurations to extract skill and item statistics.
 * Prepares data for probability calculations and game mechanics.
 */
class PlayerAnalysisService {
	/**
	 * Analyzes all players and returns comprehensive stats
	 * @param {Array<Object>} players - Array of player objects
	 * @returns {Object} Analysis results with skills, items, and player mapping
	 */
	static analyzePlayerConfiguration(players) {
		return {
			skillAnalysis: this.analyzeSkills(players),
			itemAnalysis: this.analyzeItems(players),
			playerCount: players.length,
			timestamp: Date.now()
		};
	}

	/**
	 * Analyzes skills across all players
	 * @param {Array<Object>} players - Array of player objects
	 * @returns {Object} Skill analysis data
	 */
	static analyzeSkills(players) {
		const skillCounts = {};
		const playersBySkill = {};

		players.forEach((player, index) => {
			if (player.abilities && Array.isArray(player.abilities)) {
				player.abilities.forEach(skillIcon => {
					if (!skillIcon) return; // Skip null/empty slots
					
					const skillName = this.iconToSkillName(skillIcon);
					
					// Count occurrences
					skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
					
					// Track which players have this skill (using numerical order as ID)
					if (!playersBySkill[skillName]) {
						playersBySkill[skillName] = [];
					}
					playersBySkill[skillName].push(index);
				});
			}
		});

		return {
			totalSkills: Object.values(skillCounts).reduce((a, b) => a + b, 0),
			skillCounts,
			playersBySkill,
			uniqueSkills: Object.keys(skillCounts).length
		};
	}

	/**
	 * Analyzes items across all players
	 * @param {Array<Object>} players - Array of player objects
	 * @returns {Object} Item analysis data
	 */
	static analyzeItems(players) {
		const itemCounts = {};
		const playersByItem = {};

		players.forEach((player, index) => {
			if (player.items && Array.isArray(player.items)) {
				player.items.forEach(itemIcon => {
					if (!itemIcon) return; // Skip null/empty slots
					
					const itemName = this.iconToItemName(itemIcon);
					
					// Count occurrences
					itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
					
					// Track which players have this item (using numerical order as ID)
					if (!playersByItem[itemName]) {
						playersByItem[itemName] = [];
					}
					playersByItem[itemName].push(index);
				});
			}
		});

		return {
			totalItems: Object.values(itemCounts).reduce((a, b) => a + b, 0),
			itemCounts,
			playersByItem,
			uniqueItems: Object.keys(itemCounts).length
		};
	}

	/**
	 * Converts skill icon filename to skill name
	 * @param {string} icon - Icon filename (e.g., 'survival.png')
	 * @returns {string|null} Skill name (e.g., 'survival') or null if invalid
	 */
	static iconToSkillName(icon) {
		if (!icon) return null;
		return icon.replace('.png', '').toLowerCase();
	}

	/**
	 * Converts item icon filename to item name
	 * @param {string} icon - Icon filename (e.g., 'blaster.png')
	 * @returns {string|null} Item name (e.g., 'blaster') or null if invalid
	 */
	static iconToItemName(icon) {
		if (!icon) return null;
		return icon.replace('.png', '').toLowerCase();
	}
}

// Export
if (typeof window !== 'undefined') {
	window.PlayerAnalysisService = PlayerAnalysisService;
}