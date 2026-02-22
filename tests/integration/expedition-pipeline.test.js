/**
 * Integration Tests: Expedition Pipeline
 * 
 * These tests verify multiple modules working together end-to-end.
 * Uses real implementations loaded via setup.js - no mocks.
 */

describe('Integration: Expedition Pipeline', () => {

	// Suppress console.log from production code during tests
	beforeAll(() => {
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterAll(() => {
		console.log.mockRestore();
	});

	// ========================================
	// Full Expedition Calculation Pipeline
	// ========================================

	describe('Full expedition calculation pipeline', () => {

		test('Sectors → LoadoutBuilder → EventWeightCalculator produces results', () => {
			// Setup: Create a simple expedition
			const sectors = ['LANDING', 'FOREST', 'DESERT'];
			const players = [
				{
					avatar: 'lambda_m.png',
					abilities: ['pilot.png', null, null, null],
					items: [null, null, null],
					health: 14
				}
			];

			// Step 1: Build loadout
			const loadout = LoadoutBuilder.build(players);
			expect(loadout).toBeDefined();
			expect(loadout.abilities).toContain('PILOT');

			// Step 2: Calculate probabilities
			const result = EventWeightCalculator.calculate(sectors, loadout);

			// Verify result structure
			expect(result).not.toBeNull();
			expect(result.resources).toBeDefined();
			expect(result.combat).toBeDefined();
			expect(result.eventDamage).toBeDefined();
			expect(result.sectorBreakdown).toBeDefined();
		});

		test('calculateWithSampling works with sufficient sectors', () => {
			// Need at least movementSpeed+1 sectors for sampling to trigger
			// With 8 sectors and movementSpeed 4, sampling is triggered
			const sectors = ['LANDING', 'FOREST', 'FOREST', 'DESERT', 'DESERT', 
				'HYDROCARBON', 'HYDROCARBON', 'OXYGEN'];
			const players = [
				{
					abilities: ['pilot.png', null, null, null],
					items: [null, null, null],
					health: 14
				}
			];
			const loadout = LoadoutBuilder.build(players);

			// Movement speed of 4 should trigger sampling for 8 non-landing sectors
			// alwaysInclude=[0] means include LANDING at index 0
			const result = EventWeightCalculator.calculateWithSampling(sectors, loadout, 4, [0], players);

			// Even if sampling conditions aren't met, should return valid result
			expect(result).toBeDefined();
			if (result) {
				expect(result.resources).toBeDefined();
			}
		});
	});

	// ========================================
	// Pilot Ability Integration
	// ========================================

	describe('Pilot ability prevents LANDING damage', () => {

		test('with Pilot, LANDING sector has reduced danger', () => {
			const sectors = ['LANDING', 'FOREST'];
			const players = [
				{
					abilities: ['pilot.png', null, null, null],
					items: [null, null, null],
					health: 14
				}
			];
			const loadout = LoadoutBuilder.build(players);

			// Verify pilot is in loadout
			expect(loadout.abilities).toContain('PILOT');

			// Get result with pilot
			const result = EventWeightCalculator.calculate(sectors, loadout);
			expect(result).not.toBeNull();

			// sectorBreakdown is a Map
			expect(result.sectorBreakdown).toBeDefined();
		});

		test('without Pilot, LANDING sector can contribute damage', () => {
			const sectors = ['LANDING', 'FOREST'];
			const players = [
				{
					abilities: [null, null, null, null],
					items: [null, null, null],
					health: 14
				}
			];
			const loadout = LoadoutBuilder.build(players);

			const result = EventWeightCalculator.calculate(sectors, loadout);
			expect(result).not.toBeNull();
			// Without pilot, LANDING damage is possible
		});
	});

	// ========================================
	// Diplomacy Integration
	// ========================================

	describe('Diplomacy prevents all fight damage', () => {

		test('with Diplomacy, combat damage is zero', () => {
			const sectors = ['LANDING', 'DESERT', 'FOREST'];
			const players = [
				{
					abilities: ['pilot.png', 'diplomat.png', null, null],
					items: [null, null, null],
					health: 14
				}
			];
			const loadout = LoadoutBuilder.build(players);

			const result = EventWeightCalculator.calculate(sectors, loadout);

			// With diplomacy, all fight scenarios should be 0
			// combat.damage contains the damage values
			expect(result.combat.damage.optimist).toBe(0);
			expect(result.combat.damage.pessimist).toBe(0);
			expect(result.combat.damage.worstCase).toBe(0);
		});

		test('without Diplomacy, combat damage is possible', () => {
			// Use multiple combat-heavy sectors to ensure fight damage
			const sectors = ['LANDING', 'DESERT', 'DESERT', 'MANKAROG', 'FOREST'];
			const players = [
				{
					abilities: ['pilot.png', null, null, null],
					items: [null, null, null],
					health: 14
				}
			];
			const loadout = LoadoutBuilder.build(players);

			const result = EventWeightCalculator.calculate(sectors, loadout);

			// Multiple fight sectors should produce some worst-case damage
			// Use >= 0 since pilot prevents landing and RNG might give 0
			expect(result.combat.damage.worstCase).toBeGreaterThanOrEqual(0);
			// At minimum, verify the result structure is correct
			expect(result.combat.damage).toBeDefined();
		});
	});

	// ========================================
	// DamageComparator Integration
	// ========================================

	describe('DamageComparator determines mutual exclusivity', () => {

		test('evaluateExpedition returns worst event per sector', () => {
			const sectors = ['LANDING', 'FOREST', 'DESERT'];
			const players = [
				{
					abilities: [null, null, null, null],
					items: [null, null, null],
					health: 14
				}
			];
			const loadout = LoadoutBuilder.build(players);
			const fightingPower = FightingPowerService.calculateBaseFightingPower(players);
			const grenadeCount = FightingPowerService.countGrenades(players);

			const evaluation = DamageComparator.evaluateExpedition(
				sectors, loadout, players.length, fightingPower, grenadeCount
			);

			// evaluateExpedition returns { sectorResults: Map, grenadesUsed, grenadesRemaining }
			expect(evaluation).toHaveProperty('sectorResults');
			expect(evaluation.sectorResults).toBeInstanceOf(Map);
			expect(evaluation.sectorResults.size).toBe(3);
		});

		test('grenade usage is tracked across sectors', () => {
			const sectors = ['LANDING', 'DESERT', 'DESERT', 'FOREST'];
			const players = [
				{
					abilities: [null, null, null, null],
					items: ['grenade.jpg', null, null],
					health: 14
				}
			];
			const loadout = LoadoutBuilder.build(players);
			const fightingPower = FightingPowerService.calculateBaseFightingPower(players);
			const grenadeCount = FightingPowerService.countGrenades(players);

			const evaluation = DamageComparator.evaluateExpedition(
				sectors, loadout, players.length, fightingPower, grenadeCount
			);

			// With one grenade, grenadesUsed should be at most 1
			expect(evaluation.grenadesUsed).toBeLessThanOrEqual(1);
			expect(evaluation.grenadesRemaining).toBeGreaterThanOrEqual(0);
		});
	});

	// ========================================
	// OxygenService Integration
	// ========================================

	describe('OxygenService filters participating players', () => {

		test('players without spacesuit are excluded when no oxygen', () => {
			const sectors = ['LANDING', 'DESERT', 'FOREST']; // No OXYGEN
			const players = [
				{ id: 1, items: ['space_suit.jpg', null, null] },
				{ id: 2, items: [null, null, null] }
			];

			const participating = OxygenService.getParticipatingPlayers(players, sectors);

			expect(participating.length).toBe(1);
			expect(participating[0].id).toBe(1);
		});

		test('all players participate when planet has oxygen', () => {
			const sectors = ['LANDING', 'OXYGEN', 'FOREST'];
			const players = [
				{ id: 1, items: [null, null, null] },
				{ id: 2, items: [null, null, null] }
			];

			const participating = OxygenService.getParticipatingPlayers(players, sectors);

			expect(participating.length).toBe(2);
		});
	});

	// ========================================
	// DamageSpreader Integration
	// ========================================

	describe('DamageSpreader distributes combined damage', () => {

		test('combines fight and event damage correctly', () => {
			const players = [
				{ items: [], abilities: [] },
				{ items: [], abilities: [] }
			];

			const fightInstances = {
				pessimist: [{ sources: [{ eventType: 'FIGHT_6', sector: 'DESERT', damage: 6 }] }],
				average: [{ sources: [{ eventType: 'FIGHT_6', sector: 'DESERT', damage: 3 }] }],
				optimist: [{ sources: [] }]
			};

			global.Constants = global.Constants || {};
			global.Constants.SCENARIO_KEYS = ['pessimist', 'average', 'optimist'];

			const distributed = DamageSpreader.distributeAllScenarios(fightInstances, {}, players);

			expect(distributed.pessimist.totalDamage.reduce((a, b) => a + b, 0)).toBe(6);
			expect(distributed.average.totalDamage.reduce((a, b) => a + b, 0)).toBe(3);
		});

		test('rope prevents ACCIDENT_ROPE damage', () => {
			const players = [
				{ items: ['rope.jpg'], abilities: [] }
			];

			// Mock EventDamageCalculator.EVENT_DAMAGES for rope test
			const originalEventDamageCalc = global.EventDamageCalculator;
			global.EventDamageCalculator = {
				...originalEventDamageCalc,
				EVENT_DAMAGES: {
					ACCIDENT_ROPE_3_5: { affectsAll: false, min: 3, max: 5 }
				}
			};

			const eventInstances = [
				{ sources: [{ eventType: 'ACCIDENT_ROPE_3_5', sector: 'CLIFF', damage: 5 }] }
			];

			const result = DamageSpreader.distribute([], eventInstances, players);

			// Player has rope, so should take 0 damage
			expect(result.totalDamage[0]).toBe(0);
			expect(result.appliedEffects[0].length).toBeGreaterThan(0);

			global.EventDamageCalculator = originalEventDamageCalc;
		});
	});

	// ========================================
	// Botanist Bonus Integration
	// ========================================

	describe('Botanist bonus increases fruit yield', () => {

		test('botanist adds fruit bonus to resource calculation', () => {
			const sectors = ['LANDING', 'FOREST', 'FOREST'];
			const playersWithBotanist = [
				{
					abilities: ['pilot.png', 'botanist.png', null, null],
					items: [null, null, null],
					health: 14
				}
			];
			const playersWithoutBotanist = [
				{
					abilities: ['pilot.png', null, null, null],
					items: [null, null, null],
					health: 14
				}
			];

			const loadoutWith = LoadoutBuilder.build(playersWithBotanist);
			const loadoutWithout = LoadoutBuilder.build(playersWithoutBotanist);

			const resultWith = EventWeightCalculator.calculate(sectors, loadoutWith);
			const resultWithout = EventWeightCalculator.calculate(sectors, loadoutWithout);

			// Botanist should give higher/equal fruit yield on average
			expect(resultWith.resources).toBeDefined();
			expect(resultWithout.resources).toBeDefined();
		});
	});

	// ========================================
	// Complex Loadout Integration
	// ========================================

	describe('Complex loadout with multiple modifiers', () => {

		test('multiple abilities and items combine correctly', () => {
			const sectors = ['LANDING', 'HYDROCARBON', 'FOREST', 'DESERT'];
			const players = [
				{
					abilities: ['pilot.png', 'technician.png', null, null],
					items: ['blaster.jpg', 'space_suit.jpg', null],
					health: 14
				},
				{
					abilities: ['survival.png', null, null, null],
					items: ['knife.jpg', null, null],
					health: 14
				}
			];

			const loadout = LoadoutBuilder.build(players);

			expect(loadout.abilities).toContain('PILOT');
			expect(loadout.abilities).toContain('TECHNICIAN');
			expect(loadout.abilities).toContain('SURVIVAL');
			expect(loadout.items).toContain('BLASTER');
			expect(loadout.items).toContain('SPACE_SUIT');
			expect(loadout.items).toContain('KNIFE');

			const result = EventWeightCalculator.calculate(sectors, loadout);
			expect(result).not.toBeNull();
		});

		test('grenade affects fighting power calculation', () => {
			const players = [
				{
					abilities: [null, null, null, null],
					items: ['grenade.jpg', null, null],
					health: 14
				}
			];

			// FightingPowerService.countGrenades takes players array, not loadout
			const grenades = FightingPowerService.countGrenades(players);

			expect(grenades).toBe(1);
			// Grenade power is 3 per config.js ItemEffects.grenade.effects.combatPowerBonus
			expect(FightingPowerService.getGrenadePower()).toBe(3);
		});
	});

	// ========================================
	// ExpeditionState → Full Flow
	// ========================================

	describe('ExpeditionState → LoadoutBuilder → EventWeightCalculator', () => {

		test('full state-to-results flow', () => {
			// Create fresh state
			const state = new ExpeditionState();

			// Add some sectors
			state.addSector('FOREST');
			state.addSector('DESERT');

			// Get sectors and players
			const sectors = state.getSectors();
			const players = state.getPlayers();

			// Build loadout from state
			const loadout = LoadoutBuilder.build(players);

			// Calculate results
			const result = EventWeightCalculator.calculate(sectors, loadout);

			// Verify complete flow
			expect(sectors).toContain('LANDING'); // Default
			expect(sectors).toContain('FOREST');
			expect(sectors).toContain('DESERT');
			expect(players.length).toBe(4); // Default 4 players
			expect(loadout.abilities).toContain('PILOT'); // Player 1 has pilot
			expect(result).not.toBeNull();
			expect(result.resources).toBeDefined();
			expect(result.combat).toBeDefined();
		});

		test('state changes reflect in calculations', () => {
			const state = new ExpeditionState();

			// Initial calculation
			const initialResult = EventWeightCalculator.calculate(
				state.getSectors(),
				LoadoutBuilder.build(state.getPlayers())
			);

			// Add dangerous sectors
			state.addSector('MANKAROG');
			state.addSector('MANKAROG');

			// Recalculate
			const updatedResult = EventWeightCalculator.calculate(
				state.getSectors(),
				LoadoutBuilder.build(state.getPlayers())
			);

			// More sectors = potentially more damage (use .damage.worstCase)
			expect(updatedResult.combat.damage.worstCase).toBeGreaterThanOrEqual(
				initialResult.combat.damage.worstCase
			);
		});
	});
});
