/**
 * DamageSpreader Service
 * 
 * Distributes damage from combat and event instances to individual players.
 * 
 * Distribution rules:
 * - Combat (FIGHT_*): Each unit of damage is randomly assigned to a player
 * - ACCIDENT_3_5: Single random player takes all damage
 * - TIRED_2: All players take the damage
 * - DISASTER_3_5: All players take the damage
 */
class DamageSpreader {
	/**
	 * Distributes all damage to players for a given scenario.
	 * 
	 * @param {Array} fightInstances - Damage instances from FightCalculator
	 * @param {Array} eventInstances - Damage instances from EventDamageCalculator
	 * @param {number} playerCount - Number of players
	 * @returns {Array<number>} - Array of damage per player (indexed by player position)
	 */
	static distribute(fightInstances, eventInstances, playerCount) {
		if (playerCount <= 0) {
			return [];
		}

		// Initialize damage array for each player
		const playerDamage = new Array(playerCount).fill(0);

		// Distribute fight damage
		if (fightInstances && Array.isArray(fightInstances)) {
			for (const instance of fightInstances) {
				this._distributeFightDamage(instance, playerDamage);
			}
		}

		// Distribute event damage
		if (eventInstances && Array.isArray(eventInstances)) {
			for (const instance of eventInstances) {
				this._distributeEventDamage(instance, playerDamage);
			}
		}

		return playerDamage;
	}

	/**
	 * Distributes all damage for all scenarios.
	 * 
	 * @param {Object} fightDamageInstances - { pessimist, average, optimist, worstCase }
	 * @param {Object} eventDamageInstances - { pessimist, average, optimist, worstCase }
	 * @param {number} playerCount - Number of players
	 * @returns {Object} - { pessimist, average, optimist, worstCase } each containing array of damage per player
	 */
	static distributeAllScenarios(fightDamageInstances, eventDamageInstances, playerCount) {
		const scenarios = ['pessimist', 'average', 'optimist', 'worstCase'];
		const result = {};

		for (const scenario of scenarios) {
			const fightInstances = fightDamageInstances?.[scenario] || [];
			const eventInstances = eventDamageInstances?.[scenario] || [];
			result[scenario] = this.distribute(fightInstances, eventInstances, playerCount);
		}

		return result;
	}

	/**
	 * Distributes damage from a fight instance.
	 * Combat damage: each unit of damage is randomly assigned to a player.
	 * 
	 * @param {Object} instance - { type, count, damagePerInstance, totalDamage, sources }
	 * @param {Array<number>} playerDamage - Array to update with damage
	 * @private
	 */
	static _distributeFightDamage(instance, playerDamage) {
		const playerCount = playerDamage.length;
		if (playerCount === 0) return;

		const { count, damagePerInstance } = instance;

		// For each fight instance
		for (let i = 0; i < count; i++) {
			// Total damage from this fight
			const totalDamage = Math.round(damagePerInstance);

			// Distribute each unit of damage randomly
			for (let d = 0; d < totalDamage; d++) {
				const targetPlayer = Math.floor(Math.random() * playerCount);
				playerDamage[targetPlayer]++;
			}
		}
	}

	/**
	 * Distributes damage from an event instance.
	 * - ACCIDENT_3_5: Single random player
	 * - TIRED_2, DISASTER_3_5: All players
	 * 
	 * @param {Object} instance - { type, count, damagePerInstance, sources }
	 * @param {Array<number>} playerDamage - Array to update with damage
	 * @private
	 */
	static _distributeEventDamage(instance, playerDamage) {
		const playerCount = playerDamage.length;
		if (playerCount === 0) return;

		const { type, count, damagePerInstance } = instance;

		// For each event instance
		for (let i = 0; i < count; i++) {
			const damage = Math.round(damagePerInstance);

			if (type === 'ACCIDENT_3_5') {
				// Accident: single random player takes all damage
				const targetPlayer = Math.floor(Math.random() * playerCount);
				playerDamage[targetPlayer] += damage;
			} else {
				// TIRED_2 and DISASTER_3_5: all players take the damage
				for (let p = 0; p < playerCount; p++) {
					playerDamage[p] += damage;
				}
			}
		}
	}

	/**
	 * Calculates final health for each player after damage distribution.
	 * 
	 * @param {Array<Object>} players - Array of player objects with health property
	 * @param {Array<number>} damagePerPlayer - Damage dealt to each player
	 * @returns {Array<number>} - Final health for each player (minimum 0)
	 */
	static calculateFinalHealth(players, damagePerPlayer) {
		return players.map((player, index) => {
			const damage = damagePerPlayer[index] || 0;
			return Math.max(0, player.health - damage);
		});
	}

	/**
	 * Calculates final health for all scenarios.
	 * 
	 * @param {Array<Object>} players - Array of player objects with health property
	 * @param {Object} damageByScenario - { pessimist, average, optimist, worstCase }
	 * @returns {Object} - Final health arrays for each scenario
	 */
	static calculateAllFinalHealth(players, damageByScenario) {
		const scenarios = ['pessimist', 'average', 'optimist', 'worstCase'];
		const result = {};

		for (const scenario of scenarios) {
			const damagePerPlayer = damageByScenario[scenario] || [];
			result[scenario] = this.calculateFinalHealth(players, damagePerPlayer);
		}

		return result;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.DamageSpreader = DamageSpreader;
}
