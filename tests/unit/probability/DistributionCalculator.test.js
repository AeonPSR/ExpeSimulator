/**
 * DistributionCalculator Tests
 * 
 * Tests for the core probability distribution operations.
 * DistributionCalculator is the foundation for all convolution-based calculations.
 */

describe('DistributionCalculator', () => {

	// ========================================
	// convolve()
	// ========================================

	describe('convolve', () => {

		test('convolve two simple distributions', () => {
			// Convolving two coin flips: {0: 0.5, 1: 0.5}
			// Expected: {0: 0.25, 1: 0.5, 2: 0.25}
			const distA = new Map([[0, 0.5], [1, 0.5]]);
			const distB = new Map([[0, 0.5], [1, 0.5]]);

			const result = DistributionCalculator.convolve(distA, distB);

			expect(result.get(0)).toBeCloseTo(0.25, 10);
			expect(result.get(1)).toBeCloseTo(0.5, 10);
			expect(result.get(2)).toBeCloseTo(0.25, 10);
			expect(result.size).toBe(3);
		});

		test('convolve with deterministic distribution', () => {
			// {5: 1.0} convolved with {3: 1.0} = {8: 1.0}
			const distA = new Map([[5, 1.0]]);
			const distB = new Map([[3, 1.0]]);

			const result = DistributionCalculator.convolve(distA, distB);

			expect(result.get(8)).toBeCloseTo(1.0, 10);
			expect(result.size).toBe(1);
		});

		test('convolve handles empty distribution', () => {
			const distA = new Map([[1, 0.5], [2, 0.5]]);
			const distB = new Map(); // Empty

			const result = DistributionCalculator.convolve(distA, distB);

			// Empty map has no entries, so result should be empty
			expect(result.size).toBe(0);
		});

		test('convolve preserves probability mass', () => {
			// Result should sum to 1.0 if inputs sum to 1.0
			const distA = new Map([[0, 0.3], [1, 0.5], [2, 0.2]]);
			const distB = new Map([[0, 0.6], [1, 0.4]]);

			const result = DistributionCalculator.convolve(distA, distB);

			const sum = [...result.values()].reduce((a, b) => a + b, 0);
			expect(sum).toBeCloseTo(1.0, 10);
		});

	});

	// ========================================
	// convolveAll()
	// ========================================

	describe('convolveAll', () => {

		test('convolveAll with multiple distributions', () => {
			// Three coin flips: result should be binomial(3, 0.5)
			// P(0)=0.125, P(1)=0.375, P(2)=0.375, P(3)=0.125
			const coin = new Map([[0, 0.5], [1, 0.5]]);
			const distributions = [coin, coin, coin];

			const result = DistributionCalculator.convolveAll(distributions);

			expect(result.get(0)).toBeCloseTo(0.125, 10);
			expect(result.get(1)).toBeCloseTo(0.375, 10);
			expect(result.get(2)).toBeCloseTo(0.375, 10);
			expect(result.get(3)).toBeCloseTo(0.125, 10);
		});

		test('convolveAll with empty array returns certainty of zero', () => {
			const result = DistributionCalculator.convolveAll([]);

			expect(result.get(0)).toBe(1);
			expect(result.size).toBe(1);
		});

		test('convolveAll with single distribution returns that distribution', () => {
			const dist = new Map([[5, 0.3], [10, 0.7]]);

			const result = DistributionCalculator.convolveAll([dist]);

			expect(result.get(5)).toBe(0.3);
			expect(result.get(10)).toBe(0.7);
			expect(result.size).toBe(2);
		});

	});

	// ========================================
	// getExpectedValue()
	// ========================================

	describe('getExpectedValue', () => {

		test('getExpectedValue calculates mean correctly', () => {
			// {0: 0.25, 1: 0.5, 2: 0.25} → E[X] = 0*0.25 + 1*0.5 + 2*0.25 = 1.0
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);

			const result = DistributionCalculator.getExpectedValue(dist);

			expect(result).toBeCloseTo(1.0, 10);
		});

		test('getExpectedValue with single value', () => {
			const dist = new Map([[42, 1.0]]);

			const result = DistributionCalculator.getExpectedValue(dist);

			expect(result).toBe(42);
		});

		test('getExpectedValue with empty distribution', () => {
			const dist = new Map();

			const result = DistributionCalculator.getExpectedValue(dist);

			expect(result).toBe(0);
		});

	});

	// ========================================
	// getPercentile()
	// ========================================

	describe('getPercentile', () => {

		test('getPercentile returns correct values', () => {
			// Distribution: {0: 0.25, 1: 0.5, 2: 0.25}
			// Cumulative: 0→0.25, 1→0.75, 2→1.0
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);

			// P25: cumulative reaches 0.25 at value 0
			expect(DistributionCalculator.getPercentile(dist, 0.25)).toBe(0);
			// P50: cumulative reaches 0.50 at value 1 (after 0.25, cumulative is 0.75 >= 0.50)
			expect(DistributionCalculator.getPercentile(dist, 0.50)).toBe(1);
			// P75: cumulative reaches 0.75 at value 1
			expect(DistributionCalculator.getPercentile(dist, 0.75)).toBe(1);
			// P100: cumulative reaches 1.0 at value 2
			expect(DistributionCalculator.getPercentile(dist, 1.0)).toBe(2);
		});

		test('getPercentile with uniform distribution', () => {
			// {1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25}
			const dist = new Map([[1, 0.25], [2, 0.25], [3, 0.25], [4, 0.25]]);

			expect(DistributionCalculator.getPercentile(dist, 0.25)).toBe(1);
			expect(DistributionCalculator.getPercentile(dist, 0.50)).toBe(2);
			expect(DistributionCalculator.getPercentile(dist, 0.75)).toBe(3);
			expect(DistributionCalculator.getPercentile(dist, 1.0)).toBe(4);
		});

		test('getPercentile with single value returns that value', () => {
			const dist = new Map([[10, 1.0]]);

			expect(DistributionCalculator.getPercentile(dist, 0.0)).toBe(10);
			expect(DistributionCalculator.getPercentile(dist, 0.5)).toBe(10);
			expect(DistributionCalculator.getPercentile(dist, 1.0)).toBe(10);
		});

		test('getPercentile handles empty distribution', () => {
			const dist = new Map();

			// Should return 0 (fallback)
			expect(DistributionCalculator.getPercentile(dist, 0.5)).toBe(0);
		});

	});

	// ========================================
	// getScenarios()
	// ========================================

	describe('getScenarios', () => {

		test('getScenarios extracts all percentile scenarios', () => {
			// Distribution: {0: 0.25, 1: 0.5, 2: 0.25}
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);

			const scenarios = DistributionCalculator.getScenarios(dist);

			expect(scenarios.optimist).toBe(0);   // P25
			expect(scenarios.average).toBe(1);    // P50
			expect(scenarios.pessimist).toBe(1);  // P75
			expect(scenarios.worstCase).toBe(2);  // P100
		});

		test('getScenarios calculates cumulative probabilities that sum to ~1.0', () => {
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);

			const scenarios = DistributionCalculator.getScenarios(dist);

			const total = scenarios.optimistProb + scenarios.averageProb + 
			              scenarios.pessimistProb + scenarios.worstCaseProb;
			expect(total).toBeCloseTo(1.0, 10);
		});

		test('getScenarios with wider distribution', () => {
			// Distribution: {0: 0.1, 5: 0.2, 10: 0.4, 15: 0.2, 20: 0.1}
			// Cumulative: 0→0.1, 5→0.3, 10→0.7, 15→0.9, 20→1.0
			const dist = new Map([[0, 0.1], [5, 0.2], [10, 0.4], [15, 0.2], [20, 0.1]]);

			const scenarios = DistributionCalculator.getScenarios(dist);

			// P25: cumulative reaches 0.25 at value 5 (0.1+0.2=0.3 >= 0.25)
			expect(scenarios.optimist).toBe(5);
			// P50: cumulative reaches 0.50 at value 10 (0.3+0.4=0.7 >= 0.50)
			expect(scenarios.average).toBe(10);
			// P75: cumulative reaches 0.75 at value 15 (0.7+0.2=0.9 >= 0.75)
			expect(scenarios.pessimist).toBe(15);
			// P100: max value is 20
			expect(scenarios.worstCase).toBe(20);
		});

	});

	// ========================================
	// empty()
	// ========================================

	describe('empty', () => {

		test('empty creates certainty-of-zero distribution', () => {
			const result = DistributionCalculator.empty();

			expect(result.get(0)).toBe(1);
			expect(result.size).toBe(1);
		});

	});

	// ========================================
	// mixDistributions()
	// ========================================

	describe('mixDistributions', () => {

		test('mixDistributions combines weighted distributions', () => {
			// Two distributions with equal weight (0.5 each)
			const dist1 = new Map([[0, 1.0]]);  // Always 0
			const dist2 = new Map([[10, 1.0]]); // Always 10

			const result = DistributionCalculator.mixDistributions([
				{ distribution: dist1, weight: 0.5 },
				{ distribution: dist2, weight: 0.5 }
			]);

			expect(result.get(0)).toBeCloseTo(0.5, 10);
			expect(result.get(10)).toBeCloseTo(0.5, 10);
		});

		test('mixDistributions with unequal weights', () => {
			const dist1 = new Map([[0, 1.0]]);
			const dist2 = new Map([[10, 1.0]]);

			const result = DistributionCalculator.mixDistributions([
				{ distribution: dist1, weight: 0.75 },
				{ distribution: dist2, weight: 0.25 }
			]);

			expect(result.get(0)).toBeCloseTo(0.75, 10);
			expect(result.get(10)).toBeCloseTo(0.25, 10);
		});

		test('mixDistributions with empty array returns certainty of zero', () => {
			const result = DistributionCalculator.mixDistributions([]);

			expect(result.get(0)).toBe(1);
			expect(result.size).toBe(1);
		});

		test('mixDistributions with single distribution returns copy', () => {
			const dist = new Map([[5, 0.4], [10, 0.6]]);

			const result = DistributionCalculator.mixDistributions([
				{ distribution: dist, weight: 1.0 }
			]);

			expect(result.get(5)).toBe(0.4);
			expect(result.get(10)).toBe(0.6);
			// Verify it's a copy, not same reference
			expect(result).not.toBe(dist);
		});

		test('mixDistributions merges overlapping values', () => {
			// Both distributions have value 5
			const dist1 = new Map([[5, 0.5], [10, 0.5]]);
			const dist2 = new Map([[5, 1.0]]);

			const result = DistributionCalculator.mixDistributions([
				{ distribution: dist1, weight: 0.5 },
				{ distribution: dist2, weight: 0.5 }
			]);

			// 5: 0.5*0.5 + 0.5*1.0 = 0.25 + 0.5 = 0.75
			expect(result.get(5)).toBeCloseTo(0.75, 10);
			// 10: 0.5*0.5 = 0.25
			expect(result.get(10)).toBeCloseTo(0.25, 10);
		});

	});

	// ========================================
	// mixScenarios()
	// ========================================

	describe('mixScenarios', () => {

		test('mixScenarios combines weighted scenario objects', () => {
			const scenario1 = { pessimist: 10, average: 5, optimist: 2, worstCase: 15 };
			const scenario2 = { pessimist: 20, average: 10, optimist: 4, worstCase: 30 };

			const result = DistributionCalculator.mixScenarios([
				{ scenarios: scenario1, weight: 0.5 },
				{ scenarios: scenario2, weight: 0.5 }
			]);

			expect(result.pessimist).toBeCloseTo(15, 10);  // (10+20)/2
			expect(result.average).toBeCloseTo(7.5, 10);   // (5+10)/2
			expect(result.optimist).toBeCloseTo(3, 10);    // (2+4)/2
			expect(result.worstCase).toBeCloseTo(22.5, 10); // (15+30)/2
		});

		test('mixScenarios with empty array returns zeros', () => {
			const result = DistributionCalculator.mixScenarios([]);

			expect(result.pessimist).toBe(0);
			expect(result.average).toBe(0);
			expect(result.optimist).toBe(0);
			expect(result.worstCase).toBe(0);
		});

		test('mixScenarios with single scenario returns copy', () => {
			const scenario = { pessimist: 10, average: 5, optimist: 2, worstCase: 15 };

			const result = DistributionCalculator.mixScenarios([
				{ scenarios: scenario, weight: 1.0 }
			]);

			expect(result.pessimist).toBe(10);
			expect(result.average).toBe(5);
			expect(result.optimist).toBe(2);
			expect(result.worstCase).toBe(15);
			// Verify it's a copy
			expect(result).not.toBe(scenario);
		});

	});

	// ========================================
	// validateDistribution()
	// ========================================

	describe('validateDistribution', () => {

		test('validateDistribution detects valid distributions', () => {
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);

			const result = DistributionCalculator.validateDistribution(dist);

			expect(result.valid).toBe(true);
			expect(result.sum).toBeCloseTo(1.0, 10);
			expect(result.error).toBeLessThan(1e-9);
		});

		test('validateDistribution detects invalid distributions', () => {
			const dist = new Map([[0, 0.3], [1, 0.3]]); // Sum = 0.6

			const result = DistributionCalculator.validateDistribution(dist);

			expect(result.valid).toBe(false);
			expect(result.sum).toBeCloseTo(0.6, 10);
			expect(result.error).toBeCloseTo(0.4, 10);
		});

		test('validateDistribution with exactly 1.0', () => {
			const dist = new Map([[42, 1.0]]);

			const result = DistributionCalculator.validateDistribution(dist);

			expect(result.valid).toBe(true);
		});

		test('validateDistribution with empty distribution', () => {
			const dist = new Map();

			const result = DistributionCalculator.validateDistribution(dist);

			expect(result.valid).toBe(false);
			expect(result.sum).toBe(0);
			expect(result.error).toBe(1.0);
		});

	});

});
