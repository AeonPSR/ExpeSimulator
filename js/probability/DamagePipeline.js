/**
 * DamagePipeline
 *
 * Shared driver for FightCalculator and EventDamageCalculator.
 * Both follow the same 4-step pattern:
 *   1. Calculate occurrence per event type (OccurrenceCalculator)
 *   2. Build a sector damage distribution (type-specific callback)
 *   3. Run DamageDistributionEngine
 *   4. Return a common result shape
 *
 * Only step 2 differs between fight and event damage.
 * FightCalculator and EventDamageCalculator are thin adapters that supply
 * the type-specific callbacks and reshape the result for their consumers.
 *
 * @module probability/DamagePipeline
 */
const DamagePipeline = {

	/**
	 * Runs the shared damage calculation pipeline.
	 *
	 * @param {Object} opts
	 * @param {string[]} opts.eventTypes - Full event names to calculate occurrences for
	 * @param {Array<string>} opts.sectors
	 * @param {Object} opts.loadout
	 * @param {Array<Object>} opts.players
	 * @param {Map} opts.sectorProbabilities - Precomputed cache (optional)
	 * @param {Set<string>} opts.worstCaseExclusions - Sectors excluded from worst-case (optional)
	 * @param {Function} opts.getSectorDamageDist - (sectorName, probs) → { dist, totalProb }
	 * @param {Function} opts.getDetailedSectorOutcomes - (sectorName, probs) → outcome[]
	 * @param {Function} [opts.postProcessDistribution] - Optional post-processing hook
	 * @param {string} opts.logLabel
	 * @returns {{ occurrenceWithSources, damage, damageInstances, damageDistribution, sampledPaths, playerCount, worstCaseExclusions }}
	 */
	run({ eventTypes, sectors, loadout, players, sectorProbabilities, worstCaseExclusions,
		getSectorDamageDist, getDetailedSectorOutcomes, postProcessDistribution, logLabel }) {

		const playerCount = players ? players.length : 0;

		// Step 1: calculate occurrence for each event type
		const occurrenceWithSources = {};
		for (const eventType of eventTypes) {
			occurrenceWithSources[eventType] = OccurrenceCalculator.calculateForType(
				sectors, loadout, eventType, sectorProbabilities
			);
		}

		// Step 2+3: build damage distribution via shared engine
		const { damage, damageInstances, damageDistribution, sampledPaths } =
			DamageDistributionEngine.calculate({
				sectors, loadout, sectorProbabilities, worstCaseExclusions,
				getSectorDamageDist, getDetailedSectorOutcomes, postProcessDistribution, logLabel
			});

		return {
			occurrenceWithSources,
			damage,
			damageInstances,
			damageDistribution,
			sampledPaths,
			playerCount,
			worstCaseExclusions: worstCaseExclusions ? Array.from(worstCaseExclusions) : []
		};
	}
};

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.DamagePipeline = DamagePipeline;
