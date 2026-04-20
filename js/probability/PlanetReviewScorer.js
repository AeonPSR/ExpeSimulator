/**
 * PlanetReviewScorer
 *
 * Pure scoring module: takes a list of sector names and returns a review
 * data object consumed by StarRating.update().
 *
 * Pipeline: sectors[] → PlanetReviewScorer.score(sectors) → { overall, axes, booleans }
 *
 * This module contains ALL scoring logic. No UI concerns.
 */
const PlanetReviewScorer = (() => {

	// ─── Constants ───────────────────────────────────────────────────────────

	const FIVE_STAR_RATIO = 0.50;
	const MAX_REGULAR_SECTORS = 20;

	/** Axes definition: key, label, and which events belong to each */
	const AXES = [
		{ key: 'fruits',    label: 'Fruits' },
		{ key: 'steaks',    label: 'Steaks' },
		{ key: 'fuel',      label: 'Fuel' },
		{ key: 'artifacts', label: 'Artifacts' },
		{ key: 'lethality', label: 'Lethality' },
		{ key: 'hazards',   label: 'Hazards' },
	];

	/** Fixed magnitudes for events that don't encode a number in their name */
	const FIXED_MAGNITUDES = {
		'ARTEFACT': 1,
		'DISEASE': 1,
		'PLAYER_LOST': 1,
		'ITEM_LOST': 1,
		'MUSH_TRAP': 1,
		'NOTHING_TO_REPORT': 1,
		'AGAIN': 1,
		'BACK': 1,
	};

	/** Events that don't belong to any scoring axis */
	const IGNORED_EVENTS = new Set([
		'FIND_LOST', 'KILL_LOST', 'KILL_ALL', 'KILL_RANDOM', 'STARMAP',
	]);

	/** Sectors excluded from scoring entirely */
	const IGNORED_SECTORS = new Set(['LANDING', 'UNKNOWN']);

	/**
	 * Flat star bonuses applied as post-processing.
	 * - event-based: when a sector's event pool contains the event
	 * - sector-based: when a sector name matches
	 */
	const SECTOR_BONUSES = [
		// Kill events → lethality
		{ type: 'event', event: 'KILL_ALL',    axis: 'lethality', stars: 1 },
		{ type: 'event', event: 'KILL_RANDOM', axis: 'lethality', stars: 0.5 },
		// Cristal Field → artifacts
		{ type: 'sector', sector: 'CRISTAL_FIELD', axis: 'artifacts', stars: 1.5 },
	];

	// ─── Event → Axis mapping tables ────────────────────────────────────

	/** Exact event name → axis key */
	const EVENT_AXIS = {
		'ARTEFACT':			'artifacts',
		'MUSH_TRAP':		'hazards',
		'DISEASE':			'hazards',
		'PLAYER_LOST':		'hazards',
		'ITEM_LOST':		'hazards',
		'NOTHING_TO_REPORT':'hazards',
		'AGAIN':			'hazards',
		'BACK':				'hazards',
	};

	/** Prefix → axis key (matched via startsWith, order does not matter) */
	const PREFIX_AXIS = [
		['HARVEST_',	'fruits'],
		['PROVISION_',	'steaks'],
		['FUEL_',		'fuel'],
		['FIGHT_',		'lethality'],
		['ACCIDENT_',	'lethality'],
		['DISASTER_',	'lethality'],
		['TIRED_',		'lethality'],
	];

	/** Prefixes intentionally excluded from axis scoring */
	const EXCLUDED_PREFIXES = ['OXYGEN_'];

	/** Positive axes used for overall score (resource axes) */
	const POSITIVE_AXES = new Set(['fruits', 'steaks', 'fuel', 'artifacts']);

	/** Danger axes and their penalty thresholds: [threshold, penalty] pairs (descending) */
	const DANGER_PENALTIES = {
		lethality: [[6, -2], [5, -1.5], [4, -1], [2, -0.5]],
		hazards:   [[6, -2], [5, -1.5], [4, -1], [2, -0.5]],
	};

	/** Planet sizes (scored sectors) that incur a -0.5 penalty */
	const PENALIZED_SIZES = new Set([10, 11, 12, 17, 18, 19, 20]);

	/** Threshold for 2nd-best positive axis to grant a bonus */
	const SECONDARY_BONUS_THRESHOLD = 3;
	const SECONDARY_BONUS = 0.5;

	/** Boolean bonuses toward overall score */
	const BOOLEAN_BONUSES = { oxygen: 0.5, cristal_field: 0.5 };

	// ─── Event magnitude parser ─────────────────────────────────────────────

	/**
	 * Extracts the numeric magnitude from an event name.
	 *
	 * - `HARVEST_3` → 3
	 * - `FIGHT_8_10_12_15_18_32` → average(8,10,12,15,18,32) = 15.83
	 * - `ACCIDENT_3_5` → midpoint(3,5) = 4
	 * - `ACCIDENT_ROPE_3_5` → midpoint(3,5) = 4
	 * - `ARTEFACT` → 1 (from FIXED_MAGNITUDES)
	 *
	 * @param {string} eventName
	 * @returns {number}
	 */
	function parseMagnitude(eventName) {
		if (FIXED_MAGNITUDES[eventName] !== undefined) {
			return FIXED_MAGNITUDES[eventName];
		}

		// Extract all trailing numbers from the event name
		// e.g. FIGHT_8_10_12_15_18_32 → [8,10,12,15,18,32]
		// e.g. ACCIDENT_ROPE_3_5 → [3,5]
		// e.g. HARVEST_3 → [3]
		// e.g. OXYGEN_24 → [24]
		const parts = eventName.split('_');
		const numbers = [];
		// Walk from the end collecting numeric parts
		for (let i = parts.length - 1; i >= 0; i--) {
			const n = Number(parts[i]);
			if (!isNaN(n) && parts[i] !== '') {
				numbers.unshift(n);
			} else {
				break;
			}
		}

		if (numbers.length === 0) return 0;
		if (numbers.length === 1) return numbers[0];

		// For damage ranges like ACCIDENT_3_5 → midpoint
		// For multi-fight like FIGHT_8_10_12_15_18_32 → average
		const sum = numbers.reduce((a, b) => a + b, 0);
		return sum / numbers.length;
	}

	// ─── Event-to-axis mapping ──────────────────────────────────────────────

	/**
	 * Returns the axis key for a given event name, or null if it doesn't
	 * belong to any axis.
	 *
	 * @param {string} eventName
	 * @returns {string|null}
	 */
	function getAxisForEvent(eventName) {
		if (IGNORED_EVENTS.has(eventName)) return null;
		if (EVENT_AXIS[eventName]) return EVENT_AXIS[eventName];
		for (const prefix of EXCLUDED_PREFIXES) {
			if (eventName.startsWith(prefix)) return null;
		}
		for (const [prefix, axis] of PREFIX_AXIS) {
			if (eventName.startsWith(prefix)) return axis;
		}
		return null;
	}

	// ─── Per-sector expected value ──────────────────────────────────────────

	/**
	 * Computes the expected value contribution of a single sector config
	 * to each axis.
	 *
	 * @param {Object} sectorConfig - Entry from PlanetSectorConfigData
	 * @returns {Object} Map of axisKey → expected value (number)
	 */
	function computeSectorEVs(sectorConfig) {
		const events = sectorConfig.explorationEvents || {};
		const evs = {};

		// Total weight across all events in this sector
		let totalWeight = 0;
		for (const w of Object.values(events)) {
			totalWeight += w;
		}
		if (totalWeight === 0) return evs;

		for (const [eventName, weight] of Object.entries(events)) {
			const axis = getAxisForEvent(eventName);
			if (!axis) continue;

			const magnitude = parseMagnitude(eventName);
			const contribution = (weight * magnitude) / totalWeight;

			evs[axis] = (evs[axis] || 0) + contribution;
		}

		return evs;
	}

	// ─── 5-star ceiling computation ─────────────────────────────────────────

	/**
	 * Computes the theoretical maximum raw score for each axis by greedily
	 * filling a 20-sector planet with the highest-EV sectors, respecting
	 * maxPerPlanet. Returns the 5-star ceiling (75% of max).
	 *
	 * @param {Array} sectorConfigs - PlanetSectorConfigData
	 * @returns {Object} Map of axisKey → ceiling value
	 */
	function computeCeilings(sectorConfigs) {
		// Pre-compute EVs for all sector types (exclude special sectors)
		const sectorEVs = [];
		for (const config of sectorConfigs) {
			if (config.weightAtPlanetGeneration === 0 && config.weightAtPlanetExploration === 0) {
				continue; // Skip LANDING, LOST, UNKNOWN
			}
			sectorEVs.push({
				sectorName: config.sectorName,
				maxPerPlanet: config.maxPerPlanet,
				evs: computeSectorEVs(config),
			});
		}

		const ceilings = {};

		for (const axisDef of AXES) {
			const axisKey = axisDef.key;

			// Get all sectors that contribute to this axis, sorted by EV desc
			const contributors = sectorEVs
				.filter(s => (s.evs[axisKey] || 0) > 0)
				.map(s => ({ ...s, axisEV: s.evs[axisKey] }))
				.sort((a, b) => b.axisEV - a.axisEV);

			// Greedily fill 20 slots
			let totalEV = 0;
			let slotsUsed = 0;

			for (const sector of contributors) {
				if (slotsUsed >= MAX_REGULAR_SECTORS) break;

				const canAdd = Math.min(sector.maxPerPlanet, MAX_REGULAR_SECTORS - slotsUsed);
				totalEV += sector.axisEV * canAdd;
				slotsUsed += canAdd;
			}

			ceilings[axisKey] = totalEV * FIVE_STAR_RATIO;
		}

		return ceilings;
	}

	// Cache ceilings (they only depend on PlanetSectorConfigData which is static)
	let _cachedCeilings = null;

	function getCeilings() {
		if (!_cachedCeilings) {
			_cachedCeilings = computeCeilings(PlanetSectorConfigData);
		}
		return _cachedCeilings;
	}

	// ─── Planet scoring ─────────────────────────────────────────────────────

	/**
	 * Looks up the sector config from PlanetSectorConfigData by sector name.
	 * @param {string} sectorName
	 * @returns {Object|null}
	 */
	function getSectorConfig(sectorName) {
		return PlanetSectorConfigData.find(c => c.sectorName === sectorName) || null;
	}

	/**
	 * Scores a planet given its list of sectors.
	 *
	 * @param {string[]} sectors - Array of sector names (e.g. ['LANDING', 'FOREST', 'CAVE'])
	 * @returns {Object} Review data object for StarRating.update()
	 */
	function score(sectors) {
		const ceilings = getCeilings();
		const scoredSectors = sectors.filter(s => !IGNORED_SECTORS.has(s));

		// Aggregate raw scores across all sectors
		const rawScores = {};
		for (const axisKey of AXES.map(a => a.key)) {
			rawScores[axisKey] = 0;
		}

		for (const sectorName of scoredSectors) {
			const config = getSectorConfig(sectorName);
			if (!config) continue;

			const evs = computeSectorEVs(config);
			for (const [axisKey, value] of Object.entries(evs)) {
				if (rawScores[axisKey] !== undefined) {
					rawScores[axisKey] += value;
				}
			}
		}

		// Post-process: add flat star bonuses
		const bonuses = {};
		for (const sectorName of scoredSectors) {
			const config = getSectorConfig(sectorName);
			for (const bonus of SECTOR_BONUSES) {
				if (bonus.type === 'sector' && sectorName === bonus.sector) {
					bonuses[bonus.axis] = (bonuses[bonus.axis] || 0) + bonus.stars;
				} else if (bonus.type === 'event' && config) {
					const events = config.explorationEvents || {};
					if (events[bonus.event]) {
						bonuses[bonus.axis] = (bonuses[bonus.axis] || 0) + bonus.stars;
					}
				}
			}
		}

		// Normalize to stars
		const axes = AXES.map(axisDef => {
			const ceiling = ceilings[axisDef.key] || 1;
			const raw = rawScores[axisDef.key] || 0;
			const axisBonus = bonuses[axisDef.key] || 0;
			let stars = Math.min(6, Math.max(0, (raw / ceiling) * 5));
			stars += axisBonus;
			stars = Math.min(6, stars);
			stars = Math.round(stars * 2) / 2; // Round to nearest 0.5
			if ((raw > 0 || axisBonus > 0) && stars < 0.5) stars = 0.5;
			return {
				key: axisDef.key,
				label: axisDef.label,
				stars,
			};
		});

		// Booleans
		const booleans = [];
		const hasOxygen = sectors.some(s => s === 'OXYGEN');
		booleans.push({ key: 'oxygen', label: 'Oxygen', present: hasOxygen });
		const hasCristalField = sectors.some(s => s === 'CRISTAL_FIELD');
		booleans.push({ key: 'cristal_field', label: 'Crystal Map', present: hasCristalField });

		const overall = computeOverall(axes, booleans, scoredSectors.length);

		return { overall, axes, booleans };
	}

	// ─── Overall score (tier / bucket system) ───────────────────────────────

	/**
	 * Computes the overall planet score using a rule-based tier system.
	 *
	 * Rules applied in order:
	 * 1. Base = best positive axis (fruits, steaks, fuel, artifacts)
	 * 2. Size penalty: -0.5 if scored sectors in {10,11,12,17,18,19,20}
	 * 3. Secondary bonus: +0.5 if 2nd best positive axis >= 3
	 * 4. Danger penalties: lethality/hazards >= 4 → -1, elif >= 2 → -0.5
	 * 5. Boolean bonuses: oxygen +0.5, crystal map +0.5
	 * 6. Clamp to [0, 6], round to nearest 0.5
	 *
	 * @param {Array} axes - Scored axes from score()
	 * @param {Array} booleans - Boolean indicators from score()
	 * @param {number} scoredSectorCount - Number of scored sectors (excl. LANDING/UNKNOWN)
	 * @returns {number}
	 */
	function computeOverall(axes, booleans, scoredSectorCount) {
		// 1. Base = best positive axis
		const positiveStars = axes
			.filter(a => POSITIVE_AXES.has(a.key))
			.map(a => a.stars)
			.sort((a, b) => b - a);

		let overall = positiveStars[0] || 0;

		// 2. Size penalty
		if (PENALIZED_SIZES.has(scoredSectorCount)) {
			overall -= 0.5;
		}

		// 3. Secondary bonus
		if (positiveStars.length >= 2 && positiveStars[1] >= SECONDARY_BONUS_THRESHOLD) {
			overall += SECONDARY_BONUS;
		}

		// 4. Danger penalties
		for (const [axisKey, thresholds] of Object.entries(DANGER_PENALTIES)) {
			const axis = axes.find(a => a.key === axisKey);
			if (!axis) continue;
			for (const [threshold, penalty] of thresholds) {
				if (axis.stars >= threshold) {
					overall += penalty; // penalty is negative
					break; // only apply the highest matching threshold
				}
			}
		}

		// 5. Boolean bonuses
		for (const bool of booleans) {
			if (bool.present && BOOLEAN_BONUSES[bool.key]) {
				overall += BOOLEAN_BONUSES[bool.key];
			}
		}

		// 6. Clamp and round
		overall = Math.max(0, Math.min(6, overall));
		overall = Math.round(overall * 2) / 2;

		return overall;
	}

	// ─── Public API ─────────────────────────────────────────────────────────

	return {
		score,
		// Exposed for testing
		_parseMagnitude: parseMagnitude,
		_getAxisForEvent: getAxisForEvent,
		_computeSectorEVs: computeSectorEVs,
		_computeCeilings: computeCeilings,
		_computeOverall: computeOverall,
		_FIVE_STAR_RATIO: FIVE_STAR_RATIO,
		_EVENT_AXIS: EVENT_AXIS,
		_PREFIX_AXIS: PREFIX_AXIS,
		_EXCLUDED_PREFIXES: EXCLUDED_PREFIXES,
		_SECTOR_BONUSES: SECTOR_BONUSES,
	};

})();

// Export
var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.PlanetReviewScorer = PlanetReviewScorer;
