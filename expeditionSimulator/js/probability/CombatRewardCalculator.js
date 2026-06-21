/**
 * CombatRewardCalculator
 *
 * BACKEND: Computes expected combat-reward items per scenario and exposes them
 * in the same resource buckets used by ResourceCalculator (steaks, fruits,
 * artefacts, mapFragments).
 *
 * It consumes the sampled damage paths produced by FightCalculator. Each path
 * is a concrete list of the fights faced in that scenario, so grenades can be
 * spent per fight (up to the amount needed to defeat each one) and the win
 * chance — and therefore the expected drop — can be evaluated fight by fight.
 *
 * Reward items are returned as expected values, matching how resource yields
 * are reported elsewhere.
 *
 * @module probability/CombatRewardCalculator
 */
const CombatRewardCalculator = {

	/**
	 * Maps a reward item id to the resource bucket it contributes to.
	 */
	ITEM_TO_RESOURCE: {
		ALIEN_STEAK: 'steaks',
		FRUIT:       'fruits',
		ARTEFACT:    'artefacts',
		STARMAP:     'mapFragments',
	},

	/**
	 * Scenarios shared with the resource model (worstCase is ignored: the
	 * resource side has no worst-case column).
	 */
	SCENARIOS: ['optimist', 'average', 'pessimist'],

	/**
	 * Computes expected reward items per scenario from sampled fight paths.
	 *
	 * @param {Object|null} sampledPaths - { optimist, average, pessimist, worstCase },
	 *   each { totalDamage, sources: Array<{ sector, eventType, damage }> }
	 * @param {number} basePower    - Team base fighting power (without grenades)
	 * @param {number} grenadeCount - Total grenades available to the team
	 * @returns {Object} Per-bucket scenario yields:
	 *   { steaks: {optimist,average,pessimist}, fruits: {...}, artefacts: {...}, mapFragments: {...} }
	 */
	calculate(sampledPaths, basePower = 0, grenadeCount = 0) {
		const result = {
			steaks:       { optimist: 0, average: 0, pessimist: 0 },
			fruits:       { optimist: 0, average: 0, pessimist: 0 },
			artefacts:    { optimist: 0, average: 0, pessimist: 0 },
			mapFragments: { optimist: 0, average: 0, pessimist: 0 },
		};

		if (!sampledPaths) return result;

		for (const scenario of this.SCENARIOS) {
			const path = sampledPaths[scenario];
			if (!path || !Array.isArray(path.sources)) continue;

			const expected = this._expectedItemsForPath(path.sources, basePower, grenadeCount);

			for (const itemId in expected) {
				const bucket = this.ITEM_TO_RESOURCE[itemId];
				if (bucket) result[bucket][scenario] += expected[itemId];
			}
		}

		return result;
	},

	/**
	 * Computes expected reward item counts for a single sampled path.
	 *
	 * Grenades are allocated to the toughest fights first, spending up to the
	 * amount needed to defeat each fight. Each fight's effective power then
	 * drives its reward probability via CombatRewardService.
	 *
	 * @private
	 * @param {Array<{ sector, eventType, damage }>} sources - One sampled path's sources
	 * @param {number} basePower
	 * @param {number} grenadeCount
	 * @returns {Object} itemId -> expected quantity
	 */
	_expectedItemsForPath(sources, basePower, grenadeCount) {
		const grenadePower = (typeof FightingPowerService !== 'undefined')
			? FightingPowerService.getGrenadePower()
			: 3;

		// Recover the fights faced. The sampled damage is max(0, strength - basePower),
		// so strength = damage + basePower (when already won, this yields strength = basePower,
		// which still resolves to a guaranteed reward).
		const fights = sources
			.filter(s => s.eventType && s.eventType.indexOf('FIGHT_') === 0)
			.map(s => ({ sector: s.sector, strength: s.damage + basePower }));

		// Toughest fights first so scarce grenades secure the hardest wins.
		fights.sort((a, b) => b.strength - a.strength);

		let pool = grenadeCount;
		const totals = {};

		for (const fight of fights) {
			const needed = Math.max(0, Math.ceil((fight.strength - basePower) / grenadePower));
			const used = Math.min(needed, pool);
			pool -= used;

			const effectivePower = basePower + used * grenadePower;
			const { outcomes } = CombatRewardService.computeRewardOutcomes(
				effectivePower, fight.strength, fight.sector
			);

			for (const outcome of outcomes) {
				for (const item of outcome.items) {
					totals[item.id] = (totals[item.id] || 0) + outcome.probability * item.qty;
				}
			}
		}

		return totals;
	},
};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.CombatRewardCalculator = CombatRewardCalculator;
