/**
 * DamagePathSampler Tests
 * 
 * Tests for sampling explaining paths for damage totals.
 * Uses DP algorithm to find valid sector-outcome combinations.
 */

describe('DamagePathSampler', () => {

	// ========================================
	// samplePath()
	// ========================================

	describe('samplePath', () => {

		test('samplePath returns correct structure', () => {
			const sectorOutcomes = [
				{
					sectorName: 'FOREST',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'FIGHT_10', damage: 10, probability: 0.5 }
					]
				}
			];

			const result = DamagePathSampler.samplePath(sectorOutcomes, 10);

			expect(result).toHaveProperty('totalDamage');
			expect(result).toHaveProperty('sources');
			expect(result.totalDamage).toBe(10);
			expect(result.sources.length).toBe(1);
		});

		test('samplePath returns zero damage sources for target 0', () => {
			const sectorOutcomes = [
				{
					sectorName: 'FOREST',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.7 },
						{ eventType: 'FIGHT_10', damage: 10, probability: 0.3 }
					]
				},
				{
					sectorName: 'DESERT',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.8 },
						{ eventType: 'FIGHT_8', damage: 8, probability: 0.2 }
					]
				}
			];

			const result = DamagePathSampler.samplePath(sectorOutcomes, 0);

			expect(result.totalDamage).toBe(0);
			expect(result.sources.every(s => s.damage === 0)).toBe(true);
			expect(result.sources.every(s => s.eventType === null)).toBe(true);
		});

		test('samplePath handles empty sectors', () => {
			const result = DamagePathSampler.samplePath([], 10);

			expect(result.totalDamage).toBe(10);
			expect(result.sources).toEqual([]);
		});

		test('samplePath handles negative target', () => {
			const result = DamagePathSampler.samplePath([{ sectorName: 'A', outcomes: [] }], -5);

			expect(result.totalDamage).toBe(-5);
			expect(result.sources).toEqual([]);
		});

		test('samplePath finds valid path when it exists', () => {
			// Setup: two sectors that can add up to exactly 18
			const sectorOutcomes = [
				{
					sectorName: 'FOREST',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.3 },
						{ eventType: 'FIGHT_10', damage: 10, probability: 0.7 }
					]
				},
				{
					sectorName: 'DESERT',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.4 },
						{ eventType: 'FIGHT_8', damage: 8, probability: 0.6 }
					]
				}
			];

			const result = DamagePathSampler.samplePath(sectorOutcomes, 18);

			// Only way to get 18 is 10 + 8
			expect(result.totalDamage).toBe(18);
			expect(result.sources[0].damage).toBe(10);
			expect(result.sources[1].damage).toBe(8);
		});

		test('samplePath samples from valid paths only', () => {
			// Target 10: can be reached by (10,0) or (0,10) but not (5,5)
			const sectorOutcomes = [
				{
					sectorName: 'A',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'EVENT', damage: 10, probability: 0.5 }
					]
				},
				{
					sectorName: 'B',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'EVENT', damage: 10, probability: 0.5 }
					]
				}
			];

			// Run multiple times to check we always get valid paths
			for (let i = 0; i < 10; i++) {
				const result = DamagePathSampler.samplePath(sectorOutcomes, 10);
				const sum = result.sources.reduce((s, src) => s + src.damage, 0);
				expect(sum).toBe(10);
			}
		});

	});

	// ========================================
	// samplePaths() - batch mode
	// ========================================

	describe('samplePaths', () => {

		test('samplePaths handles empty target array', () => {
			const sectorOutcomes = [
				{ sectorName: 'A', outcomes: [{ eventType: null, damage: 0, probability: 1 }] }
			];

			const result = DamagePathSampler.samplePaths(sectorOutcomes, []);

			expect(result).toEqual([]);
		});

		test('samplePaths returns path for each target', () => {
			const sectorOutcomes = [
				{
					sectorName: 'FOREST',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'FIGHT_10', damage: 10, probability: 0.3 },
						{ eventType: 'FIGHT_20', damage: 20, probability: 0.2 }
					]
				}
			];

			const targets = [0, 10, 20];
			const results = DamagePathSampler.samplePaths(sectorOutcomes, targets);

			expect(results.length).toBe(3);
			expect(results[0].totalDamage).toBe(0);
			expect(results[1].totalDamage).toBe(10);
			expect(results[2].totalDamage).toBe(20);
		});

		test('samplePaths handles target 0 correctly', () => {
			const sectorOutcomes = [
				{
					sectorName: 'A',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'EVENT', damage: 10, probability: 0.5 }
					]
				},
				{
					sectorName: 'B',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.8 },
						{ eventType: 'EVENT', damage: 5, probability: 0.2 }
					]
				}
			];

			const results = DamagePathSampler.samplePaths(sectorOutcomes, [0]);

			expect(results[0].totalDamage).toBe(0);
			expect(results[0].sources.length).toBe(2);
			expect(results[0].sources[0].damage).toBe(0);
			expect(results[0].sources[1].damage).toBe(0);
		});

		test('samplePaths reuses DP table for efficiency', () => {
			// Can't directly test internal caching, but can verify correctness
			const sectorOutcomes = [
				{
					sectorName: 'A',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'E1', damage: 5, probability: 0.3 },
						{ eventType: 'E2', damage: 10, probability: 0.2 }
					]
				},
				{
					sectorName: 'B',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.6 },
						{ eventType: 'E3', damage: 5, probability: 0.4 }
					]
				}
			];

			// Multiple targets with same structure
			const targets = [0, 5, 10, 15];
			const results = DamagePathSampler.samplePaths(sectorOutcomes, targets);

			// Verify each result is correct
			for (let i = 0; i < targets.length; i++) {
				expect(results[i].totalDamage).toBe(targets[i]);
				const sum = results[i].sources.reduce((s, src) => s + src.damage, 0);
				expect(sum).toBe(targets[i]);
			}
		});

	});

	// ========================================
	// _buildWaysTable() - internal DP
	// ========================================

	describe('_buildWaysTable', () => {

		test('_buildWaysTable creates valid DP structure', () => {
			const sectorOutcomes = [
				{
					sectorName: 'A',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'EVENT', damage: 10, probability: 0.5 }
					]
				}
			];

			const ways = DamagePathSampler._buildWaysTable(sectorOutcomes, 10);

			// Should have n+1 entries (one per sector + terminal)
			expect(ways.length).toBe(2);

			// Terminal state: ways[1][0] = 1
			expect(ways[1].get(0)).toBe(1);

			// From sector 0: can reach 0 or 10 with corresponding probabilities
			expect(ways[0].has(0) || ways[0].has(10)).toBe(true);
		});

		test('_buildWaysTable respects maxDamage cap', () => {
			const sectorOutcomes = [
				{
					sectorName: 'A',
					outcomes: [
						{ eventType: null, damage: 0, probability: 0.5 },
						{ eventType: 'EVENT', damage: 100, probability: 0.5 }
					]
				}
			];

			const ways = DamagePathSampler._buildWaysTable(sectorOutcomes, 50);

			// 100 damage exceeds cap, so only 0 should be reachable
			expect(ways[0].has(0)).toBe(true);
			expect(ways[0].has(100)).toBe(false);
		});

	});

});
