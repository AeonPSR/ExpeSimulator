/**
 * Clipboard
 *
 * I/O shell: formats a planet summary via PlanetSummary and writes it
 * to the clipboard. This is the only file in the planet-export flow
 * that touches browser APIs (navigator.clipboard / document.execCommand).
 */
class Clipboard {

	/**
	 * Formats and copies the planet summary to the clipboard.
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
	static copyPlanetSummary(name, sectors, axes = [], overall = null, diplomacy = false, nav = null, planetResources = null) {
		const text = PlanetSummary.format(name, sectors, axes, overall, diplomacy, nav, planetResources);

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

var _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.Clipboard = Clipboard;
