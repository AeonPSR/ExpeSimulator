/**
 * EventDamageCalculator Tests
 * 
 * Tests for event damage calculations using convolution.
 * Event types: TIRED_2, ACCIDENT_3_5, ACCIDENT_ROPE_3_5, DISASTER_3_5
 */

describe('EventDamageCalculator', () => {

	// Store originals for restoration
	let originalOccurrenceCalculator;
	let originalDamageDistributionEngine;

	beforeAll(() => {
		// Save originals
		originalOccurrenceCalculator = global.OccurrenceCalculator;
		originalDamageDistributionEngine = global.DamageDistributionEngine;

		// Mock OccurrenceCalculator
		global.OccurrenceCalculator = {
			calculateForType: jest.fn((sectors, loadout, eventType, cache) => ({
				occurrence: {
					pessimist: 1,
					average: 0.3,
					optimist: 0,
					distribution: new Map([[0, 0.7], [1, 0.3]])
				},
				sectors: [{ sectorName: sectors[0], probability: 0.3, index: 0 }]
			}))
		};

		// Mock DamageDistributionEngine
		global.DamageDistributionEngine = {
			calculate: jest.fn((config) => ({
				damage: {
					pessimist: 8,
					average: 4,
					optimist: 0,
					worstCase: 10,
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
				damageDistribution: new Map([[0, 0.5], [8, 0.5]]),
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
	});

	afterAll(() => {
		global.OccurrenceCalculator = originalOccurrenceCalculator;
		global.DamageDistributionEngine = originalDamageDistributionEngine;
	});

	beforeEach(() => {
		OccurrenceCalculator.calculateForType.mockClear();
		DamageDistributionEngine.calculate.mockClear();
	});

	// ========================================
	// EVENT_DAMAGES configuration
	// ========================================

	describe('EVENT_DAMAGES', () => {

		test('defines TIRED_2 event', () => {
			const tired = EventDamageCalculator.EVENT_DAMAGES['TIRED_2'];
			expect(tired.min).toBe(2);
			expect(tired.max).toBe(2);
			expect(tired.affectsAll).toBe(true);
			expect(tired.displayName).toBe('Fatigue');
		});

		test('defines ACCIDENT_3_5 event', () => {
			const accident = EventDamageCalculator.EVENT_DAMAGES['ACCIDENT_3_5'];
			expect(accident.min).toBe(3);
			expect(accident.max).toBe(5);
			expect(accident.affectsAll).toBe(false);
			expect(accident.displayName).toBe('Accident');
		});

		test('defines ACCIDENT_ROPE_3_5 event', () => {
			const ropeAccident = EventDamageCalculator.EVENT_DAMAGES['ACCIDENT_ROPE_3_5'];
			expect(ropeAccident.min).toBe(3);
			expect(ropeAccident.max).toBe(5);
			expect(ropeAccident.ropeImmune).toBe(true);
			expect(ropeAccident.displayName).toBe('Accident (rope)');
		});

		test('defines DISASTER_3_5 event', () => {
			const disaster = EventDamageCalculator.EVENT_DAMAGES['DISASTER_3_5'];
			expect(disaster.min).toBe(3);
			expect(disaster.max).toBe(5);
			expect(disaster.affectsAll).toBe(true);
			expect(disaster.displayName).toBe('Disaster');
		});

		test('all events have getDamageDistribution function', () => {
			for (const [key, config] of Object.entries(EventDamageCalculator.EVENT_DAMAGES)) {
				expect(typeof config.getDamageDistribution).toBe('function');
			}
		});
	});

	// ========================================
	// getDamageDistribution()
	// ========================================

	describe('EVENT_DAMAGES.getDamageDistribution', () => {

		test('TIRED_2 returns fixed damage × playerCount', () => {
			const tired = EventDamageCalculator.EVENT_DAMAGES['TIRED_2'];
			const dist = tired.getDamageDistribution(3);  // 3 players

			// 2 damage × 3 players = 6
			expect(dist.get(6)).toBe(1);
			expect(dist.size).toBe(1);
		});

		test('ACCIDENT_3_5 returns variable damage distribution', () => {
			const accident = EventDamageCalculator.EVENT_DAMAGES['ACCIDENT_3_5'];
			const dist = accident.getDamageDistribution(3);  // 3 players

			// Affects one player, so 3, 4, or 5 damage
			expect(dist.get(3)).toBeCloseTo(1/3, 10);
			expect(dist.get(4)).toBeCloseTo(1/3, 10);
			expect(dist.get(5)).toBeCloseTo(1/3, 10);
		});

		test('DISASTER_3_5 multiplies damage by playerCount', () => {
			const disaster = EventDamageCalculator.EVENT_DAMAGES['DISASTER_3_5'];
			const dist = disaster.getDamageDistribution(2);  // 2 players

			// 3-5 damage × 2 players = 6, 8, or 10
			expect(dist.get(6)).toBeCloseTo(1/3, 10);
			expect(dist.get(8)).toBeCloseTo(1/3, 10);
			expect(dist.get(10)).toBeCloseTo(1/3, 10);
		});
	});

	// ========================================
	// calculate()
	// ========================================

	describe('calculate', () => {

		test('returns empty result for null sectors', () => {
			const result = EventDamageCalculator.calculate(null);

			expect(result.occurrence).toEqual({});
			expect(result.playerCount).toBe(0);
		});

		test('returns empty result for empty sectors array', () => {
			const result = EventDamageCalculator.calculate([]);

			expect(result.occurrence).toEqual({});
		});

		test('returns all expected fields', () => {
			const sectors = ['SECTOR_A'];
			const players = [{}, {}];
			const result = EventDamageCalculator.calculate(sectors, {}, players);

			expect(result).toHaveProperty('occurrence');
			expect(result).toHaveProperty('damage');
			expect(result).toHaveProperty('damageInstances');
			expect(result).toHaveProperty('damageDistribution');
			expect(result).toHaveProperty('playerCount');
		});

		test('calculates occurrence for each event type', () => {
			const sectors = ['SECTOR_A'];
			EventDamageCalculator.calculate(sectors);

			// Should call OccurrenceCalculator for each event type
			const eventTypes = Object.keys(EventDamageCalculator.EVENT_DAMAGES);
			expect(OccurrenceCalculator.calculateForType).toHaveBeenCalledTimes(eventTypes.length);
		});

		test('calls DamageDistributionEngine.calculate', () => {
			const sectors = ['SECTOR_A'];
			EventDamageCalculator.calculate(sectors);

			expect(DamageDistributionEngine.calculate).toHaveBeenCalledTimes(1);
		});

		test('includes legacy fields for backward compatibility', () => {
			const sectors = ['SECTOR_A'];
			const result = EventDamageCalculator.calculate(sectors);

			expect(result).toHaveProperty('tired');
			expect(result).toHaveProperty('accident');
			expect(result).toHaveProperty('disaster');
		});

		test('passes worstCaseExclusions to engine', () => {
			const sectors = ['SECTOR_A'];
			const exclusions = new Set(['SECTOR_A']);
			EventDamageCalculator.calculate(sectors, {}, [], exclusions);

			const config = DamageDistributionEngine.calculate.mock.calls[0][0];
			expect(config.worstCaseExclusions).toBe(exclusions);
		});

		test('passes playerCount through result', () => {
			const sectors = ['SECTOR_A'];
			const players = [{}, {}, {}];  // 3 players
			const result = EventDamageCalculator.calculate(sectors, {}, players);

			expect(result.playerCount).toBe(3);
		});
	});

	// ========================================
	// _emptyResult()
	// ========================================

	describe('_emptyResult', () => {

		test('returns empty occurrence object', () => {
			const result = EventDamageCalculator._emptyResult();

			expect(result.occurrence).toEqual({});
		});

		test('returns zeroed legacy fields', () => {
			const result = EventDamageCalculator._emptyResult();

			expect(result.tired).toBe(0);
			expect(result.accident).toBe(0);
			expect(result.disaster).toBe(0);
			expect(result.playerCount).toBe(0);
		});

		test('calls DamageDistributionEngine.emptyDamageResult', () => {
			EventDamageCalculator._emptyResult();

			expect(DamageDistributionEngine.emptyDamageResult).toHaveBeenCalled();
		});

		test('calls DamageDistributionEngine.emptyDamageInstances', () => {
			EventDamageCalculator._emptyResult();

			expect(DamageDistributionEngine.emptyDamageInstances).toHaveBeenCalled();
		});
	});
});
