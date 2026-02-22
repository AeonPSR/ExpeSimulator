/**
 * OccurrenceCalculator Tests
 * 
 * Tests for event/fight occurrence distribution calculations.
 * Occurrence distributions are independent of damage multipliers.
 */

describe('OccurrenceCalculator', () => {

	// Store original EventWeightCalculator for restoration
	let originalEventWeightCalculator;

	beforeAll(() => {
		// Save original
		originalEventWeightCalculator = global.EventWeightCalculator;

		// Mock EventWeightCalculator.getSectorProbabilities
		global.EventWeightCalculator = {
			getSectorProbabilities: jest.fn((sectorName, loadout, cache) => {
				// Return different probabilities based on sector
				switch (sectorName) {
					case 'FOREST':
						return new Map([
							['FIGHT_12', 0.3],
							['NOTHING', 0.5],
							['FRUIT', 0.2]
						]);
					case 'DESERT':
						return new Map([
							['FIGHT_12', 0.2],
							['TIRED_2', 0.4],
							['NOTHING', 0.4]
						]);
					case 'HYDROCARBON':
						return new Map([
							['FIGHT_12', 0.5],
							['NOTHING', 0.5]
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
	});

	afterAll(() => {
		// Restore original
		global.EventWeightCalculator = originalEventWeightCalculator;
	});

	beforeEach(() => {
		// Clear mock call history
		EventWeightCalculator.getSectorProbabilities.mockClear();
	});

	// ========================================
	// calculateForType()
	// ========================================

	describe('calculateForType', () => {

		test('calculateForType returns occurrence distribution for a single sector', () => {
			const sectors = ['FOREST'];
			const result = OccurrenceCalculator.calculateForType(sectors, {}, 'FIGHT_12');

			// FOREST has P(FIGHT_12) = 0.3
			expect(result.occurrence.distribution.get(0)).toBeCloseTo(0.7, 10);
			expect(result.occurrence.distribution.get(1)).toBeCloseTo(0.3, 10);
			expect(result.occurrence.maxPossible).toBe(1);
			expect(result.sectors.length).toBe(1);
			expect(result.sectors[0].sectorName).toBe('FOREST');
			expect(result.sectors[0].probability).toBeCloseTo(0.3, 10);
		});

		test('calculateForType convolves multiple sectors', () => {
			const sectors = ['FOREST', 'DESERT'];
			const result = OccurrenceCalculator.calculateForType(sectors, {}, 'FIGHT_12');

			// FOREST: P(FIGHT_12) = 0.3, DESERT: P(FIGHT_12) = 0.2
			// Distribution: P(0) = 0.7 * 0.8 = 0.56
			//               P(1) = 0.3*0.8 + 0.7*0.2 = 0.24 + 0.14 = 0.38
			//               P(2) = 0.3 * 0.2 = 0.06
			expect(result.occurrence.distribution.get(0)).toBeCloseTo(0.56, 10);
			expect(result.occurrence.distribution.get(1)).toBeCloseTo(0.38, 10);
			expect(result.occurrence.distribution.get(2)).toBeCloseTo(0.06, 10);
			expect(result.occurrence.maxPossible).toBe(2);
			expect(result.sectors.length).toBe(2);
		});

		test('calculateForType returns zero distribution when event not present', () => {
			const sectors = ['SAFE_SECTOR', 'SAFE_SECTOR'];
			const result = OccurrenceCalculator.calculateForType(sectors, {}, 'FIGHT_12');

			// No fight events in safe sectors
			expect(result.occurrence.distribution.get(0)).toBe(1);
			expect(result.occurrence.maxPossible).toBe(0);
			expect(result.sectors.length).toBe(0);
		});

		test('calculateForType includes scenario percentiles', () => {
			const sectors = ['FOREST', 'DESERT', 'HYDROCARBON'];
			const result = OccurrenceCalculator.calculateForType(sectors, {}, 'FIGHT_12');

			// Should have pessimist, average, optimist with probabilities
			expect(result.occurrence).toHaveProperty('pessimist');
			expect(result.occurrence).toHaveProperty('average');
			expect(result.occurrence).toHaveProperty('optimist');
			expect(result.occurrence).toHaveProperty('pessimistProb');
			expect(result.occurrence).toHaveProperty('averageProb');
			expect(result.occurrence).toHaveProperty('optimistProb');

			// Distribution should exist and sum to 1
			const sum = Array.from(result.occurrence.distribution.values())
				.reduce((a, b) => a + b, 0);
			expect(sum).toBeCloseTo(1.0, 10);
		});

		test('calculateForType tracks sector indices for uniqueness', () => {
			// Same sector name appears twice - should track both with different indices
			const sectors = ['FOREST', 'FOREST'];
			const result = OccurrenceCalculator.calculateForType(sectors, {}, 'FIGHT_12');

			expect(result.sectors.length).toBe(2);
			expect(result.sectors[0].sectorIndex).toBe(0);
			expect(result.sectors[1].sectorIndex).toBe(1);
		});

	});

	// ========================================
	// combineOccurrences()
	// ========================================

	describe('combineOccurrences', () => {

		test('combineOccurrences merges multiple type distributions', () => {
			const perTypeResults = {
				'FIGHT_12': {
					occurrence: {
						distribution: new Map([[0, 0.5], [1, 0.5]])
					}
				},
				'TIRED_2': {
					occurrence: {
						distribution: new Map([[0, 0.6], [1, 0.4]])
					}
				}
			};

			const result = OccurrenceCalculator.combineOccurrences(perTypeResults);

			// Convolution of two distributions
			// P(0) = 0.5 * 0.6 = 0.30
			// P(1) = 0.5*0.4 + 0.5*0.6 = 0.20 + 0.30 = 0.50
			// P(2) = 0.5 * 0.4 = 0.20
			expect(result.distribution.get(0)).toBeCloseTo(0.30, 10);
			expect(result.distribution.get(1)).toBeCloseTo(0.50, 10);
			expect(result.distribution.get(2)).toBeCloseTo(0.20, 10);

			// Should have scenarios
			expect(result.scenarios).toHaveProperty('pessimist');
			expect(result.scenarios).toHaveProperty('average');
			expect(result.scenarios).toHaveProperty('optimist');
		});

		test('combineOccurrences handles empty results', () => {
			const result = OccurrenceCalculator.combineOccurrences({});

			expect(result.distribution.get(0)).toBe(1);
			expect(result.scenarios.pessimist).toBe(0);
			expect(result.scenarios.average).toBe(0);
			expect(result.scenarios.optimist).toBe(0);
		});

		test('combineOccurrences skips entries without distribution', () => {
			const perTypeResults = {
				'FIGHT_12': {
					occurrence: {
						distribution: new Map([[0, 0.5], [1, 0.5]])
					}
				},
				'NO_DATA': {} // Missing occurrence
			};

			const result = OccurrenceCalculator.combineOccurrences(perTypeResults);

			// Should only process FIGHT_12
			expect(result.distribution.get(0)).toBeCloseTo(0.5, 10);
			expect(result.distribution.get(1)).toBeCloseTo(0.5, 10);
		});

	});

	// ========================================
	// calculateOverallFromSectors()
	// ========================================

	describe('calculateOverallFromSectors', () => {

		test('calculateOverallFromSectors sums event probabilities per sector', () => {
			const sectors = ['FOREST'];
			const eventTypes = ['FIGHT_12', 'FRUIT']; // 0.3 + 0.2 = 0.5

			const result = OccurrenceCalculator.calculateOverallFromSectors(
				sectors, {}, eventTypes
			);

			expect(result.distribution.get(0)).toBeCloseTo(0.5, 10);
			expect(result.distribution.get(1)).toBeCloseTo(0.5, 10);
		});

		test('calculateOverallFromSectors respects excludedSectors', () => {
			const sectors = ['FOREST', 'DESERT'];
			const eventTypes = ['FIGHT_12'];
			const excludedSectors = new Set(['FOREST']);

			const result = OccurrenceCalculator.calculateOverallFromSectors(
				sectors, {}, eventTypes, null, excludedSectors
			);

			// FOREST excluded (zeroed), DESERT has P(FIGHT_12) = 0.2
			// P(0) = 1.0 * 0.8 = 0.8
			// P(1) = 0.0 * 0.8 + 1.0 * 0.2 = 0.2
			expect(result.distribution.get(0)).toBeCloseTo(0.8, 10);
			expect(result.distribution.get(1)).toBeCloseTo(0.2, 10);
		});

		test('calculateOverallFromSectors handles empty sectors', () => {
			const result = OccurrenceCalculator.calculateOverallFromSectors(
				[], {}, ['FIGHT_12']
			);

			expect(result.distribution.get(0)).toBe(1);
			expect(result.scenarios.pessimist).toBe(0);
		});

		test('calculateOverallFromSectors convolves all sectors', () => {
			const sectors = ['FOREST', 'DESERT'];
			const eventTypes = ['FIGHT_12'];

			const result = OccurrenceCalculator.calculateOverallFromSectors(
				sectors, {}, eventTypes
			);

			// Same as calculateForType for FIGHT_12
			expect(result.distribution.get(0)).toBeCloseTo(0.56, 10);
			expect(result.distribution.get(1)).toBeCloseTo(0.38, 10);
			expect(result.distribution.get(2)).toBeCloseTo(0.06, 10);
		});

	});

});
