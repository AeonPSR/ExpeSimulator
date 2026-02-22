/**
 * FightCalculator Tests
 * 
 * Tests for fight occurrence and damage calculations using convolution.
 * Fight types: FIGHT_8, FIGHT_10, FIGHT_12, FIGHT_15, FIGHT_18, FIGHT_32
 * Variable fight: FIGHT_8_10_12_15_18_32
 */

describe('FightCalculator', () => {

	// Store originals for restoration
	let originalEventWeightCalculator;
	let originalOccurrenceCalculator;
	let originalDamageDistributionEngine;
	let originalFightingPowerService;

	beforeAll(() => {
		// Save originals
		originalEventWeightCalculator = global.EventWeightCalculator;
		originalOccurrenceCalculator = global.OccurrenceCalculator;
		originalDamageDistributionEngine = global.DamageDistributionEngine;
		originalFightingPowerService = global.FightingPowerService;

		// Mock EventWeightCalculator
		global.EventWeightCalculator = {
			getSectorProbabilities: jest.fn((sectorName, loadout, cache) => {
				switch (sectorName) {
					case 'COMBAT_ZONE':
						return new Map([
							['FIGHT_12', 0.4],
							['FIGHT_8', 0.2],
							['NOTHING', 0.4]
						]);
					case 'MIXED_ZONE':
						return new Map([
							['FIGHT_10', 0.3],
							['HARVEST_1', 0.2],
							['NOTHING', 0.5]
						]);
					case 'VARIABLE_ZONE':
						return new Map([
							['FIGHT_8_10_12_15_18_32', 0.5],
							['NOTHING', 0.5]
						]);
					case 'SAFE_ZONE':
						return new Map([
							['NOTHING', 1.0]
						]);
					default:
						return new Map([['NOTHING', 1.0]]);
				}
			})
		};

		// Mock OccurrenceCalculator
		global.OccurrenceCalculator = {
			calculateForType: jest.fn((sectors, loadout, eventType, cache) => ({
				occurrence: {
					pessimist: 1,
					average: 0.5,
					optimist: 0,
					distribution: new Map([[0, 0.5], [1, 0.5]])
				},
				sectors: [{ sectorName: sectors[0], probability: 0.5, index: 0 }]
			}))
		};

		// Mock DamageDistributionEngine
		global.DamageDistributionEngine = {
			calculate: jest.fn((config) => ({
				damage: {
					pessimist: 10,
					average: 5,
					optimist: 0,
					worstCase: 12,
					pessimistProb: 0.25,
					averageProb: 0.5,
					optimistProb: 0.25,
					worstCaseProb: 0.1
				},
				damageInstances: {
					pessimist: [],
					average: [],
					optimist: [],
					worstCase: []
				},
				damageDistribution: new Map([[0, 0.5], [10, 0.5]]),
				sampledPaths: null
			})),
			emptyDamageResult: jest.fn(() => ({
				pessimist: 0,
				average: 0,
				optimist: 0,
				worstCase: 0,
				pessimistProb: 1,
				averageProb: 0,
				optimistProb: 0,
				worstCaseProb: 0
			})),
			emptyDamageInstances: jest.fn(() => ({
				pessimist: [],
				average: [],
				optimist: [],
				worstCase: []
			}))
		};

		// Mock FightingPowerService
		global.FightingPowerService = {
			calculateBaseFightingPower: jest.fn((players) => {
				let power = 0;
				for (const player of players) {
					if (player.items) {
						for (const item of player.items) {
							if (item && item.includes('blaster')) power += 6;
						}
					}
				}
				return power;
			}),
			countGrenades: jest.fn((players) => {
				let count = 0;
				for (const player of players) {
					if (player.items) {
						for (const item of player.items) {
							if (item && item.includes('grenade')) count++;
						}
					}
				}
				return count;
			}),
			getGrenadePower: jest.fn(() => 3)
		};
	});

	afterAll(() => {
		global.EventWeightCalculator = originalEventWeightCalculator;
		global.OccurrenceCalculator = originalOccurrenceCalculator;
		global.DamageDistributionEngine = originalDamageDistributionEngine;
		global.FightingPowerService = originalFightingPowerService;
	});

	beforeEach(() => {
		EventWeightCalculator.getSectorProbabilities.mockClear();
		OccurrenceCalculator.calculateForType.mockClear();
		DamageDistributionEngine.calculate.mockClear();
		DamageDistributionEngine.emptyDamageResult.mockClear();
		DamageDistributionEngine.emptyDamageInstances.mockClear();
		FightingPowerService.calculateBaseFightingPower.mockClear();
		FightingPowerService.countGrenades.mockClear();
	});

	// ========================================
	// FIGHT_DAMAGES configuration
	// ========================================

	describe('FIGHT_DAMAGES', () => {

		test('defines fixed damage fights', () => {
			expect(FightCalculator.FIGHT_DAMAGES['8'].fixed).toBe(8);
			expect(FightCalculator.FIGHT_DAMAGES['10'].fixed).toBe(10);
			expect(FightCalculator.FIGHT_DAMAGES['12'].fixed).toBe(12);
			expect(FightCalculator.FIGHT_DAMAGES['15'].fixed).toBe(15);
			expect(FightCalculator.FIGHT_DAMAGES['18'].fixed).toBe(18);
			expect(FightCalculator.FIGHT_DAMAGES['32'].fixed).toBe(32);
		});

		test('defines variable damage fight', () => {
			const variable = FightCalculator.FIGHT_DAMAGES['8_10_12_15_18_32'];
			expect(variable.variable).toBe(true);
			expect(variable.values).toEqual([8, 10, 12, 15, 18, 32]);
			expect(variable.min).toBe(8);
			expect(variable.max).toBe(32);
		});
	});

	// ========================================
	// calculate()
	// ========================================

	describe('calculate', () => {

		test('returns empty result for null sectors', () => {
			const result = FightCalculator.calculate(null);

			expect(result.occurrence).toEqual({});
			expect(result.fightingPower).toBe(0);
			expect(result.grenadeCount).toBe(0);
		});

		test('returns empty result for empty sectors array', () => {
			const result = FightCalculator.calculate([]);

			expect(result.occurrence).toEqual({});
		});

		test('returns all expected fields', () => {
			const sectors = ['COMBAT_ZONE'];
			const result = FightCalculator.calculate(sectors);

			expect(result).toHaveProperty('occurrence');
			expect(result).toHaveProperty('damage');
			expect(result).toHaveProperty('damageInstances');
			expect(result).toHaveProperty('fightingPower');
			expect(result).toHaveProperty('grenadeCount');
			expect(result).toHaveProperty('playerCount');
		});

		test('calculates fighting power from players', () => {
			const sectors = ['COMBAT_ZONE'];
			const players = [
				{ items: ['blaster.jpg'] }
			];
			FightCalculator.calculate(sectors, {}, players);

			expect(FightingPowerService.calculateBaseFightingPower).toHaveBeenCalledWith(players);
		});

		test('calculates grenade count from players', () => {
			const sectors = ['COMBAT_ZONE'];
			const players = [
				{ items: ['grenade.jpg', 'grenade.jpg'] }
			];
			FightCalculator.calculate(sectors, {}, players);

			expect(FightingPowerService.countGrenades).toHaveBeenCalledWith(players);
		});

		test('calls DamageDistributionEngine.calculate', () => {
			const sectors = ['COMBAT_ZONE'];
			FightCalculator.calculate(sectors);

			expect(DamageDistributionEngine.calculate).toHaveBeenCalledTimes(1);
		});

		test('passes worstCaseExclusions to engine', () => {
			const sectors = ['COMBAT_ZONE'];
			const exclusions = new Set(['COMBAT_ZONE']);
			FightCalculator.calculate(sectors, {}, [], exclusions);

			const config = DamageDistributionEngine.calculate.mock.calls[0][0];
			expect(config.worstCaseExclusions).toBe(exclusions);
		});
	});

	// ========================================
	// _getFightDamageDistribution()
	// ========================================

	describe('_getFightDamageDistribution', () => {

		test('returns fixed damage for fixed fight type', () => {
			const dist = FightCalculator._getFightDamageDistribution('12', 0);

			expect(dist.get(12)).toBe(1);
			expect(dist.size).toBe(1);
		});

		test('applies fighting power reduction', () => {
			const dist = FightCalculator._getFightDamageDistribution('12', 4);

			// 12 - 4 = 8
			expect(dist.get(8)).toBe(1);
		});

		test('damage cannot go below 0', () => {
			const dist = FightCalculator._getFightDamageDistribution('8', 20);

			expect(dist.get(0)).toBe(1);
		});

		test('handles variable fight type', () => {
			const dist = FightCalculator._getFightDamageDistribution('8_10_12_15_18_32', 0);

			// Should have equal probability for each value
			expect(dist.get(8)).toBeCloseTo(1/6, 10);
			expect(dist.get(10)).toBeCloseTo(1/6, 10);
			expect(dist.get(32)).toBeCloseTo(1/6, 10);
		});

		test('variable fight applies fighting power to each value', () => {
			const dist = FightCalculator._getFightDamageDistribution('8_10_12_15_18_32', 8);

			// Values reduced by 8: 0, 2, 4, 7, 10, 24
			expect(dist.get(0)).toBeCloseTo(1/6, 10);
			expect(dist.get(2)).toBeCloseTo(1/6, 10);
			expect(dist.get(4)).toBeCloseTo(1/6, 10);
		});

		test('handles unknown fight type', () => {
			const dist = FightCalculator._getFightDamageDistribution('99', 0);

			// Should parse as 99 damage
			expect(dist.get(99)).toBe(1);
		});
	});

	// ========================================
	// _applyGrenadesToDistribution()
	// ========================================

	describe('_applyGrenadesToDistribution', () => {

		test('returns unchanged distribution with 0 grenades', () => {
			const original = new Map([[10, 0.5], [0, 0.5]]);
			const result = FightCalculator._applyGrenadesToDistribution(original, 0);

			expect(result).toBe(original);
		});

		test('reduces damage by grenade power', () => {
			const original = new Map([[10, 1]]);
			const result = FightCalculator._applyGrenadesToDistribution(original, 1);

			// 1 grenade × 3 power = 3 reduction
			expect(result.get(7)).toBe(1);
		});

		test('multiple grenades stack', () => {
			const original = new Map([[10, 1]]);
			const result = FightCalculator._applyGrenadesToDistribution(original, 2);

			// 2 grenades × 3 power = 6 reduction
			expect(result.get(4)).toBe(1);
		});

		test('damage cannot go below 0', () => {
			const original = new Map([[5, 1]]);
			const result = FightCalculator._applyGrenadesToDistribution(original, 3);

			// 3 grenades × 3 power = 9 reduction, but 5-9 = negative, capped at 0
			expect(result.get(0)).toBe(1);
		});

		test('preserves probability mass', () => {
			const original = new Map([[5, 0.3], [10, 0.7]]);
			const result = FightCalculator._applyGrenadesToDistribution(original, 1);

			let total = 0;
			for (const prob of result.values()) {
				total += prob;
			}
			expect(total).toBeCloseTo(1, 10);
		});
	});

	// ========================================
	// _getAllFightTypes()
	// ========================================

	describe('_getAllFightTypes', () => {

		test('extracts fight types from sectors', () => {
			const sectors = ['COMBAT_ZONE'];
			const result = FightCalculator._getAllFightTypes(sectors, {}, null);

			expect(result).toContain('12');
			expect(result).toContain('8');
		});

		test('returns unique fight types', () => {
			const sectors = ['COMBAT_ZONE', 'COMBAT_ZONE'];
			const result = FightCalculator._getAllFightTypes(sectors, {}, null);

			// Should not have duplicates
			const unique = new Set(result);
			expect(unique.size).toBe(result.length);
		});

		test('returns empty array for safe sectors', () => {
			const sectors = ['SAFE_ZONE'];
			const result = FightCalculator._getAllFightTypes(sectors, {}, null);

			expect(result.length).toBe(0);
		});
	});

	// ========================================
	// _getFightingPower()
	// ========================================

	describe('_getFightingPower', () => {

		test('delegates to FightingPowerService', () => {
			const players = [{ items: ['blaster.jpg'] }];
			FightCalculator._getFightingPower(players);

			expect(FightingPowerService.calculateBaseFightingPower).toHaveBeenCalledWith(players);
		});
	});

	// ========================================
	// _getGrenadeCount()
	// ========================================

	describe('_getGrenadeCount', () => {

		test('delegates to FightingPowerService', () => {
			const players = [{ items: ['grenade.jpg'] }];
			FightCalculator._getGrenadeCount(players);

			expect(FightingPowerService.countGrenades).toHaveBeenCalledWith(players);
		});
	});

	// ========================================
	// _emptyResult()
	// ========================================

	describe('_emptyResult', () => {

		test('returns empty occurrence object', () => {
			const result = FightCalculator._emptyResult();

			expect(result.occurrence).toEqual({});
		});

		test('returns zeroed damage values', () => {
			const result = FightCalculator._emptyResult();

			expect(result.fightingPower).toBe(0);
			expect(result.grenadeCount).toBe(0);
			expect(result.playerCount).toBe(0);
		});

		test('returns empty damage instances', () => {
			const result = FightCalculator._emptyResult();

			expect(result.damageInstances).toEqual({
				pessimist: [],
				average: [],
				optimist: [],
				worstCase: []
			});
		});
	});
});
