/**
 * FightCalculator
 * 
 * BACKEND: Calculates fight occurrence and damage using convolution.
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
	 * @returns {Object} Fight data with occurrence and damage info
	 */
	calculate(sectors, loadout = {}, players = []) {
		if (!sectors || sectors.length === 0) {
			return this._emptyResult();
		}

		// Get fighting power
		const fightingPower = this._getFightingPower(players);
		const grenadeCount = this._getGrenadeCount(players);

		// Calculate occurrence for each fight type
		const fightTypes = this._getAllFightTypes(sectors, loadout);
		const occurrence = {};
		
		for (const fightType of fightTypes) {
			occurrence[fightType] = this._calculateOccurrence(sectors, loadout, fightType);
		}

		// Calculate damage scenarios
		const damage = this._calculateDamage(occurrence, fightingPower, grenadeCount);

		return {
			occurrence,      // { "12": { pessimist, average, optimist, distribution }, ... }
			damage,          // { pessimist, average, optimist, worstCase }
			fightingPower,
			grenadeCount
		};
	},

	/**
	 * Calculates fight occurrence for a specific fight type using convolution.
	 * @private
	 */
	_calculateOccurrence(sectors, loadout, fightType) {
		const distributions = [];
		const fightEvent = `FIGHT_${fightType}`;

		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getModifiedProbabilities(sectorName, loadout);
			let fightProb = 0;

			for (const [eventName, prob] of probs) {
				if (eventName === fightEvent) {
					fightProb = prob;
					break;
				}
			}

			// Each sector: either 0 fights (1-p) or 1 fight (p)
			if (fightProb > 0) {
				distributions.push(new Map([
					[0, 1 - fightProb],
					[1, fightProb]
				]));
			}
		}

		if (distributions.length === 0) {
			return { pessimist: 0, average: 0, optimist: 0, distribution: new Map([[0, 1]]) };
		}

		// Convolve all sector distributions
		const combined = DistributionCalculator.convolveAll(distributions);
		const scenarios = DistributionCalculator.getScenarios(combined);

		return {
			...scenarios,
			distribution: combined,
			maxPossible: distributions.length
		};
	},

	/**
	 * Gets all fight types present in the selected sectors.
	 * @private
	 */
	_getAllFightTypes(sectors, loadout) {
		const fightTypes = new Set();

		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getModifiedProbabilities(sectorName, loadout);
			
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
	 * Calculates total damage for all scenarios.
	 * @private
	 */
	_calculateDamage(occurrence, fightingPower, grenadeCount) {
		// For each scenario (pessimist/average/optimist), calculate total damage
		const scenarios = ['pessimist', 'average', 'optimist'];
		const result = {
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
		};

		// Track grenades used per scenario
		const grenadesRemaining = {
			pessimist: grenadeCount,
			average: grenadeCount,
			optimist: grenadeCount,
			worstCase: grenadeCount
		};

		// Sort fight types by damage (highest first) - use grenades on biggest fights
		const sortedTypes = Object.keys(occurrence).sort((a, b) => {
			const damageA = this._getBaseDamage(a, 'average');
			const damageB = this._getBaseDamage(b, 'average');
			return damageB - damageA;
		});

		for (const fightType of sortedTypes) {
			const occ = occurrence[fightType];

			for (const scenario of scenarios) {
				const fightCount = Math.round(occ[scenario]);
				const damageInfo = this._calculateFightTypeDamage(
					fightType, 
					fightCount, 
					fightingPower, 
					grenadesRemaining[scenario],
					scenario
				);
				
				result[scenario] += damageInfo.totalDamage;
				grenadesRemaining[scenario] = damageInfo.grenadesRemaining;
				
				if (fightCount > 0) {
					result.breakdown[scenario].push({
						type: fightType,
						count: fightCount,
						damagePerFight: damageInfo.damagePerFight,
						totalDamage: damageInfo.totalDamage,
						grenadesUsed: damageInfo.grenadesUsed
					});
				}
			}

			// Worst case: max possible fights for this type
			const maxFights = occ.maxPossible || 0;
			const worstDamageInfo = this._calculateFightTypeDamage(
				fightType,
				maxFights,
				fightingPower,
				grenadesRemaining.worstCase,
				'worstCase'
			);
			
			result.worstCase += worstDamageInfo.totalDamage;
			grenadesRemaining.worstCase = worstDamageInfo.grenadesRemaining;
			
			if (maxFights > 0) {
				result.breakdown.worstCase.push({
					type: fightType,
					count: maxFights,
					damagePerFight: worstDamageInfo.damagePerFight,
					totalDamage: worstDamageInfo.totalDamage,
					grenadesUsed: worstDamageInfo.grenadesUsed
				});
			}
		}

		return result;
	},

	/**
	 * Calculates damage for a specific fight type and count.
	 * @private
	 */
	_calculateFightTypeDamage(fightType, fightCount, fightingPower, grenades, scenario) {
		if (fightCount === 0) {
			return { totalDamage: 0, damagePerFight: 0, grenadesUsed: 0, grenadesRemaining: grenades };
		}

		const baseDamage = this._getBaseDamage(fightType, scenario);
		let totalDamage = 0;
		let grenadesUsed = 0;
		let grenadesRemaining = grenades;

		// Process each fight sequentially
		for (let i = 0; i < fightCount; i++) {
			let effectiveFP = fightingPower;

			// Use grenade if available and beneficial
			if (grenadesRemaining > 0) {
				const damageWithoutGrenade = Math.max(0, baseDamage - fightingPower);
				const damageWithGrenade = Math.max(0, baseDamage - fightingPower - 3);
				
				if (damageWithGrenade < damageWithoutGrenade) {
					effectiveFP += 3;
					grenadesRemaining--;
					grenadesUsed++;
				}
			}

			const damage = Math.max(0, baseDamage - effectiveFP);
			totalDamage += damage;
		}

		return {
			totalDamage,
			damagePerFight: fightCount > 0 ? totalDamage / fightCount : 0,
			grenadesUsed,
			grenadesRemaining
		};
	},

	/**
	 * Gets base damage for a fight type.
	 * @private
	 */
	_getBaseDamage(fightType, scenario) {
		const info = this.FIGHT_DAMAGES[fightType];
		
		if (!info) {
			// Unknown fight type, try to parse as number
			return parseInt(fightType) || 0;
		}

		if (info.variable) {
			// Variable damage fight - use scenario-appropriate value
			if (scenario === 'optimist') return info.optimist;
			if (scenario === 'pessimist' || scenario === 'worstCase') return info.pessimist;
			return info.average;
		}

		return info.fixed;
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
			fightingPower: 0,
			grenadeCount: 0
		};
	}
};

// Export
if (typeof window !== 'undefined') {
	window.FightCalculator = FightCalculator;
}
