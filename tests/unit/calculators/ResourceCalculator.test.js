/**
 * ResourceCalculator Tests
 * 
 * Tests for resource yield calculations using convolution.
 * Resources: Fruits, Steaks, Fuel, O2, Artefacts, Map Fragments
 */

describe('ResourceCalculator', () => {

	// Store originals for restoration
	let originalExpeditionPipeline;
	let originalDistributionCalculator;
	let originalConstants;
	let originalFilenameToId;

	beforeAll(() => {
		// Save originals
		originalExpeditionPipeline = global.ExpeditionPipeline;
		originalDistributionCalculator = global.DistributionCalculator;
		originalConstants = global.Constants;
		originalFilenameToId = global.filenameToId;

		// Mock ExpeditionPipeline
		global.ExpeditionPipeline = {
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
		global.ExpeditionPipeline = originalExpeditionPipeline;
		global.DistributionCalculator = originalDistributionCalculator;
		global.Constants = originalConstants;
		global.filenameToId = originalFilenameToId;
	});

	beforeEach(() => {
		ExpeditionPipeline.getSectorProbabilities.mockClear();
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

		test('calculate returns all resource types with numeric values', () => {
			const sectors = ['FOREST'];
			const result = ResourceCalculator.calculate(sectors);

			// Each resource type should have numeric pessimist/average/optimist
			for (const key of ['fruits', 'steaks', 'fuel', 'oxygen', 'artefacts', 'mapFragments']) {
				expect(typeof result[key].pessimist).toBe('number');
				expect(typeof result[key].average).toBe('number');
				expect(typeof result[key].optimist).toBe('number');
			}

			// FOREST has HARVEST_1 (30%) and HARVEST_2 (20%), so fruits average > 0
			expect(result.fruits.average).toBeGreaterThan(0);
			// FOREST has no fuel events, so fuel should be 0
			expect(result.fuel.average).toBe(0);
		});

		test('calculate queries sector probabilities for each sector', () => {
			const sectors = ['FOREST', 'DESERT'];
			ResourceCalculator.calculate(sectors);

			// Each resource type queries each sector
			expect(ExpeditionPipeline.getSectorProbabilities).toHaveBeenCalled();
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

		test('returns pessimist/average/optimist with correct ordering', () => {
			const sectors = ['FOREST'];
			const result = ResourceCalculator._calculateWithConvolution(sectors, {}, 'HARVEST', 0, null);

			expect(typeof result.pessimist).toBe('number');
			expect(typeof result.average).toBe('number');
			expect(typeof result.optimist).toBe('number');
			// For resources: optimist >= average >= pessimist (more = better)
			expect(result.optimist).toBeGreaterThanOrEqual(result.average);
			expect(result.average).toBeGreaterThanOrEqual(result.pessimist);
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
			// Without driller
			const resultNoDriller = ResourceCalculator._calculateFuelWithConvolution(sectors, {}, 0, null);
			// With 1 driller = 2x multiplier
			const resultWithDriller = ResourceCalculator._calculateFuelWithConvolution(sectors, {}, 1, null);

			// Average fuel with driller should be exactly double
			expect(resultWithDriller.average).toBeCloseTo(resultNoDriller.average * 2, 10);
			// Both should have non-zero fuel (DESERT has FUEL_1)
			expect(resultNoDriller.average).toBeGreaterThan(0);
			expect(resultWithDriller.average).toBeGreaterThan(0);
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
			const probs = ExpeditionPipeline.getSectorProbabilities('ARTEFACT_ZONE', {}, null);
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
			// STARMAP_ZONE has STARMAP at 30% + ARTEFACT at 20% (1/9 of that = map fragment)
			const result = ResourceCalculator._calculateMapFragments(sectors, {}, null);

			// Average should reflect the combined probability of STARMAP + 1/9 ARTEFACT
			expect(result.average).toBeGreaterThan(0);
			expect(result.optimist).toBeGreaterThanOrEqual(result.average);
			expect(result.average).toBeGreaterThanOrEqual(result.pessimist);
		});

		test('includes 1/9 of ARTEFACT as map fragment', () => {
			// ARTEFACT_ZONE has 40% ARTEFACT
			// 1/9 of that = 4.44% chance of map fragment per sector
			const sectors = ['ARTEFACT_ZONE'];
			const result = ResourceCalculator._calculateMapFragments(sectors, {}, null);

			// Average should be close to 0.4 * (1/9) ≈ 0.0444
			expect(result.average).toBeCloseTo(0.4 * (1 / 9), 2);
			expect(result.average).toBeGreaterThan(0);
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

	// ========================================
	// Combat reward integration
	// ========================================

	describe('combat reward integration', () => {

		let originalCombatRewardData;
		let originalCombatRewardService;
		let originalFightingPowerService;

		beforeAll(() => {
			originalCombatRewardData    = global.CombatRewardData;
			originalCombatRewardService = global.CombatRewardService;
			originalFightingPowerService = global.FightingPowerService;

			global.CombatRewardData = {
				tables: {
					MANKAROG: {
						lots: [
							{ weight: 1, items: [{ id: 'STARMAP',  qty: 1 }] },
							{ weight: 2, items: [{ id: 'ARTEFACT', qty: 3 }] },
						]
					},
					RUMINANT: {
						lots: [
							{ weight: 1, items: [{ id: 'ALIEN_STEAK', qty: 3 }] },
							{ weight: 1, items: [{ id: 'ALIEN_STEAK', qty: 4 }] },
							{ weight: 1, items: [{ id: 'ALIEN_STEAK', qty: 5 }] },
						]
					},
					CRISTAL_FIELD: {
						lots: [
							{ weight: 1, items: [{ id: 'STARMAP', qty: 1 }] },
						]
					},
				}
			};

			global.CombatRewardService = {
				_getRewardProbability: (power, strength) => {
					const threshold = strength / 2;
					if (power < threshold) return 0;
					return Math.min(Math.max(power - threshold + 1, 0) / (strength - threshold + 1), 1);
				}
			};

			global.FightingPowerService = {
				calculateBaseFightingPower: jest.fn(() => 40),
				countGrenades:              jest.fn(() => 0),
				getGrenadePower:            () => 0,
			};
		});

		afterAll(() => {
			global.CombatRewardData     = originalCombatRewardData;
			global.CombatRewardService  = originalCombatRewardService;
			global.FightingPowerService = originalFightingPowerService;
		});

		beforeEach(() => {
			ExpeditionPipeline.getSectorProbabilities.mockImplementation((sectorName) => {
				switch (sectorName) {
					case 'MANKAROG':
						return new Map([
							['KILL_RANDOM', 0.4],
							['FIGHT_32',    0.3],
							['BACK',        0.2],
							['ARTEFACT',    0.1],
						]);
					case 'RUMINANT':
						return new Map([
							['PROVISION_4',   0.4],
							['PROVISION_2',   0.3],
							['ACCIDENT_3_5',  0.2],
							['FIGHT_8',       0.1],
						]);
					case 'CRISTAL_FIELD':
						return new Map([
						['MUSH_TRAP',   0.3],
						['STARMAP',     0.3],
						['FIGHT_18',    0.3],
							['PLAYER_LOST', 0.1],
						]);
					default:
						return new Map([['NOTHING', 1.0]]);
				}
			});
		});

		// ---- _getFightRewardContributions ----

		describe('_getFightRewardContributions', () => {

			test('returns empty array when sector has no reward table', () => {
				const probs = new Map([['FIGHT_12', 0.5]]);
				const result = ResourceCalculator._getFightRewardContributions('FOREST', probs, 40, 0);
				expect(result).toEqual([]);
			});

			test('returns contributions for fixed fight with guaranteed win', () => {
				const probs = new Map([['FIGHT_8', 0.1]]);
				const contributions = ResourceCalculator._getFightRewardContributions('RUMINANT', probs, 40, 0);

				// 3 lots → 3 contributions
				expect(contributions).toHaveLength(3);
				expect(contributions.every(c => c.itemId === 'ALIEN_STEAK')).toBe(true);
				contributions.forEach(c => expect(c.prob).toBeCloseTo(0.1 / 3, 10));
				expect(contributions.map(c => c.qty).sort((a, b) => a - b)).toEqual([3, 4, 5]);
			});

			test('splits probability equally across all fight strengths for variable events', () => {
				// Using MANKAROG table (2 lots) with FIGHT_8_10_12_15_18_32 (6 strengths)
				const probs = new Map([['FIGHT_8_10_12_15_18_32', 0.1]]);
				const contributions = ResourceCalculator._getFightRewardContributions('MANKAROG', probs, 40, 0);

				// 6 strengths × 2 lots = 12 contributions
				expect(contributions).toHaveLength(12);
				// Total probability must equal fightEventProb × rewardProb
				const totalProb = contributions.reduce((sum, c) => sum + c.prob, 0);
				expect(totalProb).toBeCloseTo(0.1, 10);
			});

			test('returns no contributions when power is too low to win', () => {
				// FIGHT_32: threshold = 16; power=0 < 16 → rewardProb = 0
				const probs = new Map([['FIGHT_32', 0.3]]);
				const contributions = ResourceCalculator._getFightRewardContributions('MANKAROG', probs, 0, 0);
				expect(contributions).toHaveLength(0);
			});
		});

		// ---- _buildSectorDistribution with fight rewards ----

		describe('_buildSectorDistribution fight rewards', () => {

			test('RUMINANT: fight reward steaks merged into PROVISION distribution', () => {
				const dist = ResourceCalculator._buildSectorDistribution('RUMINANT', {}, 'PROVISION', 0, null, 40, 0);

				const fightRewardProb = 0.1 / 3; // each of 3 equal lots
				expect(dist.get(3)).toBeCloseTo(fightRewardProb, 5);          // fight reward only
				expect(dist.get(4)).toBeCloseTo(0.4 + fightRewardProb, 5);   // PROVISION_4 + fight reward lot
				expect(dist.get(5)).toBeCloseTo(fightRewardProb, 5);          // fight reward only
				expect(dist.get(2)).toBeCloseTo(0.3, 5);                      // PROVISION_2 unaffected
				expect(dist.get(0)).toBeCloseTo(1 - 0.4 - 0.3 - 0.1, 5);    // zero = accidents + no-fight
			});

			test('bonusPerEvent applies to fight reward qty the same as provision events', () => {
				// survival bonus +1: all resource amounts (event AND fight) shift by 1
				const dist = ResourceCalculator._buildSectorDistribution('RUMINANT', {}, 'PROVISION', 1, null, 40, 0);

				const fightRewardProb = 0.1 / 3;
				expect(dist.get(4)).toBeCloseTo(fightRewardProb, 5);          // 3+1 from fight
				expect(dist.get(5)).toBeCloseTo(0.4 + fightRewardProb, 5);   // PROVISION_4+1 + fight 4+1
				expect(dist.get(6)).toBeCloseTo(fightRewardProb, 5);          // 5+1 from fight
				expect(dist.get(3)).toBeCloseTo(0.3, 5);                      // PROVISION_2+1
			});

			test('no fight rewards when power is too low', () => {
				// power=0 vs FIGHT_8 (threshold=4): 0 < 4 → rewardProb = 0
				const dist = ResourceCalculator._buildSectorDistribution('RUMINANT', {}, 'PROVISION', 0, null, 0, 0);

				expect(dist.get(4)).toBeCloseTo(0.4, 5);
				expect(dist.get(2)).toBeCloseTo(0.3, 5);
				expect(dist.has(3)).toBe(false);
				expect(dist.has(5)).toBe(false);
			});
		});

		// ---- _calculateArtefacts with fight rewards ----

		describe('_calculateArtefacts fight rewards', () => {

			test('MANKAROG: fight reward 3-artefact lot applies 8/9 split', () => {
				// ARTEFACT event (0.1) → 1 real artefact × 8/9 = 8/90
				// FIGHT_32 (0.3) × win(1.0) × lot2(2/3) → 3 artefacts × 8/9 = 16/90
				// average = (1×8 + 3×16) / 90 = 56/90
				const result = ResourceCalculator._calculateArtefacts(['MANKAROG'], {}, null, 40, 0);

				expect(result.average).toBeCloseTo(56 / 90, 3);
				expect(result.pessimist).toBe(0); // 66/90 of runs yield 0 artefacts
				expect(result.optimist).toBeCloseTo(2.422, 2);
			});
		});

		// ---- _calculateMapFragments with fight rewards ----

		describe('_calculateMapFragments fight rewards', () => {

			test('MANKAROG: STARMAP fight reward adds directly, ARTEFACT fight reward uses 1/9', () => {
				// Sources of map fragments:
				//   ARTEFACT event × 1/9 = 1/90 (qty 1)
				//   FIGHT_32 × win × lot1(1/3) = 0.1 (STARMAP, qty 1)
				//   FIGHT_32 × win × lot2(2/3) × 1/9 = 2/90 (ARTEFACT→frag, qty 3)
				// average = 1×(1/90 + 0.1) + 3×(2/90) = 1×(10/90 + 1/90) + 6/90 = 11/90 + 6/90 = 17/90?
				// Wait: 0.1 = 9/90, so 1/90 + 9/90 + 3×(2/90) = 10/90 + 6/90 = 16/90
				const result = ResourceCalculator._calculateMapFragments(['MANKAROG'], {}, null, 40, 0);

				expect(result.average).toBeCloseTo(16 / 90, 3);
				expect(result.pessimist).toBe(0);
			});

			test('CRISTAL_FIELD: STARMAP fight reward contributes to map fragments', () => {
				// STARMAP event: 0.3 → qty 1
				// FIGHT_18 (0.3) × win(1.0) × lot(1.0) → STARMAP qty 1
				// average = 0.3 + 0.3 = 0.6
				const result = ResourceCalculator._calculateMapFragments(['CRISTAL_FIELD'], {}, null, 40, 0);

				expect(result.average).toBeCloseTo(0.6, 3);
				// hasArtefact is set by the STARMAP fight reward → floor applies
				expect(result.optimist).toBeGreaterThanOrEqual(0.1);
			});
		});
	});
});
