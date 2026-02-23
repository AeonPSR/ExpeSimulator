/**
 * FightCalculator
 * 
 * BACKEND: Calculates fight occurrence and damage using convolution.
 * 
 * NEW APPROACH (v2):
 *   1. For each sector, build a damage distribution based on fight probability and fixed damage
 *   2. Convolve damage distributions across all sectors
 *   3. Extract P25/P50/P75/P100 scenarios from the DAMAGE distribution
 *   4. This ensures all displayed damage values are actually achievable
 * 
 * Fight types: FIGHT_8, FIGHT_10, FIGHT_12, FIGHT_15, FIGHT_18, FIGHT_32
 * Variable fight: FIGHT_8_10_12_15_18_32 (random damage 8-32)
 * 
 * @module probability/FightCalculator
 */
const FightCalculator = {

	/**
	 * Fight damage values for each type
	 */
	FIGHT_DAMAGES: {
		'8': { fixed: 8 },
		'10': { fixed: 10 },
		'12': { fixed: 12 },
		'15': { fixed: 15 },
		'18': { fixed: 18 },
		'32': { fixed: 32 },
		'8_10_12_15_18_32': { 
			variable: true,
			values: [8, 10, 12, 15, 18, 32],  // All possible values with equal probability
			min: 8, 
			max: 32, 
			average: 17.5,  // (8+10+12+15+18+32)/6
			pessimist: 25,  // ~75th percentile estimate
			optimist: 10    // ~25th percentile estimate
		}
	},

	/**
	 * Calculates all fight-related data for an expedition.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - { abilities: [], items: [], projects: [] }
	 * @param {Array<Object>} players - Raw player data
	 * @param {Set<string>} worstCaseExclusions - Sectors to exclude from worst case (where event damage "wins")
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @returns {Object} Fight data with occurrence and damage info
	 */
	calculate(sectors, loadout = {}, players = [], worstCaseExclusions = null, sectorProbabilities = null) {
		if (!sectors || sectors.length === 0) {
			return this._emptyResult();
		}

		// Get fighting power
		const fightingPower = this._getFightingPower(players);
		const grenadeCount = this._getGrenadeCount(players);
		const playerCount = players.length;

		// Calculate occurrence for each fight type, tracking which sectors can produce each type
		const fightTypes = this._getAllFightTypes(sectors, loadout, sectorProbabilities);
		const occurrence = {};
		const sectorsByFightType = {};  // Track which sectors can produce each fight type
		
		for (const fightType of fightTypes) {
			const fightEvent = `FIGHT_${fightType}`;
			const occResult = OccurrenceCalculator.calculateForType(sectors, loadout, fightEvent, sectorProbabilities);
			occurrence[fightType] = occResult.occurrence;
			sectorsByFightType[fightType] = occResult.sectors;
		}

		// Reference to this for closures
		const self = this;

		// Build full damage distribution via shared engine
		const { damage: damageResult, damageInstances, damageDistribution, sampledPaths } = DamageDistributionEngine.calculate({
			sectors,
			loadout,
			sectorProbabilities,
			worstCaseExclusions,
			getSectorDamageDist: (sectorName, probs) => {
				const dist = new Map();
				let totalProb = 0;
				for (const [eventName, eventProb] of probs) {
					if (!eventName.startsWith('FIGHT_')) continue;
					if (eventProb <= 0) continue;
					totalProb += eventProb;
					const fightType = eventName.replace('FIGHT_', '');
					const damageDistForFight = self._getFightDamageDistribution(fightType, fightingPower);
					for (const [damageVal, damageProb] of damageDistForFight) {
						dist.set(damageVal, (dist.get(damageVal) || 0) + eventProb * damageProb);
					}
				}
				return { dist, totalProb };
			},
			// Detailed outcomes for path sampling - includes fight types
			getDetailedSectorOutcomes: (sectorName, probs) => {
				const outcomes = [];
				let totalProb = 0;
				for (const [eventName, eventProb] of probs) {
					if (!eventName.startsWith('FIGHT_')) continue;
					if (eventProb <= 0) continue;
					totalProb += eventProb;
					const fightType = eventName.replace('FIGHT_', '');
					const damageDistForFight = self._getFightDamageDistribution(fightType, fightingPower);
					for (const [damageVal, damageProb] of damageDistForFight) {
						outcomes.push({
							eventType: eventName,
							damage: damageVal,
							probability: eventProb * damageProb
						});
					}
				}
				// Add "no fight" case
				const noFightProb = Math.max(0, 1 - totalProb);
				if (noFightProb > 0.0001) {
					outcomes.push({ eventType: null, damage: 0, probability: noFightProb });
				}
				return outcomes;
			},
			postProcessDistribution: (dist) => self._applyGrenadesToDistribution(dist, grenadeCount),
			logLabel: 'FightDamage'
		});
		// Add breakdown for backward compatibility
		damageResult.breakdown = { pessimist: [], average: [], optimist: [], worstCase: [] };

		return {
			occurrence,      // { "12": { pessimist, average, optimist, distribution }, ... }
			damage: damageResult,
			damageInstances,  // Per-scenario damage instances with sources
			damageDistribution,  // Full damage distribution for advanced analysis
			sampledPaths,  // Sampled explaining paths for each scenario
			fightingPower,
			grenadeCount,
			playerCount,
			worstCaseExclusions: worstCaseExclusions ? Array.from(worstCaseExclusions) : []
		};
	},

	/**
	 * Gets the damage distribution for a fight type after applying fighting power.
	 * 
	 * @param {string} fightType - The fight type (e.g., "12", "8_10_12_15_18_32")
	 * @param {number} fightingPower - Team's fighting power
	 * @returns {Map<number, number>} Damage value â†’ probability
	 * @private
	 */
	_getFightDamageDistribution(fightType, fightingPower) {
		const info = this.FIGHT_DAMAGES[fightType];
		
		if (!info) {
			// Unknown fight type, try to parse as number
			const baseDamage = parseInt(fightType) || 0;
			const damage = Math.max(0, baseDamage - fightingPower);
			return new Map([[damage, 1]]);
		}
		
		if (info.variable && info.values) {
			// Variable damage fight - each value has equal probability
			const dist = new Map();
			const prob = 1 / info.values.length;
			for (const baseDamage of info.values) {
				const damage = Math.max(0, baseDamage - fightingPower);
				dist.set(damage, (dist.get(damage) || 0) + prob);
			}
			return dist;
		}
		
		// Fixed damage fight
		const damage = Math.max(0, info.fixed - fightingPower);
		return new Map([[damage, 1]]);
	},

	/**
	 * Applies grenade damage reduction to a damage distribution.
	 * 
	 * Each grenade reduces damage by 3, and we assume optimal usage
	 * (i.e., grenades are always used when they would reduce damage).
	 * 
	 * Since we don't know exactly which fights occur, we apply a simplified model:
	 * shift damage values down by (grenadeCount Ã— 3), with minimum 0.
	 * 
	 * @param {Map<number, number>} distribution - Original damage distribution
	 * @param {number} grenadeCount - Number of grenades available
	 * @returns {Map<number, number>} Adjusted damage distribution
	 * @private
	 */
	_applyGrenadesToDistribution(distribution, grenadeCount) {
		if (grenadeCount === 0) {
			return distribution;
		}
		
		const grenadePower = FightingPowerService.getGrenadePower();
		const maxReduction = grenadeCount * grenadePower;
		
		const adjusted = new Map();
		for (const [damage, prob] of distribution) {
			// Grenades only help if there's damage to reduce
			// We assume optimal usage: reduce as much as possible
			const reducedDamage = Math.max(0, damage - Math.min(damage, maxReduction));
			adjusted.set(reducedDamage, (adjusted.get(reducedDamage) || 0) + prob);
		}
		
		return adjusted;
	},

	/**
	 * Gets all fight types present in the selected sectors.
	 * @private
	 */
	_getAllFightTypes(sectors, loadout, sectorProbabilities = null) {
		const fightTypes = new Set();

		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
			
			for (const [eventName] of probs) {
				if (eventName.startsWith('FIGHT_')) {
					const fightType = eventName.replace('FIGHT_', '');
					fightTypes.add(fightType);
				}
			}
		}

		return Array.from(fightTypes);
	},

	/**
	 * Gets fighting power from players.
	 * @private
	 */
	_getFightingPower(players) {
		if (typeof FightingPowerService !== 'undefined') {
			return FightingPowerService.calculateBaseFightingPower(players);
		}
		return 0;
	},

	/**
	 * Gets grenade count from players.
	 * @private
	 */
	_getGrenadeCount(players) {
		return FightingPowerService.countGrenades(players);
	},

	/**
	 * Returns empty result structure.
	 * @private
	 */
	_emptyResult() {
		const damage = DamageDistributionEngine.emptyDamageResult();
		damage.breakdown = { pessimist: [], average: [], optimist: [], worstCase: [] };
		return {
			occurrence: {},
			damage,
			damageInstances: DamageDistributionEngine.emptyDamageInstances(),
			fightingPower: 0,
			grenadeCount: 0,
			playerCount: 0
		};
	}
};

// Export
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.FightCalculator = FightCalculator;
