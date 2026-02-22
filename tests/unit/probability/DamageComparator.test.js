/**
 * DamageComparator Tests
 * 
 * Tests for comparing damage events to determine worst-case scenarios.
 * Handles mutual exclusivity of FIGHT vs damage events per sector.
 */

describe('DamageComparator', () => {

	// Store originals
	let originalFightCalculator;
	let originalEventDamageCalculator;
	let originalEventWeightCalculator;
	let originalFightingPowerService;

	beforeAll(() => {
		// Save originals
		originalFightCalculator = global.FightCalculator;
		originalEventDamageCalculator = global.EventDamageCalculator;
		originalEventWeightCalculator = global.EventWeightCalculator;
		originalFightingPowerService = global.FightingPowerService;

		// Mock FightCalculator.FIGHT_DAMAGES
		global.FightCalculator = {
			FIGHT_DAMAGES: {
				'8': { fixed: 8 },
				'10': { fixed: 10 },
				'12': { fixed: 12 },
				'16': { fixed: 16 },
				'8_10_12_15_18_32': { variable: true, values: [8, 10, 12, 15, 18, 32], max: 32 }
			}
		};

		// Mock EventDamageCalculator.EVENT_DAMAGES
		global.EventDamageCalculator = {
			EVENT_DAMAGES: {
				'TIRED_2': { min: 2, max: 2, affectsAll: true },
				'ACCIDENT_3_5': { min: 3, max: 5, affectsAll: false },
				'DISASTER_3_5': { min: 3, max: 5, affectsAll: true },
				'HURT_2': { min: 2, max: 2, affectsAll: false },
				'HURT_4': { min: 4, max: 4, affectsAll: false }
			}
		};

		// Mock EventWeightCalculator.getSectorProbabilities
		global.EventWeightCalculator = {
			getSectorProbabilities: jest.fn((sectorName, loadout, cache) => {
				switch (sectorName) {
					case 'FOREST':
						return new Map([
							['FIGHT_12', 0.3],
							['NOTHING', 0.7]
						]);
					case 'INSECT':
						// Mixed: both fight and accident possible
						return new Map([
							['FIGHT_10', 0.4],
							['ACCIDENT_3_5', 0.3],
							['NOTHING', 0.3]
						]);
					case 'PREDATOR':
						return new Map([
							['FIGHT_16', 0.5],
							['ACCIDENT_3_5', 0.2],
							['NOTHING', 0.3]
						]);
					case 'COLD':
						return new Map([
							['TIRED_2', 0.4],
							['DISASTER_3_5', 0.2],
							['NOTHING', 0.4]
						]);
					case 'SAFE':
						return new Map([['NOTHING', 1.0]]);
					default:
						return new Map([['NOTHING', 1.0]]);
				}
			})
		};

		// Mock FightingPowerService
		global.FightingPowerService = {
			getGrenadePower: jest.fn(() => 4)  // Grenade adds 4 FP
		};
	});

	afterAll(() => {
		global.FightCalculator = originalFightCalculator;
		global.EventDamageCalculator = originalEventDamageCalculator;
		global.EventWeightCalculator = originalEventWeightCalculator;
		global.FightingPowerService = originalFightingPowerService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	// ========================================
	// _getBaseFightDamage()
	// ========================================

	describe('_getBaseFightDamage', () => {

		test('_getBaseFightDamage returns fixed damage', () => {
			const damage = DamageComparator._getBaseFightDamage('12');
			expect(damage).toBe(12);
		});

		test('_getBaseFightDamage returns max for variable fights', () => {
			const damage = DamageComparator._getBaseFightDamage('8_10_12_15_18_32');
			expect(damage).toBe(32);
		});

		test('_getBaseFightDamage parses unknown fight types', () => {
			const damage = DamageComparator._getBaseFightDamage('20');
			expect(damage).toBe(20);
		});

	});

	// ========================================
	// _scoreFightEvent()
	// ========================================

	describe('_scoreFightEvent', () => {

		test('_scoreFightEvent calculates net damage after fighting power', () => {
			// FIGHT_12 with FP=10 → 2 damage
			const result = DamageComparator._scoreFightEvent('FIGHT_12', 2, 10, 0);

			expect(result.totalDamage).toBe(2);
			expect(result.grenadesUsed).toBe(0);
		});

		test('_scoreFightEvent uses grenade when it reduces damage', () => {
			// FIGHT_12 with FP=6 → 6 damage
			// With grenade (FP=6+4=10) → 2 damage
			const result = DamageComparator._scoreFightEvent('FIGHT_12', 2, 6, 1);

			expect(result.totalDamage).toBe(2);
			expect(result.grenadesUsed).toBe(1);
		});

		test('_scoreFightEvent does not use grenade when unnecessary', () => {
			// FIGHT_12 with FP=12 → 0 damage (grenade won't help)
			const result = DamageComparator._scoreFightEvent('FIGHT_12', 2, 12, 1);

			expect(result.totalDamage).toBe(0);
			expect(result.grenadesUsed).toBe(0);
		});

		test('_scoreFightEvent calculates max damage to one player', () => {
			// 10 damage, 2 players → max 5 per player
			const result = DamageComparator._scoreFightEvent('FIGHT_12', 2, 2, 0);

			expect(result.totalDamage).toBe(10);
			expect(result.maxDamageToOne).toBe(5);
		});

		test('_scoreFightEvent uses ceiling for odd damage splits', () => {
			// 10 damage, 3 players → ceil(10/3) = 4 max per player
			const result = DamageComparator._scoreFightEvent('FIGHT_12', 3, 2, 0);

			expect(result.totalDamage).toBe(10);
			expect(result.maxDamageToOne).toBe(4);
		});

	});

	// ========================================
	// _scoreDamageEvent()
	// ========================================

	describe('_scoreDamageEvent', () => {

		test('_scoreDamageEvent handles affectsAll=true events', () => {
			// TIRED_2: 2 damage to ALL players
			const result = DamageComparator._scoreDamageEvent('TIRED_2', 3);

			expect(result.totalDamage).toBe(6);  // 2 × 3 players
			expect(result.maxDamageToOne).toBe(2);
		});

		test('_scoreDamageEvent handles affectsAll=false events', () => {
			// ACCIDENT_3_5: max 5 damage to ONE player
			const result = DamageComparator._scoreDamageEvent('ACCIDENT_3_5', 3);

			expect(result.totalDamage).toBe(5);  // 5 to one player
			expect(result.maxDamageToOne).toBe(5);
		});

		test('_scoreDamageEvent uses max damage for variable events', () => {
			// DISASTER_3_5: uses max=5, affects all
			const result = DamageComparator._scoreDamageEvent('DISASTER_3_5', 2);

			expect(result.totalDamage).toBe(10);  // 5 × 2 players
			expect(result.maxDamageToOne).toBe(5);
		});

		test('_scoreDamageEvent returns zero for unknown event', () => {
			const result = DamageComparator._scoreDamageEvent('UNKNOWN_EVENT', 2);

			expect(result.score).toBe(0);
			expect(result.totalDamage).toBe(0);
		});

	});

	// ========================================
	// getWorstEvent()
	// ========================================

	describe('getWorstEvent', () => {

		test('getWorstEvent returns fight when only fight present', () => {
			const result = DamageComparator.getWorstEvent('FOREST', {}, 2, 2, 0);

			expect(result.worstEvent).toBe('FIGHT_12');
			expect(result.eventType).toBe('fight');
		});

		test('getWorstEvent returns null for safe sector', () => {
			const result = DamageComparator.getWorstEvent('SAFE', {}, 2, 10, 0);

			expect(result.worstEvent).toBeNull();
			expect(result.score).toBe(0);
		});

		test('getWorstEvent compares fight vs event damage', () => {
			// INSECT: FIGHT_10 vs ACCIDENT_3_5
			// With low FP, fight is worse
			const result = DamageComparator.getWorstEvent('INSECT', {}, 2, 2, 0);

			// FIGHT_10 with FP=2 → 8 damage total
			// ACCIDENT_3_5 → max 5 damage to one player
			// Fight score = 8*100 + 4*10 = 840
			// Accident score = 5*100 + 5*10 = 550
			expect(result.eventType).toBe('fight');
		});

		test('getWorstEvent tracks grenade usage', () => {
			// FIGHT_12 with FP=6, grenade available
			const result = DamageComparator.getWorstEvent('FOREST', {}, 2, 6, 1);

			expect(result.grenadesUsed).toBe(1);
		});

	});

	// ========================================
	// evaluateExpedition()
	// ========================================

	describe('evaluateExpedition', () => {

		test('evaluateExpedition returns results for all sectors', () => {
			const sectors = ['FOREST', 'INSECT', 'SAFE'];
			const result = DamageComparator.evaluateExpedition(
				sectors, {}, 2, 10, 2, null
			);

			expect(result.sectorResults.size).toBe(3);
			expect(result.sectorResults.has('FOREST')).toBe(true);
			expect(result.sectorResults.has('INSECT')).toBe(true);
			expect(result.sectorResults.has('SAFE')).toBe(true);
		});

		test('evaluateExpedition tracks total grenade usage', () => {
			// Two fight sectors
			const sectors = ['FOREST', 'PREDATOR'];
			const result = DamageComparator.evaluateExpedition(
				sectors, {}, 2, 6, 2, null
			);

			// Should use grenades on both if they help
			expect(result.grenadesUsed).toBeGreaterThanOrEqual(0);
			expect(result.grenadesRemaining).toBeLessThanOrEqual(2);
			expect(result.grenadesUsed + result.grenadesRemaining).toBe(2);
		});

		test('evaluateExpedition prioritizes highest damage fights for grenades', () => {
			// PREDATOR (FIGHT_16) vs FOREST (FIGHT_12)
			// Should use grenade on PREDATOR first
			const sectors = ['FOREST', 'PREDATOR'];
			const result = DamageComparator.evaluateExpedition(
				sectors, {}, 2, 6, 1, null  // Only 1 grenade
			);

			// PREDATOR should get the grenade (higher damage)
			const predatorResult = result.sectorResults.get('PREDATOR');
			expect(predatorResult.grenadesUsed).toBe(1);
		});

	});

});
