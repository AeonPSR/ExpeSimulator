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
				
				// Add to sector distribution: each damage value gets eventProb × damageProb
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
	 * @returns {Map<number, number>} Damage value → probability
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
	 * shift damage values down by (grenadeCount × 3), with minimum 0.
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
	 * Calculates fight occurrence for a specific fight type using convolution.
	 * Delegates to OccurrenceCalculator (shared with EventDamageCalculator).
	 * @deprecated Use OccurrenceCalculator.calculateForType directly
	 * @private
	 */
	_calculateOccurrenceWithSources(sectors, loadout, fightType, sectorProbabilities = null) {
		const fightEvent = `FIGHT_${fightType}`;
		return OccurrenceCalculator.calculateForType(sectors, loadout, fightEvent, sectorProbabilities);
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
	 * @deprecated Use _calculateDamageFromDistribution instead.
	 * Calculates total damage for all scenarios.
	 * @param {Object} occurrence - Fight occurrence data for normal scenarios
	 * @param {Object} worstCaseOccurrence - Fight occurrence data for worst case (may exclude some sectors)
	 * @param {number} fightingPower - Team's fighting power
	 * @param {number} grenadeCount - Available grenades
	 * @private
	 */
	_calculateDamage(occurrence, worstCaseOccurrence, fightingPower, grenadeCount) {
		// For each scenario (pessimist/median/optimist), calculate total damage
		const scenarios = ['pessimist', 'average', 'optimist'];
		const result = {
			pessimist: 0,
			average: 0,
			optimist: 0,
			worstCase: 0,
			// Probabilities will be set from occurrence distributions
			pessimistProb: 0,
			averageProb: 0,
			optimistProb: 0,
			worstCaseProb: 0,
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

		// Build combined occurrence distribution for probability calculation
		const occurrenceDistributions = [];
		for (const fightType of sortedTypes) {
			const occ = occurrence[fightType];
			if (occ.distribution) {
				occurrenceDistributions.push(occ.distribution);
			}
		}

		// Get cumulative probabilities from combined occurrence distribution
		if (occurrenceDistributions.length > 0) {
			const combinedOccurrence = DistributionCalculator.convolveAll(occurrenceDistributions);
			const occScenarios = DistributionCalculator.getScenarios(combinedOccurrence, false);
			result.optimistProb = occScenarios.optimistProb;
			result.averageProb = occScenarios.averageProb;
			result.pessimistProb = occScenarios.pessimistProb;
			result.worstCaseProb = occScenarios.worstProb;
		}

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
		}

		// Worst case: use worstCaseOccurrence (which may have excluded sectors)
		const worstCaseSortedTypes = Object.keys(worstCaseOccurrence).sort((a, b) => {
			const damageA = this._getBaseDamage(a, 'worstCase');
			const damageB = this._getBaseDamage(b, 'worstCase');
			return damageB - damageA;
		});

		for (const fightType of worstCaseSortedTypes) {
			const occ = worstCaseOccurrence[fightType];
			if (!occ) continue;

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
	 * @deprecated Use _calculateDamageFromDistribution instead.
	 * Calculates total damage for all scenarios with damage instances for per-player distribution.
	 * @param {Object} occurrence - Fight occurrence data
	 * @param {number} fightingPower - Team's fighting power
	 * @param {number} grenadeCount - Available grenades
	 * @param {number} playerCount - Number of players
	 * @param {Object} sectorsByFightType - Sectors that can produce each fight type
	 * @param {Set<string>} eventWinExclusions - Sectors where event "wins" (fight damage = 0)
	 * @private
	 */
	_calculateDamageWithInstances(occurrence, fightingPower, grenadeCount, playerCount, sectorsByFightType, eventWinExclusions = null) {
		const scenarios = ['pessimist', 'average', 'optimist'];
		
		const damage = {
			pessimist: 0,
			average: 0,
			optimist: 0,
			worstCase: 0,
			pessimistProb: 0,
			averageProb: 0,
			optimistProb: 0,
			worstCaseProb: 0,
			breakdown: {
				pessimist: [],
				average: [],
				optimist: [],
				worstCase: []
			}
		};

		// Damage instances for per-player distribution
		const damageInstances = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};

		// Track grenades and used sectors per scenario
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

		// Build combined occurrence distribution for probability calculation
		// Uses OccurrenceCalculator to combine per-type distributions
		const perTypeForCombine = {};
		for (const fightType of sortedTypes) {
			perTypeForCombine[fightType] = { occurrence: occurrence[fightType] };
		}
		const combined = OccurrenceCalculator.combineOccurrences(perTypeForCombine);
		damage.optimistProb = combined.scenarios.optimistProb;
		damage.averageProb = combined.scenarios.averageProb;
		damage.pessimistProb = combined.scenarios.pessimistProb;
		damage.worstCaseProb = combined.scenarios.worstProb;

		for (const fightType of sortedTypes) {
			const occ = occurrence[fightType];
			const availableSectors = sectorsByFightType[fightType] || [];

			for (const scenario of scenarios) {
				const fightCount = Math.round(occ[scenario]);
				const damageInfo = this._calculateFightTypeDamage(
					fightType, 
					fightCount, 
					fightingPower, 
					grenadesRemaining[scenario],
					scenario
				);
				
				damage[scenario] += damageInfo.totalDamage;
				grenadesRemaining[scenario] = damageInfo.grenadesRemaining;
				
				if (fightCount > 0) {
					damage.breakdown[scenario].push({
						type: fightType,
						count: fightCount,
						damagePerFight: damageInfo.damagePerFight,
						totalDamage: damageInfo.totalDamage,
						grenadesUsed: damageInfo.grenadesUsed
					});

					// Build damage instances with sources
					// Assign sectors to each fight instance (pick from available sectors)
					const sources = this._assignSourcesToInstances(fightCount, availableSectors);
					
					damageInstances[scenario].push({
						type: `FIGHT_${fightType}`,
						count: fightCount,
						damagePerInstance: damageInfo.damagePerFight,
						totalDamage: damageInfo.totalDamage,
						sources: sources
					});
				}
			}
		}

		// Worst case: use same occurrence but zero damage for sectors where event "wins"
		for (const fightType of sortedTypes) {
			const occ = occurrence[fightType];
			if (!occ) continue;

			const availableSectors = sectorsByFightType[fightType] || [];
			
			// Count how many fights come from non-excluded sectors
			// (sectors in eventWinExclusions still have fights, but those fights deal 0 damage)
			let effectiveFights = 0;
			let totalFights = occ.maxPossible || 0;
			
			if (eventWinExclusions && eventWinExclusions.size > 0) {
				// Count only fights from sectors where event doesn't win
				for (const sector of availableSectors) {
					if (!eventWinExclusions.has(sector.sectorName)) {
						effectiveFights++;
					}
				}
			} else {
				effectiveFights = totalFights;
			}
			
			const worstDamageInfo = this._calculateFightTypeDamage(
				fightType,
				effectiveFights,  // Only non-excluded sectors contribute damage
				fightingPower,
				grenadesRemaining.worstCase,
				'worstCase'
			);
			
			damage.worstCase += worstDamageInfo.totalDamage;
			grenadesRemaining.worstCase = worstDamageInfo.grenadesRemaining;
			
			if (totalFights > 0) {
				damage.breakdown.worstCase.push({
					type: fightType,
					count: totalFights,  // Total fights that occur
					effectiveCount: effectiveFights,  // Fights that deal damage
					damagePerFight: worstDamageInfo.damagePerFight,
					totalDamage: worstDamageInfo.totalDamage,
					grenadesUsed: worstDamageInfo.grenadesUsed
				});

				// Build damage instances with sources for worst case
				// Mark sectors where event wins (damage = 0)
				const sources = [];
				for (const sector of availableSectors) {
					const isExcluded = eventWinExclusions && eventWinExclusions.has(sector.sectorName);
					sources.push({
						sectorName: sector.sectorName,
						probability: sector.probability,
						zeroDamage: isExcluded  // Event wins, so fight damage = 0
					});
				}
				
				damageInstances.worstCase.push({
					type: `FIGHT_${fightType}`,
					count: totalFights,
					effectiveCount: effectiveFights,
					damagePerInstance: worstDamageInfo.damagePerFight,
					totalDamage: worstDamageInfo.totalDamage,
					sources: sources
				});
			}
		}

		return { damage, damageInstances };
	},

	/**
	 * Assigns source sectors to fight instances.
	 * @private
	 */
	_assignSourcesToInstances(count, availableSectors) {
		const sources = [];
		for (let i = 0; i < count; i++) {
			if (i < availableSectors.length) {
				sources.push({
					sectorName: availableSectors[i].sectorName,
					probability: availableSectors[i].probability
				});
			} else {
				// More instances than sectors - shouldn't happen but handle gracefully
				sources.push({
					sectorName: availableSectors[i % availableSectors.length]?.sectorName || 'UNKNOWN',
					probability: availableSectors[i % availableSectors.length]?.probability || 0
				});
			}
		}
		return sources;
	},

	/**
	 * Calculates damage for a specific fight type and count.
	 * Multiple grenades can be used per fight to reduce damage further.
	 * @private
	 */
	_calculateFightTypeDamage(fightType, fightCount, fightingPower, grenades, scenario) {
		if (fightCount === 0) {
			return { totalDamage: 0, damagePerFight: 0, grenadesUsed: 0, grenadesRemaining: grenades };
		}

		const baseDamage = this._getBaseDamage(fightType, scenario);
		const grenadePower = 3;  // Each grenade adds +3 FP
		let totalDamage = 0;
		let grenadesUsed = 0;
		let grenadesRemaining = grenades;

		// Process each fight sequentially
		for (let i = 0; i < fightCount; i++) {
			let effectiveFP = fightingPower;
			let grenadesUsedThisFight = 0;

			// Use grenades while available and beneficial (can use multiple per fight)
			while (grenadesRemaining > 0) {
				const currentDamage = Math.max(0, baseDamage - effectiveFP);
				const damageWithOneMoreGrenade = Math.max(0, baseDamage - effectiveFP - grenadePower);
				
				// Only use grenade if it reduces damage
				if (damageWithOneMoreGrenade < currentDamage) {
					effectiveFP += grenadePower;
					grenadesRemaining--;
					grenadesUsedThisFight++;
				} else {
					// No benefit from using another grenade
					break;
				}
			}

			grenadesUsed += grenadesUsedThisFight;
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
