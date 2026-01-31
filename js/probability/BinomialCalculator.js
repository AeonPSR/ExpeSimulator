/**
 * BinomialCalculator
 * 
 * Pure utility for binomial distribution calculations.
 * Used to calculate "how many events of type X will occur in N sectors".
 * 
 * @module probability/BinomialCalculator
 */
const BinomialCalculator = {

	/**
	 * Calculates the probability of exactly k successes in n trials.
	 * P(X = k) = C(n,k) * p^k * (1-p)^(n-k)
	 * 
	 * @param {number} n - Number of trials (sectors)
	 * @param {number} k - Number of successes (events occurring)
	 * @param {number} p - Probability of success on each trial
	 * @returns {number} Probability of exactly k successes
	 * 
	 * @example
	 * // Probability of exactly 2 fights in 5 sectors with 30% fight chance each
	 * BinomialCalculator.probability(5, 2, 0.3); // ≈ 0.3087
	 */
	probability(n, k, p) {
		if (k > n || k < 0) return 0;
		if (p === 0) return k === 0 ? 1 : 0;
		if (p === 1) return k === n ? 1 : 0;

		return this.binomialCoefficient(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
	},

	/**
	 * Calculates the binomial coefficient C(n, k) = n! / (k! * (n-k)!)
	 * Uses multiplicative formula to avoid overflow for reasonable values.
	 * 
	 * @param {number} n - Total number
	 * @param {number} k - Selection size
	 * @returns {number} Binomial coefficient
	 */
	binomialCoefficient(n, k) {
		if (k > n) return 0;
		if (k === 0 || k === n) return 1;
		
		// Use symmetry: C(n,k) = C(n, n-k)
		if (k > n - k) {
			k = n - k;
		}

		let result = 1;
		for (let i = 0; i < k; i++) {
			result = result * (n - i) / (i + 1);
		}
		return Math.round(result); // Round to handle floating point errors
	},

	/**
	 * Generates the full probability distribution for n trials with probability p.
	 * Returns probability for each possible outcome (0 to n successes).
	 * 
	 * @param {number} n - Number of trials
	 * @param {number} p - Probability of success on each trial
	 * @returns {Array<{k: number, probability: number, cumulative: number}>}
	 * 
	 * @example
	 * BinomialCalculator.distribution(3, 0.4);
	 * // Returns:
	 * // [
	 * //   { k: 0, probability: 0.216, cumulative: 0.216 },
	 * //   { k: 1, probability: 0.432, cumulative: 0.648 },
	 * //   { k: 2, probability: 0.288, cumulative: 0.936 },
	 * //   { k: 3, probability: 0.064, cumulative: 1.000 }
	 * // ]
	 */
	distribution(n, p) {
		const result = [];
		let cumulative = 0;

		for (let k = 0; k <= n; k++) {
			const prob = this.probability(n, k, p);
			cumulative += prob;
			result.push({
				k: k,
				probability: prob,
				cumulative: Math.min(cumulative, 1) // Cap at 1 due to floating point
			});
		}

		return result;
	},

	/**
	 * Calculates expected value E[X] = n * p
	 * 
	 * @param {number} n - Number of trials
	 * @param {number} p - Probability of success
	 * @returns {number} Expected number of successes
	 */
	expectedValue(n, p) {
		return n * p;
	},

	/**
	 * Finds the value at a given percentile in the distribution.
	 * 
	 * @param {number} n - Number of trials
	 * @param {number} p - Probability of success
	 * @param {number} percentile - Target percentile (0-1, e.g., 0.25 for 25th)
	 * @returns {number} The k value at or just above the percentile
	 * 
	 * @example
	 * // Find 25th percentile (optimist scenario)
	 * BinomialCalculator.percentile(10, 0.3, 0.25); // Returns k where cumulative >= 0.25
	 */
	percentile(n, p, percentile) {
		const dist = this.distribution(n, p);
		
		for (const entry of dist) {
			if (entry.cumulative >= percentile) {
				return entry.k;
			}
		}
		
		return n; // Fallback to max
	},

	/**
	 * Calculates scenario-based outcomes (optimist/average/pessimist/worst).
	 * 
	 * @param {number} n - Number of trials (sectors with this event)
	 * @param {number} p - Probability of event occurring in each sector
	 * @returns {{optimist: number, average: number, pessimist: number, worstCase: number}}
	 * 
	 * @example
	 * // 5 sectors each with 30% fight chance
	 * BinomialCalculator.scenarios(5, 0.3);
	 * // Returns: { optimist: 0, average: 1.5, pessimist: 2, worstCase: 5 }
	 */
	scenarios(n, p) {
		if (n === 0 || p === 0) {
			return { optimist: 0, average: 0, pessimist: 0, worstCase: 0 };
		}

		return {
			optimist: this.percentile(n, p, 0.25),
			average: this.expectedValue(n, p),
			pessimist: this.percentile(n, p, 0.75),
			worstCase: n
		};
	}
};

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.BinomialCalculator = BinomialCalculator;
}
