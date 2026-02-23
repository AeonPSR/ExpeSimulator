/**
 * SectorSampler
 * 
 * BACKEND: Handles weighted sector composition enumeration for movement-limited expeditions.
 * Implements Fisher's noncentral multivariate hypergeometric distribution.
 * 
 * When movement speed K < total sectors N, we can't visit all sectors.
 * This module enumerates all possible K-sector compositions and their probabilities.
 * 
 * @module probability/SectorSampler
 */
const SectorSampler = {

	// Memoization cache for binomial coefficients
	_binomialCache: new Map(),

	/**
	 * Computes binomial coefficient C(n, k) with memoization.
	 * 
	 * @param {number} n - Total items
	 * @param {number} k - Items to choose
	 * @returns {number} C(n, k)
	 */
	binomial(n, k) {
		if (k < 0 || k > n) return 0;
		if (k === 0 || k === n) return 1;
		
		const key = `${n},${k}`;
		if (this._binomialCache.has(key)) {
			return this._binomialCache.get(key);
		}

		// Use symmetry: C(n, k) = C(n, n-k)
		if (k > n - k) {
			k = n - k;
		}

		let result = 1;
		for (let i = 0; i < k; i++) {
			result = result * (n - i) / (i + 1);
		}

		this._binomialCache.set(key, result);
		return result;
	},

	/**
	 * Enumerates all valid compositions of K sectors drawn from a planet.
	 * A composition is a count per sector type that sums to K.
	 * 
	 * @param {Object} sectorCounts - Map of sectorType → count on planet (e.g., {FOREST: 3, DESERT: 4})
	 * @param {number} K - Number of sectors to draw (movement speed)
	 * @returns {Array<Object>} Array of composition objects, each with counts per sector type
	 */
	enumerateCompositions(sectorCounts, K) {
		const sectorTypes = Object.keys(sectorCounts);
		const maxCounts = sectorTypes.map(t => sectorCounts[t]);
		const compositions = [];

		// Recursive enumeration helper
		const enumerate = (typeIndex, remaining, currentComposition) => {
			if (typeIndex === sectorTypes.length) {
				if (remaining === 0) {
					// Valid composition - clone and store
					const composition = {};
					for (let i = 0; i < sectorTypes.length; i++) {
						composition[sectorTypes[i]] = currentComposition[i];
					}
					compositions.push(composition);
				}
				return;
			}

			const maxForThisType = Math.min(maxCounts[typeIndex], remaining);
			for (let count = 0; count <= maxForThisType; count++) {
				currentComposition[typeIndex] = count;
				enumerate(typeIndex + 1, remaining - count, currentComposition);
			}
		};

		enumerate(0, K, new Array(sectorTypes.length).fill(0));
		return compositions;
	},

	/**
	 * Computes noncentral multivariate hypergeometric probabilities for compositions.
	 * 
	 * Formula: P(k_1, ..., k_m) = [∏ C(n_i, k_i) × ω_i^k_i] / Z
	 * where Z is the sum over all valid compositions (normalization constant).
	 * 
	 * @param {Array<Object>} compositions - Array of composition objects
	 * @param {Object} sectorCounts - Map of sectorType → count on planet
	 * @param {Object} weights - Map of sectorType → exploration weight
	 * @returns {Array<Object>} Compositions with their probabilities: [{composition, probability}, ...]
	 */
	computeProbabilities(compositions, sectorCounts, weights) {
		const sectorTypes = Object.keys(sectorCounts);

		// Compute unnormalized probability for each composition
		const unnormalized = compositions.map(composition => {
			let value = 1;
			for (const type of sectorTypes) {
				const n_i = sectorCounts[type];
				const k_i = composition[type] || 0;
				const omega_i = weights[type] || 1;

				value *= this.binomial(n_i, k_i) * Math.pow(omega_i, k_i);
			}
			return { composition, unnormalized: value };
		});

		// Compute normalization constant (sum of all unnormalized values)
		const Z = unnormalized.reduce((sum, item) => sum + item.unnormalized, 0);

		// Normalize to get probabilities
		return unnormalized.map(item => ({
			composition: item.composition,
			probability: Z > 0 ? item.unnormalized / Z : 0
		}));
	},

	/**
	 * Gets effective exploration weights for each sector type, applying item multipliers.
	 * 
	 * @param {Array<string>} sectorTypes - List of sector types on the planet
	 * @param {Object} loadout - Player loadout { items: [...], ... }
	 * @returns {Object} Map of sectorType → effective weight
	 */
	getEffectiveWeights(sectorTypes, loadout = {}) {
		const weights = {};

		// Get base weights from PlanetSectorConfigData
		for (const sectorType of sectorTypes) {
			const config = PlanetSectorConfigData?.find(s => s.sectorName === sectorType);
			weights[sectorType] = config?.weightAtPlanetExploration || 8;
		}

		// Apply item multipliers
		const items = loadout.items || [];
		for (const itemId of items) {
			const itemName = itemId.replace('.jpg', '');
			const itemConfig = ItemEffects?.[itemName];
			
			if (itemConfig?.effects?.sectorDiscoveryMultiplier) {
				const multipliers = itemConfig.effects.sectorDiscoveryMultiplier;
				for (const [sectorType, multiplier] of Object.entries(multipliers)) {
					if (weights[sectorType] !== undefined) {
						weights[sectorType] *= multiplier;
					}
				}
			}
		}

		return weights;
	},

	/**
	 * Main entry point: generates all weighted compositions for a planet expedition.
	 * 
	 * @param {Object} sectorCounts - Map of sectorType → count on planet (excluding LANDING/LOST)
	 * @param {number} movementSpeed - Number of sectors that can be explored
	 * @param {Object} loadout - Player loadout for item effects
	 * @returns {Array<Object>} [{composition: {FOREST: 2, ...}, probability: 0.xxx}, ...]
	 */
	generateWeightedCompositions(sectorCounts, movementSpeed, loadout = {}) {
		const sectorTypes = Object.keys(sectorCounts);
		const totalSectors = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

		// If we can visit all sectors, return single composition with probability 1
		if (movementSpeed >= totalSectors) {
			return [{
				composition: { ...sectorCounts },
				probability: 1.0
			}];
		}

		// Get effective weights (base + item multipliers)
		const weights = this.getEffectiveWeights(sectorTypes, loadout);

		// Enumerate all valid compositions
		const compositions = this.enumerateCompositions(sectorCounts, movementSpeed);

		// Compute probabilities and prune negligible compositions
		const weighted = this.computeProbabilities(compositions, sectorCounts, weights);
		return this.pruneCompositions(weighted);
	},

	/**
	 * Removes compositions with negligible probability and renormalizes.
	 * Keeps compositions that together cover at least 99.9% of probability mass.
	 * 
	 * @param {Array<Object>} weighted - [{composition, probability}, ...]
	 * @param {number} threshold - Minimum cumulative coverage (default 0.999)
	 * @returns {Array<Object>} Pruned and renormalized compositions
	 */
	pruneCompositions(weighted, threshold = 0.999) {
		// Sort descending by probability
		const sorted = [...weighted].sort((a, b) => b.probability - a.probability);
		
		let cumulative = 0;
		const kept = [];
		for (const comp of sorted) {
			kept.push(comp);
			cumulative += comp.probability;
			if (cumulative >= threshold) break;
		}

		// Renormalize so probabilities sum to 1
		const sum = kept.reduce((s, c) => s + c.probability, 0);
		return kept.map(c => ({
			composition: c.composition,
			probability: c.probability / sum
		}));
	},

	/**
	 * Expands a composition into a flat sector list.
	 * E.g., {FOREST: 2, DESERT: 1} → ['FOREST', 'FOREST', 'DESERT']
	 * 
	 * @param {Object} composition - Map of sectorType → count
	 * @returns {Array<string>} Flat array of sector names
	 */
	expandComposition(composition) {
		const sectors = [];
		for (const [sectorType, count] of Object.entries(composition)) {
			for (let i = 0; i < count; i++) {
				sectors.push(sectorType);
			}
		}
		return sectors;
	},

	/**
	 * Validates that probabilities sum to 1 (within floating point tolerance).
	 * For debugging purposes.
	 * 
	 * @param {Array<Object>} weightedCompositions - Output from generateWeightedCompositions
	 * @returns {Object} {valid: boolean, sum: number, error: number}
	 */
	validateProbabilities(weightedCompositions) {
		const sum = weightedCompositions.reduce((s, c) => s + c.probability, 0);
		const error = Math.abs(1.0 - sum);
		return {
			valid: error < 1e-10,
			sum: sum,
			error: error
		};
	}
};

// Export
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.SectorSampler = SectorSampler;
