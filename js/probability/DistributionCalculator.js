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
	 * Extracts pessimist/average/optimist from a distribution.
	 * 
	 * @param {Map<number, number>} distribution - Value → probability map
	 * @returns {{pessimist: number, average: number, optimist: number}}
	 */
	getScenarios(distribution) {
		return {
			pessimist: this.getPercentile(distribution, 0.25),
			average: Math.round(this.getExpectedValue(distribution) * 10) / 10,
			optimist: this.getPercentile(distribution, 0.75)
		};
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
