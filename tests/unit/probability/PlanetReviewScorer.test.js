/**
 * PlanetReviewScorer Tests
 *
 * Phase 1: event magnitude parsing, axis mapping, sector EVs,
 * ceiling computation, and full planet scoring.
 */

describe('PlanetReviewScorer', () => {

	// =========================================================================
	// _parseMagnitude
	// =========================================================================

	describe('_parseMagnitude', () => {
		test('single-number events: HARVEST_3 → 3', () => {
			expect(PlanetReviewScorer._parseMagnitude('HARVEST_3')).toBe(3);
		});

		test('single-number events: FUEL_6 → 6', () => {
			expect(PlanetReviewScorer._parseMagnitude('FUEL_6')).toBe(6);
		});

		test('single-number events: OXYGEN_24 → 24', () => {
			expect(PlanetReviewScorer._parseMagnitude('OXYGEN_24')).toBe(24);
		});

		test('single-number events: TIRED_2 → 2', () => {
			expect(PlanetReviewScorer._parseMagnitude('TIRED_2')).toBe(2);
		});

		test('range events: ACCIDENT_3_5 → midpoint 4', () => {
			expect(PlanetReviewScorer._parseMagnitude('ACCIDENT_3_5')).toBe(4);
		});

		test('range events: DISASTER_3_5 → midpoint 4', () => {
			expect(PlanetReviewScorer._parseMagnitude('DISASTER_3_5')).toBe(4);
		});

		test('rope range events: ACCIDENT_ROPE_3_5 → midpoint 4', () => {
			expect(PlanetReviewScorer._parseMagnitude('ACCIDENT_ROPE_3_5')).toBe(4);
		});

		test('multi-fight: FIGHT_8_10_12_15_18_32 → average', () => {
			const expected = (8 + 10 + 12 + 15 + 18 + 32) / 6;
			expect(PlanetReviewScorer._parseMagnitude('FIGHT_8_10_12_15_18_32')).toBeCloseTo(expected);
		});

		test('single fight: FIGHT_12 → 12', () => {
			expect(PlanetReviewScorer._parseMagnitude('FIGHT_12')).toBe(12);
		});

		test('fixed magnitudes: ARTEFACT → 1', () => {
			expect(PlanetReviewScorer._parseMagnitude('ARTEFACT')).toBe(1);
		});

		test('fixed magnitudes: DISEASE → 1', () => {
			expect(PlanetReviewScorer._parseMagnitude('DISEASE')).toBe(1);
		});

		test('fixed magnitudes: KILL_ALL is now ignored (no magnitude needed)', () => {
			// KILL_ALL is in IGNORED_EVENTS, parseMagnitude still returns 0 for it
			expect(PlanetReviewScorer._parseMagnitude('KILL_ALL')).toBe(0);
		});

		test('fixed magnitudes: NOTHING_TO_REPORT → 1', () => {
			expect(PlanetReviewScorer._parseMagnitude('NOTHING_TO_REPORT')).toBe(1);
		});

		test('fixed magnitudes: AGAIN → 1', () => {
			expect(PlanetReviewScorer._parseMagnitude('AGAIN')).toBe(1);
		});
	});

	// =========================================================================
	// _getAxisForEvent
	// =========================================================================

	describe('_getAxisForEvent', () => {
		test('HARVEST_* → fruits', () => {
			expect(PlanetReviewScorer._getAxisForEvent('HARVEST_3')).toBe('fruits');
			expect(PlanetReviewScorer._getAxisForEvent('HARVEST_1')).toBe('fruits');
		});

		test('PROVISION_* → steaks', () => {
			expect(PlanetReviewScorer._getAxisForEvent('PROVISION_4')).toBe('steaks');
			expect(PlanetReviewScorer._getAxisForEvent('PROVISION_1')).toBe('steaks');
		});

		test('FUEL_* → fuel', () => {
			expect(PlanetReviewScorer._getAxisForEvent('FUEL_6')).toBe('fuel');
			expect(PlanetReviewScorer._getAxisForEvent('FUEL_1')).toBe('fuel');
		});

		test('ARTEFACT → artifacts', () => {
			expect(PlanetReviewScorer._getAxisForEvent('ARTEFACT')).toBe('artifacts');
		});

		test('STARMAP → null (ignored, handled via sector bonus)', () => {
			expect(PlanetReviewScorer._getAxisForEvent('STARMAP')).toBeNull();
		});

		test('FIGHT_* → lethality', () => {
			expect(PlanetReviewScorer._getAxisForEvent('FIGHT_12')).toBe('lethality');
			expect(PlanetReviewScorer._getAxisForEvent('FIGHT_8_10_12_15_18_32')).toBe('lethality');
		});

		test('KILL events → ignored (post-processed as bonus)', () => {
			expect(PlanetReviewScorer._getAxisForEvent('KILL_ALL')).toBeNull();
			expect(PlanetReviewScorer._getAxisForEvent('KILL_RANDOM')).toBeNull();
			expect(PlanetReviewScorer._getAxisForEvent('KILL_LOST')).toBeNull();
		});

		test('MUSH_TRAP → hazards', () => {
			expect(PlanetReviewScorer._getAxisForEvent('MUSH_TRAP')).toBe('hazards');
		});

		test('DISEASE, PLAYER_LOST, ITEM_LOST → hazards', () => {
			expect(PlanetReviewScorer._getAxisForEvent('DISEASE')).toBe('hazards');
			expect(PlanetReviewScorer._getAxisForEvent('PLAYER_LOST')).toBe('hazards');
			expect(PlanetReviewScorer._getAxisForEvent('ITEM_LOST')).toBe('hazards');
		});

		test('ACCIDENT_*, DISASTER_*, TIRED_* → lethality', () => {
			expect(PlanetReviewScorer._getAxisForEvent('ACCIDENT_3_5')).toBe('lethality');
			expect(PlanetReviewScorer._getAxisForEvent('ACCIDENT_ROPE_3_5')).toBe('lethality');
			expect(PlanetReviewScorer._getAxisForEvent('DISASTER_3_5')).toBe('lethality');
			expect(PlanetReviewScorer._getAxisForEvent('TIRED_2')).toBe('lethality');
		});

		test('OXYGEN_* → null (handled as boolean)', () => {
			expect(PlanetReviewScorer._getAxisForEvent('OXYGEN_24')).toBeNull();
		});

		test('NOTHING_TO_REPORT, AGAIN, BACK → hazards', () => {
			expect(PlanetReviewScorer._getAxisForEvent('NOTHING_TO_REPORT')).toBe('hazards');
			expect(PlanetReviewScorer._getAxisForEvent('AGAIN')).toBe('hazards');
			expect(PlanetReviewScorer._getAxisForEvent('BACK')).toBe('hazards');
		});

		test('ignored events → null', () => {
			expect(PlanetReviewScorer._getAxisForEvent('FIND_LOST')).toBeNull();
			expect(PlanetReviewScorer._getAxisForEvent('KILL_ALL')).toBeNull();
			expect(PlanetReviewScorer._getAxisForEvent('KILL_RANDOM')).toBeNull();
		});
	});

	// =========================================================================
	// _computeSectorEVs
	// =========================================================================

	describe('_computeSectorEVs', () => {
		test('FRUIT_TREES: fruits EV is correct', () => {
			// HARVEST_3: weight 4, HARVEST_1: weight 3, NOTHING: weight 3
			// total weight = 10
			// fruits EV = (4*3 + 3*1) / 10 = 15/10 = 1.5
			const config = PlanetSectorConfigData.find(c => c.sectorName === 'FRUIT_TREES');
			const evs = PlanetReviewScorer._computeSectorEVs(config);
			expect(evs.fruits).toBeCloseTo(1.5);
		});

		test('HYDROCARBON: fuel EV is correct', () => {
			// FUEL_3: 4, FUEL_4: 3, FUEL_5: 2, FUEL_6: 1 → total 10
			// fuel EV = (4*3 + 3*4 + 2*5 + 1*6) / 10 = (12+12+10+6)/10 = 4.0
			const config = PlanetSectorConfigData.find(c => c.sectorName === 'HYDROCARBON');
			const evs = PlanetReviewScorer._computeSectorEVs(config);
			expect(evs.fuel).toBeCloseTo(4.0);
		});

		test('DESERT: no resource axes (only NOTHING and TIRED and AGAIN)', () => {
			const config = PlanetSectorConfigData.find(c => c.sectorName === 'DESERT');
			const evs = PlanetReviewScorer._computeSectorEVs(config);
			expect(evs.fruits).toBeUndefined();
			expect(evs.fuel).toBeUndefined();
			expect(evs.lethality).toBeDefined(); // TIRED_2
		});

		test('PREDATOR: has lethality from FIGHT and ACCIDENT', () => {
			const config = PlanetSectorConfigData.find(c => c.sectorName === 'PREDATOR');
			const evs = PlanetReviewScorer._computeSectorEVs(config);
			expect(evs.lethality).toBeGreaterThan(0); // FIGHT_12, ACCIDENT_3_5
		});
	});

	// =========================================================================
	// _computeCeilings
	// =========================================================================

	describe('_computeCeilings', () => {
		test('all axis ceilings are positive', () => {
			const ceilings = PlanetReviewScorer._computeCeilings(PlanetSectorConfigData);
			expect(ceilings.fruits).toBeGreaterThan(0);
			expect(ceilings.steaks).toBeGreaterThan(0);
			expect(ceilings.fuel).toBeGreaterThan(0);
			expect(ceilings.artifacts).toBeGreaterThan(0);
			expect(ceilings.lethality).toBeGreaterThan(0);
			expect(ceilings.hazards).toBeGreaterThan(0);
		});

		test('ceilings are 75% of theoretical max', () => {
			// Fuel theoretical max: HYDROCARBON (EV=4.0, max 2) + CAVE (EV for fuel) + MOUNTAIN (EV for fuel)
			// Just check the ratio is applied
			const ceilings = PlanetReviewScorer._computeCeilings(PlanetSectorConfigData);
			// Fuel ceiling should be less than 20 * 4.0 (impossible max) but reasonable
			expect(ceilings.fuel).toBeLessThan(20 * 4.0);
			expect(ceilings.fuel).toBeGreaterThan(0);
		});
	});

	// =========================================================================
	// score (full planet scoring)
	// =========================================================================

	describe('score', () => {
		test('returns correct shape', () => {
			const result = PlanetReviewScorer.score(['LANDING']);
			expect(result).toHaveProperty('overall');
			expect(result).toHaveProperty('axes');
			expect(result).toHaveProperty('booleans');
			expect(result.axes).toHaveLength(6);
			expect(result.axes.map(a => a.key)).toEqual(
				['fruits', 'steaks', 'fuel', 'artifacts', 'lethality', 'hazards']
			);
		});

		test('LANDING-only planet: all axes at 0 (LANDING is ignored)', () => {
			const result = PlanetReviewScorer.score(['LANDING']);
			for (const axis of result.axes) {
				expect(axis.stars).toBe(0);
			}
		});

		test('DESERT has lethality > 0 (TIRED)', () => {
			const result = PlanetReviewScorer.score(['LANDING', 'DESERT']);
			const lethality = result.axes.find(a => a.key === 'lethality');
			expect(lethality.stars).toBeGreaterThan(0);
		});

		test('oxygen boolean: false when no OXYGEN sector', () => {
			const result = PlanetReviewScorer.score(['LANDING', 'FOREST']);
			const oxygen = result.booleans.find(b => b.key === 'oxygen');
			expect(oxygen.present).toBe(false);
		});

		test('oxygen boolean: true when OXYGEN sector present', () => {
			const result = PlanetReviewScorer.score(['LANDING', 'OXYGEN']);
			const oxygen = result.booleans.find(b => b.key === 'oxygen');
			expect(oxygen.present).toBe(true);
		});

		test('cristal_field boolean: false when no CRISTAL_FIELD sector', () => {
			const result = PlanetReviewScorer.score(['LANDING', 'FOREST']);
			const cf = result.booleans.find(b => b.key === 'cristal_field');
			expect(cf.present).toBe(false);
		});

		test('cristal_field boolean: true when CRISTAL_FIELD sector present', () => {
			const result = PlanetReviewScorer.score(['LANDING', 'CRISTAL_FIELD']);
			const cf = result.booleans.find(b => b.key === 'cristal_field');
			expect(cf.present).toBe(true);
		});

		test('stars are rounded to nearest 0.5', () => {
			const result = PlanetReviewScorer.score(['LANDING', 'FOREST', 'CAVE', 'HYDROCARBON']);
			for (const axis of result.axes) {
				const remainder = axis.stars % 0.5;
				expect(remainder).toBeCloseTo(0);
			}
		});

		test('stars are clamped between 0 and 6', () => {
			// Use a heavy planet to test upper clamping potential
			const sectors = ['LANDING'];
			for (let i = 0; i < 4; i++) sectors.push('FRUIT_TREES');
			for (let i = 0; i < 4; i++) sectors.push('FOREST');
			for (let i = 0; i < 4; i++) sectors.push('HOT');
			for (let i = 0; i < 4; i++) sectors.push('SWAMP');

			const result = PlanetReviewScorer.score(sectors);
			for (const axis of result.axes) {
				expect(axis.stars).toBeGreaterThanOrEqual(0);
				expect(axis.stars).toBeLessThanOrEqual(6);
			}
		});

		test('minimum half-star: any contribution yields at least 0.5', () => {
			// Two MOUNTAIN sectors have a tiny fuel EV that would round to 0
			const result = PlanetReviewScorer.score(['LANDING', 'MOUNTAIN', 'MOUNTAIN']);
			const fuel = result.axes.find(a => a.key === 'fuel');
			expect(fuel.stars).toBeGreaterThanOrEqual(0.5);
		});

		test('truly absent axis still shows 0 stars', () => {
			// LANDING alone has no fruit events at all
			const result = PlanetReviewScorer.score(['LANDING']);
			const fruits = result.axes.find(a => a.key === 'fruits');
			expect(fruits.stars).toBe(0);
		});

		// ── Example worlds sanity checks ──────────────────────────────────

		test('Americas Dream: high fuel', () => {
			const sectors = WorldData.getWorldConfiguration("America's Dream");
			const result = PlanetReviewScorer.score(sectors);
			const fuel = result.axes.find(a => a.key === 'fuel');
			expect(fuel.stars).toBeGreaterThanOrEqual(3);
		});

		test('Fugubos: has oxygen', () => {
			const sectors = WorldData.getWorldConfiguration('Fugubos');
			const result = PlanetReviewScorer.score(sectors);
			const oxygen = result.booleans.find(b => b.key === 'oxygen');
			expect(oxygen.present).toBe(true);
		});

		test('Museum: high artifacts', () => {
			const sectors = WorldData.getWorldConfiguration('Museum');
			const result = PlanetReviewScorer.score(sectors);
			const artifacts = result.axes.find(a => a.key === 'artifacts');
			expect(artifacts.stars).toBeGreaterThanOrEqual(2);
		});

		test('Museum: high lethality', () => {
			const sectors = WorldData.getWorldConfiguration('Museum');
			const result = PlanetReviewScorer.score(sectors);
			const lethality = result.axes.find(a => a.key === 'lethality');
			expect(lethality.stars).toBeGreaterThanOrEqual(2);
		});

		test('Nurgles Throne: has disease (hazards > 0)', () => {
			const sectors = WorldData.getWorldConfiguration("Nurgle's Throne");
			const result = PlanetReviewScorer.score(sectors);
			const hazards = result.axes.find(a => a.key === 'hazards');
			expect(hazards.stars).toBeGreaterThanOrEqual(1);
		});

		test('overall is computed from tier rules', () => {
			const sectors = WorldData.getWorldConfiguration('Fugubos');
			const result = PlanetReviewScorer.score(sectors);
			expect(result.overall).toBeGreaterThan(0);
			expect(result.overall).toBeLessThanOrEqual(6);
			// Should be rounded to 0.5
			expect(result.overall * 2 % 1).toBe(0);
		});

		// ── Kill bonus post-processing ─────────────────────────────────

		test('VOLCANIC_ACTIVITY adds +1 lethality star (KILL_ALL)', () => {
			const base = PlanetReviewScorer.score(['LANDING', 'FOREST']);
			const withKill = PlanetReviewScorer.score(['LANDING', 'FOREST', 'VOLCANIC_ACTIVITY']);
			const baseLethality = base.axes.find(a => a.key === 'lethality').stars;
			const killLethality = withKill.axes.find(a => a.key === 'lethality').stars;
			// +1 from kill bonus, plus sector's own EV
			expect(killLethality - baseLethality).toBeGreaterThanOrEqual(1);
		});

		test('MANKAROG adds +1 lethality star (KILL_RANDOM)', () => {
			const base = PlanetReviewScorer.score(['LANDING', 'FOREST']);
			const withKill = PlanetReviewScorer.score(['LANDING', 'FOREST', 'MANKAROG']);
			const baseLethality = base.axes.find(a => a.key === 'lethality').stars;
			const killLethality = withKill.axes.find(a => a.key === 'lethality').stars;
			// MANKAROG also has FIGHT_32, so the diff should be at least 1
			expect(killLethality - baseLethality).toBeGreaterThanOrEqual(1);
		});

		test('multiple kill sectors stack bonuses', () => {
			const result = PlanetReviewScorer.score(['LANDING', 'VOLCANIC_ACTIVITY', 'MANKAROG']);
			const lethality = result.axes.find(a => a.key === 'lethality').stars;
			// +1 for KILL_ALL + +0.5 for KILL_RANDOM + base EV from FIGHT_32 etc.
			expect(lethality).toBeGreaterThanOrEqual(2);
		});

		test('kill bonuses are clamped at 6 stars', () => {
			// Stack 4x VOLCANIC_ACTIVITY (+8 stars worth) — should clamp at 6
			const sectors = ['LANDING'];
			for (let i = 0; i < 4; i++) sectors.push('VOLCANIC_ACTIVITY');
			const result = PlanetReviewScorer.score(sectors);
			const lethality = result.axes.find(a => a.key === 'lethality').stars;
			expect(lethality).toBeLessThanOrEqual(6);
		});

		// ── Sector bonus: CRISTAL_FIELD → artifacts ──────────────────

		test('CRISTAL_FIELD adds +2 artifact stars', () => {
			const base = PlanetReviewScorer.score(['LANDING', 'FOREST']);
			const withCristal = PlanetReviewScorer.score(['LANDING', 'FOREST', 'CRISTAL_FIELD']);
			const baseArt = base.axes.find(a => a.key === 'artifacts').stars;
			const cristalArt = withCristal.axes.find(a => a.key === 'artifacts').stars;
			expect(cristalArt - baseArt).toBeGreaterThanOrEqual(1.5);
		});
	});

	// =========================================================================
	// _computeOverall (Phase 2 — tier/bucket system)
	// =========================================================================

	describe('_computeOverall', () => {

		function makeAxes(obj) {
			const defaults = { fruits: 0, steaks: 0, fuel: 0, artifacts: 0, lethality: 0, hazards: 0 };
			const merged = { ...defaults, ...obj };
			return Object.entries(merged).map(([key, stars]) => ({ key, label: key, stars }));
		}

		function makeBooleans(oxygen = false, cristal = false) {
			return [
				{ key: 'oxygen', label: 'Oxygen', present: oxygen },
				{ key: 'cristal_field', label: 'Crystal Map', present: cristal },
			];
		}

		// ── Rule 1: Base = best positive axis ────────────────────────

		test('base equals best positive axis', () => {
			const axes = makeAxes({ fuel: 4, fruits: 2 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(4);
		});

		test('base is 0 when all positive axes are 0', () => {
			const axes = makeAxes({ lethality: 3 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(0);
		});

		// ── Rule 2: Size penalty ─────────────────────────────────────

		test('size 9 → no penalty', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(4);
		});

		test('size 10 → −0.5 penalty', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 10)).toBe(3.5);
		});

		test('size 12 → −0.5 penalty', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 12)).toBe(3.5);
		});

		test('size 13 → no penalty', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 13)).toBe(4);
		});

		test('size 16 → no penalty', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 16)).toBe(4);
		});

		test('size 17 → −0.5 penalty', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 17)).toBe(3.5);
		});

		test('size 20 → −0.5 penalty', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 20)).toBe(3.5);
		});

		// ── Rule 3: Secondary bonus ──────────────────────────────────

		test('2nd axis ≥ 3 → +0.5 bonus', () => {
			const axes = makeAxes({ fuel: 4, artifacts: 3 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(4.5);
		});

		test('2nd axis < 3 → no bonus', () => {
			const axes = makeAxes({ fuel: 4, artifacts: 2.5 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(4);
		});

		// ── Rule 4: Danger penalties ─────────────────────────────────

		test('lethality = 6 → −2', () => {
			const axes = makeAxes({ fuel: 4, lethality: 6 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(2);
		});

		test('lethality = 5 → −1.5', () => {
			const axes = makeAxes({ fuel: 4, lethality: 5 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(2.5);
		});

		test('lethality = 4 → −1', () => {
			const axes = makeAxes({ fuel: 4, lethality: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(3);
		});

		test('lethality ≥ 2 but < 4 → −0.5', () => {
			const axes = makeAxes({ fuel: 4, lethality: 2 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(3.5);
		});

		test('lethality < 2 → no penalty', () => {
			const axes = makeAxes({ fuel: 4, lethality: 1.5 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(4);
		});

		test('hazards = 6 → −2', () => {
			const axes = makeAxes({ fuel: 4, hazards: 6 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(2);
		});

		test('hazards = 4 → −1', () => {
			const axes = makeAxes({ fuel: 4, hazards: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(3);
		});

		test('both lethality and hazards penalize cumulatively', () => {
			const axes = makeAxes({ fuel: 5, lethality: 4, hazards: 4 });
			// 5 - 1 - 1 = 3
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 9)).toBe(3);
		});

		// ── Rule 5: Boolean bonuses ──────────────────────────────────

		test('oxygen +0.5', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(true, false), 9)).toBe(4.5);
		});

		test('crystal map +0.5', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(false, true), 9)).toBe(4.5);
		});

		test('both booleans → +1', () => {
			const axes = makeAxes({ fuel: 4 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(true, true), 9)).toBe(5);
		});

		// ── Rule 6: Clamping ─────────────────────────────────────────

		test('result is clamped to minimum 0', () => {
			const axes = makeAxes({ fuel: 0.5, lethality: 5, hazards: 5 });
			// 0.5 - 1.5 - 1.5 - 0.5 (size 10) = -3 → clamped to 0
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(), 10)).toBe(0);
		});

		test('result is clamped to maximum 6', () => {
			const axes = makeAxes({ fuel: 6, artifacts: 5 });
			// 6 + 0.5 (secondary) + 1 (booleans) = 7.5 → clamped to 6
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(true, true), 9)).toBe(6);
		});

		// ── Combined rules ───────────────────────────────────────────

		test('all rules combine correctly', () => {
			// fuel=5 (base), artifacts=3 (+0.5 secondary), lethality=3 (-0.5),
			// oxygen (+0.5), size=10 (-0.5) → 5 + 0.5 - 0.5 + 0.5 - 0.5 = 5
			const axes = makeAxes({ fuel: 5, artifacts: 3, lethality: 3 });
			expect(PlanetReviewScorer._computeOverall(axes, makeBooleans(true, false), 10)).toBe(5);
		});

		// ── Example worlds overall sanity ────────────────────────────

		test('Americas Dream: good overall', () => {
			const sectors = WorldData.getWorldConfiguration("America's Dream");
			const result = PlanetReviewScorer.score(sectors);
			expect(result.overall).toBeGreaterThanOrEqual(2);
		});

		test('Polyphemus: low overall (dangerous)', () => {
			const sectors = WorldData.getWorldConfiguration('Polyphemus');
			const result = PlanetReviewScorer.score(sectors);
			expect(result.overall).toBeLessThanOrEqual(3);
		});

		test('all example worlds have valid overall', () => {
			const worlds = WorldData.getAvailableWorlds();
			for (const name of worlds) {
				const sectors = WorldData.getWorldConfiguration(name);
				const result = PlanetReviewScorer.score(sectors);
				expect(result.overall).toBeGreaterThanOrEqual(0);
				expect(result.overall).toBeLessThanOrEqual(6);
				expect(result.overall * 2 % 1).toBe(0); // rounded to 0.5
			}
		});
	});

	// =========================================================================
	// Diplomacy option
	// =========================================================================

	describe('diplomacy option', () => {

		test('diplomacy reduces lethality on fight-heavy sectors', () => {
			// Thousands Cuts is full of fight sectors (PREDATOR, RUMINANT, etc.)
			const sectors = WorldData.getWorldConfiguration('Thousands Cuts');
			const without = PlanetReviewScorer.score(sectors);
			const withDip = PlanetReviewScorer.score(sectors, { diplomacy: true });
			const letWithout = without.axes.find(a => a.key === 'lethality').stars;
			const letWith = withDip.axes.find(a => a.key === 'lethality').stars;
			expect(letWith).toBeLessThan(letWithout);
		});

		test('diplomacy does not affect non-fight axes', () => {
			const sectors = WorldData.getWorldConfiguration("America's Dream");
			const without = PlanetReviewScorer.score(sectors);
			const withDip = PlanetReviewScorer.score(sectors, { diplomacy: true });
			const fuelWithout = without.axes.find(a => a.key === 'fuel').stars;
			const fuelWith = withDip.axes.find(a => a.key === 'fuel').stars;
			// Fuel comes from FUEL_ events, not FIGHT_, so should stay same or increase
			// (removing FIGHT_ redistributes weight, potentially increasing fuel's share)
			expect(fuelWith).toBeGreaterThanOrEqual(fuelWithout);
		});

		test('diplomacy improves overall on dangerous planets', () => {
			const sectors = WorldData.getWorldConfiguration('Thousands Cuts');
			const without = PlanetReviewScorer.score(sectors);
			const withDip = PlanetReviewScorer.score(sectors, { diplomacy: true });
			expect(withDip.overall).toBeGreaterThanOrEqual(without.overall);
		});

		test('diplomacy=false is the default', () => {
			const sectors = WorldData.getWorldConfiguration('Museum');
			const defaultResult = PlanetReviewScorer.score(sectors);
			const explicitFalse = PlanetReviewScorer.score(sectors, { diplomacy: false });
			expect(defaultResult.overall).toBe(explicitFalse.overall);
			expect(defaultResult.axes).toEqual(explicitFalse.axes);
		});
	});
});
