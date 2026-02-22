/**
 * SectorSampler Tests
 * 
 * Tests for the weighted sector composition enumeration.
 * Implements noncentral multivariate hypergeometric distribution.
 */

describe('SectorSampler', () => {

	// Mock PlanetSectorConfigData and ItemEffects (defined as const in config.js, not global)
	beforeAll(() => {
		global.PlanetSectorConfigData = [
			{ name: 'FOREST_default', sectorName: 'FOREST', weightAtPlanetExploration: 8 },
			{ name: 'DESERT_default', sectorName: 'DESERT', weightAtPlanetExploration: 8 },
			{ name: 'HYDROCARBON_default', sectorName: 'HYDROCARBON', weightAtPlanetExploration: 8 },
		];
		global.ItemEffects = {
			'echo_sounder': {
				name: 'Echo Sounder',
				effects: {
					sectorDiscoveryMultiplier: { HYDROCARBON: 5 }
				}
			}
		};
	});

	afterAll(() => {
		delete global.PlanetSectorConfigData;
		delete global.ItemEffects;
	});

	// Clear memoization cache before each test to ensure isolation
	beforeEach(() => {
		SectorSampler._binomialCache.clear();
	});

	// ========================================
	// binomial()
	// ========================================

	describe('binomial', () => {

		test('binomial coefficient calculation', () => {
			expect(SectorSampler.binomial(5, 2)).toBe(10);  // C(5,2) = 10
			expect(SectorSampler.binomial(10, 0)).toBe(1); // C(n,0) = 1
			expect(SectorSampler.binomial(7, 7)).toBe(1);  // C(n,n) = 1
			expect(SectorSampler.binomial(6, 3)).toBe(20); // C(6,3) = 20
		});

		test('binomial handles edge cases', () => {
			expect(SectorSampler.binomial(5, -1)).toBe(0); // k < 0
			expect(SectorSampler.binomial(5, 6)).toBe(0);  // k > n
			expect(SectorSampler.binomial(0, 0)).toBe(1);  // C(0,0) = 1
		});

		test('binomial uses memoization', () => {
			// Clear cache first
			SectorSampler._binomialCache.clear();
			expect(SectorSampler._binomialCache.size).toBe(0);

			// First call should compute and cache
			const result1 = SectorSampler.binomial(10, 3);
			expect(result1).toBe(120);
			expect(SectorSampler._binomialCache.has('10,3')).toBe(true);

			// Second call should use cache (same result)
			const result2 = SectorSampler.binomial(10, 3);
			expect(result2).toBe(120);
		});

		test('binomial uses symmetry optimization', () => {
			// C(10, 8) should use C(10, 2) due to symmetry
			const result = SectorSampler.binomial(10, 8);
			expect(result).toBe(45); // C(10,2) = C(10,8) = 45
		});

	});

	// ========================================
	// enumerateCompositions()
	// ========================================

	describe('enumerateCompositions', () => {

		test('enumerateCompositions generates all valid combinations', () => {
			// Planet with {A:2, B:2}, K=2: should get 3 compositions
			const sectorCounts = { A: 2, B: 2 };
			const K = 2;

			const compositions = SectorSampler.enumerateCompositions(sectorCounts, K);

			// Expected: {A:2, B:0}, {A:1, B:1}, {A:0, B:2}
			expect(compositions.length).toBe(3);
			
			// Check each composition sums to K
			for (const comp of compositions) {
				const sum = Object.values(comp).reduce((a, b) => a + b, 0);
				expect(sum).toBe(K);
			}

			// Verify specific compositions exist
			const hasA2B0 = compositions.some(c => c.A === 2 && c.B === 0);
			const hasA1B1 = compositions.some(c => c.A === 1 && c.B === 1);
			const hasA0B2 = compositions.some(c => c.A === 0 && c.B === 2);
			expect(hasA2B0).toBe(true);
			expect(hasA1B1).toBe(true);
			expect(hasA0B2).toBe(true);
		});

		test('enumerateCompositions respects max counts', () => {
			// Planet with {A:1, B:3}, K=2
			// Can't draw 2 from A (only 1 available)
			const sectorCounts = { A: 1, B: 3 };
			const K = 2;

			const compositions = SectorSampler.enumerateCompositions(sectorCounts, K);

			// Expected: {A:1, B:1}, {A:0, B:2}
			expect(compositions.length).toBe(2);

			// Verify no composition has A > 1
			for (const comp of compositions) {
				expect(comp.A).toBeLessThanOrEqual(1);
			}
		});

		test('enumerateCompositions with K=0 returns single empty composition', () => {
			const sectorCounts = { A: 2, B: 2 };
			const K = 0;

			const compositions = SectorSampler.enumerateCompositions(sectorCounts, K);

			expect(compositions.length).toBe(1);
			expect(compositions[0].A).toBe(0);
			expect(compositions[0].B).toBe(0);
		});

		test('enumerateCompositions with three sector types', () => {
			// {A:1, B:1, C:1}, K=2: should get 3 compositions
			const sectorCounts = { A: 1, B: 1, C: 1 };
			const K = 2;

			const compositions = SectorSampler.enumerateCompositions(sectorCounts, K);

			// {A:1, B:1, C:0}, {A:1, B:0, C:1}, {A:0, B:1, C:1}
			expect(compositions.length).toBe(3);
		});

	});

	// ========================================
	// computeProbabilities()
	// ========================================

	describe('computeProbabilities', () => {

		test('computeProbabilities sums to 1.0', () => {
			const sectorCounts = { A: 2, B: 2 };
			const compositions = SectorSampler.enumerateCompositions(sectorCounts, 2);
			const weights = { A: 1, B: 1 };

			const result = SectorSampler.computeProbabilities(compositions, sectorCounts, weights);

			const sum = result.reduce((s, r) => s + r.probability, 0);
			expect(sum).toBeCloseTo(1.0, 10);
		});

		test('computeProbabilities with uniform weights reduces to hypergeometric', () => {
			// {A:2, B:2}, K=2, uniform weights
			// P({A:2}) = C(2,2)*C(2,0) / C(4,2) = 1/6
			// P({A:1,B:1}) = C(2,1)*C(2,1) / C(4,2) = 4/6
			// P({B:2}) = C(2,0)*C(2,2) / C(4,2) = 1/6
			const sectorCounts = { A: 2, B: 2 };
			const compositions = SectorSampler.enumerateCompositions(sectorCounts, 2);
			const weights = { A: 1, B: 1 };

			const result = SectorSampler.computeProbabilities(compositions, sectorCounts, weights);

			const pA2 = result.find(r => r.composition.A === 2)?.probability;
			const pA1B1 = result.find(r => r.composition.A === 1 && r.composition.B === 1)?.probability;
			const pB2 = result.find(r => r.composition.B === 2)?.probability;

			expect(pA2).toBeCloseTo(1/6, 10);
			expect(pA1B1).toBeCloseTo(4/6, 10);
			expect(pB2).toBeCloseTo(1/6, 10);
		});

		test('computeProbabilities with varying weights favors higher weights', () => {
			// Higher weight for A should make A-heavy compositions more likely
			const sectorCounts = { A: 2, B: 2 };
			const compositions = SectorSampler.enumerateCompositions(sectorCounts, 2);
			
			const uniformResult = SectorSampler.computeProbabilities(compositions, sectorCounts, { A: 1, B: 1 });
			const weightedResult = SectorSampler.computeProbabilities(compositions, sectorCounts, { A: 10, B: 1 });

			const uniformA2 = uniformResult.find(r => r.composition.A === 2)?.probability;
			const weightedA2 = weightedResult.find(r => r.composition.A === 2)?.probability;

			// With higher A weight, P(A:2) should be higher
			expect(weightedA2).toBeGreaterThan(uniformA2);
		});

		test('computeProbabilities handles empty compositions array', () => {
			const result = SectorSampler.computeProbabilities([], { A: 2 }, { A: 1 });
			expect(result.length).toBe(0);
		});

	});

	// ========================================
	// getEffectiveWeights()
	// ========================================

	describe('getEffectiveWeights', () => {

		test('getEffectiveWeights defaults to base weight', () => {
			// Without any items, should use weightAtPlanetExploration from config (8 for most sectors)
			const weights = SectorSampler.getEffectiveWeights(['FOREST', 'DESERT'], {});

			// Both should have default weight (typically 8)
			expect(weights.FOREST).toBe(8);
			expect(weights.DESERT).toBe(8);
		});

		test('getEffectiveWeights applies item multipliers', () => {
			// Echo Sounder multiplies HYDROCARBON weight by 5
			const loadout = { items: ['echo_sounder.jpg'] };
			const weights = SectorSampler.getEffectiveWeights(['HYDROCARBON', 'FOREST'], loadout);

			expect(weights.HYDROCARBON).toBe(40); // 8 * 5
			expect(weights.FOREST).toBe(8);       // Unchanged
		});

		test('getEffectiveWeights handles missing sector config', () => {
			// Unknown sector should default to 8
			const weights = SectorSampler.getEffectiveWeights(['UNKNOWN_SECTOR'], {});
			expect(weights.UNKNOWN_SECTOR).toBe(8);
		});

	});

	// ========================================
	// generateWeightedCompositions()
	// ========================================

	describe('generateWeightedCompositions', () => {

		test('generateWeightedCompositions returns compositions with probabilities', () => {
			const sectorCounts = { FOREST: 2, DESERT: 2 };
			const movementSpeed = 2;

			const result = SectorSampler.generateWeightedCompositions(sectorCounts, movementSpeed);

			expect(result.length).toBe(3);
			
			// Each result should have composition and probability
			for (const item of result) {
				expect(item.composition).toBeDefined();
				expect(item.probability).toBeDefined();
				expect(typeof item.probability).toBe('number');
			}

			// Probabilities should sum to 1
			const sum = result.reduce((s, r) => s + r.probability, 0);
			expect(sum).toBeCloseTo(1.0, 10);
		});

		test('generateWeightedCompositions returns single composition when K >= N', () => {
			const sectorCounts = { FOREST: 2, DESERT: 1 };
			const movementSpeed = 5; // More than total sectors (3)

			const result = SectorSampler.generateWeightedCompositions(sectorCounts, movementSpeed);

			expect(result.length).toBe(1);
			expect(result[0].probability).toBe(1.0);
			expect(result[0].composition.FOREST).toBe(2);
			expect(result[0].composition.DESERT).toBe(1);
		});

	});

	// ========================================
	// expandComposition()
	// ========================================

	describe('expandComposition', () => {

		test('expandComposition creates correct sector array', () => {
			const composition = { FOREST: 2, DESERT: 1 };

			const sectors = SectorSampler.expandComposition(composition);

			expect(sectors.length).toBe(3);
			expect(sectors.filter(s => s === 'FOREST').length).toBe(2);
			expect(sectors.filter(s => s === 'DESERT').length).toBe(1);
		});

		test('expandComposition handles empty composition', () => {
			const composition = { FOREST: 0, DESERT: 0 };

			const sectors = SectorSampler.expandComposition(composition);

			expect(sectors.length).toBe(0);
		});

		test('expandComposition handles single sector type', () => {
			const composition = { FOREST: 5 };

			const sectors = SectorSampler.expandComposition(composition);

			expect(sectors.length).toBe(5);
			expect(sectors.every(s => s === 'FOREST')).toBe(true);
		});

	});

	// ========================================
	// validateProbabilities()
	// ========================================

	describe('validateProbabilities', () => {

		test('validateProbabilities detects valid probabilities', () => {
			const compositions = [
				{ composition: {}, probability: 0.5 },
				{ composition: {}, probability: 0.5 }
			];

			const result = SectorSampler.validateProbabilities(compositions);

			expect(result.valid).toBe(true);
			expect(result.sum).toBeCloseTo(1.0, 10);
		});

		test('validateProbabilities detects invalid probabilities', () => {
			const compositions = [
				{ composition: {}, probability: 0.3 },
				{ composition: {}, probability: 0.3 }
			];

			const result = SectorSampler.validateProbabilities(compositions);

			expect(result.valid).toBe(false);
			expect(result.sum).toBeCloseTo(0.6, 10);
		});

	});

});
