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
 * chance and expected drop can be evaluated fight by fight.
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
	 * Computes expected reward items per scenario from raw-strength fight paths.
	 *
	 * @param {Object|null} rewardPaths - { optimist, average, pessimist }, each
	 *   { totalDamage, sources: Array<{ sector, eventType, damage }> } where
	 *   damage is the raw fight strength (no power reduction applied).
	 * @param {number} basePower    - Team base fighting power (without grenades)
	 * @param {number} grenadeCount - Total grenades available to the team
	 * @returns {Object} Per-bucket scenario yields:
	 *   { steaks: {optimist,average,pessimist}, fruits: {...}, artefacts: {...}, mapFragments: {...} }
	 */
	calculate(rewardPaths, basePower = 0, grenadeCount = 0) {
		const result = {
			steaks:       { optimist: 0, average: 0, pessimist: 0 },
			fruits:       { optimist: 0, average: 0, pessimist: 0 },
			artefacts:    { optimist: 0, average: 0, pessimist: 0 },
			mapFragments: { optimist: 0, average: 0, pessimist: 0 },
		};

		if (!rewardPaths) return result;

		// The raw fight distribution's percentiles are semantically inverted relative
		// to resource conventions: P75 (pessimist) = most fights = highest reward,
		// P25 (optimist) = fewest fights = lowest reward. Map accordingly so that
		// high reward lands in the resource optimist column and low reward in pessimist.
		const REWARD_TO_RESOURCE = { optimist: 'pessimist', average: 'average', pessimist: 'optimist' };

		for (const rewardScenario of this.SCENARIOS) {
			const path = rewardPaths[rewardScenario];
			if (!path || !Array.isArray(path.sources)) continue;

			const expected = this._expectedItemsForPath(path.sources, basePower, grenadeCount);
			const resourceScenario = REWARD_TO_RESOURCE[rewardScenario];

			for (const itemId in expected) {
				const bucket = this.ITEM_TO_RESOURCE[itemId];
				if (bucket) result[bucket][resourceScenario] += expected[itemId];
			}
		}

		return result;
	},

	/**
	 * Computes expected reward item counts for a single sampled path.
	 *
	 * Each fight source carries its raw strength (no power reduction). Grenades
	 * are spent on the toughest fights first, up to the amount needed to defeat
	 * each one, giving each fight an effective power for the reward probability.
	 *
	 * @private
	 * @param {Array<{ sector, eventType, damage }>} sources - One path's sources,
	 *   where damage is the raw fight strength.
	 * @param {number} basePower
	 * @param {number} grenadeCount
	 * @returns {Object} itemId -> expected quantity
	 */
	_expectedItemsForPath(sources, basePower, grenadeCount) {
		const grenadePower = (typeof FightingPowerService !== 'undefined')
			? FightingPowerService.getGrenadePower()
			: 3;

		// source.damage is the raw fight strength.
		const fights = sources
			.filter(s => s.eventType && s.eventType.indexOf('FIGHT_') === 0)
			.map(s => ({ sector: s.sector, strength: s.damage }));

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
