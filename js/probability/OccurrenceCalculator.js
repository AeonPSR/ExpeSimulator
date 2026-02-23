/**
 * OccurrenceCalculator
 * 
 * Shared utility for calculating event/fight occurrence distributions.
 * Both FightCalculator and EventDamageCalculator delegate their occurrence
 * logic here to avoid duplication.
 * 
 * Core principle: occurrence distributions are independent of damage multipliers
 * (fighting power, player count, etc). Scenario percentages derived from
 * occurrence distributions will never change when damage parameters change.
 * 
 * @module probability/OccurrenceCalculator
 */
const OccurrenceCalculator = {

	/**
	 * Calculates occurrence distribution for a specific event type across sectors.
	 * 
	 * Each sector either produces the event (probability p) or doesn't (1-p).
	 * These Bernoulli distributions are convolved to get the total occurrence count.
	 * 
	 * @param {Array<string>} sectors - Sector names
	 * @param {Object} loadout - Player loadout
	 * @param {string} eventType - Event name to look for (e.g., 'FIGHT_12', 'TIRED_2')
	 * @param {Map} sectorProbabilities - Precomputed sector probabilities (optional)
	 * @returns {{ occurrence: Object, sectors: Array }}
	 *   occurrence: { pessimist, average, optimist, pessimistProb, averageProb, optimistProb, distribution, maxPossible }
	 *   sectors: [{ sectorName, probability }]
	 */
	calculateForType(sectors, loadout, eventType, sectorProbabilities = null) {
		const distributions = [];
		const sectorsWithEvent = [];

		for (let i = 0; i < sectors.length; i++) {
			const sectorName = sectors[i];
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);
			let eventProb = 0;

			for (const [eventName, prob] of probs) {
				if (eventName === eventType) {
					eventProb = prob;
					break;
				}
			}

			if (eventProb > 0) {
				distributions.push(new Map([
					[0, 1 - eventProb],
					[1, eventProb]
				]));
				sectorsWithEvent.push({
					sectorIndex: i,  // Track original position for uniqueness
					sectorName,
					probability: eventProb
				});
			}
		}

		if (distributions.length === 0) {
			return {
				occurrence: {
					pessimist: 0, average: 0, optimist: 0,
					pessimistProb: 0, averageProb: 0, optimistProb: 0,
					distribution: new Map([[0, 1]]),
					maxPossible: 0
				},
				sectors: []
			};
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		const scenarios = DistributionCalculator.getScenarios(combined);

		return {
			occurrence: {
				...scenarios,
				distribution: combined,
				maxPossible: distributions.length
			},
			sectors: sectorsWithEvent
		};
	},

	/**
	 * Combines per-type occurrence distributions into an overall distribution.
	 * 
	 * Used to get "total events of any type" by convolving the per-type
	 * distributions together. The resulting scenarios give percentages that
	 * are independent of any damage multiplier.
	 * 
	 * @param {Object} perTypeResults - { [eventType]: { occurrence: { distribution } } }
	 * @returns {{ distribution: Map, scenarios: Object }}
	 */
	combineOccurrences(perTypeResults) {
		const distributions = [];

		for (const [type, data] of Object.entries(perTypeResults)) {
			if (data.occurrence?.distribution) {
				distributions.push(data.occurrence.distribution);
			}
		}

		if (distributions.length === 0) {
			return {
				distribution: new Map([[0, 1]]),
				scenarios: {
					pessimist: 0, average: 0, optimist: 0,
					pessimistProb: 0, averageProb: 0, optimistProb: 0,
					worstProb: 0
				}
			};
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		const scenarios = DistributionCalculator.getScenarios(combined);

		return { distribution: combined, scenarios };
	},

	/**
	 * Calculates overall occurrence from sectors directly.
	 * 
	 * For each sector, sums the probability of ANY matching event type occurring.
	 * This gives a per-sector "any event" Bernoulli, then convolves across sectors.
	 * 
	 * @param {Array<string>} sectors - Sector names
	 * @param {Object} loadout - Player loadout
	 * @param {Array<string>} eventTypes - Event types to match
	 * @param {Map} sectorProbabilities - Precomputed (optional)
	 * @param {Set<string>} excludedSectors - Sectors to zero out (optional)
	 * @returns {{ distribution: Map, scenarios: Object }}
	 */
	calculateOverallFromSectors(sectors, loadout, eventTypes, sectorProbabilities = null, excludedSectors = null) {
		const distributions = [];

		for (const sectorName of sectors) {
			const zeroed = excludedSectors && excludedSectors.has(sectorName);
			const probs = EventWeightCalculator.getSectorProbabilities(sectorName, loadout, sectorProbabilities);

			let anyEventProb = 0;
			if (!zeroed) {
				for (const [eventName, prob] of probs) {
					if (eventTypes.includes(eventName)) {
						anyEventProb += prob;
					}
				}
			}

			distributions.push(new Map([
				[0, 1 - anyEventProb],
				[1, anyEventProb]
			]));
		}

		if (distributions.length === 0) {
			return {
				distribution: new Map([[0, 1]]),
				scenarios: {
					pessimist: 0, average: 0, optimist: 0,
					pessimistProb: 0, averageProb: 0, optimistProb: 0,
					worstProb: 0
				}
			};
		}

		const combined = DistributionCalculator.convolveAll(distributions);
		const scenarios = DistributionCalculator.getScenarios(combined);

		return { distribution: combined, scenarios };
	}
};

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.OccurrenceCalculator = OccurrenceCalculator;
