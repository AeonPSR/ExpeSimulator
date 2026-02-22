/**
 * EventWeightCalculator Tests
 * 
 * Tests for event probability calculations and weight modifications.
 */

describe('EventWeightCalculator', () => {

	// Store originals for restoration
	let originalPlanetSectorConfigData;
	let originalModifierApplicator;
	let originalSectorSampler;
	let originalResourceCalculator;
	let originalNegativeEventCalculator;
	let originalFightCalculator;
	let originalEventDamageCalculator;
	let originalDamageComparator;
	let originalFightingPowerService;
	let originalDistributionCalculator;

	beforeAll(() => {
		// Save originals
		originalPlanetSectorConfigData = global.PlanetSectorConfigData;
		originalModifierApplicator = global.ModifierApplicator;
		originalSectorSampler = global.SectorSampler;
		originalResourceCalculator = global.ResourceCalculator;
		originalNegativeEventCalculator = global.NegativeEventCalculator;
		originalFightCalculator = global.FightCalculator;
		originalEventDamageCalculator = global.EventDamageCalculator;
		originalDamageComparator = global.DamageComparator;
		originalFightingPowerService = global.FightingPowerService;
		originalDistributionCalculator = global.DistributionCalculator;

		// Mock PlanetSectorConfigData
		global.PlanetSectorConfigData = [
			{
				name: 'FOREST_default',
				sectorName: 'FOREST',
				explorationEvents: {
					NOTHING: 40,
					FRUIT: 20,
					FIGHT_12: 15,
					STEAK: 10,
					TIRED_2: 15
				}
			},
			{
				name: 'DESERT_default',
				sectorName: 'DESERT',
				explorationEvents: {
					NOTHING: 50,
					FIGHT_8: 20,
					TIRED_2: 30
				}
			},
			{
				name: 'HYDROCARBON_default',
				sectorName: 'HYDROCARBON',
				explorationEvents: {
					NOTHING: 30,
					FUEL: 50,
					FIGHT_16: 20
				}
			}
		];

		// Mock ModifierApplicator
		global.ModifierApplicator = {
			apply: jest.fn((config, sectorName, loadout) => {
				// Return modified config if abilities present
				if (loadout.abilities?.includes('survivalist')) {
					const modified = JSON.parse(JSON.stringify(config));
					if (modified.explorationEvents.FRUIT) {
						modified.explorationEvents.FRUIT *= 2;
					}
					return modified;
				}
				return config;
			})
		};

		// Mock SectorSampler
		global.SectorSampler = {
			generateWeightedCompositions: jest.fn((sectorCounts, movementSpeed) => [
				{ composition: { FOREST: 1, DESERT: 1 }, probability: 0.5 },
				{ composition: { FOREST: 2 }, probability: 0.5 }
			]),
			expandComposition: jest.fn(composition => {
				const result = [];
				for (const [type, count] of Object.entries(composition)) {
					for (let i = 0; i < count; i++) {
						result.push(type);
					}
				}
				return result;
			})
		};

		// Mock ResourceCalculator
		global.ResourceCalculator = {
			calculate: jest.fn(() => ({
				fruits: { pessimist: 0, average: 1, optimist: 2, distribution: new Map([[0, 0.3], [1, 0.4], [2, 0.3]]) },
				steaks: { pessimist: 0, average: 0, optimist: 1, distribution: new Map([[0, 0.8], [1, 0.2]]) },
				fuel: { pessimist: 0, average: 0, optimist: 0, distribution: new Map([[0, 1]]) },
				oxygen: { pessimist: 0, average: 0, optimist: 0, distribution: new Map([[0, 1]]) },
				artefacts: { pessimist: 0, average: 0, optimist: 0, distribution: new Map([[0, 1]]) },
				mapFragments: { pessimist: 0, average: 0, optimist: 0, distribution: new Map([[0, 1]]) }
			}))
		};

		// Mock NegativeEventCalculator
		global.NegativeEventCalculator = {
			calculate: jest.fn(() => ({
				tired: { pessimist: 0, average: 0.5, optimist: 1 },
				hurt: { pessimist: 0, average: 0, optimist: 0 },
				sick: { pessimist: 0, average: 0, optimist: 0 }
			}))
		};

		// Mock EventDamageCalculator
		global.EventDamageCalculator = {
			calculate: jest.fn(() => ({
				totalDamage: { pessimist: 0, average: 2, optimist: 4 }
			})),
			EVENT_DAMAGES: {
				TIRED_2: 2,
				HURT_2: 2,
				HURT_4: 4
			}
		};

		// Mock DamageComparator
		global.DamageComparator = {
			evaluateExpedition: jest.fn(() => ({
				sectorEvaluations: [],
				sectorResults: [],
				fightExclusions: new Set(),
				eventExclusions: new Set()
			}))
		};

		// Mock FightingPowerService
		global.FightingPowerService = {
			calculateBaseFightingPower: jest.fn(() => 10),
			countGrenades: jest.fn(() => 0)
		};

		// Mock FightCalculator
		global.FightCalculator = {
			calculate: jest.fn(() => ({
				totalFights: { pessimist: 0, average: 0.5, optimist: 1 },
				totalDamage: { pessimist: 0, average: 4, optimist: 12 }
			}))
		};

		// Keep real DistributionCalculator for mixing operations
		// (it's already loaded)
	});

	afterAll(() => {
		// Restore originals
		global.PlanetSectorConfigData = originalPlanetSectorConfigData;
		global.ModifierApplicator = originalModifierApplicator;
		global.SectorSampler = originalSectorSampler;
		global.ResourceCalculator = originalResourceCalculator;
		global.NegativeEventCalculator = originalNegativeEventCalculator;
		global.FightCalculator = originalFightCalculator;
		global.EventDamageCalculator = originalEventDamageCalculator;
		global.DamageComparator = originalDamageComparator;
		global.FightingPowerService = originalFightingPowerService;
		global.DistributionCalculator = originalDistributionCalculator;
	});

	beforeEach(() => {
		// Clear mock call history
		jest.clearAllMocks();
	});

	// ========================================
	// calculateProbabilities()
	// ========================================

	describe('calculateProbabilities', () => {

		test('calculateProbabilities normalizes weights to probabilities', () => {
			// FOREST: NOTHING=40, FRUIT=20, FIGHT_12=15, STEAK=10, TIRED_2=15
			// Total = 100
			const config = PlanetSectorConfigData.find(s => s.sectorName === 'FOREST');
			const probs = EventWeightCalculator.calculateProbabilities(config);

			expect(probs.get('NOTHING')).toBeCloseTo(0.40, 10);
			expect(probs.get('FRUIT')).toBeCloseTo(0.20, 10);
			expect(probs.get('FIGHT_12')).toBeCloseTo(0.15, 10);
			expect(probs.get('STEAK')).toBeCloseTo(0.10, 10);
			expect(probs.get('TIRED_2')).toBeCloseTo(0.15, 10);
		});

		test('calculateProbabilities sums to 1.0', () => {
			const config = PlanetSectorConfigData.find(s => s.sectorName === 'DESERT');
			const probs = EventWeightCalculator.calculateProbabilities(config);

			const sum = Array.from(probs.values()).reduce((a, b) => a + b, 0);
			expect(sum).toBeCloseTo(1.0, 10);
		});

		test('calculateProbabilities handles null config', () => {
			const probs = EventWeightCalculator.calculateProbabilities(null);
			expect(probs.size).toBe(0);
		});

		test('calculateProbabilities handles missing explorationEvents', () => {
			const probs = EventWeightCalculator.calculateProbabilities({});
			expect(probs.size).toBe(0);
		});

		test('calculateProbabilities handles zero total weight', () => {
			const config = { explorationEvents: { EVENT_A: 0, EVENT_B: 0 } };
			const probs = EventWeightCalculator.calculateProbabilities(config);
			expect(probs.size).toBe(0);
		});

	});

	// ========================================
	// getSectorConfig()
	// ========================================

	describe('getSectorConfig', () => {

		test('getSectorConfig finds sector by name', () => {
			const config = EventWeightCalculator.getSectorConfig('FOREST');
			expect(config).not.toBeNull();
			expect(config.sectorName).toBe('FOREST');
		});

		test('getSectorConfig returns null for unknown sector', () => {
			const config = EventWeightCalculator.getSectorConfig('UNKNOWN_SECTOR');
			expect(config).toBeNull();
		});

	});

	// ========================================
	// getModifiedProbabilities()
	// ========================================

	describe('getModifiedProbabilities', () => {

		test('getModifiedProbabilities returns base probabilities without loadout', () => {
			const probs = EventWeightCalculator.getModifiedProbabilities('FOREST');
			expect(probs.get('FRUIT')).toBeCloseTo(0.20, 10);
		});

		test('getModifiedProbabilities applies modifiers from loadout', () => {
			const loadout = { abilities: ['survivalist'] };
			const probs = EventWeightCalculator.getModifiedProbabilities('FOREST', loadout);

			// ModifierApplicator doubles FRUIT weight: 20 → 40
			// New total: 40 + 40 + 15 + 10 + 15 = 120
			// FRUIT probability: 40/120 = 1/3
			expect(probs.get('FRUIT')).toBeCloseTo(1/3, 10);
			expect(ModifierApplicator.apply).toHaveBeenCalled();
		});

		test('getModifiedProbabilities returns empty map for unknown sector', () => {
			const probs = EventWeightCalculator.getModifiedProbabilities('UNKNOWN');
			expect(probs.size).toBe(0);
		});

	});

	// ========================================
	// getSectorProbabilities()
	// ========================================

	describe('getSectorProbabilities', () => {

		test('getSectorProbabilities uses cache when available', () => {
			const cache = new Map();
			const cachedProbs = new Map([['CACHED_EVENT', 1.0]]);
			cache.set('FOREST', cachedProbs);

			const result = EventWeightCalculator.getSectorProbabilities('FOREST', {}, cache);

			expect(result).toBe(cachedProbs);
			expect(result.get('CACHED_EVENT')).toBe(1.0);
		});

		test('getSectorProbabilities computes when cache miss', () => {
			const cache = new Map(); // Empty cache

			const result = EventWeightCalculator.getSectorProbabilities('FOREST', {}, cache);

			// Should compute and return probabilities
			expect(result.get('NOTHING')).toBeCloseTo(0.40, 10);
		});

		test('getSectorProbabilities computes when no cache provided', () => {
			const result = EventWeightCalculator.getSectorProbabilities('FOREST', {});
			expect(result.get('NOTHING')).toBeCloseTo(0.40, 10);
		});

	});

	// ========================================
	// calculate()
	// ========================================

	describe('calculate', () => {

		test('calculate returns null for empty sectors', () => {
			const result = EventWeightCalculator.calculate([]);
			expect(result).toBeNull();
		});

		test('calculate returns results object with all sections', () => {
			const sectors = ['FOREST', 'DESERT'];
			const result = EventWeightCalculator.calculate(sectors);

			expect(result).toHaveProperty('resources');
			expect(result).toHaveProperty('negativeEvents');
			expect(ResourceCalculator.calculate).toHaveBeenCalled();
			expect(NegativeEventCalculator.calculate).toHaveBeenCalled();
		});

		test('calculate builds sector counts correctly', () => {
			const sectors = ['FOREST', 'FOREST', 'DESERT'];
			EventWeightCalculator.calculate(sectors);

			// Check that ResourceCalculator received correct sectors
			const callArgs = ResourceCalculator.calculate.mock.calls[0];
			expect(callArgs[0]).toEqual(['FOREST', 'FOREST', 'DESERT']);
		});

	});

	// ========================================
	// calculateWithSampling()
	// ========================================

	describe('calculateWithSampling', () => {

		test('calculateWithSampling bypasses sampling when movementSpeed >= totalSectors', () => {
			const sectorCounts = { FOREST: 2, DESERT: 1 };
			const movementSpeed = 5; // More than 3 total sectors

			EventWeightCalculator.calculateWithSampling(sectorCounts, movementSpeed);

			// Should not call SectorSampler
			expect(SectorSampler.generateWeightedCompositions).not.toHaveBeenCalled();
		});

		test('calculateWithSampling uses sampling when movementSpeed < totalSectors', () => {
			const sectorCounts = { FOREST: 2, DESERT: 2 };
			const movementSpeed = 2;

			EventWeightCalculator.calculateWithSampling(sectorCounts, movementSpeed);

			expect(SectorSampler.generateWeightedCompositions).toHaveBeenCalledWith(
				sectorCounts, movementSpeed, expect.any(Object)
			);
		});

		test('calculateWithSampling includes alwaysInclude sectors', () => {
			const sectorCounts = { FOREST: 2 };
			const movementSpeed = 5; // No sampling needed

			EventWeightCalculator.calculateWithSampling(
				sectorCounts, movementSpeed, {}, [],
				{ alwaysInclude: ['LANDING'] }
			);

			// LANDING should be in the sectors passed to calculate
			const callArgs = ResourceCalculator.calculate.mock.calls[0];
			expect(callArgs[0]).toContain('LANDING');
		});

		test('calculateWithSampling returns null for empty compositions', () => {
			// Mock empty compositions
			SectorSampler.generateWeightedCompositions.mockReturnValueOnce([]);

			const sectorCounts = { FOREST: 2 };
			const movementSpeed = 1;

			const result = EventWeightCalculator.calculateWithSampling(sectorCounts, movementSpeed);

			expect(result).toBeNull();
		});

		test('calculateWithSampling includes sampling metadata', () => {
			const sectorCounts = { FOREST: 2, DESERT: 2 };
			const movementSpeed = 2;

			const result = EventWeightCalculator.calculateWithSampling(sectorCounts, movementSpeed);

			expect(result._sampling).toBeDefined();
			expect(result._sampling.enabled).toBe(true);
			expect(result._sampling.compositionCount).toBe(2);
		});

	});

});
