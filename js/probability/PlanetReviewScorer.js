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
	 * Boolean tags shown as badges on the planetary review.
	 * Each entry defines a tag that appears when its condition is met.
	 *
	 * Fields:
	 *   key       - unique identifier
	 *   label     - display text on the badge
	 *   color     - badge border + dot color
	 *   condition - fn(sectors, axes, overall) → boolean; receives the raw sector
	 *               list, scored axes array, and the computed overall score.
	 *               Note: for overall-based conditions, `overall` is 0 on the
	 *               first internal pass (used only for BOOLEAN_BONUSES), so only
	 *               use `overall` in display conditions, not bonus-granting ones.
	 *
	 * To add a new tag: add an entry here. Nothing else needs to change.
	 *
	 * Per-sector "x4" tags are appended dynamically below from the sector
	 * config, so any sector with maxPerPlanet >= 4 automatically gets one.
	 */
	const BOOLEAN_TAGS = [
		// ── Specific sector presence ─────────────────────────────────────
		// Has at least one Oxygen sector
		{
			key:   'oxygen',
			label: 'Oxygen',
			color: '#3498db',
			condition: (sectors) => sectors.some(s => s === 'OXYGEN'),
		},
		// Has at least one Cristalite sector
		{
			key:   'cristal_field',
			label: 'Crystal Field',
			color: '#a855f7',
			condition: (sectors) => sectors.some(s => s === 'CRISTAL_FIELD'),
		},
		// Has at least one Mankarog sector
		{
			key:   'mankarog',
			label: 'Mankarog',
			color: '#dc2626',
			condition: (sectors) => sectors.some(s => s === 'MANKAROG'),
		},

		// ── Axis tags: triggered when an axis exceeds 4 stars ────────────
		// Lots of fruit harvests
		{
			key:   'fruits_high',
			label: 'Cornucopia',
			color: '#16a34a',
			condition: (_sectors, axes) => (axes.find(a => a.key === 'fruits')?.stars ?? 0) > 4,
		},
		// Lots of meat provisions
		{
			key:   'steaks_high',
			label: 'Hunting Grounds',
			color: '#b45309',
			condition: (_sectors, axes) => (axes.find(a => a.key === 'steaks')?.stars ?? 0) > 4,
		},
		// Lots of fuel
		{
			key:   'fuel_high',
			label: 'Black Pearl',
			color: '#0f172a',
			condition: (_sectors, axes) => (axes.find(a => a.key === 'fuel')?.stars ?? 0) > 4,
		},
		// Lots of artifacts
		{
			key:   'artifacts_high',
			label: 'Treasure Planet',
			color: '#d97706',
			condition: (_sectors, axes) => (axes.find(a => a.key === 'artifacts')?.stars ?? 0) > 4,
		},
		// High lethality (combat-heavy planet)
		{
			key:   'lethality_high',
			label: 'Death World',
			color: '#7f1d1d',
			condition: (_sectors, axes) => (axes.find(a => a.key === 'lethality')?.stars ?? 0) > 4,
		},
		// High hazards (disease, traps, lost crew, item loss…)
		{
			key:   'hazards_high',
			label: "Murphy's Law",
			color: '#78350f',
			condition: (_sectors, axes) => (axes.find(a => a.key === 'hazards')?.stars ?? 0) > 4,
		},

		// ── Composition tags ─────────────────────────────────────────────
		// Mineral-heavy: HC + Mountain + Cristal + Cave + Seismic + Volcano > 7
		{
			key:   'mineral_rich',
			label: 'Rock and Stone !',
			color: '#64748b',
			condition: (sectors) => countIn(sectors, [
				'HYDROCARBON', 'MOUNTAIN', 'CRISTAL_FIELD', 'CAVE',
				'SEISMIC_ACTIVITY', 'VOLCANIC_ACTIVITY',
			]) > 7,
		},
		// Plant-heavy: Forest + Swamp + Fruit Trees + Hot > 7
		// (Note: Swamp listed once — duplicate in the request was likely a typo)
		{
			key:   'jungle',
			label: 'Greenpath',
			color: '#15803d',
			condition: (sectors) => countIn(sectors, [
				'FOREST', 'SWAMP', 'FRUIT_TREES', 'HOT',
			]) > 7,
		},
		// Diverse terrain: Forest + Mountain + Swamp + Desert + Ocean + Cave
		// + Ruins + Wreck + Fruit Trees + Cristalite > 11
		{
			key:   'varied_landscape',
			label: 'Pretty Landscapes',
			color: '#0d9488',
			condition: (sectors) => countIn(sectors, [
				'FOREST', 'MOUNTAIN', 'SWAMP', 'DESERT', 'OCEAN', 'CAVE',
				'RUINS', 'WRECK', 'FRUIT_TREES', 'CRISTAL_FIELD',
			]) > 11,
		},
		// Fauna-heavy: Ruminant + Intelligent + Predator + Insect + Mankarog > 7
		{
			key:   'fauna_rich',
			label: 'Overcrowded',
			color: '#ca8a04',
			condition: (sectors) => countIn(sectors, [
				'RUMINANT', 'INTELLIGENT', 'PREDATOR', 'INSECT', 'MANKAROG',
			]) > 7,
		},
		// Climate hazards: Hot + Cold + Wind + Volcano + Seismic > 7
		{
			key:   'climate_change',
			label: 'Climate Change',
			color: '#7c3aed',
			condition: (sectors) => countIn(sectors, [
				'HOT', 'COLD', 'STRONG_WIND', 'VOLCANIC_ACTIVITY', 'SEISMIC_ACTIVITY',
			]) > 7,
		},

		// ── Unknown tags ─────────────────────────────────────────────────
		// Some unknowns: 5–8 (mysterious)
		{
			key:   'terra_incognita',
			label: 'Terra Incognita',
			color: '#6366f1',
			condition: (sectors) => {
				const n = sectors.filter(s => s === 'UNKNOWN').length;
				return n > 4 && n < 9;
			},
		},
		// Lots of unknowns: > 8 (uncharted)
		{
			key:   'no_astro',
			label: 'Maybe scan it some more',
			color: '#4338ca',
			condition: (sectors) => sectors.filter(s => s === 'UNKNOWN').length > 8,
		},

		// ── Size tags (LANDING excluded from the count) ──────────────────
		// Tiny planet: fewer than 6 sectors
		{
			key:   'tiny',
			label: 'Pocket World',
			color: '#94a3b8',
			condition: (sectors) => sectors.filter(s => s !== 'LANDING').length < 6,
		},
		// Huge planet: more than 16 sectors
		{
			key:   'huge',
			label: 'Behemoth',
			color: '#1e40af',
			condition: (sectors) => sectors.filter(s => s !== 'LANDING').length > 16,
		},
		// ── Overall score tags ───────────────────────────────────────────────
		// Terrible planet: overall score below 2
		{
			key:   'score_terrible',
			label: 'Poor',
			color: '#6b7280',
			condition: (_s, _a, overall) => overall > 0 && overall < 2,
		},
		// Good planet: overall between 3.5 and 5 (inclusive)
		{
			key:   'score_good',
			label: 'Promising',
			color: '#22c55e',
			condition: (_s, _a, overall) => overall >= 3.5 && overall <= 5,
		},
		// Exceptional planet: overall above 5
		{
			key:   'score_exceptional',
			label: 'Exceptionnal',
			color: '#f59e0b',
			condition: (_s, _a, overall) => overall > 5,
		},
		// ── Per-sector "x4" tags: triggered when 4 of that sector are present ──
		// Forest x4 — endless canopy of trees
		{ key: 'quad_forest',             label: 'Brocéliande',     color: '#15803d', condition: (s) => quad(s, 'FOREST') },
		// Mountain x4 — towering ranges
		{ key: 'quad_mountain',           label: 'Mountain Ranges',         color: '#78716c', condition: (s) => quad(s, 'MOUNTAIN') },
		// Swamp x4 — endless wetlands
		{ key: 'quad_swamp',              label: 'Bayou',             color: '#365314', condition: (s) => quad(s, 'SWAMP') },
		// Desert x4 — vast dunes
		{ key: 'quad_desert',             label: 'Arrakis\' Wastes',        color: '#eab308', condition: (s) => quad(s, 'DESERT') },
		// Ocean x4 — water world
		{ key: 'quad_ocean',              label: 'Waterworld',        color: '#0ea5e9', condition: (s) => quad(s, 'OCEAN') },
		// Cave x4 — vast cave network
		{ key: 'quad_cave',               label: 'Hollow World',      color: '#000000', condition: (s) => quad(s, 'CAVE') },
		// Ruins x4 — ancient civilization remnants
		{ key: 'quad_ruins',              label: 'Type 1 Extinction', color: '#a16207', condition: (s) => quad(s, 'RUINS') },
		// Wreck x4 — ship graveyard
		{ key: 'quad_wreck',              label: 'The Big Thrash Heap',    color: '#52525b', condition: (s) => quad(s, 'WRECK') },
		// Fruit trees x4 — orchard planet
		{ key: 'quad_fruit_trees',        label: 'Hanging Gardens',           color: '#84cc16', condition: (s) => quad(s, 'FRUIT_TREES') },
		// Ruminant x4 — herds everywhere
		{ key: 'quad_ruminant',           label: 'Augean Stables',          color: '#a3a3a3', condition: (s) => quad(s, 'RUMINANT') },
		// Predator x4 — apex predators
		{ key: 'quad_predator',           label: 'Apex Hunters',      color: '#991b1b', condition: (s) => quad(s, 'PREDATOR') },
		// Intelligent x4 — civilized natives
		{ key: 'quad_intelligent',        label: 'Homeworld',     color: '#7c3aed', condition: (s) => quad(s, 'INTELLIGENT') },
		// Insect x4 — swarms
		{ key: 'quad_insect',             label: 'The Great Swarm',        color: '#65a30d', condition: (s) => quad(s, 'INSECT') },
		// Cold x4 — frozen wasteland
		{ key: 'quad_cold',               label: 'Giant Snowball',              color: '#ffffff', condition: (s) => quad(s, 'COLD') },
		// Hot x4 — scorching wasteland
		{ key: 'quad_hot',                label: '4th degree burn',           color: '#f97316', condition: (s) => quad(s, 'HOT') },
		// Strong wind x4 — perpetual storms
		{ key: 'quad_strong_wind',        label: 'Jovian Winds',       color: '#0891b2', condition: (s) => quad(s, 'STRONG_WIND') },
		// Seismic x4 — never-ending tremors
		{ key: 'quad_seismic_activity',   label: 'Faultline',         color: '#a8a29e', condition: (s) => quad(s, 'SEISMIC_ACTIVITY') },
		// Volcanic x4 — molten hellscape
		{ key: 'quad_volcanic_activity',  label: 'A nice chill expedition',          color: '#dc2626', condition: (s) => quad(s, 'VOLCANIC_ACTIVITY') },
	];

	/** Count how many sectors in `list` are present in `sectors` (with multiplicity). */
	function countIn(sectors, list) {
		const set = new Set(list);
		let n = 0;
		for (const s of sectors) if (set.has(s)) n++;
		return n;
	}

	/** True when `sectors` contains 4+ instances of `name`. */
	function quad(sectors, name) {
		let n = 0;
		for (const s of sectors) if (s === name && ++n >= 4) return true;
		return false;
	}



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
	 * @param {Object} [options]
	 * @param {boolean} [options.diplomacy=false] - When true, removes FIGHT_* events before scoring
	 * @returns {Object} Review data object for StarRating.update()
	 */
	function score(sectors, options = {}) {
		const ceilings = getCeilings();
		const scoredSectors = sectors.filter(s => !IGNORED_SECTORS.has(s));
		const useDiplomacy = options.diplomacy || false;
		const fuelCost = options.fuelCost ?? 0;

		// Aggregate raw scores across all sectors
		const rawScores = {};
		for (const axisKey of AXES.map(a => a.key)) {
			rawScores[axisKey] = 0;
		}

		for (const sectorName of scoredSectors) {
			let config = getSectorConfig(sectorName);
			if (!config) continue;

			// Diplomacy: strip FIGHT_* events from the pool
			if (useDiplomacy && config.explorationEvents) {
				const filtered = {};
				for (const [event, weight] of Object.entries(config.explorationEvents)) {
					if (!event.startsWith('FIGHT_')) {
						filtered[event] = weight;
					}
				}
				config = { ...config, explorationEvents: filtered };
			}

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

		// Booleans — driven entirely by BOOLEAN_TAGS, no changes needed here.
		// Two-pass: first pass (overall=0) feeds computeOverall for BOOLEAN_BONUSES;
		// second pass re-evaluates with the real overall so score-based tags work.
		const booleansPass1 = BOOLEAN_TAGS.map(tag => ({
			key:     tag.key,
			label:   tag.label,
			color:   tag.color,
			present: tag.condition(sectors, axes, 0),
		}));

		const overall = computeOverall(axes, booleansPass1, scoredSectors.length, fuelCost);

		const booleans = BOOLEAN_TAGS.map(tag => ({
			key:     tag.key,
			label:   tag.label,
			color:   tag.color,
			present: tag.condition(sectors, axes, overall),
		}));

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
	 * 6. Fuel cost penalty: fuel 4-6 → -0.5, fuel > 6 → -1
	 * 7. Clamp to [0, 6], round to nearest 0.5
	 *
	 * @param {Array}  axes - Scored axes from score()
	 * @param {Array}  booleans - Boolean indicators from score()
	 * @param {number} scoredSectorCount - Number of scored sectors (excl. LANDING/UNKNOWN)
	 * @param {number} [fuelCost=0] - Fuel cost to reach the planet
	 * @returns {number}
	 */
	function computeOverall(axes, booleans, scoredSectorCount, fuelCost = 0) {
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

		// 6. Fuel cost penalty
		if (fuelCost > 6) {
			overall -= 1;
		} else if (fuelCost >= 4) {
			overall -= 0.5;
		}

		// 7. Clamp and round
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
