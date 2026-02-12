/**
 * DamageSpreader Service
 * 
 * Distributes damage from combat and event instances to individual players.
 * 
 * Distribution rules:
 * - Combat (FIGHT_*): Each unit of damage is randomly assigned to a player
 * - ACCIDENT_3_5 / ACCIDENT_ROPE_3_5: Single random player takes all damage
 * - TIRED_2: All players take the damage (2 each)
 * - DISASTER_3_5: All players take the damage (3-5 each)
 */
class DamageSpreader {
	/**
	 * Distributes all damage to players for a given scenario.
	 * Returns per-player damage attribution breakdown.
	 * 
	 * @param {Array} fightInstances - Damage instances from FightCalculator
	 * @param {Array} eventInstances - Damage instances from EventDamageCalculator
	 * @param {Array<Object>} players - Array of player objects (for item checks)
	 * @returns {Object} - { totalDamage: Array<number>, breakdown: Array<Array> }
	 *   breakdown[playerIndex] = [{ type, source, damage }, ...]
	 */
	static distribute(fightInstances, eventInstances, players) {
		const playerCount = players.length;
		if (playerCount <= 0) {
			return {
				totalDamage: [],
				breakdown: [],
				appliedEffects: []
			};
		}

		// Initialize damage breakdown and applied effects for each player
		const playerBreakdown = Array.from({ length: playerCount }, () => []);
		const playerDamageTotals = new Array(playerCount).fill(0);
		const appliedEffects = Array.from({ length: playerCount }, () => []);

		// Distribute fight damage
		if (fightInstances && Array.isArray(fightInstances)) {
			for (const instance of fightInstances) {
				this._distributeFightDamage(instance, playerBreakdown, playerDamageTotals);
			}
		}

		// Distribute event damage
		if (eventInstances && Array.isArray(eventInstances)) {
			for (const instance of eventInstances) {
				this._distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players, appliedEffects);
			}
		}

		return {
			totalDamage: playerDamageTotals,
			breakdown: playerBreakdown,
			appliedEffects: appliedEffects
		};
	}

	/**
	 * Distributes all damage for all scenarios.
	 * 
	 * @param {Object} fightDamageInstances - { pessimist, average, optimist, worstCase }
	 * @param {Object} eventDamageInstances - { pessimist, average, optimist, worstCase }
	 * @param {Array<Object>} players - Array of player objects (for item checks like rope)
	 * @returns {Object} - { pessimist, average, optimist, worstCase } each containing { totalDamage, breakdown }
	 */
	static distributeAllScenarios(fightDamageInstances, eventDamageInstances, players) {
		const scenarios = Constants.SCENARIO_KEYS;
		const result = {};
		const playerCount = players.length;

		for (const scenario of scenarios) {
			const fightInstances = fightDamageInstances?.[scenario] || [];
			const eventInstances = eventDamageInstances?.[scenario] || [];
			result[scenario] = this.distribute(fightInstances, eventInstances, players);
		}

		// Debug logging
		if (playerCount > 0) {
			console.log('[DamageSpreader] === DAMAGE ATTRIBUTION ===');
			for (const scenario of scenarios) {
				const totals = result[scenario].totalDamage;
				const breakdown = result[scenario].breakdown;
				const totalSum = totals.reduce((a, b) => a + b, 0);
				if (totalSum > 0) {
					const playerDesc = totals.map((dmg, i) => `P${i + 1}:${dmg}`).join(' ');
					console.log(`[DamageSpreader] ${scenario} (total=${totalSum}): ${playerDesc}`);
					// Show breakdown details for first player with damage
					for (let i = 0; i < breakdown.length; i++) {
						if (breakdown[i].length > 0) {
							const details = breakdown[i].map(b => `${b.type}@${b.source}(${b.damage})`).join(', ');
							console.log(`[DamageSpreader]   P${i + 1}: ${details}`);
						}
					}
				}
			}
		}

		return result;
	}

	/**
	 * Distributes damage from a fight instance.
	 * Combat damage: each unit of damage is randomly assigned to a player.
	 * 
	 * @param {Object} instance - { sources: [{ eventType, sector, damage }] }
	 * @param {Array<Array>} playerBreakdown - Breakdown arrays to update
	 * @param {Array<number>} playerDamageTotals - Totals to update
	 * @private
	 */
	static _distributeFightDamage(instance, playerBreakdown, playerDamageTotals) {
		const playerCount = playerBreakdown.length;
		if (playerCount === 0) return;

		const { sources } = instance;

		for (const source of sources) {
			const damage = Math.round(source.damage || 0);
			if (damage <= 0) continue;

			// Fight damage: distribute each point randomly
			for (let d = 0; d < damage; d++) {
				const targetPlayer = Math.floor(Math.random() * playerCount);
				playerBreakdown[targetPlayer].push({
					type: source.eventType,
					source: source.sector,
					damage: 1
				});
				playerDamageTotals[targetPlayer]++;
			}
		}
	}

	/**
	 * Distributes damage from an event instance.
	 * Uses event type information to determine distribution:
	 * - affectsAll: true → all players take the full damage
	 * - affectsAll: false → one random player takes all damage
	 * 
	 * @param {Object} instance - { sources: [{ eventType, sector, damage }] }
	 * @param {Array<Array>} playerBreakdown - Breakdown arrays to update
	 * @param {Array<number>} playerDamageTotals - Totals to update
	 * @param {Array<Object>} players - Array of player objects (for item immunity checks)
	 * @param {Array<Array>} appliedEffects - Effects that triggered (e.g., rope immunity)
	 * @private
	 */
	static _distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players = [], appliedEffects = []) {
		const playerCount = playerBreakdown.length;
		if (playerCount === 0) return;

		const { sources } = instance;

		for (const source of sources) {
			const damage = Math.round(source.damage || 0);
			if (damage <= 0) continue;

			const eventType = source.eventType;
			const eventInfo = this._getEventInfo(eventType);
			const affectsAll = eventInfo?.affectsAll ?? false;

			if (affectsAll) {
				// TIRED_2, DISASTER_3_5: All players take damage
				// The damage value from path sampling is already total (perPlayer × playerCount)
				// So we divide back to get per-player damage
				const perPlayerDamage = Math.round(damage / playerCount);
				for (let p = 0; p < playerCount; p++) {
					if (perPlayerDamage > 0) {
						playerBreakdown[p].push({
							type: eventType,
							source: source.sector,
							damage: perPlayerDamage
						});
						playerDamageTotals[p] += perPlayerDamage;
					}
				}
			} else {
				// ACCIDENT_3_5, ACCIDENT_ROPE_3_5: One random player takes all damage
				const targetPlayer = Math.floor(Math.random() * playerCount);
				
				// Check for rope immunity: if ACCIDENT_ROPE_3_5 and target has rope, no damage
				if (eventType === 'ACCIDENT_ROPE_3_5' && this._playerHasRope(players[targetPlayer])) {
					console.log(`[DamageSpreader] P${targetPlayer + 1} immune to rope damage (has rope)`);
					// Track the applied effect
					if (appliedEffects[targetPlayer]) {
						appliedEffects[targetPlayer].push({ type: 'ROPE', damagePrevented: damage, sector: source.sector });
					}
					continue; // Skip this damage
				}
				
				playerBreakdown[targetPlayer].push({
					type: eventType,
					source: source.sector,
					damage: damage
				});
				playerDamageTotals[targetPlayer] += damage;
			}
		}
	}

	/**
	 * Gets event info from EventDamageCalculator.
	 * Returns null if event type not found.
	 * 
	 * @param {string} eventType - The event type (e.g., 'TIRED_2', 'ACCIDENT_3_5')
	 * @returns {Object|null} - Event info with affectsAll, min, max, etc.
	 * @private
	 */
	static _getEventInfo(eventType) {
		if (typeof EventDamageCalculator !== 'undefined' && EventDamageCalculator.EVENT_DAMAGES) {
			return EventDamageCalculator.EVENT_DAMAGES[eventType] || null;
		}
		return null;
	}

	/**
	 * Checks if a player has a rope item.
	 * 
	 * @param {Object} player - Player object with items array
	 * @returns {boolean} - True if player has a rope
	 * @private
	 */
	static _playerHasRope(player) {
		if (!player || !player.items) return false;
		return player.items.some(item => {
			if (!item) return false;
			const itemId = typeof filenameToId === 'function' ? filenameToId(item) : item.toUpperCase().replace(/\.(png|jpg|gif)$/i, '');
			return itemId === 'ROPE';
		});
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
				return filenameToId(ability) === 'SURVIVAL';
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
		const scenarios = Constants.SCENARIO_KEYS;
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
