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

		// Determine which players are alive (health > 0)
		const aliveIndices = players.reduce((acc, p, i) => {
			if (p.health > 0) acc.push(i);
			return acc;
		}, []);

		// Distribute fight damage
		if (fightInstances && Array.isArray(fightInstances)) {
			for (const instance of fightInstances) {
				this._distributeFightDamage(instance, playerBreakdown, playerDamageTotals, players, aliveIndices);
			}
		}

		// Distribute event damage
		if (eventInstances && Array.isArray(eventInstances)) {
			for (const instance of eventInstances) {
				this._distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players, appliedEffects, aliveIndices);
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
			// console.log('[DamageSpreader] === DAMAGE ATTRIBUTION ===');
			for (const scenario of scenarios) {
				const totals = result[scenario].totalDamage;
				const breakdown = result[scenario].breakdown;
				const totalSum = totals.reduce((a, b) => a + b, 0);
				if (totalSum > 0) {
					const playerDesc = totals.map((dmg, i) => `P${i + 1}:${dmg}`).join(' ');
					// console.log(`[DamageSpreader] ${scenario} (total=${totalSum}): ${playerDesc}`);
					// Show breakdown details for first player with damage
					for (let i = 0; i < breakdown.length; i++) {
						if (breakdown[i].length > 0) {
							const details = breakdown[i].map(b => `${b.type}@${b.source}(${b.damage})`).join(', ');
							// console.log(`[DamageSpreader]   P${i + 1}: ${details}`);
						}
					}
				}
			}
		}

		return result;
	}

	/**
	 * Distributes damage from a fight instance.
	 * Each point is randomly assigned to an alive player. Once a player's HP
	 * reaches 0, they are removed from the pool so overflow goes to survivors.
	 *
	 * @param {Object} instance - { sources: [{ eventType, sector, damage }] }
	 * @param {Array<Array>} playerBreakdown - Breakdown arrays to update
	 * @param {Array<number>} playerDamageTotals - Totals to update
	 * @param {Array<Object>} players - Player objects (for health tracking)
	 * @param {Array<number>} aliveIndices - Indices of players alive at fight start
	 * @private
	 */
	static _distributeFightDamage(instance, playerBreakdown, playerDamageTotals, players, aliveIndices) {
		if (aliveIndices.length === 0) return;

		const { sources } = instance;

		// Track remaining health so we can remove players from the pool as they die
		const remainingHealth = players.map(p => p.health);
		let currentAlive = [...aliveIndices];

		for (const source of sources) {
			const damage = Math.round(source.damage || 0);
			if (damage <= 0) continue;

			for (let d = 0; d < damage; d++) {
				if (currentAlive.length === 0) break;

				const pickIdx = Math.floor(Math.random() * currentAlive.length);
				const targetPlayer = currentAlive[pickIdx];

				playerBreakdown[targetPlayer].push({
					type: source.eventType,
					source: source.sector,
					damage: 1
				});
				playerDamageTotals[targetPlayer]++;
				remainingHealth[targetPlayer]--;

				// Remove player from pool once their HP hits 0
				if (remainingHealth[targetPlayer] <= 0) {
					currentAlive.splice(pickIdx, 1);
				}
			}
		}
	}

	/**
	 * Distributes damage from an event instance.
	 * Uses event type information to determine distribution:
	 * - affectsAll: true → all alive players take the per-player damage
	 * - affectsAll: false → one random alive player takes all damage
	 *
	 * @param {Object} instance - { sources: [{ eventType, sector, damage }] }
	 * @param {Array<Array>} playerBreakdown - Breakdown arrays to update
	 * @param {Array<number>} playerDamageTotals - Totals to update
	 * @param {Array<Object>} players - Array of player objects (for item immunity checks)
	 * @param {Array<Array>} appliedEffects - Effects that triggered (e.g., rope immunity)
	 * @param {Array<number>} aliveIndices - Indices of alive players
	 * @private
	 */
	static _distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players = [], appliedEffects = [], aliveIndices = []) {
		if (aliveIndices.length === 0) return;

		const playerCount = playerBreakdown.length;
		const { sources } = instance;

		for (const source of sources) {
			const damage = Math.round(source.damage || 0);
			if (damage <= 0) continue;

			const eventType = source.eventType;
			const eventInfo = this._getEventInfo(eventType);
			const affectsAll = eventInfo?.affectsAll ?? false;

			if (affectsAll) {
				// TIRED_2, DISASTER_3_5: alive players take per-player damage
				// damage = perPlayer × totalPlayerCount (from path sampling)
				const perPlayerDamage = Math.round(damage / playerCount);
				for (const p of aliveIndices) {
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
				// ACCIDENT_3_5, ACCIDENT_ROPE_3_5: One random alive player takes all damage
				const targetPlayer = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];

				// Check for rope immunity
				if (eventType === 'ACCIDENT_ROPE_3_5' && this._playerHasRope(players[targetPlayer])) {
					if (appliedEffects[targetPlayer]) {
						appliedEffects[targetPlayer].push({ type: 'ROPE', damagePrevented: damage, sector: source.sector });
					}
					continue;
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
				return filenameToId(item) === 'ROPE';
		});
	}

	/**
	 * Generic damage reduction: reduces damage by 1 from the first instance of
	 * each unique source for players that match the check function.
	 * 
	 * @param {Array<Object>} players - Player objects
	 * @param {Array<Array>} damageBreakdown - Damage breakdown per player
	 * @param {Function} hasEffectFn - (player) => boolean, checks if player has the reduction
	 * @param {Function} [eventFilter] - (instance) => boolean, if provided only matching events are reduced
	 * @returns {Array<Array>} - Modified damage breakdown
	 */
	static applyDamageReduction(players, damageBreakdown, hasEffectFn, eventFilter = null) {
		return damageBreakdown.map((playerBreakdown, playerIndex) => {
			const player = players[playerIndex];
			
			if (!hasEffectFn(player)) {
				return playerBreakdown;
			}
			
			const reducedSources = new Set();
			
			return playerBreakdown.map(instance => {
				// Skip events that don't match the filter
				if (eventFilter && !eventFilter(instance)) {
					return instance;
				}
				
				const sourceKey = `${instance.type}@${instance.source}`;
				
				if (!reducedSources.has(sourceKey)) {
					reducedSources.add(sourceKey);
					return {
						...instance,
						damage: Math.max(0, instance.damage - 1)
					};
				}
				
				return instance;
			}).filter(inst => inst.damage > 0);
		});
	}

	/**
	 * Applies Survival ability reduction.
	 * Reduces damage by 1 from the first instance of each unique source (all damage types).
	 */
	static applySurvivalReduction(players, damageBreakdown) {
		return this.applyDamageReduction(players, damageBreakdown, player => {
			return player?.abilities?.some(a => a && filenameToId(a) === 'SURVIVAL');
		});
	}

	/**
	 * Applies Armor item reduction.
	 * Reduces damage by 1 from the first combat instance of each unique fight (FIGHT_* only).
	 */
	static applyArmorReduction(players, damageBreakdown) {
		return this.applyDamageReduction(players, damageBreakdown,
			player => player?.items?.some(item => item && filenameToId(item) === 'PLASTENITE_ARMOR'),
			instance => instance.type?.startsWith('FIGHT_')
		);
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
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.DamageSpreader = DamageSpreader;
