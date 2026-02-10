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

		// NEW: Build full damage distribution and derive scenarios from it
		const { damage: damageResult, damageInstances, damageDistribution } = this._calculateDamageFromDistribution(
			sectors,
			loadout,
			fightingPower,
			grenadeCount,
			worstCaseExclusions,
			sectorProbabilities
		);

		return {
			occurrence,      // { "12": { pessimist, average, optimist, distribution }, ... }
			damage: damageResult,
			damageInstances,  // Per-scenario damage instances with sources
			damageDistribution,  // Full damage distribution for advanced analysis
			fightingPower,
			grenadeCount,
			playerCount,
			worstCaseExclusions: worstCaseExclusions ? Array.from(worstCaseExclusions) : []
		};
	},

	/**
	 * NEW: Calculates damage scenarios from full damage distribution.
	 * 
	 * This builds a complete probability distribution over total damage values
	 * by convolving per-sector damage distributions. The scenarios (P25/P50/P75/P100)
	 * are then extracted from this damage distribution, ensuring all displayed
	 * damage values are actually achievable.
	 * 
	 * For each sector:
	 *   - Get probability of each fight type
	 *   - Calculate damage after fighting power for each fight type
	 *   - Build sector damage distribution (weighted by fight probabilities)
	 *   - Include "0 damage" with probability (1 - sum of fight probs)
	 * 
	 * Then convolve all sector distributions to get total damage distribution.
	 * 
	 * @param {Array<string>} sectors - Sector names
	 * @param {Object} loadout - Player loadout
	 * @param {number} fightingPower - Team's fighting power
	 * @param {number} grenadeCount - Available grenades
	 * @param {Set<string>} worstCaseExclusions - Sectors to exclude from worst case
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities
	 * @returns {{ damage: Object, damageInstances: Object, damageDistribution: Map }}
	 * @private
	 */
	_calculateDamageFromDistribution(sectors, loadout, fightingPower, grenadeCount, worstCaseExclusions = null, sectorProbabilities = null) {
		// Build per-sector damage distributions
		const sectorDamageDistributions = [];
		const sectorDamageDistributionsWorstCase = [];
		
		// For grenade usage, we need to be smart: grenades should be used on highest-damage fights first
		// For the distribution, we'll compute damage WITHOUT grenades first, then apply grenade reduction
		// as a post-processing step on the scenarios (since grenade usage depends on which fights occur)
		
		for (let i = 0; i < sectors.length; i++) {
			const sectorName = sectors[i];
			const isExcluded = worstCaseExclusions && worstCaseExclusions.has(sectorName);
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
			
			// Build this sector's damage distribution
			const sectorDist = new Map();
			const sectorDistWorstCase = new Map();
			let totalFightProb = 0;
			
			for (const [eventName, eventProb] of probs) {
				if (!eventName.startsWith('FIGHT_')) continue;
				if (eventProb <= 0) continue;
				
				totalFightProb += eventProb;
				
				const fightType = eventName.replace('FIGHT_', '');
				const damageDistForFight = this._getFightDamageDistribution(fightType, fightingPower);
				
				// Add to sector distribution: each damage value gets eventProb Ã— damageProb
				for (const [damageVal, damageProb] of damageDistForFight) {
					const combinedProb = eventProb * damageProb;
					sectorDist.set(damageVal, (sectorDist.get(damageVal) || 0) + combinedProb);
					
					// For worst case, excluded sectors contribute 0 damage
					if (!isExcluded) {
						sectorDistWorstCase.set(damageVal, (sectorDistWorstCase.get(damageVal) || 0) + combinedProb);
					}
				}
			}
			
			// Add probability of no fight (0 damage)
			const noFightProb = Math.max(0, 1 - totalFightProb);
			sectorDist.set(0, (sectorDist.get(0) || 0) + noFightProb);
			
			// For worst case distribution
			if (isExcluded) {
				// Excluded sector: 100% chance of 0 damage
				sectorDistWorstCase.set(0, 1);
			} else {
				sectorDistWorstCase.set(0, (sectorDistWorstCase.get(0) || 0) + noFightProb);
			}
			
			sectorDamageDistributions.push(sectorDist);
			sectorDamageDistributionsWorstCase.push(sectorDistWorstCase);
		}
		
		// Convolve all sector distributions to get total damage distribution
		const totalDamageDistribution = sectorDamageDistributions.length > 0
			? DistributionCalculator.convolveAll(sectorDamageDistributions)
			: new Map([[0, 1]]);
		
		const totalDamageDistributionWorstCase = sectorDamageDistributionsWorstCase.length > 0
			? DistributionCalculator.convolveAll(sectorDamageDistributionsWorstCase)
			: new Map([[0, 1]]);
		
		// Apply grenade reduction to the distribution
		// Grenades reduce damage by 3 each, used optimally
		const adjustedDistribution = this._applyGrenadesToDistribution(totalDamageDistribution, grenadeCount);
		const adjustedDistributionWorstCase = this._applyGrenadesToDistribution(totalDamageDistributionWorstCase, grenadeCount);
		
		// Extract scenarios from the damage distribution (lower is better for damage)
		const scenarios = DistributionCalculator.getScenarios(adjustedDistribution, false);
		const worstCaseScenarios = DistributionCalculator.getScenarios(adjustedDistributionWorstCase, false);
		
		// Debug logging
		console.log(`[FightDamage] Damage distribution scenarios: optimist=${scenarios.optimist}, average=${scenarios.average}, pessimist=${scenarios.pessimist}, worst=${scenarios.worst}`);
		console.log(`[FightDamage] Damage distribution probabilities: optimistProb=${(scenarios.optimistProb * 100).toFixed(1)}%, averageProb=${(scenarios.averageProb * 100).toFixed(1)}%, pessimistProb=${(scenarios.pessimistProb * 100).toFixed(1)}%, worstProb=${(scenarios.worstProb * 100).toFixed(1)}%`);
		
		const damage = {
			optimist: scenarios.optimist,
			average: scenarios.average,
			pessimist: scenarios.pessimist,
			worstCase: worstCaseScenarios.worst,  // Use worst case from the filtered distribution
			optimistProb: scenarios.optimistProb,
			averageProb: scenarios.averageProb,
			pessimistProb: scenarios.pessimistProb,
			worstCaseProb: worstCaseScenarios.worstProb,
			// Include distribution for potential detailed display
			distribution: adjustedDistribution,
			breakdown: {
				pessimist: [],
				average: [],
				optimist: [],
				worstCase: []
			}
		};
		
		// Build simplified damage instances for backward compatibility
		const damageInstances = this._buildDamageInstancesFromDistribution(scenarios, worstCaseScenarios);
		
		return { damage, damageInstances, damageDistribution: adjustedDistribution };
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
		
		const grenadePower = 3;
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
	 * Builds damage instances for backward compatibility with the display layer.
	 * @private
	 */
	_buildDamageInstancesFromDistribution(scenarios, worstCaseScenarios) {
		const damageInstances = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};
		
		// Provide simplified summary
		if (scenarios.optimist > 0) {
			damageInstances.optimist.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: scenarios.optimist,
				sources: []
			});
		}
		
		if (scenarios.average > 0) {
			damageInstances.average.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: scenarios.average,
				sources: []
			});
		}
		
		if (scenarios.pessimist > 0) {
			damageInstances.pessimist.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: scenarios.pessimist,
				sources: []
			});
		}
		
		if (worstCaseScenarios.worst > 0) {
			damageInstances.worstCase.push({
				type: 'COMBINED',
				count: null,
				damagePerInstance: null,
				totalDamage: worstCaseScenarios.worst,
				sources: []
			});
		}
		
		return damageInstances;
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
		if (typeof FightingPowerService !== 'undefined') {
			return FightingPowerService.countGrenades(players);
		}
		
		// Fallback: count grenades manually
		let count = 0;
		for (const player of players) {
			if (player.items) {
				for (const item of player.items) {
					if (item && item.replace(/\.(jpg|png)$/, '') === 'grenade') {
						count++;
					}
				}
			}
		}
		return count;
	},

	/**
	 * Returns empty result structure.
	 * @private
	 */
	_emptyResult() {
		return {
			occurrence: {},
			damage: {
				pessimist: 0,
				average: 0,
				optimist: 0,
				worstCase: 0,
				breakdown: {
					pessimist: [],
					average: [],
					optimist: [],
					worstCase: []
				}
			},
			damageInstances: {
				pessimist: [],
				average: [],
				optimist: [],
				worstCase: []
			},
			fightingPower: 0,
			grenadeCount: 0,
			playerCount: 0
		};
	}
};

// Export
if (typeof window !== 'undefined') {
	window.FightCalculator = FightCalculator;
}
