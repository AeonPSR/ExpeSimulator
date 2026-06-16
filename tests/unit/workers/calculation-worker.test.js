/**
 * ExpeditionRunner / Worker Parity Tests
 *
 * ExpeditionRunner.run() is the pure calculation function extracted from
 * calculation-worker.js so it can be tested without Web Worker infrastructure.
 *
 * Result shape: resources, combat, eventDamage, negativeEvents, sectorBreakdown
 * plus worker-specific fields: healthByScenario, effectsByScenario,
 * participationStatus, planetResources.
 *
 * Parity: the EWC-calculation portions of ExpeditionRunner.run must produce the
 * same numeric values as calling ExpeditionPipeline.calculate directly with
 * the same sectors and loadout.
 */

describe('ExpeditionRunner', () => {

	beforeAll(() => {
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterAll(() => {
		console.log.mockRestore();
	});

	// =========================================================================
	// Shared fixtures
	// =========================================================================

	// OXYGEN sector ensures all players can participate without needing space suits.
	const SECTORS  = ['LANDING', 'FOREST', 'DESERT', 'OXYGEN'];
	const PLAYERS  = [
		{ abilities: ['pilot.png'], items: ['blaster.jpg'], health: 14 },
		{ abilities: [],            items: [],              health: 14 }
	];
	const EXPLORED = 99; // ≥ total sectors → no sampling

	// =========================================================================
	// Result shape
	// =========================================================================

	describe('result shape', () => {

		test('returns a non-null object for valid inputs', () => {
			const result = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});
			expect(result).not.toBeNull();
			expect(typeof result).toBe('object');
		});

		test('contains all EWC fields: resources, combat, eventDamage, negativeEvents, sectorBreakdown', () => {
			const result = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});

			expect(result).toHaveProperty('resources');
			expect(result).toHaveProperty('combat');
			expect(result).toHaveProperty('eventDamage');
			expect(result).toHaveProperty('negativeEvents');
			expect(result).toHaveProperty('sectorBreakdown');
		});

		test('contains worker-specific fields: healthByScenario, effectsByScenario, participationStatus, planetResources', () => {
			const result = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});

			expect(result).toHaveProperty('healthByScenario');
			expect(result).toHaveProperty('effectsByScenario');
			expect(result).toHaveProperty('participationStatus');
			expect(result).toHaveProperty('planetResources');
		});

		test('healthByScenario has an entry for every scenario key', () => {
			const result = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});

			for (const key of Constants.SCENARIO_KEYS) {
				expect(result.healthByScenario).toHaveProperty(key);
			}
		});

		test('participationStatus has one entry per allPlayers player', () => {
			const result = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});

			expect(result.participationStatus.length).toBe(PLAYERS.length);
		});

		test('returns null for empty sectors array', () => {
			const result = ExpeditionRunner.run({
				sectors: [], allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});
			expect(result).toBeNull();
		});

	});

	// =========================================================================
	// Parity with ExpeditionPipeline.calculate
	// =========================================================================

	describe('parity with ExpeditionPipeline.calculate', () => {

		// Build the loadout the runner will use internally, so we can
		// call EWC.calculate with an identical loadout.
		function equivalentLoadout(players) {
			const participating = OxygenService.getParticipatingPlayers(players, SECTORS);
			return LoadoutBuilder.build(participating, { antigravActive: false });
		}

		test('resources match direct EWC.calculate call', () => {
			const runnerResult = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});

			const loadout = equivalentLoadout(PLAYERS);
			const directResult = ExpeditionPipeline.calculate(SECTORS, loadout, PLAYERS);

			// Compare scenario values for each resource type
			for (const type of ['fruits', 'steaks', 'fuel', 'artefacts', 'mapFragments']) {
				const r = runnerResult.resources[type];
				const d = directResult.resources[type];
				if (!r || !d) continue;
				expect(r.average).toBeCloseTo(d.average, 8);
				expect(r.pessimist).toBeCloseTo(d.pessimist, 8);
				expect(r.optimist).toBeCloseTo(d.optimist, 8);
			}
		});

		test('negativeEvents match direct EWC.calculate call', () => {
			const runnerResult = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});

			const loadout = equivalentLoadout(PLAYERS);
			const directResult = ExpeditionPipeline.calculate(SECTORS, loadout, PLAYERS);

			for (const type of ['disease', 'playerLost', 'again', 'itemLost']) {
				const r = runnerResult.negativeEvents[type];
				const d = directResult.negativeEvents[type];
				if (!r || !d) continue;
				expect(r.average).toBeCloseTo(d.average, 8);
			}
		});

		test('combat damage matches direct EWC.calculate call', () => {
			const runnerResult = ExpeditionRunner.run({
				sectors: SECTORS, allPlayers: PLAYERS,
				antigravActive: false, exploredCount: EXPLORED
			});

			const loadout = equivalentLoadout(PLAYERS);
			const directResult = ExpeditionPipeline.calculate(SECTORS, loadout, PLAYERS);

			const rDmg = runnerResult.combat?.damage;
			const dDmg = directResult.combat?.damage;

			if (rDmg && dDmg) {
				expect(rDmg.average).toBeCloseTo(dDmg.average, 8);
				expect(rDmg.pessimist).toBeCloseTo(dDmg.pessimist, 8);
				expect(rDmg.worstCase).toBeCloseTo(dDmg.worstCase, 8);
			}
		});

		test('oxygen-filtered players reduce the calculation scope', () => {
			// Player 2 has no space suit; planet has no OXYGEN sector.
			const mixedPlayers = [
				{ abilities: [], items: ['space_suit.jpg'], health: 14 },
				{ abilities: [], items: [],                 health: 14 }
			];
			const noOxygenSectors = ['LANDING', 'FOREST', 'DESERT'];

			const runnerResult = ExpeditionRunner.run({
				sectors: noOxygenSectors, allPlayers: mixedPlayers,
				antigravActive: false, exploredCount: EXPLORED
			});

			// participationStatus must reflect that player 2 cannot participate
			const p1Status = runnerResult.participationStatus[0];
			const p2Status = runnerResult.participationStatus[1];
			expect(p1Status.canParticipate).toBe(true);
			expect(p2Status.canParticipate).toBe(false);

			// Runner result must differ from a run with both players participating
			const bothResult = ExpeditionRunner.run({
				sectors: ['LANDING', 'FOREST', 'OXYGEN'],
				allPlayers: mixedPlayers,
				antigravActive: false, exploredCount: EXPLORED
			});
			// With oxygen, both participate → health array has 2 entries, damage differs
			// (different FP changes the combat number)
			const healthKeySingle = Object.values(runnerResult.healthByScenario.pessimist || {});
			const healthKeyBoth   = Object.values(bothResult.healthByScenario.pessimist || {});
			if (healthKeySingle.length && healthKeyBoth.length) {
				// At minimum, the number of players tracked differs
				expect(healthKeySingle.length).not.toBe(healthKeyBoth.length);
			}
		});

	});

});
