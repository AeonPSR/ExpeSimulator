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
	 * @param {Object} fightDamageInstances - { pessimist, median, optimist, worstCase }
	 * @param {Object} eventDamageInstances - { pessimist, median, optimist, worstCase }
	 * @param {number} playerCount - Number of players
	 * @returns {Object} - { pessimist, median, optimist, worstCase } each containing array of damage per player
	 */
	static distributeAllScenarios(fightDamageInstances, eventDamageInstances, playerCount) {
		const scenarios = ['pessimist', 'median', 'optimist', 'worstCase'];
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
	 * Calculates final health for all scenarios using total damage values.
	 * This method uses the pre-calculated scenario damage totals directly,
	 * distributing damage evenly among players (accounting for damage reduction).
	 * 
	 * @param {Array<Object>} players - Array of player objects with health property
	 * @param {Object} fightDamage - { pessimist, median, optimist, worstCase } total fight damage
	 * @param {Object} eventDamage - { pessimist, median, optimist, worstCase } total event damage
	 * @returns {Object} - Final health arrays for each scenario
	 */
	static calculateHealthFromTotals(players, fightDamage, eventDamage) {
		const scenarios = ['pessimist', 'median', 'optimist', 'worstCase'];
		const result = {};
		const playerCount = players.length;

		if (playerCount === 0) {
			return { pessimist: [], median: [], optimist: [], worstCase: [] };
		}

		// Pre-calculate damage reduction for each player
		const playerReductions = this._calculatePlayerReductions(players);

		for (const scenario of scenarios) {
			// Round damage values to integers
			const totalFightDamage = Math.round(fightDamage?.[scenario] || 0);
			const totalEventDamage = Math.round(eventDamage?.[scenario] || 0);

			// Distribute damage to players
			const damagePerPlayer = this._distributeScenarioDamage(
				totalFightDamage,
				totalEventDamage,
				playerCount,
				playerReductions
			);

			result[scenario] = players.map((player, index) => {
				// Ensure health is always an integer
				const damage = Math.round(damagePerPlayer[index]);
				return Math.max(0, player.health - damage);
			});
		}

		return result;
	}

	/**
	 * Calculates damage reduction values for each player.
	 * - Survival: -1 to all damage
	 * - Plastenite Armor: -1 to fight damage
	 * 
	 * @param {Array<Object>} players - Player objects
	 * @returns {Array<Object>} - Array of { allReduction, fightReduction } per player
	 * @private
	 */
	static _calculatePlayerReductions(players) {
		return players.map(player => {
			let allReduction = 0;
			let fightReduction = 0;

			// Check abilities for Survival
			if (player.abilities) {
				for (const ability of player.abilities) {
					if (ability) {
						const id = ability.replace(/\.(png|jpg|gif)$/i, '').toUpperCase();
						if (id === 'SURVIVAL') {
							allReduction += 1;
						}
					}
				}
			}

			// Check items for Plastenite Armor
			if (player.items) {
				for (const item of player.items) {
					if (item) {
						const id = item.replace(/\.(png|jpg|gif)$/i, '').toUpperCase();
						if (id === 'PLASTENITE_ARMOR') {
							fightReduction += 1;
						}
					}
				}
			}

			return { allReduction, fightReduction };
		});
	}

	/**
	 * Distributes scenario damage totals to players.
	 * Fight damage is distributed evenly, event damage affects all players.
	 * Damage reduction is applied per-player.
	 * All values are rounded to integers.
	 * 
	 * @param {number} totalFightDamage - Total fight damage for the scenario
	 * @param {number} totalEventDamage - Total event damage for the scenario
	 * @param {number} playerCount - Number of players
	 * @param {Array<Object>} playerReductions - Damage reduction per player
	 * @returns {Array<number>} - Damage per player (integers)
	 * @private
	 */
	static _distributeScenarioDamage(totalFightDamage, totalEventDamage, playerCount, playerReductions) {
		const damagePerPlayer = new Array(playerCount).fill(0);

		// Fight damage: distributed evenly among players
		// Each player's share = totalFightDamage / playerCount (rounded)
		// Then apply damage reduction (Survival + Plastenite Armor)
		const fightDamagePerPlayer = Math.round(totalFightDamage / playerCount);
		
		for (let i = 0; i < playerCount; i++) {
			const fightReduction = playerReductions[i] 
				? (playerReductions[i].allReduction + playerReductions[i].fightReduction)
				: 0;
			const reducedFightDamage = Math.max(0, fightDamagePerPlayer - fightReduction);
			damagePerPlayer[i] += reducedFightDamage;
		}

		// Event damage: affects all players equally
		// Each player receives their share of event damage (rounded)
		// Apply Survival reduction per player
		const eventDamagePerPlayer = Math.round(totalEventDamage / playerCount);
		
		for (let i = 0; i < playerCount; i++) {
			const eventReduction = playerReductions[i]?.allReduction || 0;
			const reducedEventDamage = Math.max(0, eventDamagePerPlayer - eventReduction);
			damagePerPlayer[i] += reducedEventDamage;
		}

		return damagePerPlayer;
	}

	/**
	 * Calculates final health for all scenarios.
	 * 
	 * @param {Array<Object>} players - Array of player objects with health property
	 * @param {Object} damageByScenario - { pessimist, median, optimist, worstCase }
	 * @returns {Object} - Final health arrays for each scenario
	 */
	static calculateAllFinalHealth(players, damageByScenario) {
		const scenarios = ['pessimist', 'median', 'optimist', 'worstCase'];
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
