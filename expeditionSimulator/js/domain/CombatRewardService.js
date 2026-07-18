/**
 * Domain Service: Combat Rewards
 *
 * Determines the probability and contents of a combat reward given
 * the team's fighting power relative to a fight's strength.
 *
 * Eligibility rules:
 *   power/strength < 0.5   → no reward (probability = 0)
 *   power/strength in [0.5, 1) → linear ramp from ~0% to 100% (server formula)
 *   power/strength >= 1    → guaranteed reward (probability = 1)
 *
 * The lot split within a drop table is always proportional to lot weights
 * and is independent of fighting power.
 */
class CombatRewardService {

	/**
	 * Computes the reward outcomes for a single fight in a given sector.
	 *
	 * @param {number} fightingPower - Team's effective fighting power, INCLUDING grenades.
	 *   Must be consistent with how FightCalculator models combat: base power + grenadeCount × grenadePower.
	 *   Use FightingPowerService.calculateTotalFightingPower() as the source.
	 * @param {number} fightStrength - The fight's strength (damage value)
	 * @param {string} sectorName   - Sector name to look up the drop table
	 * @returns {{
	 *   rewardProbability: number,
	 *   outcomes: Array<{ items: Array<{ id: string, qty: number }>, probability: number }>
	 * }}
	 *   rewardProbability: overall probability [0,1] that any reward drops
	 *   outcomes: each possible lot with its absolute probability
	 *                       (already multiplied by rewardProbability)
	 */
	static computeRewardOutcomes(fightingPower, fightStrength, sectorName) {
		const dropTable = CombatRewardData.tables[sectorName];
		if (!dropTable) return { rewardProbability: 0, outcomes: [] };

		const rewardProbability = this._getRewardProbability(fightingPower, fightStrength);

		if (rewardProbability === 0) return { rewardProbability: 0, outcomes: [] };

		const lots = dropTable.lots;
		const totalWeight = lots.reduce((sum, lot) => sum + lot.weight, 0);

		const outcomes = lots.map(lot => ({
			items: lot.items,
			probability: rewardProbability * (lot.weight / totalWeight),
		}));

		return { rewardProbability, outcomes };
	}

	/**
	 * Converts fighting power and fight strength to a reward probability.
	 * Mirrors the server-side getWinChance() formula:
	 *   threshold = fightStrength / 2
	 *   if power < threshold → 0
	 *   else → linear ramp: (power - threshold + 1) / (fightStrength - threshold + 1), capped at 1
	 * The +1 on both sides avoids division by zero and produces a tiny non-zero
	 * probability right at the threshold, reaching exactly 1 at fightStrength.
	 *
	 * @param {number} fightingPower  - Team's total fighting power
	 * @param {number} fightStrength  - The fight's strength (damage value)
	 * @returns {number} probability in [0, 1]
	 */
	static _getRewardProbability(fightingPower, fightStrength) {
		const threshold = fightStrength / 2;
		if (fightingPower < threshold) return 0;
		return Math.min(
			Math.max(fightingPower - threshold + 1, 0) / (fightStrength - threshold + 1),
			1
		);
	}
}

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.CombatRewardService = CombatRewardService;
