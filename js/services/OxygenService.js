/**
 * OxygenService
 * 
 * Determines which players can participate in an expedition based on oxygen.
 * A player can participate if:
 * - The planet has an OXYGEN sector, OR
 * - The player has a spacesuit item
 * 
 * Players who cannot participate are "stuck in ship" and excluded from all calculations.
 */
class OxygenService {
	/**
	 * Checks if the planet has oxygen (OXYGEN sector selected)
	 * @param {Array<string>} sectors - Selected sector names
	 * @returns {boolean}
	 */
	static planetHasOxygen(sectors) {
		return sectors.includes('OXYGEN');
	}

	/**
	 * Checks if a player has a spacesuit
	 * @param {Object} player - Player object with items array
	 * @returns {boolean}
	 */
	static playerHasSpacesuit(player) {
		if (!player.items || !Array.isArray(player.items)) {
			return false;
		}

		return player.items.some(item => {
			if (!item) return false;
			const itemName = item.replace(/\.(jpg|png|gif)$/i, '').toLowerCase();
			return itemName === 'space_suit';
		});
	}

	/**
	 * Checks if a player can participate in the expedition
	 * @param {Object} player - Player object
	 * @param {Array<string>} sectors - Selected sector names
	 * @returns {boolean}
	 */
	static canParticipate(player, sectors) {
		// If planet has oxygen, everyone can participate
		if (this.planetHasOxygen(sectors)) {
			return true;
		}

		// Otherwise, player needs a spacesuit
		return this.playerHasSpacesuit(player);
	}

	/**
	 * Filters players to only those who can participate
	 * @param {Array<Object>} players - All players
	 * @param {Array<string>} sectors - Selected sector names
	 * @returns {Array<Object>} Players who can participate
	 */
	static getParticipatingPlayers(players, sectors) {
		return players.filter(player => this.canParticipate(player, sectors));
	}

	/**
	 * Gets participation status for each player
	 * @param {Array<Object>} players - All players
	 * @param {Array<string>} sectors - Selected sector names
	 * @returns {Array<{player: Object, canParticipate: boolean, reason: string}>}
	 */
	static getParticipationStatus(players, sectors) {
		const planetHasO2 = this.planetHasOxygen(sectors);

		return players.map(player => {
			if (planetHasO2) {
				return {
					player,
					canParticipate: true,
					reason: 'Planet has oxygen'
				};
			}

			const hasSpacesuit = this.playerHasSpacesuit(player);
			return {
				player,
				canParticipate: hasSpacesuit,
				reason: hasSpacesuit ? 'Has spacesuit' : 'Stuck in ship (no oxygen)'
			};
		});
	}
}

// Export
if (typeof window !== 'undefined') {
	window.OxygenService = OxygenService;
}
