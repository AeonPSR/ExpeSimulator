/**
 * DamageSpreader Tests
 * 
 * Tests for damage distribution logic across players.
 */

describe('DamageSpreader', () => {

	// Store originals for restoration
	let originalFilenameToId;
	let originalConstants;
	let originalEventDamageCalculator;
	let originalMathRandom;

	beforeAll(() => {
		// Save originals
		originalFilenameToId = global.filenameToId;
		originalConstants = global.Constants;
		originalEventDamageCalculator = global.EventDamageCalculator;
		originalMathRandom = Math.random;

		// Mock filenameToId
		global.filenameToId = jest.fn((filename) => {
			if (!filename) return '';
			return filename.replace(/\.(jpg|png)$/, '').toUpperCase();
		});

		// Mock Constants
		global.Constants = {
			SCENARIO_KEYS: ['pessimist', 'average', 'optimist']
		};

		// Mock EventDamageCalculator.EVENT_DAMAGES
		global.EventDamageCalculator = {
			EVENT_DAMAGES: {
				TIRED_2: { affectsAll: true, min: 2, max: 2 },
				DISASTER_3_5: { affectsAll: true, min: 3, max: 5 },
				ACCIDENT_3_5: { affectsAll: false, min: 3, max: 5 },
				ACCIDENT_ROPE_3_5: { affectsAll: false, min: 3, max: 5 }
			}
		};

		// Suppress console.log in tests
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterAll(() => {
		global.filenameToId = originalFilenameToId;
		global.Constants = originalConstants;
		global.EventDamageCalculator = originalEventDamageCalculator;
		Math.random = originalMathRandom;
		console.log.mockRestore();
	});

	beforeEach(() => {
		filenameToId.mockClear();
		Math.random = originalMathRandom;
	});

	// ========================================
	// distribute()
	// ========================================

	describe('distribute', () => {

		test('returns empty arrays for no players', () => {
			const result = DamageSpreader.distribute([], [], []);

			expect(result.totalDamage).toEqual([]);
			expect(result.breakdown).toEqual([]);
			expect(result.appliedEffects).toEqual([]);
		});

		test('handles null instances gracefully', () => {
			const players = [{ items: [] }];
			const result = DamageSpreader.distribute(null, null, players);

			expect(result.totalDamage).toEqual([0]);
			expect(result.breakdown).toEqual([[]]);
		});

		test('distributes fight instances', () => {
			// Mock random to always select player 0
			Math.random = () => 0;

			const players = [{ items: [] }, { items: [] }];
			const fightInstances = [
				{ sources: [{ eventType: 'FIGHT_6', sector: 'DESERT', damage: 3 }] }
			];

			const result = DamageSpreader.distribute(fightInstances, [], players);

			expect(result.totalDamage[0]).toBe(3);
			expect(result.totalDamage[1]).toBe(0);
		});

		test('distributes event instances', () => {
			// Mock random to always select player 1
			Math.random = () => 0.9;

			const players = [{ items: [] }, { items: [] }];
			const eventInstances = [
				{ sources: [{ eventType: 'ACCIDENT_3_5', sector: 'FOREST', damage: 4 }] }
			];

			const result = DamageSpreader.distribute([], eventInstances, players);

			expect(result.totalDamage[1]).toBe(4);
			expect(result.totalDamage[0]).toBe(0);
		});

		test('combines fight and event damage', () => {
			// Make random predictable
			let callCount = 0;
			Math.random = () => {
				callCount++;
				return 0; // Always player 0
			};

			const players = [{ items: [] }];
			const fightInstances = [
				{ sources: [{ eventType: 'FIGHT_6', sector: 'DESERT', damage: 2 }] }
			];
			const eventInstances = [
				{ sources: [{ eventType: 'TIRED_2', sector: 'FOREST', damage: 2 }] }
			];

			const result = DamageSpreader.distribute(fightInstances, eventInstances, players);

			// Fight: 2 damage, TIRED_2: 2 damage (affectsAll)
			expect(result.totalDamage[0]).toBe(4);
		});
	});

	// ========================================
	// distributeAllScenarios()
	// ========================================

	describe('distributeAllScenarios', () => {

		test('distributes for all scenarios', () => {
			const players = [{ items: [] }];
			const fightDamage = {
				pessimist: [{ sources: [{ eventType: 'FIGHT_6', sector: 'A', damage: 3 }] }],
				average: [{ sources: [{ eventType: 'FIGHT_6', sector: 'A', damage: 2 }] }],
				optimist: [{ sources: [{ eventType: 'FIGHT_6', sector: 'A', damage: 1 }] }]
			};

			const result = DamageSpreader.distributeAllScenarios(fightDamage, {}, players);

			expect(result.pessimist.totalDamage[0]).toBe(3);
			expect(result.average.totalDamage[0]).toBe(2);
			expect(result.optimist.totalDamage[0]).toBe(1);
		});

		test('handles missing scenario data', () => {
			const players = [{ items: [] }];
			const result = DamageSpreader.distributeAllScenarios({}, {}, players);

			expect(result.pessimist.totalDamage[0]).toBe(0);
		});
	});

	// ========================================
	// _distributeFightDamage()
	// ========================================

	describe('_distributeFightDamage', () => {

		test('distributes each damage point randomly', () => {
			// Simulate random: first 2 to player 0, last 1 to player 1
			const randomValues = [0.1, 0.2, 0.8];
			let callIndex = 0;
			Math.random = () => randomValues[callIndex++];

			const playerBreakdown = [[], []];
			const playerDamageTotals = [0, 0];
			const instance = { sources: [{ eventType: 'FIGHT_6', sector: 'TEST', damage: 3 }] };

			DamageSpreader._distributeFightDamage(instance, playerBreakdown, playerDamageTotals);

			expect(playerDamageTotals[0]).toBe(2);
			expect(playerDamageTotals[1]).toBe(1);
		});

		test('handles zero damage', () => {
			const playerBreakdown = [[]];
			const playerDamageTotals = [0];
			const instance = { sources: [{ eventType: 'FIGHT_6', sector: 'TEST', damage: 0 }] };

			DamageSpreader._distributeFightDamage(instance, playerBreakdown, playerDamageTotals);

			expect(playerDamageTotals[0]).toBe(0);
		});

		test('handles multiple sources in one instance', () => {
			Math.random = () => 0;

			const playerBreakdown = [[]];
			const playerDamageTotals = [0];
			const instance = {
				sources: [
					{ eventType: 'FIGHT_6', sector: 'A', damage: 2 },
					{ eventType: 'FIGHT_6', sector: 'B', damage: 3 }
				]
			};

			DamageSpreader._distributeFightDamage(instance, playerBreakdown, playerDamageTotals);

			expect(playerDamageTotals[0]).toBe(5);
			expect(playerBreakdown[0].length).toBe(5); // One entry per damage point
		});
	});

	// ========================================
	// _distributeEventDamage()
	// ========================================

	describe('_distributeEventDamage', () => {

		test('distributes affectsAll events to all players', () => {
			const playerBreakdown = [[], [], []];
			const playerDamageTotals = [0, 0, 0];
			const players = [{}, {}, {}];
			const appliedEffects = [[], [], []];
			const instance = {
				sources: [{ eventType: 'TIRED_2', sector: 'FOREST', damage: 6 }]
			};

			DamageSpreader._distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players, appliedEffects);

			// 6 total damage / 3 players = 2 each
			expect(playerDamageTotals).toEqual([2, 2, 2]);
		});

		test('distributes non-affectsAll events to one random player', () => {
			Math.random = () => 0; // Player 0

			const playerBreakdown = [[], []];
			const playerDamageTotals = [0, 0];
			const players = [{}, {}];
			const appliedEffects = [[], []];
			const instance = {
				sources: [{ eventType: 'ACCIDENT_3_5', sector: 'DESERT', damage: 4 }]
			};

			DamageSpreader._distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players, appliedEffects);

			expect(playerDamageTotals[0]).toBe(4);
			expect(playerDamageTotals[1]).toBe(0);
		});

		test('rope immunity prevents ACCIDENT_ROPE_3_5 damage', () => {
			Math.random = () => 0; // Player 0 (who has rope)

			const playerBreakdown = [[], []];
			const playerDamageTotals = [0, 0];
			const players = [
				{ items: ['rope.jpg'] },
				{ items: [] }
			];
			const appliedEffects = [[], []];
			const instance = {
				sources: [{ eventType: 'ACCIDENT_ROPE_3_5', sector: 'CLIFF', damage: 5 }]
			};

			DamageSpreader._distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players, appliedEffects);

			expect(playerDamageTotals[0]).toBe(0);
			expect(appliedEffects[0][0].type).toBe('ROPE');
			expect(appliedEffects[0][0].damagePrevented).toBe(5);
		});

		test('rope immunity does not apply to regular ACCIDENT_3_5', () => {
			Math.random = () => 0;

			const playerBreakdown = [[]];
			const playerDamageTotals = [0];
			const players = [{ items: ['rope.jpg'] }];
			const appliedEffects = [[]];
			const instance = {
				sources: [{ eventType: 'ACCIDENT_3_5', sector: 'DESERT', damage: 4 }]
			};

			DamageSpreader._distributeEventDamage(instance, playerBreakdown, playerDamageTotals, players, appliedEffects);

			expect(playerDamageTotals[0]).toBe(4);
		});
	});

	// ========================================
	// _playerHasRope()
	// ========================================

	describe('_playerHasRope', () => {

		test('returns true when player has rope', () => {
			const player = { items: ['rope.jpg'] };
			expect(DamageSpreader._playerHasRope(player)).toBe(true);
		});

		test('returns false when player has no rope', () => {
			const player = { items: ['blaster.jpg'] };
			expect(DamageSpreader._playerHasRope(player)).toBe(false);
		});

		test('returns false for null player', () => {
			expect(DamageSpreader._playerHasRope(null)).toBe(false);
		});

		test('returns false for null items', () => {
			const player = { items: null };
			expect(DamageSpreader._playerHasRope(player)).toBe(false);
		});
	});

	// ========================================
	// applyDamageReduction()
	// ========================================

	describe('applyDamageReduction', () => {

		test('reduces damage by 1 from first instance of each source', () => {
			const players = [{ hasEffect: true }];
			const damageBreakdown = [[
				{ type: 'FIGHT_6', source: 'A', damage: 3 },
				{ type: 'FIGHT_6', source: 'A', damage: 2 },
				{ type: 'FIGHT_6', source: 'B', damage: 3 }
			]];
			const hasEffectFn = (player) => player.hasEffect;

			const result = DamageSpreader.applyDamageReduction(players, damageBreakdown, hasEffectFn);

			// First A: 3-1=2, Second A: unchanged 2, First B: 3-1=2
			expect(result[0][0].damage).toBe(2);
			expect(result[0][1].damage).toBe(2);
			expect(result[0][2].damage).toBe(2);
		});

		test('does not reduce for players without effect', () => {
			const players = [{ hasEffect: false }];
			const damageBreakdown = [[
				{ type: 'FIGHT_6', source: 'A', damage: 3 }
			]];

			const result = DamageSpreader.applyDamageReduction(players, damageBreakdown, (p) => p.hasEffect);

			expect(result[0][0].damage).toBe(3);
		});

		test('filters by event type when eventFilter provided', () => {
			const players = [{ hasEffect: true }];
			const damageBreakdown = [[
				{ type: 'FIGHT_6', source: 'A', damage: 3 },
				{ type: 'TIRED_2', source: 'A', damage: 2 }
			]];
			const eventFilter = (inst) => inst.type.startsWith('FIGHT_');

			const result = DamageSpreader.applyDamageReduction(
				players, damageBreakdown, (p) => p.hasEffect, eventFilter
			);

			expect(result[0][0].damage).toBe(2); // FIGHT reduced
			expect(result[0][1].damage).toBe(2); // TIRED unchanged
		});

		test('removes instances reduced to 0 damage', () => {
			const players = [{ hasEffect: true }];
			const damageBreakdown = [[
				{ type: 'FIGHT_6', source: 'A', damage: 1 }
			]];

			const result = DamageSpreader.applyDamageReduction(players, damageBreakdown, () => true);

			expect(result[0].length).toBe(0);
		});
	});

	// ========================================
	// applySurvivalReduction()
	// ========================================

	describe('applySurvivalReduction', () => {

		test('reduces damage for player with Survival ability', () => {
			const players = [{ abilities: ['survival.jpg'] }];
			const damageBreakdown = [[
				{ type: 'FIGHT_6', source: 'A', damage: 3 }
			]];

			const result = DamageSpreader.applySurvivalReduction(players, damageBreakdown);

			expect(result[0][0].damage).toBe(2);
		});

		test('does not reduce for player without Survival', () => {
			const players = [{ abilities: ['technician.jpg'] }];
			const damageBreakdown = [[
				{ type: 'FIGHT_6', source: 'A', damage: 3 }
			]];

			const result = DamageSpreader.applySurvivalReduction(players, damageBreakdown);

			expect(result[0][0].damage).toBe(3);
		});
	});

	// ========================================
	// applyArmorReduction()
	// ========================================

	describe('applyArmorReduction', () => {

		test('reduces FIGHT damage for player with armor', () => {
			const players = [{ items: ['plastenite_armor.jpg'] }];
			const damageBreakdown = [[
				{ type: 'FIGHT_6', source: 'A', damage: 3 }
			]];

			const result = DamageSpreader.applyArmorReduction(players, damageBreakdown);

			expect(result[0][0].damage).toBe(2);
		});

		test('does not reduce non-FIGHT damage', () => {
			const players = [{ items: ['plastenite_armor.jpg'] }];
			const damageBreakdown = [[
				{ type: 'ACCIDENT_3_5', source: 'A', damage: 3 }
			]];

			const result = DamageSpreader.applyArmorReduction(players, damageBreakdown);

			expect(result[0][0].damage).toBe(3);
		});
	});

	// ========================================
	// calculateFinalHealth()
	// ========================================

	describe('calculateFinalHealth', () => {

		test('subtracts damage from player health', () => {
			const players = [
				{ health: 10 },
				{ health: 8 }
			];
			const damagePerPlayer = [3, 5];

			const result = DamageSpreader.calculateFinalHealth(players, damagePerPlayer);

			expect(result).toEqual([7, 3]);
		});

		test('does not go below 0', () => {
			const players = [{ health: 5 }];
			const damagePerPlayer = [10];

			const result = DamageSpreader.calculateFinalHealth(players, damagePerPlayer);

			expect(result[0]).toBe(0);
		});

		test('handles undefined damage', () => {
			const players = [{ health: 10 }];
			const damagePerPlayer = [];

			const result = DamageSpreader.calculateFinalHealth(players, damagePerPlayer);

			expect(result[0]).toBe(10);
		});
	});

	// ========================================
	// calculateAllFinalHealth()
	// ========================================

	describe('calculateAllFinalHealth', () => {

		test('calculates final health for all scenarios', () => {
			const players = [{ health: 10 }];
			const damageByScenario = {
				pessimist: [5],
				average: [3],
				optimist: [1]
			};

			const result = DamageSpreader.calculateAllFinalHealth(players, damageByScenario);

			expect(result.pessimist[0]).toBe(5);
			expect(result.average[0]).toBe(7);
			expect(result.optimist[0]).toBe(9);
		});
	});
});
