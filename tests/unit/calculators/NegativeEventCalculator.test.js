/**
 * NegativeEventCalculator Tests
 * 
 * Tests for negative event occurrence calculations using convolution.
 * Negative events: Disease, Player Lost, Again, Item Lost, Kill All, Kill One, Mush Trap
 */

describe('NegativeEventCalculator', () => {

	// Store originals for restoration
	let originalEventWeightCalculator;
	let originalDistributionCalculator;
	let originalEventClassifier;

	beforeAll(() => {
		// Save originals
		originalEventWeightCalculator = global.EventWeightCalculator;
		originalDistributionCalculator = global.DistributionCalculator;
		originalEventClassifier = global.EventClassifier;

		// Mock EventWeightCalculator
		global.EventWeightCalculator = {
			getSectorProbabilities: jest.fn((sectorName, loadout, cache) => {
				switch (sectorName) {
					case 'DANGEROUS':
						return new Map([
							['DISEASE', 0.2],
							['PLAYER_LOST', 0.1],
							['NOTHING', 0.7]
						]);
					case 'HOSTILE':
						return new Map([
							['KILL_ALL', 0.15],
							['KILL_ONE', 0.25],
							['NOTHING', 0.6]
						]);
					case 'CONFUSING':
						return new Map([
							['AGAIN', 0.3],
							['ITEM_LOST', 0.1],
							['NOTHING', 0.6]
						]);
					case 'MUSH_ZONE':
						return new Map([
							['MUSH_TRAP', 0.4],
							['NOTHING', 0.6]
						]);
					case 'SAFE_SECTOR':
						return new Map([
							['NOTHING', 1.0]
						]);
					default:
						return new Map([['NOTHING', 1.0]]);
				}
			})
		};

		// Mock DistributionCalculator
		global.DistributionCalculator = {
			convolveAll: jest.fn((distributions) => {
				if (distributions.length === 0) {
					return new Map([[0, 1]]);
				}
				if (distributions.length === 1) {
					return new Map(distributions[0]);
				}
				// Simple convolution
				let result = new Map(distributions[0]);
				for (let i = 1; i < distributions.length; i++) {
					const newResult = new Map();
					for (const [v1, p1] of result) {
						for (const [v2, p2] of distributions[i]) {
							const sum = v1 + v2;
							newResult.set(sum, (newResult.get(sum) || 0) + p1 * p2);
						}
					}
					result = newResult;
				}
				return result;
			})
		};

		// Mock EventClassifier
		global.EventClassifier = {
			classify: jest.fn((eventName) => {
				const categoryMap = {
					'DISEASE': { category: 'disease' },
					'PLAYER_LOST': { category: 'playerLost' },
					'AGAIN': { category: 'again' },
					'ITEM_LOST': { category: 'itemLost' },
					'KILL_ALL': { category: 'killAll' },
					'KILL_ONE': { category: 'killOne' },
					'MUSH_TRAP': { category: 'mushTrap' },
					'NOTHING': { category: 'nothing' }
				};
				return categoryMap[eventName] || { category: 'unknown' };
			})
		};
	});

	afterAll(() => {
		global.EventWeightCalculator = originalEventWeightCalculator;
		global.DistributionCalculator = originalDistributionCalculator;
		global.EventClassifier = originalEventClassifier;
	});

	beforeEach(() => {
		EventWeightCalculator.getSectorProbabilities.mockClear();
		DistributionCalculator.convolveAll.mockClear();
		EventClassifier.classify.mockClear();
	});

	// ========================================
	// EVENT_TYPES configuration
	// ========================================

	describe('EVENT_TYPES', () => {

		test('defines all negative event types with valid categories', () => {
			const types = NegativeEventCalculator.EVENT_TYPES;
			// All 7 event types must be present
			const expectedKeys = ['disease', 'playerLost', 'again', 'itemLost', 'killAll', 'killOne', 'mushTrap'];
			for (const key of expectedKeys) {
				expect(types).toHaveProperty(key);
				// Each must have a non-empty categories array with string values
				expect(types[key].categories.length).toBeGreaterThan(0);
				for (const cat of types[key].categories) {
					expect(typeof cat).toBe('string');
				}
			}
		});

		test('each event type has non-empty categories of strings', () => {
			for (const [key, config] of Object.entries(NegativeEventCalculator.EVENT_TYPES)) {
				expect(Array.isArray(config.categories)).toBe(true);
				expect(config.categories.length).toBeGreaterThan(0);
				config.categories.forEach(cat => {
					expect(typeof cat).toBe('string');
					expect(cat.length).toBeGreaterThan(0);
				});
			}
		});
	});

	// ========================================
	// calculate()
	// ========================================

	describe('calculate', () => {

		test('returns empty result for null sectors', () => {
			const result = NegativeEventCalculator.calculate(null);

			expect(result.disease).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.playerLost).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});

		test('returns empty result for empty sectors array', () => {
			const result = NegativeEventCalculator.calculate([]);

			expect(result.disease).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});

		test('returns all event types with numeric scenario values', () => {
			const sectors = ['DANGEROUS'];
			const result = NegativeEventCalculator.calculate(sectors);

			const expectedKeys = ['disease', 'playerLost', 'again', 'itemLost', 'killAll', 'killOne', 'mushTrap'];
			for (const key of expectedKeys) {
				expect(typeof result[key].pessimist).toBe('number');
				expect(typeof result[key].average).toBe('number');
				expect(typeof result[key].optimist).toBe('number');
				// Pessimist >= average >= optimist (more events = worse)
				expect(result[key].pessimist).toBeGreaterThanOrEqual(result[key].average);
				expect(result[key].average).toBeGreaterThanOrEqual(result[key].optimist);
			}
			// DANGEROUS has DISEASE at 20%, so disease average should be > 0
			expect(result.disease.average).toBeGreaterThan(0);
		});

		test('calculate queries sector probabilities', () => {
			const sectors = ['DANGEROUS'];
			NegativeEventCalculator.calculate(sectors);

			expect(EventWeightCalculator.getSectorProbabilities).toHaveBeenCalled();
		});
	});

	// ========================================
	// _calculateEventType()
	// ========================================

	describe('_calculateEventType', () => {

		test('returns distribution for single sector with event', () => {
			const sectors = ['DANGEROUS'];
			const result = NegativeEventCalculator._calculateEventType(
				sectors, {}, ['disease'], null
			);

			expect(typeof result.pessimist).toBe('number');
			expect(typeof result.average).toBe('number');
			expect(typeof result.optimist).toBe('number');
			// DANGEROUS has DISEASE at 20%, so average = 0.2
			expect(result.average).toBeCloseTo(0.2, 10);
			// Pessimist >= average >= optimist
			expect(result.pessimist).toBeGreaterThanOrEqual(result.average);
			expect(result.average).toBeGreaterThanOrEqual(result.optimist);
		});

		test('convolves multiple sectors', () => {
			const sectors = ['DANGEROUS', 'DANGEROUS'];
			NegativeEventCalculator._calculateEventType(sectors, {}, ['disease'], null);

			expect(DistributionCalculator.convolveAll).toHaveBeenCalledTimes(1);
			const distributions = DistributionCalculator.convolveAll.mock.calls[0][0];
			expect(distributions.length).toBe(2);
		});

		test('returns zeros for empty sectors', () => {
			const result = NegativeEventCalculator._calculateEventType([], {}, ['disease'], null);

			expect(result).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});
	});

	// ========================================
	// _buildSectorDistribution()
	// ========================================

	describe('_buildSectorDistribution', () => {

		test('builds binary distribution for sector with event', () => {
			const dist = NegativeEventCalculator._buildSectorDistribution(
				'DANGEROUS', {}, ['disease'], null
			);

			// DANGEROUS has 20% DISEASE
			expect(dist.get(1)).toBeCloseTo(0.2, 10);
			expect(dist.get(0)).toBeCloseTo(0.8, 10);
		});

		test('sums probabilities for multiple matching events', () => {
			const dist = NegativeEventCalculator._buildSectorDistribution(
				'HOSTILE', {}, ['killAll', 'killOne'], null
			);

			// HOSTILE has 15% KILL_ALL + 25% KILL_ONE = 40%
			expect(dist.get(1)).toBeCloseTo(0.4, 10);
			expect(dist.get(0)).toBeCloseTo(0.6, 10);
		});

		test('returns 100% zero for safe sector', () => {
			const dist = NegativeEventCalculator._buildSectorDistribution(
				'SAFE_SECTOR', {}, ['disease'], null
			);

			expect(dist.get(0)).toBe(1);
			expect(dist.has(1)).toBe(false);
		});

		test('uses EventClassifier to match categories', () => {
			NegativeEventCalculator._buildSectorDistribution(
				'DANGEROUS', {}, ['disease'], null
			);

			expect(EventClassifier.classify).toHaveBeenCalled();
		});
	});

	// ========================================
	// _getTailScenarios()
	// ========================================

	describe('_getTailScenarios', () => {

		test('calculates expected value for average', () => {
			// Distribution: 0 → 50%, 2 → 50%
			const dist = new Map([[0, 0.5], [2, 0.5]]);
			const result = NegativeEventCalculator._getTailScenarios(dist);

			expect(result.average).toBe(1);  // 0*0.5 + 2*0.5
		});

		test('optimist is bottom tail (fewer events = better)', () => {
			// Distribution: 0 → 25%, 1 → 50%, 2 → 25%
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);
			const result = NegativeEventCalculator._getTailScenarios(dist);

			// Optimist = bottom 25% (fewer events is better)
			expect(result.optimist).toBe(0);
		});

		test('pessimist is top tail (more events = worse)', () => {
			// Distribution: 0 → 25%, 1 → 50%, 2 → 25%
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);
			const result = NegativeEventCalculator._getTailScenarios(dist);

			// Pessimist = top 25% (more events is worse)
			expect(result.pessimist).toBe(2);
		});
	});

	// ========================================
	// _conditionalExpectation()
	// ========================================

	describe('_conditionalExpectation', () => {

		test('bottom tail gives values from low end', () => {
			const sorted = [[0, 0.5], [2, 0.5]];
			const result = NegativeEventCalculator._conditionalExpectation(sorted, 0.25, 'bottom');

			expect(result).toBe(0);
		});

		test('top tail gives values from high end', () => {
			const sorted = [[0, 0.5], [2, 0.5]];
			const result = NegativeEventCalculator._conditionalExpectation(sorted, 0.25, 'top');

			expect(result).toBe(2);
		});

		test('handles partial probability mass in tail', () => {
			// Distribution: 0 → 40%, 1 → 60%
			const sorted = [[0, 0.4], [1, 0.6]];
			// Bottom 50%: 40% from 0, 10% from 1
			const result = NegativeEventCalculator._conditionalExpectation(sorted, 0.5, 'bottom');

			// E[X | bottom 50%] = (0*0.4 + 1*0.1) / 0.5 = 0.1/0.5 = 0.2
			expect(result).toBeCloseTo(0.2, 10);
		});
	});

	// ========================================
	// _emptyResult()
	// ========================================

	describe('_emptyResult', () => {

		test('returns all event types with zeros', () => {
			const result = NegativeEventCalculator._emptyResult();

			for (const key of Object.keys(NegativeEventCalculator.EVENT_TYPES)) {
				expect(result[key]).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			}
		});

		test('returns correct number of event types', () => {
			const result = NegativeEventCalculator._emptyResult();
			const expectedCount = Object.keys(NegativeEventCalculator.EVENT_TYPES).length;

			expect(Object.keys(result).length).toBe(expectedCount);
		});
	});
});
