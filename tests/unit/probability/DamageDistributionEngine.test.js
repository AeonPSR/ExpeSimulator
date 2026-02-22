/**
 * DamageDistributionEngine Tests
 * 
 * Tests for the shared convolution pipeline for damage calculations.
 */

describe('DamageDistributionEngine', () => {

	// Store originals
	let originalEventWeightCalculator;
	let originalDamagePathSampler;
	let originalConstants;

	beforeAll(() => {
		// Save originals
		originalEventWeightCalculator = global.EventWeightCalculator;
		originalDamagePathSampler = global.DamagePathSampler;
		originalConstants = global.Constants;

		// Mock EventWeightCalculator
		global.EventWeightCalculator = {
			getSectorProbabilities: jest.fn((sectorName, loadout, cache) => {
				switch (sectorName) {
					case 'FOREST':
						return new Map([
							['FIGHT_12', 0.3],
							['NOTHING', 0.7]
						]);
					case 'DESERT':
						return new Map([
							['FIGHT_8', 0.2],
							['TIRED_2', 0.3],
							['NOTHING', 0.5]
						]);
					default:
						return new Map([['NOTHING', 1.0]]);
				}
			})
		};

		// Mock DamagePathSampler (optional path sampling)
		global.DamagePathSampler = {
			samplePaths: jest.fn((sectorOutcomes, targetTotals) => {
				// Return mock paths for each target total
				return targetTotals.map(total => ({
					totalDamage: total,
					sources: total > 0 ? [{ sector: 'FOREST', eventType: 'FIGHT', damage: total }] : []
				}));
			})
		};

		// Ensure Constants.SCENARIO_KEYS is available
		if (!global.Constants) {
			global.Constants = {};
		}
		global.Constants.SCENARIO_KEYS = ['pessimist', 'average', 'optimist', 'worstCase'];
	});

	afterAll(() => {
		global.EventWeightCalculator = originalEventWeightCalculator;
		global.DamagePathSampler = originalDamagePathSampler;
		global.Constants = originalConstants;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	// ========================================
	// emptyDamageResult()
	// ========================================

	describe('emptyDamageResult', () => {

		test('emptyDamageResult returns zeroed values', () => {
			const result = DamageDistributionEngine.emptyDamageResult();

			expect(result.pessimist).toBe(0);
			expect(result.average).toBe(0);
			expect(result.optimist).toBe(0);
			expect(result.worstCase).toBe(0);
		});

		test('emptyDamageResult has probability 1 for all scenarios', () => {
			const result = DamageDistributionEngine.emptyDamageResult();

			expect(result.pessimistProb).toBe(1);
			expect(result.averageProb).toBe(1);
			expect(result.optimistProb).toBe(1);
			expect(result.worstCaseProb).toBe(1);
		});

		test('emptyDamageResult distribution has 100% on 0 damage', () => {
			const result = DamageDistributionEngine.emptyDamageResult();

			expect(result.distribution.get(0)).toBe(1);
			expect(result.distribution.size).toBe(1);
		});

	});

	// ========================================
	// emptyDamageInstances()
	// ========================================

	describe('emptyDamageInstances', () => {

		test('emptyDamageInstances returns empty arrays for all scenarios', () => {
			const result = DamageDistributionEngine.emptyDamageInstances();

			expect(result.pessimist).toEqual([]);
			expect(result.average).toEqual([]);
			expect(result.optimist).toEqual([]);
			expect(result.worstCase).toEqual([]);
		});

	});

	// ========================================
	// buildDamageResult()
	// ========================================

	describe('buildDamageResult', () => {

		test('buildDamageResult copies scenario values', () => {
			const scenarios = {
				optimist: 0,
				average: 6,
				pessimist: 12,
				worstCase: 24,
				optimistProb: 0.7,
				averageProb: 0.2,
				pessimistProb: 0.08,
				worstCaseProb: 0.02
			};
			const dist = new Map([[0, 0.7], [12, 0.2], [24, 0.1]]);

			const result = DamageDistributionEngine.buildDamageResult(scenarios, dist);

			expect(result.optimist).toBe(0);
			expect(result.average).toBe(6);
			expect(result.pessimist).toBe(12);
			expect(result.worstCase).toBe(24);
			expect(result.optimistProb).toBe(0.7);
			expect(result.averageProb).toBe(0.2);
			expect(result.pessimistProb).toBe(0.08);
			expect(result.worstCaseProb).toBe(0.02);
			expect(result.distribution).toBe(dist);
		});

	});

	// ========================================
	// buildDamageInstances()
	// ========================================

	describe('buildDamageInstances', () => {

		test('buildDamageInstances creates COMBINED type without paths', () => {
			const scenarios = {
				optimist: 0,
				average: 6,
				pessimist: 12,
				worstCase: 24
			};

			const result = DamageDistributionEngine.buildDamageInstances(scenarios);

			// Optimist has 0 damage, so no instance
			expect(result.optimist).toEqual([]);

			// Others should have COMBINED type
			expect(result.average[0].type).toBe('COMBINED');
			expect(result.average[0].totalDamage).toBe(6);
			expect(result.average[0].sources).toEqual([]);

			expect(result.pessimist[0].totalDamage).toBe(12);
			expect(result.worstCase[0].totalDamage).toBe(24);
		});

		test('buildDamageInstances includes sources with DETAILED type when paths provided', () => {
			const scenarios = {
				optimist: 0,
				average: 12,
				pessimist: 12,
				worstCase: 12
			};
			const sampledPaths = {
				optimist: { totalDamage: 0, sources: [] },
				average: {
					totalDamage: 12,
					sources: [
						{ sector: 'FOREST', eventType: 'FIGHT_12', damage: 12 }
					]
				},
				pessimist: {
					totalDamage: 12,
					sources: [
						{ sector: 'FOREST', eventType: 'FIGHT_12', damage: 12 }
					]
				},
				worstCase: {
					totalDamage: 12,
					sources: [
						{ sector: 'FOREST', eventType: 'FIGHT_12', damage: 12 }
					]
				}
			};

			const result = DamageDistributionEngine.buildDamageInstances(scenarios, sampledPaths);

			expect(result.average[0].type).toBe('DETAILED');
			expect(result.average[0].sources.length).toBe(1);
			expect(result.average[0].sources[0].sector).toBe('FOREST');
			expect(result.average[0].sources[0].eventType).toBe('FIGHT_12');
			expect(result.average[0].sources[0].damage).toBe(12);
		});

	});

	// ========================================
	// calculate()
	// ========================================

	describe('calculate', () => {

		test('calculate convolves sector distributions', () => {
			// Simple callback: each sector has 50% chance of 10 damage
			const getSectorDamageDist = (sectorName, probs) => ({
				dist: [[10, 0.5]],
				totalProb: 0.5
			});

			const result = DamageDistributionEngine.calculate({
				sectors: ['FOREST', 'DESERT'],
				loadout: {},
				sectorProbabilities: null,
				getSectorDamageDist,
				logLabel: 'Test'
			});

			// With 2 sectors each 50% 10 damage:
			// P(0) = 0.5 * 0.5 = 0.25
			// P(10) = 0.5*0.5 + 0.5*0.5 = 0.50
			// P(20) = 0.5 * 0.5 = 0.25
			expect(result.damageDistribution.get(0)).toBeCloseTo(0.25, 10);
			expect(result.damageDistribution.get(10)).toBeCloseTo(0.50, 10);
			expect(result.damageDistribution.get(20)).toBeCloseTo(0.25, 10);
		});

		test('calculate handles excluded sectors', () => {
			// Callback: 100% chance of 10 damage
			const getSectorDamageDist = () => ({
				dist: [[10, 1.0]],
				totalProb: 1.0
			});

			const result = DamageDistributionEngine.calculate({
				sectors: ['FOREST', 'DESERT'],
				loadout: {},
				worstCaseExclusions: new Set(['FOREST']), // FOREST excluded
				getSectorDamageDist,
				logLabel: 'Test'
			});

			// FOREST excluded (0 damage), DESERT has 10 damage
			// Result: only 10 possible
			expect(result.damageDistribution.get(10)).toBe(1.0);
		});

		test('calculate applies postProcessDistribution', () => {
			const getSectorDamageDist = () => ({
				dist: [[10, 1.0]],
				totalProb: 1.0
			});

			// Post-process: halve all damage values
			const postProcess = (dist) => {
				const newDist = new Map();
				for (const [damage, prob] of dist) {
					newDist.set(damage / 2, prob);
				}
				return newDist;
			};

			const result = DamageDistributionEngine.calculate({
				sectors: ['FOREST'],
				loadout: {},
				getSectorDamageDist,
				postProcessDistribution: postProcess,
				logLabel: 'Test'
			});

			// Original 10 damage halved to 5
			expect(result.damageDistribution.get(5)).toBe(1.0);
		});

		test('calculate returns standard damage result structure', () => {
			const getSectorDamageDist = () => ({
				dist: [[10, 0.5]],
				totalProb: 0.5
			});

			const result = DamageDistributionEngine.calculate({
				sectors: ['FOREST'],
				loadout: {},
				getSectorDamageDist,
				logLabel: 'Test'
			});

			expect(result.damage).toHaveProperty('optimist');
			expect(result.damage).toHaveProperty('average');
			expect(result.damage).toHaveProperty('pessimist');
			expect(result.damage).toHaveProperty('worstCase');
			expect(result.damage).toHaveProperty('distribution');
			expect(result.damageInstances).toBeDefined();
		});

		test('calculate handles empty sectors', () => {
			const getSectorDamageDist = () => ({ dist: [], totalProb: 0 });

			const result = DamageDistributionEngine.calculate({
				sectors: [],
				loadout: {},
				getSectorDamageDist,
				logLabel: 'Test'
			});

			// Empty sectors = 100% 0 damage
			expect(result.damageDistribution.get(0)).toBe(1);
		});

		test('calculate invokes path sampling when detailed outcomes provided', () => {
			const getSectorDamageDist = () => ({
				dist: [[10, 0.5]],
				totalProb: 0.5
			});
			const getDetailedSectorOutcomes = (sectorName, probs) => [
				{ eventType: 'FIGHT_10', damage: 10, probability: 0.5 }
			];

			DamageDistributionEngine.calculate({
				sectors: ['FOREST'],
				loadout: {},
				getSectorDamageDist,
				getDetailedSectorOutcomes,
				logLabel: 'Test'
			});

			expect(DamagePathSampler.samplePaths).toHaveBeenCalled();
		});

	});

});
