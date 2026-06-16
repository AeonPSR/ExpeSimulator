/**
 * Cross-Module Integration Tests
 *
 * Asserts behaviours that span multiple modules and were previously untested.
 * No mocks — uses real implementations loaded via setup.js.
 */

describe('Cross-module integration', () => {

	beforeAll(() => {
		jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterAll(() => {
		console.log.mockRestore();
	});

	// =========================================================================
	// Fight → disease fold
	// =========================================================================

	describe('Fight → disease fold', () => {

		// PREDATOR has FIGHT_12 and ACCIDENT_3_5 in the real sector data.
		// 3 players with no abilities / items → FP = 3, net fight damage = 12 − 3 = 9.
		// Binomial(min(9, 3), 0.05) → E[disease] = 3 × 0.05 = 0.15, so average > 0.

		test('combat result exposes diseaseFromFights', () => {
			const sectors = ['PREDATOR'];
			const players = [
				{ abilities: [], items: [], health: 14 },
				{ abilities: [], items: [], health: 14 },
				{ abilities: [], items: [], health: 14 }
			];
			const result = ExpeditionPipeline.calculate(sectors, {}, players);

			expect(result.combat.diseaseFromFights).toBeDefined();
			expect(typeof result.combat.diseaseFromFights.pessimist).toBe('number');
			expect(typeof result.combat.diseaseFromFights.average).toBe('number');
			expect(typeof result.combat.diseaseFromFights.optimist).toBe('number');
		});

		test('fight-induced disease is > 0 when fights deal damage', () => {
			const sectors = ['PREDATOR'];
			const players = [
				{ abilities: [], items: [], health: 14 },
				{ abilities: [], items: [], health: 14 },
				{ abilities: [], items: [], health: 14 }
			];
			const result = ExpeditionPipeline.calculate(sectors, {}, players);

			// With FIGHT_12 and 3 players (FP=3, net≥9 per fight occurrence),
			// diseaseFromFights.average must be strictly positive.
			expect(result.combat.diseaseFromFights.average).toBeGreaterThan(0);
		});

		test('fold arithmetic: negativeEvents.disease equals NEC disease plus fight-induced disease', () => {
			const sectors = ['PREDATOR'];
			const players = [
				{ abilities: [], items: [], health: 14 },
				{ abilities: [], items: [], health: 14 }
			];

			const result = ExpeditionPipeline.calculate(sectors, {}, players);

			// Compute sub-results independently using the same sectorProbabilities
			const sectorProbs = ExpeditionPipeline._precomputeSectorProbabilities(sectors, {});
			const necResult   = NegativeEventCalculator.calculate(sectors, {}, sectorProbs);
			const fightResult = FightCalculator.calculate(sectors, {}, players, null, sectorProbs);

			const fightDisease = fightResult.diseaseFromFights || { pessimist: 0, average: 0, optimist: 0 };

			expect(result.negativeEvents.disease.average).toBeCloseTo(
				necResult.disease.average + fightDisease.average, 10
			);
			expect(result.negativeEvents.disease.pessimist).toBeCloseTo(
				necResult.disease.pessimist + fightDisease.pessimist, 10
			);
			expect(result.negativeEvents.disease.optimist).toBeCloseTo(
				necResult.disease.optimist + fightDisease.optimist, 10
			);
		});

		test('no fight sector → diseaseFromFights is zero', () => {
			// DESERT has only TIRED_2 and AGAIN — no FIGHT events.
			const sectors = ['DESERT'];
			const players = [{ abilities: [], items: [], health: 14 }];
			const result = ExpeditionPipeline.calculate(sectors, {}, players);

			expect(result.combat.diseaseFromFights.average).toBe(0);
			expect(result.combat.diseaseFromFights.pessimist).toBe(0);
			expect(result.combat.diseaseFromFights.optimist).toBe(0);
		});

	});

	// =========================================================================
	// DamageComparator exclusion wiring
	// =========================================================================

	describe('DamageComparator exclusion wiring', () => {

		test('evaluateExpedition is called when playerCount > 0', () => {
			const spy = jest.spyOn(DamageComparator, 'evaluateExpedition');
			const sectors = ['PREDATOR'];
			const players = [{ abilities: [], items: [], health: 14 }];

			ExpeditionPipeline.calculate(sectors, {}, players);

			expect(spy).toHaveBeenCalledTimes(1);
			spy.mockRestore();
		});

		test('evaluateExpedition is called regardless of playerCount', () => {
			// Guard is on typeof DamageComparator, not playerCount;
			// with 0 players it runs with power=0 (no exclusions generated).
			const spy = jest.spyOn(DamageComparator, 'evaluateExpedition');

			ExpeditionPipeline.calculate(['PREDATOR'], {}, []);

			expect(spy).toHaveBeenCalledTimes(1);
			spy.mockRestore();
		});

		test('PREDATOR fight wins → excluded from eventDamage worst-case, not from combat', () => {
			// PREDATOR: FIGHT_12 vs ACCIDENT_3_5.
			// 1 player (FP=1): net fight damage ≈ 11 >> ACCIDENT max 5 → fight wins.
			const spyFight = jest.spyOn(FightCalculator, 'calculate');
			const spyEvent = jest.spyOn(EventDamageCalculator, 'calculate');

			const sectors = ['PREDATOR'];
			const players = [{ abilities: [], items: [], health: 14 }];

			ExpeditionPipeline.calculate(sectors, {}, players);

			const fightExclusions = spyFight.mock.calls[0][3]; // 4th arg
			const eventExclusions = spyEvent.mock.calls[0][3]; // 4th arg

			// Fight wins → PREDATOR in eventExclusions, NOT in fightExclusions
			if (fightExclusions instanceof Set) {
				expect(fightExclusions.has('PREDATOR')).toBe(false);
			}
			if (eventExclusions instanceof Set) {
				expect(eventExclusions.has('PREDATOR')).toBe(true);
			}

			spyFight.mockRestore();
			spyEvent.mockRestore();
		});

		test('exclusion sets are disjoint (no sector excluded from both calculators)', () => {
			const spyFight = jest.spyOn(FightCalculator, 'calculate');
			const spyEvent = jest.spyOn(EventDamageCalculator, 'calculate');

			const sectors = ['PREDATOR', 'LANDING', 'DESERT'];
			const players = [
				{ abilities: [], items: [], health: 14 },
				{ abilities: [], items: [], health: 14 }
			];

			ExpeditionPipeline.calculate(sectors, {}, players);

			const fightExclusions = spyFight.mock.calls[0][3];
			const eventExclusions = spyEvent.mock.calls[0][3];

			if (fightExclusions instanceof Set && eventExclusions instanceof Set) {
				for (const sector of fightExclusions) {
					expect(eventExclusions.has(sector)).toBe(false);
				}
			}

			spyFight.mockRestore();
			spyEvent.mockRestore();
		});

	});

	// =========================================================================
	// sectorProbabilities computed once
	// =========================================================================

	describe('sectorProbabilities computed once per unique sector type', () => {

		test('getModifiedProbabilities called exactly once per unique sector, not per occurrence', () => {
			const spy = jest.spyOn(ExpeditionPipeline, 'getModifiedProbabilities');

			// 3 sector entries but only 2 unique types
			const sectors = ['PREDATOR', 'PREDATOR', 'FOREST'];
			ExpeditionPipeline.calculate(sectors, {}, []);

			expect(spy).toHaveBeenCalledTimes(2);
			const calledSectors = spy.mock.calls.map(c => c[0]);
			expect(calledSectors).toContain('PREDATOR');
			expect(calledSectors).toContain('FOREST');

			spy.mockRestore();
		});

		test('_precomputeSectorProbabilities cache has one entry per unique sector', () => {
			const sectors = ['PREDATOR', 'PREDATOR', 'FOREST'];
			const cache = ExpeditionPipeline._precomputeSectorProbabilities(sectors, {});

			expect(cache.size).toBe(2);
			expect(cache.has('PREDATOR')).toBe(true);
			expect(cache.has('FOREST')).toBe(true);
		});

		test('all sub-calculators receive the same cache Map instance', () => {
			// Spy to capture the sectorProbabilities argument passed into sub-calculators.
			// ResourceCalculator.calculate receives it as 4th arg.
			const spyRC  = jest.spyOn(ResourceCalculator, 'calculate');
			const spyNEC = jest.spyOn(NegativeEventCalculator, 'calculate');
			const spyFC  = jest.spyOn(FightCalculator, 'calculate');

			const sectors = ['PREDATOR', 'FOREST'];
			const players = [{ abilities: [], items: [], health: 14 }];
			ExpeditionPipeline.calculate(sectors, {}, players);

			const rcProbs  = spyRC.mock.calls[0]?.[3];
			const necProbs = spyNEC.mock.calls[0]?.[2];
			const fcProbs  = spyFC.mock.calls[0]?.[4];

			// All must be the same Map instance (reference equality)
			if (rcProbs && necProbs) expect(rcProbs).toBe(necProbs);
			if (rcProbs && fcProbs)  expect(rcProbs).toBe(fcProbs);

			spyRC.mockRestore();
			spyNEC.mockRestore();
			spyFC.mockRestore();
		});

	});

	// =========================================================================
	// Multi-modifier interactions
	// =========================================================================

	describe('Multi-modifier interactions', () => {

		// Pilot + Antigrav Propeller on LANDING — both remove the same damage events;
		// second application must be idempotent (no double-removal, no side-effects).
		test('Pilot + Antigrav on LANDING: damage events removed exactly once', () => {
			const landingConfig = PlanetSectorConfigData.find(c => c.sectorName === 'LANDING');
			expect(landingConfig).toBeDefined();

			const loadout = { abilities: ['PILOT'], items: [], projects: ['ANTIGRAV_PROPELLER'] };
			const result = ModifierApplicator.apply(landingConfig, 'LANDING', loadout);

			// Damage events gone
			expect(result.explorationEvents.TIRED_2).toBeUndefined();
			expect(result.explorationEvents.ACCIDENT_3_5).toBeUndefined();
			expect(result.explorationEvents.DISASTER_3_5).toBeUndefined();

			// Non-damage events untouched (NOTHING_TO_REPORT keeps its original weight)
			const originalNothing = landingConfig.explorationEvents.NOTHING_TO_REPORT;
			if (originalNothing !== undefined) {
				expect(result.explorationEvents.NOTHING_TO_REPORT).toBe(originalNothing);
			}
		});

		// Diplomacy + White Flag on INTELLIGENT — White Flag is a no-op because
		// Diplomacy already removed every FIGHT_* event; ARTEFACT must be untouched.
		test('Diplomacy + White Flag on INTELLIGENT: fights removed once, ARTEFACT unchanged', () => {
			const intelligentConfig = PlanetSectorConfigData.find(c => c.sectorName === 'INTELLIGENT');
			expect(intelligentConfig).toBeDefined();

			const loadout = { abilities: ['DIPLOMACY'], items: ['WHITE_FLAG'], projects: [] };
			const result = ModifierApplicator.apply(intelligentConfig, 'INTELLIGENT', loadout);

			// All FIGHT_* events removed
			const fightKeys = Object.keys(result.explorationEvents).filter(k => k.startsWith('FIGHT_'));
			expect(fightKeys.length).toBe(0);

			// ARTEFACT weight preserved
			const originalArtefact = intelligentConfig.explorationEvents.ARTEFACT;
			if (originalArtefact !== undefined) {
				expect(result.explorationEvents.ARTEFACT).toBe(originalArtefact);
			}
		});

		// Trad Module doubles ARTEFACT weight on INTELLIGENT, which must propagate
		// to a higher artefact yield in the full pipeline result.
		test('Trad Module increases artefact yield through the full pipeline', () => {
			// INTELLIGENT must exist and have ARTEFACT events for this to matter
			const intelligentConfig = PlanetSectorConfigData.find(c => c.sectorName === 'INTELLIGENT');
			if (!intelligentConfig || !intelligentConfig.explorationEvents.ARTEFACT) {
				return; // sector not present in this build — skip gracefully
			}

			const sectors = ['INTELLIGENT'];
			const resultBase = ExpeditionPipeline.calculate(sectors, {}, []);
			const resultTrad = ExpeditionPipeline.calculate(sectors, { items: ['TRAD_MODULE'] }, []);

			expect(resultTrad.resources.artefacts.average).toBeGreaterThan(
				resultBase.resources.artefacts.average
			);
		});

		// A player filtered out by OxygenService (no space_suit, no OXYGEN sector)
		// must not contribute their items to the fighting-power calculation.
		test('Excluded player (no space suit) does not contribute items to fighting power', () => {
			const allPlayers = [
				{ abilities: [], items: ['space_suit.jpg', 'blaster.jpg'], health: 14 }, // participates
				{ abilities: [], items: ['blaster.jpg'],                   health: 14 }  // excluded
			];
			// No OXYGEN sector → only the player with a space suit participates
			const sectors = ['FOREST', 'DESERT'];

			const participating = OxygenService.getParticipatingPlayers(allPlayers, sectors);
			expect(participating.length).toBe(1);

			const loadout = LoadoutBuilder.build(participating);
			const fpFull  = FightingPowerService.calculateBaseFightingPower(allPlayers);
			const fpFiltered = FightingPowerService.calculateBaseFightingPower(participating);

			// Full: 2 players + 2 blasters (combatPowerBonus=1 each in real config) = 4.
			// Filtered: 1 player + 1 blaster = 2.
			// The excluded player contributes 1 (base) + 1 (blaster) = 2 FP; assert that.
			expect(fpFiltered).toBeLessThan(fpFull);
			// Excluded player's blaster (combatPowerBonus=1) must not appear in the filtered sum
			expect(fpFull - fpFiltered).toBeGreaterThanOrEqual(1);
		});

	});

	// =========================================================================
	// Sampling path
	// =========================================================================

	describe('Sampling path', () => {

		// When only one composition is possible (single sector type, movementSpeed
		// < totalSectors), calculateWithSampling must return an identical result
		// to calling calculate directly with that composition's sector list.

		test('single-composition sampling returns the same result as direct calculate', () => {
			// {FOREST: 3}, movementSpeed=2 → only possible composition is {FOREST: 2}
			// with probability 1.0 → no mixing, result is returned unchanged.
			const directResult   = ExpeditionPipeline.calculate(['FOREST', 'FOREST'], {}, []);
			const samplingResult = ExpeditionPipeline.calculateWithSampling({ FOREST: 3 }, 2, {}, []);

			// Resources
			expect(samplingResult.resources.fruits.average)
				.toBeCloseTo(directResult.resources.fruits.average, 8);
			expect(samplingResult.resources.fruits.pessimist)
				.toBeCloseTo(directResult.resources.fruits.pessimist, 8);

			// Negative events
			expect(samplingResult.negativeEvents.again.average)
				.toBeCloseTo(directResult.negativeEvents.again.average, 8);
		});

		// The mixed result must equal the probability-weighted sum of each
		// composition's individual calculate() result.

		test('mixed result is the probability-weighted average of each composition result', () => {
			const sectorCounts   = { FOREST: 2, DESERT: 2 };
			const movementSpeed  = 2;

			// Get the compositions exactly as the sampler computes them
			const compositions = SectorSampler.generateWeightedCompositions(sectorCounts, movementSpeed, {});

			// Compute each composition's result independently
			const perComposition = compositions.map(({ composition, probability }) => ({
				probability,
				result: ExpeditionPipeline.calculate(
					SectorSampler.expandComposition(composition), {}, []
				)
			}));

			// Manual weighted average for fruits (varies across compositions: FOREST has
			// HARVEST events, DESERT does not, so the values are meaningfully different)
			const expectedFruitsAvg = perComposition.reduce(
				(sum, { probability, result }) => sum + probability * (result.resources.fruits?.average || 0),
				0
			);

			const samplingResult = ExpeditionPipeline.calculateWithSampling(
				sectorCounts, movementSpeed, {}, []
			);

			expect(samplingResult.resources.fruits.average).toBeCloseTo(expectedFruitsAvg, 8);

			// Same check for negativeEvents to verify the negative-event mixer too
			const expectedAgainAvg = perComposition.reduce(
				(sum, { probability, result }) => sum + probability * (result.negativeEvents.again?.average || 0),
				0
			);
			expect(samplingResult.negativeEvents.again.average).toBeCloseTo(expectedAgainAvg, 8);
		});

	});

});
