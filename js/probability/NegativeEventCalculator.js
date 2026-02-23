/**
 * NegativeEventCalculator
 * 
 * BACKEND: Calculates expected negative event counts using convolution.
 * Builds per-sector binary distributions (event fires or not), then convolves
 * to get total occurrence distribution.
 * 
 * Uses conditional tail expectations instead of percentiles, because negative
 * events are rare per-sector (5-15%) and percentile-based scenarios snap to
 * integer values (0 or 1), losing all granularity.
 * 
 * - Average  = E[X]                   (expected value of the full distribution)
 * - Optimist = E[X | bottom 25%]      (conditional mean of best-case quartile)
 * - Pessimist = E[X | top 25%]        (conditional mean of worst-case quartile)
 * 
 * Fewer negative events = better (optimist).
 * 
 * Negative events: Disease, Player Lost, Sector Unexplored (Again),
 *                  Item Lost, Kill All, Kill One, Mush Trap
 * 
 * @module probability/NegativeEventCalculator
 */
const NegativeEventCalculator = {

	/**
	 * Event type definitions — maps output keys to the event categories
	 * they match via EventClassifier.
	 * @private
	 */
	EVENT_TYPES: {
		disease:    { categories: ['disease'] },
		playerLost: { categories: ['playerLost'] },
		again:      { categories: ['again'] },
		itemLost:   { categories: ['itemLost'] },
		killAll:    { categories: ['killAll'] },
		killOne:    { categories: ['killOne'] },
		mushTrap:   { categories: ['mushTrap'] }
	},

	/**
	 * Calculates all negative event distributions for an expedition.
	 * 
	 * @param {Array<string>} sectors - Array of sector names
	 * @param {Object} loadout - { abilities: [], items: [], projects: [] }
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities
	 * @returns {Object} Each key has { pessimist, average, optimist }
	 */
	calculate(sectors, loadout = {}, sectorProbabilities = null) {
		if (!sectors || sectors.length === 0) {
			return this._emptyResult();
		}

		const result = {};

		for (const [key, config] of Object.entries(this.EVENT_TYPES)) {
			result[key] = this._calculateEventType(
				sectors, loadout, config.categories, sectorProbabilities
			);
		}

		return result;
	},

	/**
	 * Calculates convolved distribution for a single negative event type.
	 * Each sector contributes a binary distribution: event fires (1) or not (0).
	 * 
	 * @private
	 * @param {Array<string>} sectors - Sector names
	 * @param {Object} loadout - Player loadout
	 * @param {Array<string>} categories - EventClassifier categories to match
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities
	 * @returns {Object} { pessimist, average, optimist }
	 */
	_calculateEventType(sectors, loadout, categories, sectorProbabilities) {
		const distributions = [];

		for (const sectorName of sectors) {
			const dist = this._buildSectorDistribution(
				sectorName, loadout, categories, sectorProbabilities
			);
			distributions.push(dist);
		}

		if (distributions.length === 0) {
			return { pessimist: 0, average: 0, optimist: 0 };
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		return this._getTailScenarios(combined);
	},

	/**
	 * Computes conditional tail expectations from a distribution.
	 * Unlike percentile-based getScenarios(), this produces smooth fractional
	 * values even for sparse distributions concentrated at 0.
	 * 
	 * - average  = E[X]
	 * - optimist = E[X | bottom 25%]   (fewer events = better)
	 * - pessimist = E[X | top 25%]     (more events = worse)
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

		// Optimist: conditional expectation of bottom 25% (ascending — fewest events)
		const optimist = this._conditionalExpectation(sorted, 0.25, 'bottom');

		// Pessimist: conditional expectation of top 25% (descending — most events)
		const pessimist = this._conditionalExpectation(sorted, 0.25, 'top');

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
	 * Builds a binary distribution for one sector and one event type.
	 * Sums probabilities of all events matching the given categories.
	 * 
	 * @private
	 * @param {string} sectorName - Sector name
	 * @param {Object} loadout - Player loadout
	 * @param {Array<string>} categories - Categories to match
	 * @param {Map} sectorProbabilities - Precomputed cache
	 * @returns {Map<number, number>} Distribution: {0 → noEventProb, 1 → eventProb}
	 */
	_buildSectorDistribution(sectorName, loadout, categories, sectorProbabilities) {
		const probs = EventWeightCalculator.getSectorProbabilities(
			sectorName, loadout, sectorProbabilities
		);

		let eventProb = 0;

		for (const [eventName, prob] of probs) {
			const { category } = EventClassifier.classify(eventName);
			if (categories.includes(category)) {
				eventProb += prob;
			}
		}

		const dist = new Map();
		if (eventProb > 0.0001) {
			dist.set(1, eventProb);
		}
		const zeroProb = 1 - eventProb;
		if (zeroProb > 0.0001) {
			dist.set(0, zeroProb);
		}

		if (dist.size === 0) {
			return new Map([[0, 1]]);
		}

		return dist;
	},

	/**
	 * Returns empty result structure.
	 * @private
	 */
	_emptyResult() {
		const zero = { pessimist: 0, average: 0, optimist: 0 };
		const result = {};
		for (const key of Object.keys(this.EVENT_TYPES)) {
			result[key] = { ...zero };
		}
		return result;
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.NegativeEventCalculator = NegativeEventCalculator;
