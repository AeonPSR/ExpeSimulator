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
		['FOREST', 'MOUNTAIN', 'SWAMP', 'DESERT', 'OCEAN', 'CAVE', 'RUINS', 'WRECK', 'FRUIT_TREES'],
		['INTELLIGENT', 'INSECT', 'RUMINANT', 'PREDATOR'],
		['STRONG_WIND', 'COLD', 'HOT'],
	];

	/**
	 * Builds the formatted planet summary string.
	 *
	 * @param {string}   name    - Planet display name
	 * @param {string[]} sectors - Raw sector list (LANDING will be stripped)
	 * @returns {string}
	 */
	static formatSummary(name, sectors) {
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

		return `:ic_planet_scanned: **${name}**\n${iconBlock}`;
	}

	/**
	 * Copies the planet summary to the clipboard.
	 * Returns a Promise that resolves on success and rejects on failure,
	 * so callers can show visual feedback.
	 *
	 * @param {string}   name    - Planet display name
	 * @param {string[]} sectors - Raw sector list
	 * @returns {Promise<void>}
	 */
	static copyToClipboard(name, sectors) {
		const text = PlanetExporter.formatSummary(name, sectors);

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
