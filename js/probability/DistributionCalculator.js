/**
 * DistributionCalculator
 * 
 * BACKEND: Utility for probability distribution operations.
 * Core math for convolution-based calculations.
 * 
 * @module probability/DistributionCalculator
 */
const DistributionCalculator = {

	/**
	 * Convolves two distributions together.
	 * Combines two independent random variables into their sum distribution.
	 * 
	 * @param {Map<number, number>} distA - Distribution A (value → probability)
	 * @param {Map<number, number>} distB - Distribution B (value → probability)
	 * @returns {Map<number, number>} Combined distribution
	 */
	convolve(distA, distB) {
		const result = new Map();

		for (const [valA, probA] of distA) {
			for (const [valB, probB] of distB) {
				const sum = valA + valB;
				const prob = probA * probB;
				result.set(sum, (result.get(sum) || 0) + prob);
			}
		}

		return result;
	},

	/**
	 * Convolves multiple distributions together.
	 * 
	 * @param {Array<Map<number, number>>} distributions - Array of distributions
	 * @returns {Map<number, number>} Combined distribution
	 */
	convolveAll(distributions) {
		if (distributions.length === 0) {
			return new Map([[0, 1]]); // Certainty of 0
		}

		let result = distributions[0];
		for (let i = 1; i < distributions.length; i++) {
			result = this.convolve(result, distributions[i]);
		}

		return result;
	},

	/**
	 * Extracts percentile value from a distribution.
	 * 
	 * @param {Map<number, number>} distribution - Value → probability map
	 * @param {number} percentile - Target percentile (0-1)
	 * @returns {number} Value at or just above the percentile
	 */
	getPercentile(distribution, percentile) {
		// Sort by value
		const sorted = [...distribution.entries()].sort((a, b) => a[0] - b[0]);
		
		let cumulative = 0;
		for (const [value, prob] of sorted) {
			cumulative += prob;
			if (cumulative >= percentile) {
				return value;
			}
		}

		// Fallback to max value
		return sorted[sorted.length - 1]?.[0] || 0;
	},

	/**
	 * Calculates expected value (mean) of a distribution.
	 * 
	 * @param {Map<number, number>} distribution - Value → probability map
	 * @returns {number} Expected value
	 */
	getExpectedValue(distribution) {
		let sum = 0;
		for (const [value, prob] of distribution) {
			sum += value * prob;
		}
		return sum;
	},

	/**
	 * Extracts pessimist/median/optimist from a distribution.
	 * Uses percentiles for all three values for consistency:
	 * - Optimist: 25th percentile (lucky run)
	 * - Median: 50th percentile (typical run)
	 * - Pessimist: 75th percentile (unlucky run)
	 * 
	 * Also calculates cumulative probability ranges for display:
	 * - optimistProb: P(value <= optimist) - chance of getting optimist or better
	 * - medianProb: P(optimist < value < pessimist) - chance of getting between optimist and pessimist
	 * - pessimistProb: P(pessimist <= value < worstCase) - chance of getting pessimist but not worst
	 * - worstCaseProb: P(value = worstCase) - chance of getting worst case
	 * 
	 * @param {Map<number, number>} distribution - Value → probability map
	 * @param {boolean} [higherIsBetter=true] - If true (resources), higher values are optimist.
	 *                                          If false (damage/fights), lower values are optimist.
	 * @returns {Object} Scenarios with values and cumulative probabilities
	 */
	getScenarios(distribution, higherIsBetter = true) {
		const p0 = this.getPercentile(distribution, 0);
		const p25 = this.getPercentile(distribution, 0.25);
		const p50 = this.getPercentile(distribution, 0.50);
		const p75 = this.getPercentile(distribution, 0.75);
		const p100 = this.getPercentile(distribution, 1.0);

		// Calculate cumulative probability ranges using EXCLUSIVE boundaries
		// Each value should only be counted in ONE category
		let optimistCumProb = 0;
		let medianCumProb = 0;
		let pessimistCumProb = 0;
		let worstCumProb = 0;

		// Sort distribution for iteration
		const sorted = [...distribution.entries()].sort((a, b) => a[0] - b[0]);

		if (higherIsBetter) {
			// Resources: higher = better, so optimist is p75, pessimist is p25
			// worst = p0 (lowest), best = p100 (highest)
			const optimistVal = p75;
			const pessimistVal = p25;
			const worstVal = p0;

			for (const [value, prob] of sorted) {
				if (value >= optimistVal) {
					optimistCumProb += prob;  // Optimist: >= p75
				} else if (value >= pessimistVal && value < optimistVal) {
					medianCumProb += prob;    // Median: between pessimist and optimist (exclusive)
				} else if (value > worstVal && value < pessimistVal) {
					pessimistCumProb += prob; // Pessimist: > worst but < pessimist threshold
				} else {
					worstCumProb += prob;     // Worst: <= p0 value
				}
			}

			return { 
				pessimist: p25, 
				average: p50,
				optimist: p75,
				worstCase: p0,
				pessimistProb: pessimistCumProb,
				averageProb: medianCumProb,
				optimistProb: optimistCumProb,
				worstCaseProb: worstCumProb
			};
		} else {
			// Damage/Fights: lower = better, so optimist is p25, pessimist is p75
			// worst = p100 (highest damage), best = p0 (lowest damage)
			const optimistVal = p25;
			const pessimistVal = p75;
			const worstVal = p100;

			for (const [value, prob] of sorted) {
				if (value <= optimistVal) {
					optimistCumProb += prob;  // Optimist: <= p25
				} else if (value > optimistVal && value < pessimistVal) {
					medianCumProb += prob;    // Average: > optimist AND < pessimist
				} else if (value >= pessimistVal && value < worstVal) {
					pessimistCumProb += prob; // Pessimist: >= pessimist threshold but < worst
				} else {
					worstCumProb += prob;     // Worst: >= p100 value
				}
			}

			return { 
				pessimist: p75, 
				average: p50, 
				optimist: p25,
				worstCase: p100,
				pessimistProb: pessimistCumProb,
				averageProb: medianCumProb,
				optimistProb: optimistCumProb,
				worstCaseProb: worstCumProb
			};
		}
	},

	/**
	 * Creates an empty distribution (certainty of 0).
	 * @returns {Map<number, number>}
	 */
	empty() {
		return new Map([[0, 1]]);
	}
};

// Export
if (typeof window !== 'undefined') {
	window.DistributionCalculator = DistributionCalculator;
}
