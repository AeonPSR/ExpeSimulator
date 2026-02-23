/**
 * ResourceCalculator
 * 
 * BACKEND: Calculates expected resource yields using convolution.
 * Builds per-sector distributions with bonuses applied, then convolves.
 * 
 * Resources: Fruits, Steaks, Fuel, O2, Artefacts, Map Fragments
 * 
 * @module probability/ResourceCalculator
 */
const ResourceCalculator = {

	/**
	 * Calculates all resource yields for an expedition.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - { abilities: [], items: [], projects: [] }
	 * @param {Array<Object>} players - Raw player data for counting duplicates
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @returns {Object} Resource data with pessimist/average/optimist for each
	 */
	calculate(sectors, loadout = {}, players = [], sectorProbabilities = null) {
		if (!sectors || sectors.length === 0) {
			return this._emptyResult();
		}

		// Count modifiers
		const modifiers = this._countModifiers(players);

		// Build and convolve distributions for each resource type
		return {
			fruits: this._calculateWithConvolution(sectors, loadout, 'HARVEST', modifiers.botanistCount, sectorProbabilities),
			steaks: this._calculateWithConvolution(sectors, loadout, 'PROVISION', modifiers.survivalCount, sectorProbabilities),
			fuel: this._calculateFuelWithConvolution(sectors, loadout, modifiers.drillerCount, sectorProbabilities),
			oxygen: this._calculateOxygen(sectors, loadout, sectorProbabilities),
			artefacts: this._calculateArtefacts(sectors, loadout, sectorProbabilities),
			mapFragments: this._calculateMapFragments(sectors, loadout, sectorProbabilities)
		};
	},

	/**
	 * Calculates oxygen with pessimist always = 0 (worst case: find nothing)
	 * @private
	 */
	_calculateOxygen(sectors, loadout, sectorProbabilities = null) {
		const result = this._calculateWithConvolution(sectors, loadout, 'OXYGEN', 0, sectorProbabilities);
		// Pessimist for O2 is always 0 (you might find nothing)
		result.pessimist = 0;
		return result;
	},

	/**
	 * Calculates resource using convolution with additive bonus.
	 * @private
	 */
	_calculateWithConvolution(sectors, loadout, eventPrefix, bonusPerEvent, sectorProbabilities = null) {
		const distributions = [];

		for (const sectorName of sectors) {
			const dist = this._buildSectorDistribution(sectorName, loadout, eventPrefix, bonusPerEvent, sectorProbabilities);
			distributions.push(dist);
		}

		if (distributions.length === 0) {
			return { pessimist: 0, average: 0, optimist: 0 };
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		return this._getTailScenarios(combined);
	},

	/**
	 * Builds distribution for a single sector for a resource type.
	 * Applies bonus to each resource event.
	 * @private
	 */
	_buildSectorDistribution(sectorName, loadout, eventPrefix, bonusPerEvent, sectorProbabilities = null) {
		const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
		const dist = new Map();
		let resourceProb = 0;

		for (const [eventName, prob] of probs) {
			if (eventName.startsWith(eventPrefix + '_')) {
				const baseAmount = parseInt(eventName.split('_')[1]) || 1;
				const finalAmount = baseAmount + bonusPerEvent;
				dist.set(finalAmount, (dist.get(finalAmount) || 0) + prob);
				resourceProb += prob;
			}
		}

		// Add probability of getting 0 (non-resource events)
		const zeroProb = 1 - resourceProb;
		if (zeroProb > 0.0001) {
			dist.set(0, (dist.get(0) || 0) + zeroProb);
		}

		// Handle empty distribution
		if (dist.size === 0) {
			return new Map([[0, 1]]);
		}

		return dist;
	},

	/**
	 * Calculates fuel with multiplicative bonus (driller = x2).
	 * @private
	 */
	_calculateFuelWithConvolution(sectors, loadout, drillerCount, sectorProbabilities = null) {
		const multiplier = Math.pow(2, drillerCount);
		const distributions = [];

		for (const sectorName of sectors) {
			const dist = this._buildFuelDistribution(sectorName, loadout, multiplier, sectorProbabilities);
			distributions.push(dist);
		}

		if (distributions.length === 0) {
			return { pessimist: 0, average: 0, optimist: 0 };
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		return this._getTailScenarios(combined);
	},

	/**
	 * Builds fuel distribution for a single sector with multiplier.
	 * @private
	 */
	_buildFuelDistribution(sectorName, loadout, multiplier, sectorProbabilities = null) {
		const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
		const dist = new Map();
		let fuelProb = 0;

		for (const [eventName, prob] of probs) {
			if (eventName.startsWith('FUEL_')) {
				const baseAmount = parseInt(eventName.split('_')[1]) || 1;
				const finalAmount = baseAmount * multiplier;
				dist.set(finalAmount, (dist.get(finalAmount) || 0) + prob);
				fuelProb += prob;
			}
		}

		const zeroProb = 1 - fuelProb;
		if (zeroProb > 0.0001) {
			dist.set(0, (dist.get(0) || 0) + zeroProb);
		}

		if (dist.size === 0) {
			return new Map([[0, 1]]);
		}

		return dist;
	},

	/**
	 * Calculates artefacts (8/9 of ARTEFACT events).
	 * @private
	 */
	_calculateArtefacts(sectors, loadout, sectorProbabilities = null) {
		const distributions = [];

		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
			const dist = new Map();
			let artefactProb = 0;

			for (const [eventName, prob] of probs) {
				if (eventName === 'ARTEFACT') {
					// 8/9 chance it's a real artefact
					const realArtefactProb = prob * (8 / 9);
					dist.set(1, (dist.get(1) || 0) + realArtefactProb);
					artefactProb += realArtefactProb;
				}
			}

			const zeroProb = 1 - artefactProb;
			if (zeroProb > 0.0001) {
				dist.set(0, zeroProb);
			}

			if (dist.size === 0) {
				dist.set(0, 1);
			}

			distributions.push(dist);
		}

		if (distributions.length === 0) {
			return { pessimist: 0, average: 0, optimist: 0 };
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		return this._getTailScenarios(combined);
	},

	/**
	 * Calculates map fragments (STARMAP + 1/9 of ARTEFACT).
	 * If any ARTEFACT exists, optimist is at least 0.1 (important for ending)
	 * @private
	 */
	_calculateMapFragments(sectors, loadout, sectorProbabilities = null) {
		const distributions = [];
		let hasArtefact = false;

		for (const sectorName of sectors) {
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
			const dist = new Map();
			let mapProb = 0;

			for (const [eventName, prob] of probs) {
				if (eventName === 'STARMAP') {
					dist.set(1, (dist.get(1) || 0) + prob);
					mapProb += prob;
				} else if (eventName === 'ARTEFACT') {
					hasArtefact = true;
					// 1/9 chance it's a map fragment
					const mapFragmentProb = prob * (1 / 9);
					dist.set(1, (dist.get(1) || 0) + mapFragmentProb);
					mapProb += mapFragmentProb;
				}
			}

			const zeroProb = 1 - mapProb;
			if (zeroProb > 0.0001) {
				dist.set(0, zeroProb);
			}

			if (dist.size === 0) {
				dist.set(0, 1);
			}

			distributions.push(dist);
		}

		if (distributions.length === 0) {
			return { pessimist: 0, average: 0, optimist: 0 };
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		const result = this._getTailScenarios(combined);

		// If any artefact exists, optimist should be at least 0.1 (starmaps are important for endings)
		if (hasArtefact && result.optimist < 0.1) {
			result.optimist = 0.1;
		}

		return result;
	},

	/**
	 * Computes conditional tail expectations from a distribution.
	 * Uses the same approach as NegativeEventCalculator but for resources:
	 * higher is better, so optimist = top tail, pessimist = bottom tail.
	 *
	 * - average  = E[X]
	 * - optimist = E[X | top 25%]      (most resources = best)
	 * - pessimist = E[X | bottom 25%]  (fewest resources = worst)
	 *
	 * @private
	 * @param {Map<number, number>} distribution - value → probability
	 * @returns {Object} { pessimist, average, optimist }
	 */
	_getTailScenarios(distribution) {
		const sorted = [...distribution.entries()].sort((a, b) => a[0] - b[0]);

		// Expected value
		let average = 0;
		for (const [value, prob] of sorted) {
			average += value * prob;
		}

		// Pessimist: conditional expectation of bottom 25% (ascending — fewest resources)
		const pessimist = this._conditionalExpectation(sorted, 0.25, 'bottom');

		// Optimist: conditional expectation of top 25% (descending — most resources)
		const optimist = this._conditionalExpectation(sorted, 0.25, 'top');

		return { pessimist, average, optimist };
	},

	/**
	 * Computes the conditional expected value of a tail of the distribution.
	 *
	 * @private
	 * @param {Array<[number, number]>} sorted - Entries sorted ascending by value
	 * @param {number} tailFraction - Fraction of probability mass to include (e.g. 0.25)
	 * @param {string} side - 'bottom' (ascending from min) or 'top' (descending from max)
	 * @returns {number} Conditional expected value of the tail
	 */
	_conditionalExpectation(sorted, tailFraction, side) {
		const entries = side === 'top' ? [...sorted].reverse() : sorted;
		let remaining = tailFraction;
		let weightedSum = 0;

		for (const [value, prob] of entries) {
			const take = Math.min(prob, remaining);
			weightedSum += value * take;
			remaining -= take;
			if (remaining <= 1e-10) break;
		}

		return weightedSum / tailFraction;
	},

	/**
	 * Counts modifiers from raw player data.
	 * Uses ABILITY_ALIASES to expand abilities (e.g. Skillful counts as Botanic).
	 * @private
	 */
	_countModifiers(players) {
		let botanistCount = 0;
		let survivalCount = 0;
		let drillerCount = 0;

		for (const player of players) {
			if (player.abilities) {
				for (const ability of player.abilities) {
					if (ability) {
						const id = filenameToId(ability);
						// Collect this ability + any aliases it grants
						const effectiveAbilities = [id, ...(Constants.ABILITY_ALIASES[id] || [])];
						for (const eid of effectiveAbilities) {
							if (eid === 'BOTANIC') botanistCount++;
							if (eid === 'SURVIVAL') survivalCount++;
						}
					}
				}
			}
			if (player.items) {
				for (const item of player.items) {
					if (item) {
						const id = filenameToId(item);
						if (id === 'DRILLER') drillerCount++;
					}
				}
			}
		}

		return { botanistCount, survivalCount, drillerCount };
	},

	/**
	 * Returns empty result structure.
	 * @private
	 */
	_emptyResult() {
		const zero = { pessimist: 0, average: 0, optimist: 0 };
		return {
			fruits: { ...zero },
			steaks: { ...zero },
			fuel: { ...zero },
			oxygen: { ...zero },
			artefacts: { ...zero },
			mapFragments: { ...zero }
		};
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.ResourceCalculator = ResourceCalculator;
