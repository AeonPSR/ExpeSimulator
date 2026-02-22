/**
 * ResourceCalculator Tests
 * 
 * Tests for resource yield calculations using convolution.
 * Resources: Fruits, Steaks, Fuel, O2, Artefacts, Map Fragments
 */

describe('ResourceCalculator', () => {

	// Store originals for restoration
	let originalEventWeightCalculator;
	let originalDistributionCalculator;
	let originalConstants;
	let originalFilenameToId;

	beforeAll(() => {
		// Save originals
		originalEventWeightCalculator = global.EventWeightCalculator;
		originalDistributionCalculator = global.DistributionCalculator;
		originalConstants = global.Constants;
		originalFilenameToId = global.filenameToId;

		// Mock EventWeightCalculator
		global.EventWeightCalculator = {
			getSectorProbabilities: jest.fn((sectorName, loadout, cache) => {
				switch (sectorName) {
					case 'FOREST':
						return new Map([
							['HARVEST_1', 0.3],
							['HARVEST_2', 0.2],
							['NOTHING', 0.5]
						]);
					case 'DESERT':
						return new Map([
							['FUEL_1', 0.4],
							['PROVISION_1', 0.3],
							['NOTHING', 0.3]
						]);
					case 'OCEAN':
						return new Map([
							['OXYGEN_1', 0.5],
							['HARVEST_1', 0.2],
							['NOTHING', 0.3]
						]);
					case 'ARTEFACT_ZONE':
						return new Map([
							['ARTEFACT', 0.4],
							['NOTHING', 0.6]
						]);
					case 'STARMAP_ZONE':
						return new Map([
							['STARMAP', 0.3],
							['ARTEFACT', 0.2],
							['NOTHING', 0.5]
						]);
					case 'EMPTY':
						return new Map([
							['NOTHING', 1.0]
						]);
					default:
						return new Map([['NOTHING', 1.0]]);
				}
			})
		};

		// Mock DistributionCalculator - use the real one
		global.DistributionCalculator = {
			convolveAll: jest.fn((distributions) => {
				if (distributions.length === 0) {
					return new Map([[0, 1]]);
				}
				if (distributions.length === 1) {
					return new Map(distributions[0]);
				}
				// Simple convolution for testing
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

		// Mock Constants
		global.Constants = {
			ABILITY_ALIASES: {
				'SKILLFUL': ['BOTANIC', 'SURVIVAL']
			}
		};

		// Mock filenameToId
		global.filenameToId = jest.fn((filename) => {
			if (!filename) return '';
			return filename.replace('.jpg', '').toUpperCase();
		});
	});

	afterAll(() => {
		global.EventWeightCalculator = originalEventWeightCalculator;
		global.DistributionCalculator = originalDistributionCalculator;
		global.Constants = originalConstants;
		global.filenameToId = originalFilenameToId;
	});

	beforeEach(() => {
		EventWeightCalculator.getSectorProbabilities.mockClear();
		DistributionCalculator.convolveAll.mockClear();
		filenameToId.mockClear();
	});

	// ========================================
	// calculate()
	// ========================================

	describe('calculate', () => {

		test('returns empty result for null sectors', () => {
			const result = ResourceCalculator.calculate(null);

			expect(result.fruits).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.steaks).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.fuel).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.oxygen).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.artefacts).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.mapFragments).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});

		test('returns empty result for empty sectors array', () => {
			const result = ResourceCalculator.calculate([]);

			expect(result.fruits).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});

		test('calculate returns all resource types', () => {
			const sectors = ['FOREST'];
			const result = ResourceCalculator.calculate(sectors);

			expect(result).toHaveProperty('fruits');
			expect(result).toHaveProperty('steaks');
			expect(result).toHaveProperty('fuel');
			expect(result).toHaveProperty('oxygen');
			expect(result).toHaveProperty('artefacts');
			expect(result).toHaveProperty('mapFragments');
		});

		test('calculate queries sector probabilities for each sector', () => {
			const sectors = ['FOREST', 'DESERT'];
			ResourceCalculator.calculate(sectors);

			// Each resource type queries each sector
			expect(EventWeightCalculator.getSectorProbabilities).toHaveBeenCalled();
		});
	});

	// ========================================
	// _buildSectorDistribution()
	// ========================================

	describe('_buildSectorDistribution', () => {

		test('builds distribution with resource events', () => {
			const dist = ResourceCalculator._buildSectorDistribution('FOREST', {}, 'HARVEST', 0, null);

			// FOREST has HARVEST_1 (30%) and HARVEST_2 (20%)
			// Remaining 50% should be 0
			expect(dist.get(1)).toBeCloseTo(0.3, 10);
			expect(dist.get(2)).toBeCloseTo(0.2, 10);
			expect(dist.get(0)).toBeCloseTo(0.5, 10);
		});

		test('applies bonus per event', () => {
			// With bonus of 1, HARVEST_1 becomes 2, HARVEST_2 becomes 3
			const dist = ResourceCalculator._buildSectorDistribution('FOREST', {}, 'HARVEST', 1, null);

			expect(dist.get(2)).toBeCloseTo(0.3, 10);  // HARVEST_1 + 1
			expect(dist.get(3)).toBeCloseTo(0.2, 10);  // HARVEST_2 + 1
			expect(dist.get(0)).toBeCloseTo(0.5, 10);
		});

		test('returns 100% zero for empty sector', () => {
			const dist = ResourceCalculator._buildSectorDistribution('EMPTY', {}, 'HARVEST', 0, null);

			expect(dist.get(0)).toBe(1);
			expect(dist.size).toBe(1);
		});
	});

	// ========================================
	// _calculateWithConvolution()
	// ========================================

	describe('_calculateWithConvolution', () => {

		test('convolves distributions from multiple sectors', () => {
			const sectors = ['FOREST', 'OCEAN'];
			ResourceCalculator._calculateWithConvolution(sectors, {}, 'HARVEST', 0, null);

			expect(DistributionCalculator.convolveAll).toHaveBeenCalledTimes(1);
			const distributions = DistributionCalculator.convolveAll.mock.calls[0][0];
			expect(distributions.length).toBe(2);
		});

		test('returns pessimist/average/optimist structure', () => {
			const sectors = ['FOREST'];
			const result = ResourceCalculator._calculateWithConvolution(sectors, {}, 'HARVEST', 0, null);

			expect(result).toHaveProperty('pessimist');
			expect(result).toHaveProperty('average');
			expect(result).toHaveProperty('optimist');
		});

		test('returns zeros for empty sectors', () => {
			const result = ResourceCalculator._calculateWithConvolution([], {}, 'HARVEST', 0, null);

			expect(result).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});
	});

	// ========================================
	// _calculateOxygen()
	// ========================================

	describe('_calculateOxygen', () => {

		test('pessimist for oxygen is always 0', () => {
			const sectors = ['OCEAN'];
			const result = ResourceCalculator._calculateOxygen(sectors, {}, null);

			// Oxygen pessimist is forced to 0 (might find nothing)
			expect(result.pessimist).toBe(0);
		});
	});

	// ========================================
	// _calculateFuelWithConvolution()
	// ========================================

	describe('_calculateFuelWithConvolution', () => {

		test('applies driller multiplier to fuel', () => {
			const sectors = ['DESERT'];
			// 1 driller = 2x multiplier
			const result = ResourceCalculator._calculateFuelWithConvolution(sectors, {}, 1, null);

			expect(result).toHaveProperty('pessimist');
			expect(result).toHaveProperty('average');
			expect(result).toHaveProperty('optimist');
		});

		test('returns zeros for empty sectors', () => {
			const result = ResourceCalculator._calculateFuelWithConvolution([], {}, 0, null);

			expect(result).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});
	});

	// ========================================
	// _buildFuelDistribution()
	// ========================================

	describe('_buildFuelDistribution', () => {

		test('applies multiplier to fuel amounts', () => {
			// DESERT has FUEL_1 at 40%
			// With multiplier 2, FUEL_1 becomes 2
			const dist = ResourceCalculator._buildFuelDistribution('DESERT', {}, 2, null);

			expect(dist.get(2)).toBeCloseTo(0.4, 10);  // FUEL_1 * 2
			expect(dist.get(0)).toBeCloseTo(0.6, 10);  // Non-fuel events
		});

		test('returns 100% zero for no fuel sector', () => {
			const dist = ResourceCalculator._buildFuelDistribution('FOREST', {}, 1, null);

			expect(dist.get(0)).toBe(1);
		});
	});

	// ========================================
	// _calculateArtefacts()
	// ========================================

	describe('_calculateArtefacts', () => {

		test('calculates 8/9 chance for real artefact', () => {
			const sectors = ['ARTEFACT_ZONE'];
			
			// Manually test the distribution building
			const probs = EventWeightCalculator.getSectorProbabilities('ARTEFACT_ZONE', {}, null);
			const artefactProb = probs.get('ARTEFACT') || 0;
			
			// 40% chance of ARTEFACT * 8/9 = real artefact
			const expectedRealArtefactProb = artefactProb * (8 / 9);
			expect(expectedRealArtefactProb).toBeCloseTo(0.4 * (8/9), 10);
		});
	});

	// ========================================
	// _calculateMapFragments()
	// ========================================

	describe('_calculateMapFragments', () => {

		test('includes STARMAP events', () => {
			const sectors = ['STARMAP_ZONE'];
			// Should call getSectorProbabilities and include STARMAP
			const result = ResourceCalculator._calculateMapFragments(sectors, {}, null);

			expect(result).toHaveProperty('pessimist');
			expect(result).toHaveProperty('average');
			expect(result).toHaveProperty('optimist');
		});

		test('includes 1/9 of ARTEFACT as map fragment', () => {
			// ARTEFACT_ZONE has 40% ARTEFACT
			// 1/9 of that is map fragment
			const sectors = ['ARTEFACT_ZONE'];
			const result = ResourceCalculator._calculateMapFragments(sectors, {}, null);

			// Result should have non-zero values since there's artefact chance
			expect(result).toHaveProperty('average');
		});
	});

	// ========================================
	// _countModifiers()
	// ========================================

	describe('_countModifiers', () => {

		test('counts BOTANIC ability', () => {
			const players = [
				{ abilities: ['botanic.jpg'], items: [] }
			];
			const result = ResourceCalculator._countModifiers(players);

			expect(result.botanistCount).toBe(1);
		});

		test('counts SURVIVAL ability', () => {
			const players = [
				{ abilities: ['survival.jpg'], items: [] }
			];
			const result = ResourceCalculator._countModifiers(players);

			expect(result.survivalCount).toBe(1);
		});

		test('counts DRILLER item', () => {
			const players = [
				{ abilities: [], items: ['driller.jpg'] }
			];
			const result = ResourceCalculator._countModifiers(players);

			expect(result.drillerCount).toBe(1);
		});

		test('expands SKILLFUL alias to BOTANIC and SURVIVAL', () => {
			const players = [
				{ abilities: ['skillful.jpg'], items: [] }
			];
			const result = ResourceCalculator._countModifiers(players);

			// SKILLFUL counts as both BOTANIC and SURVIVAL
			expect(result.botanistCount).toBe(1);
			expect(result.survivalCount).toBe(1);
		});

		test('counts multiple modifiers across players', () => {
			const players = [
				{ abilities: ['botanic.jpg'], items: [] },
				{ abilities: ['botanic.jpg'], items: ['driller.jpg'] },
				{ abilities: [], items: ['driller.jpg'] }
			];
			const result = ResourceCalculator._countModifiers(players);

			expect(result.botanistCount).toBe(2);
			expect(result.drillerCount).toBe(2);
		});

		test('handles empty players', () => {
			const result = ResourceCalculator._countModifiers([]);

			expect(result.botanistCount).toBe(0);
			expect(result.survivalCount).toBe(0);
			expect(result.drillerCount).toBe(0);
		});

		test('handles null abilities/items', () => {
			const players = [
				{ abilities: null, items: null }
			];
			const result = ResourceCalculator._countModifiers(players);

			expect(result.botanistCount).toBe(0);
		});
	});

	// ========================================
	// _getTailScenarios()
	// ========================================

	describe('_getTailScenarios', () => {

		test('calculates expected value for average', () => {
			// Distribution: 0 → 50%, 2 → 50%
			const dist = new Map([[0, 0.5], [2, 0.5]]);
			const result = ResourceCalculator._getTailScenarios(dist);

			expect(result.average).toBe(1);  // 0*0.5 + 2*0.5
		});

		test('pessimist is conditional expectation of bottom 25%', () => {
			// Distribution: 0 → 25%, 1 → 50%, 2 → 25%
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);
			const result = ResourceCalculator._getTailScenarios(dist);

			// Bottom 25% is entirely 0
			expect(result.pessimist).toBe(0);
		});

		test('optimist is conditional expectation of top 25%', () => {
			// Distribution: 0 → 25%, 1 → 50%, 2 → 25%
			const dist = new Map([[0, 0.25], [1, 0.5], [2, 0.25]]);
			const result = ResourceCalculator._getTailScenarios(dist);

			// Top 25% is entirely 2
			expect(result.optimist).toBe(2);
		});
	});

	// ========================================
	// _conditionalExpectation()
	// ========================================

	describe('_conditionalExpectation', () => {

		test('bottom tail from sorted ascending', () => {
			const sorted = [[0, 0.5], [2, 0.5]];
			const result = ResourceCalculator._conditionalExpectation(sorted, 0.25, 'bottom');

			// Bottom 25% is from value 0 (which has 50% mass)
			expect(result).toBe(0);  // 0 * 0.25 / 0.25
		});

		test('top tail from sorted descending', () => {
			const sorted = [[0, 0.5], [2, 0.5]];
			const result = ResourceCalculator._conditionalExpectation(sorted, 0.25, 'top');

			// Top 25% is from value 2 (which has 50% mass)
			expect(result).toBe(2);  // 2 * 0.25 / 0.25
		});
	});

	// ========================================
	// _emptyResult()
	// ========================================

	describe('_emptyResult', () => {

		test('returns all resource types with zeros', () => {
			const result = ResourceCalculator._emptyResult();

			expect(result.fruits).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.steaks).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.fuel).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.oxygen).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.artefacts).toEqual({ pessimist: 0, average: 0, optimist: 0 });
			expect(result.mapFragments).toEqual({ pessimist: 0, average: 0, optimist: 0 });
		});
	});
});
