/**
 * DamageComparator
 * 
 * UTILITY: Compares damage events to determine which is "worse" for worst-case calculations.
 * Reads damage data from FightCalculator.FIGHT_DAMAGES and EventDamageCalculator.EVENT_DAMAGES
 * (single sources of truth — no mirrored copies).
 * 
 * Key insight: Concentrated damage is worse than spread damage.
 * - 5 damage to ONE player is worse than 10 damage spread across 4 players
 * - One dead player + 3 healthy > 4 mid-life players
 * 
 * Score formula: (maxDamageToOnePlayer × 1000) + totalDamage
 * 
 * This handles mutual exclusivity of FIGHT vs ACCIDENT on sectors like:
 * - INSECT (FIGHT_10 vs ACCIDENT_3_5)
 * - PREDATOR (FIGHT_12 vs ACCIDENT_3_5)
 * - LANDING, MOUNTAIN, COLD, HOT (TIRED_2 vs ACCIDENT_3_5 vs DISASTER_3_5)
 * 
 * IMPORTANT: Uses EventWeightCalculator.getModifiedProbabilities() to account for
 * abilities that remove events (e.g., Pilot removes ACCIDENT, Diplomat affects fights).
 * 
 * @module probability/DamageComparator
 */
const DamageComparator = {

	/**
	 * Returns the worst-case base damage for a fight type,
	 * reading from FightCalculator.FIGHT_DAMAGES (single source of truth).
	 * @param {string} fightType - e.g. '12', '8_10_12_15_18_32'
	 * @returns {number}
	 * @private
	 */
	_getBaseFightDamage(fightType) {
		const info = FightCalculator.FIGHT_DAMAGES[fightType];
		if (!info) return parseInt(fightType) || 0;
		if (info.variable) return info.max || Math.max(...info.values);
		return info.fixed || 0;
	},

	/**
	 * Determines the worst damaging event for a sector, accounting for player count,
	 * fighting power, grenades, and LOADOUT (abilities that remove events).
	 * 
	 * @param {string} sectorName - The sector to analyze
	 * @param {Object} loadout - { abilities: [], items: [], projects: [] }
	 * @param {number} playerCount - Number of players in expedition
	 * @param {number} fightingPower - Team's total fighting power
	 * @param {number} grenadesAvailable - Grenades available for this sector
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @returns {Object} { worstEvent, score, grenadesUsed, eventType: 'fight'|'event' }
	 */
	getWorstEvent(sectorName, loadout, playerCount, fightingPower, grenadesAvailable = 0, sectorProbabilities = null) {
		// Get the ACTUAL events present on this sector after ability modifications
		const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
		
		if (!probs || probs.size === 0) {
			return { worstEvent: null, score: 0, grenadesUsed: 0, eventType: null };
		}

		const candidates = [];

		// Check each event on this sector
		for (const [eventName, prob] of probs) {
			if (prob <= 0) continue;  // Event was removed by ability

			// Is it a fight event?
			if (eventName.startsWith('FIGHT_')) {
				const fightScore = this._scoreFightEvent(
					eventName, 
					playerCount, 
					fightingPower, 
					grenadesAvailable
				);
				candidates.push({
					event: eventName,
					eventType: 'fight',
					probability: prob,
					...fightScore
				});
			}
			// Is it a damage event?
			else if (EventDamageCalculator.EVENT_DAMAGES[eventName]) {
				const eventScore = this._scoreDamageEvent(eventName, playerCount);
				candidates.push({
					event: eventName,
					eventType: 'event',
					probability: prob,
					...eventScore
				});
			}
		}

		// Find the worst (highest score)
		if (candidates.length === 0) {
			return { worstEvent: null, score: 0, grenadesUsed: 0, eventType: null };
		}

		// If only one candidate, return it
		if (candidates.length === 1) {
			const only = candidates[0];
			return {
				worstEvent: only.event,
				score: only.score,
				grenadesUsed: only.grenadesUsed || 0,
				eventType: only.eventType,
				maxDamageToOne: only.maxDamageToOne,
				totalDamage: only.totalDamage
			};
		}

		// Multiple candidates - find the worst
		const worst = candidates.reduce((a, b) => a.score > b.score ? a : b);
		
		return {
			worstEvent: worst.event,
			score: worst.score,
			grenadesUsed: worst.grenadesUsed || 0,
			eventType: worst.eventType,
			maxDamageToOne: worst.maxDamageToOne,
			totalDamage: worst.totalDamage,
			// Also return all candidates for debugging
			allCandidates: candidates
		};
	},

	/**
	 * Batch evaluate all sectors in an expedition.
	 * Returns which event is worst for each sector, tracking grenade consumption.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - { abilities: [], items: [], projects: [] }
	 * @param {number} playerCount - Number of players
	 * @param {number} fightingPower - Team's fighting power
	 * @param {number} totalGrenades - Total grenades available
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @returns {Object} { sectorResults: Map<sectorName, worstEventInfo>, grenadesUsed: number }
	 */
	evaluateExpedition(sectors, loadout, playerCount, fightingPower, totalGrenades, sectorProbabilities = null) {
		const sectorResults = new Map();
		let grenadesRemaining = totalGrenades;

		// First pass: get all sector events and identify which have mixed damage
		const sectorEventInfo = [];
		
		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
			let hasFight = false;
			let hasDamageEvent = false;
			let maxFightDamage = 0;

			for (const [eventName, prob] of probs) {
				if (prob <= 0) continue;
				
				if (eventName.startsWith('FIGHT_')) {
					hasFight = true;
					const fightType = eventName.replace('FIGHT_', '');
					const damage = this._getBaseFightDamage(fightType);
					maxFightDamage = Math.max(maxFightDamage, damage);
				} else if (EventDamageCalculator.EVENT_DAMAGES[eventName]) {
					hasDamageEvent = true;
				}
			}

			sectorEventInfo.push({
				sectorName,
				hasFight,
				hasDamageEvent,
				maxFightDamage,
				hasMixedDamage: hasFight && hasDamageEvent
			});
		}

		// Sort sectors with fights by fight damage (highest first)
		// This way grenades are used on the biggest fights first
		sectorEventInfo.sort((a, b) => b.maxFightDamage - a.maxFightDamage);

		// Evaluate each sector
		for (const info of sectorEventInfo) {
			const result = this.getWorstEvent(
				info.sectorName,
				loadout,
				playerCount, 
				fightingPower, 
				grenadesRemaining,
				sectorProbabilities
			);
			
			sectorResults.set(info.sectorName, result);
			
			// Consume grenades if the fight won and used grenades
			if (result.eventType === 'fight' && result.grenadesUsed > 0) {
				grenadesRemaining -= result.grenadesUsed;
			}
		}

		return {
			sectorResults,
			grenadesUsed: totalGrenades - grenadesRemaining,
			grenadesRemaining
		};
	},

	/**
	 * Scores a fight event for worst-case comparison.
	 * 
	 * Score = (totalDamage × 100) + (maxDamageToOnePlayer × 10)
	 * Total damage is primary factor, concentration is secondary tie-breaker.
	 * 
	 * @private
	 */
	_scoreFightEvent(fightEvent, playerCount, fightingPower, grenadesAvailable) {
		const fightType = fightEvent.replace('FIGHT_', '');
		const baseDamage = this._getBaseFightDamage(fightType);

		// Calculate effective FP (with potential grenade use)
		let effectiveFP = fightingPower;
		let grenadesUsed = 0;

		// Use grenade if it reduces damage
		if (grenadesAvailable > 0) {
			const grenadePower = FightingPowerService.getGrenadePower();
			const damageWithoutGrenade = Math.max(0, baseDamage - fightingPower);
			const damageWithGrenade = Math.max(0, baseDamage - fightingPower - grenadePower);
			
			if (damageWithGrenade < damageWithoutGrenade) {
				effectiveFP += grenadePower;
				grenadesUsed = 1;
			}
		}

		const totalDamage = Math.max(0, baseDamage - effectiveFP);
		
		// Fight damage is split among all players
		// Max damage to one = ceiling of totalDamage / playerCount
		const maxDamageToOne = playerCount > 0 
			? Math.ceil(totalDamage / playerCount) 
			: totalDamage;

		// Total damage is primary (×100), concentration is secondary (×10)
		const score = (totalDamage * 100) + (maxDamageToOne * 10);

		return {
			score,
			maxDamageToOne,
			totalDamage,
			grenadesUsed
		};
	},

	/**
	 * Scores a damage event for worst-case comparison.
	 * 
	 * Score = (totalDamage × 100) + (maxDamageToOnePlayer × 10)
	 * Total damage is primary factor, concentration is secondary tie-breaker.
	 * 
	 * @private
	 */
	_scoreDamageEvent(eventName, playerCount) {
		const eventInfo = EventDamageCalculator.EVENT_DAMAGES[eventName];
		if (!eventInfo) {
			return { score: 0, maxDamageToOne: 0, totalDamage: 0, grenadesUsed: 0 };
		}

		// Use worst-case (max) damage value
		const baseDamage = eventInfo.max;

		let maxDamageToOne, totalDamage;

		if (eventInfo.affectsAll) {
			// TIRED_2, DISASTER_3_5: damage to ALL players
			maxDamageToOne = baseDamage;
			totalDamage = baseDamage * playerCount;
		} else {
			// ACCIDENT_3_5: damage to ONE player only
			maxDamageToOne = baseDamage;
			totalDamage = baseDamage;
		}

		// Total damage is primary (×100), concentration is secondary (×10)
		const score = (totalDamage * 100) + (maxDamageToOne * 10);

		return {
			score,
			maxDamageToOne,
			totalDamage,
			grenadesUsed: 0  // Events don't use grenades
		};
	}
};

// Export
if (typeof window !== 'undefined') {
	window.DamageComparator = DamageComparator;
}
