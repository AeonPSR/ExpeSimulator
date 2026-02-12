/**
 * DamagePathSampler
 * 
 * BACKEND: Samples explaining paths for a given total damage value.
 * 
 * After convolution gives us P(total = k), this module can sample ONE concrete
 * assignment of damage values to sectors that explains how k was reached.
 * This recovers provenance information (which sectors contributed what damage,
 * from which event types) that is lost during convolution.
 * 
 * Algorithm:
 *   1. Precompute DP table: ways[sector][remaining] = weighted count of ways
 *      to reach exactly `remaining` damage using sectors [sector..n-1]
 *   2. Sample path: For each sector, choose an outcome weighted by
 *      (outcome.probability × ways_to_finish_remaining)
 * 
 * @module probability/DamagePathSampler
 */
const DamagePathSampler = {

	/**
	 * Samples an explaining path for a target total damage.
	 * 
	 * @param {Array<Object>} sectorOutcomes - Array of sector outcome data, one per sector.
	 *   Each element: {
	 *     sectorName: string,
	 *     outcomes: Array<{ eventType: string, damage: number, probability: number }>
	 *   }
	 *   Note: outcomes should include the "no damage" case with eventType: null, damage: 0
	 * @param {number} targetTotal - The total damage to explain
	 * @returns {Object} { totalDamage, sources: Array<{ sector, eventType, damage }> }
	 */
	samplePath(sectorOutcomes, targetTotal) {
		const n = sectorOutcomes.length;
		
		if (n === 0 || targetTotal < 0) {
			return { totalDamage: targetTotal, sources: [] };
		}

		// Edge case: target 0 means all sectors contributed 0
		if (targetTotal === 0) {
			return {
				totalDamage: 0,
				sources: sectorOutcomes.map(s => ({
					sector: s.sectorName,
					eventType: null,
					damage: 0
				}))
			};
		}

		// Step 1: Build DP table
		// ways[sector][remaining] = total probability weight of paths from sector to end
		// that sum to exactly `remaining`
		const ways = this._buildWaysTable(sectorOutcomes, targetTotal);

		// Step 2: Sample path using the DP table
		const sources = [];
		let remaining = targetTotal;

		for (let i = 0; i < n; i++) {
			const sector = sectorOutcomes[i];
			const outcome = this._sampleOutcomeForSector(sector, remaining, ways, i, n);
			
			sources.push({
				sector: sector.sectorName,
				eventType: outcome.eventType,
				damage: outcome.damage
			});

			remaining -= outcome.damage;
		}

		return { totalDamage: targetTotal, sources };
	},

	/**
	 * Builds the DP "ways" table.
	 * ways[i][r] = probability weight of reaching exactly r from sectors [i..n-1]
	 * 
	 * @private
	 */
	_buildWaysTable(sectorOutcomes, maxDamage) {
		const n = sectorOutcomes.length;
		
		// Initialize: ways[n][0] = 1, ways[n][r>0] = 0
		// We use Maps for sparse storage since damage can be large
		const ways = new Array(n + 1);
		ways[n] = new Map([[0, 1]]);

		// Fill backwards: ways[i][r] = sum over outcomes o of: o.prob × ways[i+1][r - o.damage]
		for (let i = n - 1; i >= 0; i--) {
			ways[i] = new Map();
			const sector = sectorOutcomes[i];

			for (const outcome of sector.outcomes) {
				const dmg = outcome.damage;
				const prob = outcome.probability;

				// For each reachable state from i+1, extend backwards
				for (const [nextRemaining, nextWays] of ways[i + 1]) {
					const thisRemaining = nextRemaining + dmg;
					if (thisRemaining <= maxDamage) {
						const contribution = prob * nextWays;
						ways[i].set(thisRemaining, (ways[i].get(thisRemaining) || 0) + contribution);
					}
				}
			}
		}

		return ways;
	},

	/**
	 * Samples one outcome for a sector, weighted by probability × ways_to_finish.
	 * 
	 * @private
	 */
	_sampleOutcomeForSector(sector, remaining, ways, sectorIndex, totalSectors) {
		const candidates = [];
		let totalWeight = 0;

		for (const outcome of sector.outcomes) {
			if (outcome.damage > remaining) continue;

			const futureRemaining = remaining - outcome.damage;
			const futureWays = sectorIndex + 1 < totalSectors
				? (ways[sectorIndex + 1].get(futureRemaining) || 0)
				: (futureRemaining === 0 ? 1 : 0);

			if (futureWays > 0) {
				const weight = outcome.probability * futureWays;
				candidates.push({ outcome, weight });
				totalWeight += weight;
			}
		}

		if (candidates.length === 0 || totalWeight === 0) {
			// Fallback: no valid path found (shouldn't happen if targetTotal is reachable)
			console.warn(`[DamagePathSampler] No valid path for remaining=${remaining} at sector ${sectorIndex}`);
			return { eventType: null, damage: 0 };
		}

		// Weighted random selection
		const roll = Math.random() * totalWeight;
		let cumulative = 0;
		for (const { outcome, weight } of candidates) {
			cumulative += weight;
			if (roll <= cumulative) {
				return outcome;
			}
		}

		// Fallback to last candidate (numerical precision edge case)
		return candidates[candidates.length - 1].outcome;
	},

	/**
	 * Samples paths for multiple target totals at once (batch mode).
	 * More efficient than calling samplePath repeatedly since DP table is reused.
	 * 
	 * @param {Array<Object>} sectorOutcomes - Same as samplePath
	 * @param {Array<number>} targetTotals - Array of target totals to sample
	 * @returns {Array<Object>} Array of sampled paths, one per target
	 */
	samplePaths(sectorOutcomes, targetTotals) {
		if (targetTotals.length === 0) return [];

		const maxTarget = Math.max(...targetTotals);
		const ways = this._buildWaysTable(sectorOutcomes, maxTarget);

		return targetTotals.map(target => {
			if (target === 0) {
				return {
					totalDamage: 0,
					sources: sectorOutcomes.map(s => ({
						sector: s.sectorName,
						eventType: null,
						damage: 0
					}))
				};
			}

			const sources = [];
			let remaining = target;

			for (let i = 0; i < sectorOutcomes.length; i++) {
				const sector = sectorOutcomes[i];
				const outcome = this._sampleOutcomeForSector(sector, remaining, ways, i, sectorOutcomes.length);
				
				sources.push({
					sector: sector.sectorName,
					eventType: outcome.eventType,
					damage: outcome.damage
				});

				remaining -= outcome.damage;
			}

			return { totalDamage: target, sources };
		});
	}
};

// Export
if (typeof window !== 'undefined') {
	window.DamagePathSampler = DamagePathSampler;
}
