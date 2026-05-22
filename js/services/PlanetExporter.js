/**
 * PlanetExporter
 *
 * Formats a planet summary as a chat-ready string and writes it to the
 * clipboard. Sectors are emitted as their `:as_name:` icon codes, grouped
 * and ordered by category, each group on its own line.
 *
 * Group order:
 *   1. Resources   — Cristalite · Oxygen · Fuel
 *   2. Danger      — Mankarog · Volcano · Seismic
 *   3. Terrain     — Forest · Mountain · Swamp · Desert · Ocean · Cave · Ruins · Wreck · Orchard
 *   4. Fauna       — Intelligent · Insect · Ruminant · Predator
 *   5. Climate     — Wind · Cold · Hot
 *   6. Remainder   — Unknown + anything not covered above
 */
class PlanetExporter {

	static EXPORT_GROUPS = [
		['CRISTAL_FIELD', 'OXYGEN', 'HYDROCARBON'],
		['MANKAROG', 'VOLCANIC_ACTIVITY', 'SEISMIC_ACTIVITY'],
		['FRUIT_TREES', 'FOREST', 'MOUNTAIN', 'SWAMP', 'DESERT', 'OCEAN', 'CAVE', 'RUINS', 'WRECK'],
		['INTELLIGENT', 'INSECT', 'RUMINANT', 'PREDATOR'],
		['STRONG_WIND', 'COLD', 'HOT'],
	];

	/**
	 * Builds the formatted planet summary string.
	 *
	 * @param {string}      name        - Planet display name
	 * @param {string[]}    sectors     - Raw sector list (LANDING will be stripped)
	 * @param {Array}       [axes]      - Scored axes from PlanetReviewScorer ({ key, label, stars }[])
	 * @param {number|null} [overall]   - Overall star score
	 * @param {boolean}     [diplomacy] - Whether diplomacy mode is active
	 * @param {{ direction: string, fuel: number }|null} [nav] - Direction and fuel cost
	 * @param {Object|null} [planetResources] - Planet-level resource quartiles from ResourceCalculator
	 * @returns {string}
	 */
	static formatSummary(name, sectors, axes = [], overall = null, diplomacy = false, nav = null, planetResources = null) {
		const filtered = sectors.filter(s => s !== 'LANDING');

		const placed = new Set();
		const groupLines = PlanetExporter.EXPORT_GROUPS.map(group => {
			const line = [];
			for (const id of group) {
				const count = filtered.filter(s => s === id).length;
				for (let i = 0; i < count; i++) {
					line.push(SectorData.SECTOR_ICONS[id] || id);
				}
				if (count > 0) placed.add(id);
			}
			return line.join('');
		});

		const remaining = filtered
			.filter(s => !placed.has(s))
			.map(s => SectorData.SECTOR_ICONS[s] || s)
			.join('');

		const iconBlock = [...groupLines, remaining]
			.filter(l => l.length > 0)
			.join('');

		const starChar = '★';

		// Title line: name + overall score + optional diplomacy flag + nav
		const overallStr = overall !== null ? ` - ${overall}${starChar}` : '';
		const diplomacyStr = diplomacy ? ' (:sk_diplomacy:)' : '';
		const navDir = nav ? (I18n?.t?.('planet.dir.' + nav.direction.toLowerCase()) || nav.direction) : '';
		const navStr = nav ? `*${navDir} - ${nav.fuel} :fuel:*` : '';
		const titleLine = `:ic_planet_scanned: **${name}**${overallStr}${diplomacyStr}`;

		// Axes: fixed pairs on three lines
		// Line 1: Fruits | Steaks
		// Line 2: Fuel   | Artifacts
		// Line 3: Lethality | Hazards
		const axesLines = [];
		if (axes.length > 0) {
			const RESOURCE_KEY_MAP = {
				fruits:    ['fruits'],
				steaks:    ['steaks'],
				fuel:      ['fuel'],
				artifacts: ['artefacts', 'mapFragments'],
			};
			const fmtQ = (v, round) => (v === 0 || v == null) ? '0' : round ? String(Math.round(v)) : v < 0.1 ? '<0.1' : v.toFixed(1);
			const quartileStr = (axisKey) => {
				if (!planetResources) return '';
				const keys = RESOURCE_KEY_MAP[axisKey];
				if (!keys) return '';
				let q1 = 0, q3 = 0;
				for (const k of keys) {
					const d = planetResources[k];
					if (d) { q1 += d.pessimist ?? 0; q3 += d.optimist ?? 0; }
				}
				const round = axisKey !== 'artifacts';
				if (q1 === 0 && q3 === 0) return ' *(0)*';
				return ` *(${fmtQ(q1, round)}~${fmtQ(q3, round)})*`;
			};
			const byKey = Object.fromEntries(axes.map(a => [a.key, a]));
			const fmtAxis = (key) => {
				const a = byKey[key];
				if (!a) return null;
				return `${a.label}: ${a.stars > 0 ? `${a.stars}${starChar}` : '-'}${quartileStr(a.key)}`;
			};
			const PAIRS = [
				['fruits', 'steaks'],
				['fuel', 'artifacts'],
				['lethality', 'hazards'],
			];
			for (const pair of PAIRS) {
				const cells = pair.map(fmtAxis).filter(Boolean);
				if (cells.length > 0) axesLines.push(cells.join(' | '));
			}
		}

		const parts = [titleLine, navStr, iconBlock, ...axesLines].filter(p => p.length > 0);
		return '\n' + parts.join('\n');
	}

	/**
	 * Copies the planet summary to the clipboard.
	 * Returns a Promise that resolves on success and rejects on failure,
	 * so callers can show visual feedback.
	 *
	 * @param {string}      name        - Planet display name
	 * @param {string[]}    sectors     - Raw sector list
	 * @param {Array}       [axes]      - Scored axes from PlanetReviewScorer
	 * @param {number|null} [overall]   - Overall star score
	 * @param {boolean}     [diplomacy] - Whether diplomacy mode is active
	 * @param {{ direction: string, fuel: number }|null} [nav] - Direction and fuel cost
	 * @param {Object|null} [planetResources] - Planet-level resource quartiles
	 * @returns {Promise<void>}
	 */
	static copyToClipboard(name, sectors, axes = [], overall = null, diplomacy = false, nav = null, planetResources = null) {
		const text = PlanetExporter.formatSummary(name, sectors, axes, overall, diplomacy, nav, planetResources);

		if (navigator.clipboard?.writeText) {
			return navigator.clipboard.writeText(text);
		}

		// execCommand fallback
		return new Promise((resolve, reject) => {
			try {
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				const ok = document.execCommand('copy');
				document.body.removeChild(ta);
				ok ? resolve() : reject(new Error('execCommand returned false'));
			} catch (e) {
				reject(e);
			}
		});
	}
}
