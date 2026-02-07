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
	 * Returns per-player damage attribution breakdown.
	 * 
	 * @param {Array} fightInstances - Damage instances from FightCalculator
	 * @param {Array} eventInstances - Damage instances from EventDamageCalculator
	 * @param {number} playerCount - Number of players
	 * @returns {Object} - { totalDamage: Array<number>, breakdown: Array<Array> }
	 *   breakdown[playerIndex] = [{ type, source, damage }, ...]
	 */
	static distribute(fightInstances, eventInstances, playerCount) {
		if (playerCount <= 0) {
			return {
				totalDamage: [],
				breakdown: []
			};
		}

		// Initialize damage breakdown for each player
		const playerBreakdown = Array.from({ length: playerCount }, () => []);
		const playerDamageTotals = new Array(playerCount).fill(0);

		// Distribute fight damage
		if (fightInstances && Array.isArray(fightInstances)) {
			for (const instance of fightInstances) {
				this._distributeFightDamage(instance, playerBreakdown, playerDamageTotals);
			}
		}

		// Distribute event damage
		if (eventInstances && Array.isArray(eventInstances)) {
			for (const instance of eventInstances) {
				this._distributeEventDamage(instance, playerBreakdown, playerDamageTotals);
			}
		}

		return {
			totalDamage: playerDamageTotals,
			breakdown: playerBreakdown
		};
	}

	/**
	 * Distributes all damage for all scenarios.
	 * 
	 * @param {Object} fightDamageInstances - { pessimist, average, optimist, worstCase }
	 * @param {Object} eventDamageInstances - { pessimist, average, optimist, worstCase }
	 * @param {number} playerCount - Number of players
	 * @returns {Object} - { pessimist, average, optimist, worstCase } each containing { totalDamage, breakdown }
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
	 * Tracks attribution for each damage instance.
	 * 
	 * @param {Object} instance - { type, count, damagePerInstance, sources }
	 * @param {Array<Array>} playerBreakdown - Breakdown arrays to update
	 * @param {Array<number>} playerDamageTotals - Totals to update
	 * @private
	 */
	static _distributeFightDamage(instance, playerBreakdown, playerDamageTotals) {
		const playerCount = playerBreakdown.length;
		if (playerCount === 0) return;

		const { type, count, damagePerInstance, sources } = instance;

		// For each fight instance
		for (let i = 0; i < count; i++) {
			// Total damage from this fight
			const totalDamage = Math.round(damagePerInstance);
			const source = sources?.[i]?.sectorName || 'UNKNOWN';

			// Distribute each unit of damage randomly
			for (let d = 0; d < totalDamage; d++) {
				const targetPlayer = Math.floor(Math.random() * playerCount);
				playerBreakdown[targetPlayer].push({
					type: type,
					source: source,
					damage: 1
				});
				playerDamageTotals[targetPlayer]++;
			}
		}
	}

	/**
	 * Distributes damage from an event instance.
	 * - ACCIDENT_3_5, ROPE: Single random player
	 * - TIRED_2, DISASTER_3_5: All players
	 * Tracks attribution for each damage instance.
	 * 
	 * @param {Object} instance - { type, count, damagePerInstance, sources }
	 * @param {Array<Array>} playerBreakdown - Breakdown arrays to update
	 * @param {Array<number>} playerDamageTotals - Totals to update
	 * @private
	 */
	static _distributeEventDamage(instance, playerBreakdown, playerDamageTotals) {
		const playerCount = playerBreakdown.length;
		if (playerCount === 0) return;

		const { type, count, damagePerInstance, sources } = instance;

		// For each event instance
		for (let i = 0; i < count; i++) {
			const damage = Math.round(damagePerInstance);
			const source = sources?.[i]?.sectorName || 'UNKNOWN';

			if (type === 'ACCIDENT_3_5' || type === 'ROPE') {
				// Accident & Rope: single random player takes all damage
				const targetPlayer = Math.floor(Math.random() * playerCount);
				playerBreakdown[targetPlayer].push({
					type: type,
					source: source,
					damage: damage
				});
				playerDamageTotals[targetPlayer] += damage;
			} else {
				// TIRED_2 and DISASTER_3_5: all players take the damage
				for (let p = 0; p < playerCount; p++) {
					playerBreakdown[p].push({
						type: type,
						source: source,
						damage: damage
					});
					playerDamageTotals[p] += damage;
				}
			}
		}
	}

	/**
	 * Applies Survival ability reduction to damage breakdown.
	 * Survival reduces each damage instance by 1 (minimum 0 per instance).
	 * 
	 * @param {Array<Object>} players - Player objects
	 * @param {Array<Array>} damageBreakdown - Damage breakdown per player
	 * @returns {Array<Array>} - Modified damage breakdown with Survival applied
	 */
	static applySurvivalReduction(players, damageBreakdown) {
		return damageBreakdown.map((playerBreakdown, playerIndex) => {
			const player = players[playerIndex];
			
			// Check if player has Survival ability
			const hasSurvival = player?.abilities?.some(ability => {
				if (!ability) return false;
				const id = ability.replace(/\.(png|jpg|gif)$/i, '').toLowerCase();
				return id === 'survival';
			});
			
			if (!hasSurvival) {
				return playerBreakdown;
			}
			
			// Apply -1 to each damage instance (minimum 0 per instance)
			return playerBreakdown.map(instance => ({
				...instance,
				damage: Math.max(0, instance.damage - 1)
			}));
		});
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
