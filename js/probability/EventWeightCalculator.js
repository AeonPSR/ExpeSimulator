/**
 * EventWeightCalculator
 * 
 * BACKEND: Pure calculation service for event probabilities.
 * Returns DATA STRUCTURES only - NO HTML generation.
 * 
 * @module probability/EventWeightCalculator
 */
const EventWeightCalculator = {

	// ========================================
	// Sampling-Aware Calculation (Movement Speed)
	// ========================================

	/**
	 * Calculates expedition results accounting for movement speed limits.
	 * 
	 * When movementSpeed < totalSectors, we can't visit all sectors.
	 * This method enumerates all possible sector compositions, runs
	 * calculations for each, and mixes the results weighted by
	 * composition probability.
	 * 
	 * @param {Object} sectorCounts - Map of sectorType → count (e.g., {FOREST: 3, DESERT: 4})
	 * @param {number} movementSpeed - Number of sectors that can be explored
	 * @param {Object} loadout - Combined loadout { abilities: [], items: [], projects: [] }
	 * @param {Array<Object>} players - Raw player data
	 * @param {Object} options - Additional options
	 * @param {Array<string>} options.alwaysInclude - Sectors always included (e.g., LANDING)
	 * @returns {Object} Complete results data structure (same shape as calculate())
	 */
	calculateWithSampling(sectorCounts, movementSpeed, loadout = {}, players = [], options = {}) {
		const totalSectors = Object.values(sectorCounts).reduce((a, b) => a + b, 0);
		const alwaysInclude = options.alwaysInclude || [];

		// If we can visit all sectors, no sampling needed - use standard calculate
		if (movementSpeed >= totalSectors) {
			const allSectors = [];
			for (const [type, count] of Object.entries(sectorCounts)) {
				for (let i = 0; i < count; i++) {
					allSectors.push(type);
				}
			}
			// Add always-included sectors
			for (const sector of alwaysInclude) {
				allSectors.push(sector);
			}
			return this.calculate(allSectors, loadout, players);
		}

		// Generate weighted compositions
		const compositions = SectorSampler.generateWeightedCompositions(
			sectorCounts, movementSpeed, loadout
		);

		if (compositions.length === 0) {
			return null;
		}

		// Calculate results for each composition
		const compositionResults = [];
		for (const { composition, probability } of compositions) {
			// Expand composition to sector array
			const sectors = SectorSampler.expandComposition(composition);
			
			// Add always-included sectors (e.g., LANDING)
			for (const sector of alwaysInclude) {
				sectors.push(sector);
			}

			// Run standard calculation
			const result = this.calculate(sectors, loadout, players);
			
			compositionResults.push({
				composition,
				probability,
				sectors,
				result
			});
		}

		// Mix all results
		return this._mixCompositionResults(compositionResults, loadout, players);
	},

	/**
	 * Mixes results from multiple compositions into a single result.
	 * 
	 * @param {Array} compositionResults - Array of {composition, probability, sectors, result}
	 * @param {Object} loadout - For reference
	 * @param {Array} players - For reference
	 * @returns {Object} Mixed results
	 * @private
	 */
	_mixCompositionResults(compositionResults, loadout, players) {
		if (compositionResults.length === 0) {
			return null;
		}

		if (compositionResults.length === 1) {
			return compositionResults[0].result;
		}

		// ========================================
		// Mix Resources
		// ========================================
		const mixedResources = this._mixResourceResults(compositionResults);

		// ========================================
		// Mix Combat (Fights)
		// ========================================
		const mixedCombat = this._mixDamageResults(compositionResults, 'combat');

		// ========================================
		// Mix Event Damage
		// ========================================
		const mixedEventDamage = this._mixDamageResults(compositionResults, 'eventDamage');

		// ========================================
		// Mix Negative Events
		// ========================================
		const mixedNegativeEvents = this._mixNegativeEventResults(compositionResults);

		// ========================================
		// Build weighted sector breakdown
		// ========================================
		const sectorBreakdown = this._mixSectorBreakdown(compositionResults);

		return {
			resources: mixedResources,
			combat: mixedCombat,
			eventDamage: mixedEventDamage,
			negativeEvents: mixedNegativeEvents,
			sectorBreakdown: sectorBreakdown,
			// Include sampling metadata
			_sampling: {
				enabled: true,
				compositionCount: compositionResults.length,
				compositions: compositionResults.map(cr => ({
					composition: cr.composition,
					probability: cr.probability
				}))
			}
		};
	},

	/**
	 * Mixes resource results from multiple compositions.
	 * @private
	 */
	_mixResourceResults(compositionResults) {
		const resourceTypes = ['fruits', 'steaks', 'fuel', 'oxygen', 'artefacts', 'mapFragments'];
		const mixed = {};

		for (const resourceType of resourceTypes) {
			// Collect distributions from each composition
			const weightedDists = [];
			const weightedScenarios = [];

			for (const { probability, result } of compositionResults) {
				const resourceData = result.resources?.[resourceType];
				if (!resourceData) continue;

				if (resourceData.distribution) {
					weightedDists.push({
						distribution: resourceData.distribution,
						weight: probability
					});
				}

				weightedScenarios.push({
					scenarios: {
						pessimist: resourceData.pessimist || 0,
						average: resourceData.average || 0,
						optimist: resourceData.optimist || 0
					},
					weight: probability
				});
			}

			// Mix distributions if available
			let mixedDistribution = null;
			if (weightedDists.length > 0) {
				mixedDistribution = DistributionCalculator.mixDistributions(weightedDists);
			}

			// Mix scenarios (weighted average)
			const mixedScenarios = DistributionCalculator.mixScenarios(weightedScenarios);

			mixed[resourceType] = {
				pessimist: mixedScenarios.pessimist,
				average: mixedScenarios.average,
				optimist: mixedScenarios.optimist,
				distribution: mixedDistribution
			};
		}

		return mixed;
	},

	/**
	 * Mixes damage results (combat or eventDamage) from multiple compositions.
	 * @private
	 */
	_mixDamageResults(compositionResults, key) {
		const weightedDists = [];
		
		// Track composition results by damage value for damageInstance selection
		const damageToCompositions = new Map(); // damageValue → [{composition, probability, damageInstances}, ...]

		for (const { composition, probability, result } of compositionResults) {
			const damageData = result[key];
			if (!damageData) continue;

			// Collect distribution
			const dist = damageData.damageDistribution || damageData.damage?.distribution;
			if (dist) {
				weightedDists.push({ distribution: dist, weight: probability });
			}

			// Track damageInstances by scenario damage value
			const damageInstances = damageData.damageInstances;
			if (damageInstances) {
				for (const scenario of Constants.SCENARIO_KEYS) {
					const instances = damageInstances[scenario];
					if (instances && instances.length > 0) {
						const totalDamage = instances.reduce((sum, inst) => sum + (inst.totalDamage || 0), 0);
						if (!damageToCompositions.has(totalDamage)) {
							damageToCompositions.set(totalDamage, []);
						}
						damageToCompositions.get(totalDamage).push({
							composition,
							probability,
							instances,
							scenario
						});
					}
				}
			}
		}

		// Mix the damage distribution
		if (weightedDists.length === 0) {
			return DamageDistributionEngine.emptyDamageResult();
		}

		const mixedDistribution = DistributionCalculator.mixDistributions(weightedDists);
		
		// Extract scenarios from mixed distribution
		const scenarios = DistributionCalculator.getScenarios(mixedDistribution);

		// Select damageInstances for each scenario from the most probable composition
		const mixedDamageInstances = this._selectDamageInstances(scenarios, damageToCompositions);

		// Get other fields from first result as reference
		const firstResult = compositionResults[0].result[key];

		return {
			occurrence: firstResult?.occurrence || {},
			damage: {
				optimist: scenarios.optimist,
				average: scenarios.average,
				pessimist: scenarios.pessimist,
				worstCase: scenarios.worstCase,
				optimistProb: scenarios.optimistProb,
				averageProb: scenarios.averageProb,
				pessimistProb: scenarios.pessimistProb,
				worstCaseProb: scenarios.worstCaseProb,
				distribution: mixedDistribution
			},
			damageInstances: mixedDamageInstances,
			damageDistribution: mixedDistribution,
			fightingPower: firstResult?.fightingPower,
			grenadeCount: firstResult?.grenadeCount,
			playerCount: firstResult?.playerCount
		};
	},

	/**
	 * Selects damageInstances for each scenario from the most probable composition
	 * that produces the target damage value.
	 * @private
	 */
	_selectDamageInstances(scenarios, damageToCompositions) {
		const result = {
			pessimist: [],
			average: [],
			optimist: [],
			worstCase: []
		};

		for (const scenario of Constants.SCENARIO_KEYS) {
			const targetDamage = scenarios[scenario];
			
			// Find compositions that produced this damage value
			const candidates = damageToCompositions.get(targetDamage) || [];
			
			if (candidates.length === 0) {
				// No exact match - find closest
				let closest = null;
				let closestDiff = Infinity;
				for (const [damage, comps] of damageToCompositions) {
					const diff = Math.abs(damage - targetDamage);
					if (diff < closestDiff) {
						closestDiff = diff;
						closest = comps;
					}
				}
				if (closest && closest.length > 0) {
					// Pick most probable
					closest.sort((a, b) => b.probability - a.probability);
					result[scenario] = closest[0].instances;
				}
			} else {
				// Pick the most probable composition that matches
				candidates.sort((a, b) => b.probability - a.probability);
				result[scenario] = candidates[0].instances;
			}
		}

		return result;
	},

	/**
	 * Mixes negative event results from multiple compositions.
	 * @private
	 */
	_mixNegativeEventResults(compositionResults) {
		const eventTypes = ['disease', 'playerLost', 'again', 'itemLost', 'killAll', 'killOne', 'mushTrap'];
		const mixed = {};

		for (const eventType of eventTypes) {
			const weightedScenarios = [];

			for (const { probability, result } of compositionResults) {
				const eventData = result.negativeEvents?.[eventType];
				if (!eventData) continue;

				weightedScenarios.push({
					scenarios: {
						pessimist: eventData.pessimist || 0,
						average: eventData.average || 0,
						optimist: eventData.optimist || 0
					},
					weight: probability
				});
			}

			const mixedScenarios = DistributionCalculator.mixScenarios(weightedScenarios);
			mixed[eventType] = {
				pessimist: mixedScenarios.pessimist,
				average: mixedScenarios.average,
				optimist: mixedScenarios.optimist
			};
		}

		return mixed;
	},

	/**
	 * Creates a weighted average sector breakdown.
	 * @private
	 */
	_mixSectorBreakdown(compositionResults) {
		const breakdown = {};
		const sectorWeights = new Map(); // sectorName → total weight seen

		for (const { composition, probability, result } of compositionResults) {
			const sectorBreakdown = result.sectorBreakdown || {};
			
			for (const [sectorName, data] of Object.entries(sectorBreakdown)) {
				// Weight the count by composition probability
				const weightedCount = (data.count || 0) * probability;
				
				if (!breakdown[sectorName]) {
					breakdown[sectorName] = {
						count: 0,
						expectedCount: 0,
						events: {}
					};
				}
				
				breakdown[sectorName].expectedCount += weightedCount;
				
				// Track max count seen (for display purposes)
				breakdown[sectorName].count = Math.max(
					breakdown[sectorName].count,
					data.count || 0
				);

				// Merge events (weighted)
				for (const [eventName, prob] of Object.entries(data.events || {})) {
					if (!breakdown[sectorName].events[eventName]) {
						breakdown[sectorName].events[eventName] = 0;
					}
					breakdown[sectorName].events[eventName] += prob * probability;
				}
			}
		}

		return breakdown;
	},

	// ========================================
	// Core Probability Methods
	// ========================================

	/**
	 * Calculates normalized probabilities for all events in a sector.
	 * 
	 * @param {Object} sectorConfig - Sector configuration from PlanetSectorConfigData
	 * @returns {Map<string, number>} Map of event names to probabilities (sum = 1.0)
	 */
	calculateProbabilities(sectorConfig) {
		if (!sectorConfig || !sectorConfig.explorationEvents) {
			return new Map();
		}

		const events = sectorConfig.explorationEvents;
		const totalWeight = this._getTotalWeight(events);
		
		if (totalWeight === 0) {
			return new Map();
		}

		const probabilities = new Map();
		for (const [eventName, weight] of Object.entries(events)) {
			probabilities.set(eventName, weight / totalWeight);
		}

		return probabilities;
	},

	/**
	 * Gets sector configuration by name.
	 * 
	 * @param {string} sectorName - Name of the sector
	 * @returns {Object|null} Sector configuration or null
	 */
	getSectorConfig(sectorName) {
		if (typeof PlanetSectorConfigData === 'undefined') {
			return null;
		}
		return PlanetSectorConfigData.find(s => s.sectorName === sectorName) || null;
	},

	/**
	 * Gets probabilities for a sector with modifiers applied.
	 * 
	 * @param {string} sectorName - Sector name
	 * @param {Object} loadout - Player loadout { abilities: [], items: [], projects: [] }
	 * @returns {Map<string, number>} Probabilities map
	 */
	getModifiedProbabilities(sectorName, loadout = {}) {
		const config = this.getSectorConfig(sectorName);
		if (!config) {
			return new Map();
		}

		if (typeof ModifierApplicator !== 'undefined' && Object.keys(loadout).length > 0) {
			const modifiedConfig = ModifierApplicator.apply(config, sectorName, loadout);
			return this.calculateProbabilities(modifiedConfig);
		}

		return this.calculateProbabilities(config);
	},

	// ========================================
	// Main Calculation Method
	// ========================================

	/**
	 * Main calculation method - returns complete results data structure.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - Combined loadout { abilities: [], items: [], projects: [] }
	 * @param {Array<Object>} players - Optional: raw player data for resource modifier counting
	 * @returns {Object} Complete results data structure
	 */
	calculate(sectors, loadout = {}, players = []) {
		if (!sectors || sectors.length === 0) {
			return null;
		}

		// Build sector counts
		const sectorCounts = {};
		for (const sector of sectors) {
			sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
		}

		// OPTIMIZATION: Precompute all sector probabilities ONCE
		// This map is passed to all sub-calculators to avoid redundant recalculation
		const sectorProbabilities = this._precomputeSectorProbabilities(sectors, loadout);

		// Calculate resources using ResourceCalculator (convolution-based)
		const resources = ResourceCalculator.calculate(sectors, loadout, players, sectorProbabilities);

		// Calculate negative events using NegativeEventCalculator (convolution-based)
		const negativeEvents = NegativeEventCalculator.calculate(sectors, loadout, sectorProbabilities);

		// Use DamageComparator to determine which sectors should have fight vs event damage
		// for worst case calculations (mutual exclusivity)
		let fightExclusions = null;  // Sectors where event damage "wins" (exclude from fight worst case)
		let eventExclusions = null;  // Sectors where fight damage "wins" (exclude from event worst case)
		
		if (typeof DamageComparator !== 'undefined' && typeof FightingPowerService !== 'undefined') {
			const playerCount = players.length;
			const fightingPower = FightingPowerService.calculateBaseFightingPower(players);
			const grenadeCount = FightingPowerService.countGrenades(players);
			
			const evaluation = DamageComparator.evaluateExpedition(
				sectors, loadout, playerCount, fightingPower, grenadeCount, sectorProbabilities
			);
			
			fightExclusions = new Set();
			eventExclusions = new Set();
			
			for (const [sectorName, result] of evaluation.sectorResults) {
				if (result.worstEvent) {
					if (result.eventType === 'event') {
						// Event damage wins - exclude this sector from fight worst case
						fightExclusions.add(sectorName);
					} else if (result.eventType === 'fight') {
						// Fight damage wins - exclude this sector from event worst case
						eventExclusions.add(sectorName);
					}
				}
			}
		}

		// Calculate fights using FightCalculator (convolution-based)
		const combat = FightCalculator.calculate(sectors, loadout, players, fightExclusions, sectorProbabilities);

		// Calculate event damage using EventDamageCalculator (convolution-based)
		const eventDamage = EventDamageCalculator.calculate(sectors, loadout, players, eventExclusions, sectorProbabilities);

		// Build sector breakdown (reuse precomputed probabilities)
		const sectorBreakdown = this._buildSectorBreakdownFromCache(sectorCounts, sectorProbabilities);

		return {
			resources: resources,
			combat: combat,  // Full fight data with occurrence + damage
			eventDamage: eventDamage,  // Full event damage data with occurrence + scenarios
			negativeEvents: negativeEvents,  // Convolution-based pessimist/average/optimist per event type
			sectorBreakdown: sectorBreakdown
		};
	},

	// ========================================
	// Private Helper Methods
	// ========================================

	/**
	 * Precomputes sector probabilities for all unique sectors.
	 * This is called ONCE at the start of calculate() and the result is passed
	 * to all sub-calculators to avoid redundant recalculation.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - Player loadout
	 * @returns {Map<string, Map<string, number>>} sectorName → (eventName → probability)
	 * @private
	 */
	_precomputeSectorProbabilities(sectors, loadout) {
		const cache = new Map();
		const uniqueSectors = [...new Set(sectors)];
		
		for (const sectorName of uniqueSectors) {
			cache.set(sectorName, this.getModifiedProbabilities(sectorName, loadout));
		}
		
		return cache;
	},

	/**
	 * Gets probabilities for a sector, using cache if available.
	 * This is the preferred method for sub-calculators to use.
	 * 
	 * @param {string} sectorName - Sector name
	 * @param {Object} loadout - Player loadout (used only if cache miss)
	 * @param {Map} sectorProbabilities - Precomputed cache (optional)
	 * @returns {Map<string, number>} eventName → probability
	 */
	getSectorProbabilities(sectorName, loadout, sectorProbabilities = null) {
		if (sectorProbabilities && sectorProbabilities.has(sectorName)) {
			return sectorProbabilities.get(sectorName);
		}
		return this.getModifiedProbabilities(sectorName, loadout);
	},

	/**
	 * @private
	 */
	_getTotalWeight(events) {
		return Object.values(events).reduce((sum, weight) => sum + weight, 0);
	},

	/**
	 * @private - Builds sector breakdown with event probabilities (using cache)
	 */
	_buildSectorBreakdownFromCache(sectorCounts, sectorProbabilities) {
		const breakdown = {};

		for (const [sectorName, count] of Object.entries(sectorCounts)) {
			const probs = sectorProbabilities.get(sectorName);
			const events = {};
			
			if (probs) {
				for (const [eventName, prob] of probs) {
					events[eventName] = prob;
				}
			}

			breakdown[sectorName] = {
				count: count,
				events: events
			};
		}

		return breakdown;
	},

	/**
	 * @private - Builds sector breakdown with event probabilities (legacy, no cache)
	 */
	_buildSectorBreakdown(sectorCounts, loadout) {
		const breakdown = {};

		for (const [sectorName, count] of Object.entries(sectorCounts)) {
			const probs = this.getModifiedProbabilities(sectorName, loadout);
			const events = {};
			
			for (const [eventName, prob] of probs) {
				events[eventName] = prob;
			}

			breakdown[sectorName] = {
				count: count,
				events: events
			};
		}

		return breakdown;
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.EventWeightCalculator = EventWeightCalculator;
