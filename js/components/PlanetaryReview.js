/**
 * PlanetaryReview Component
 *
 * Displays the planet image and name in the Planetary Review tab.
 * The planet image is determined deterministically from the planet name
 * using the same CRC32-based algorithm as the game server:
 *
 *   imageId = intval(hash('crc32', $planet->getName()->toString()), 16) % 5
 *
 * Images used: pictures/astro/planet_0_small.png … planet_4_small.png
 * Fallback:    pictures/astro/planet_unknown.png  (no name / error)
 */
class PlanetaryReview extends Component {
	/**
	 * @param {Object}   options
	 * @param {Function} options.getResourceURL - Resolves extension asset paths
	 * @param {string}   [options.planetName]   - Initial planet name (optional)
	 */
	constructor(options = {}) {
		super(options);
		this.getResourceURL = options.getResourceURL;
		this._planetName = options.planetName || null;

		this._imgElement  = null;
		this._nameElement = null;
	}

	// ─── Static helpers ──────────────────────────────────────────────────────

	/**
	 * Computes the CRC32b hash of a UTF-8 string, matching PHP's
	 * hash('crc32', $str).  Returns an *unsigned* 32-bit integer so that
	 * the subsequent % 5 always land in [0, 4], just like PHP's intval().
	 *
	 * @param {string} str
	 * @returns {number}
	 */
	static _crc32(str) {
		// Pre-compute the lookup table
		const table = new Uint32Array(256);
		for (let i = 0; i < 256; i++) {
			let c = i;
			for (let j = 0; j < 8; j++) {
				c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
			}
			table[i] = c;
		}

		// Encode as UTF-8 bytes (mirrors PHP string → CRC32 behaviour)
		const bytes = new TextEncoder().encode(str);

		let crc = 0xFFFFFFFF;
		for (const byte of bytes) {
			crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF];
		}

		// >>> 0 keeps the result unsigned (matches PHP intval of hex string)
		return (crc ^ 0xFFFFFFFF) >>> 0;
	}

	/**
	 * Returns the resolved URL for the planet image that corresponds to
	 * the given name.  Falls back to planet_unknown.png when:
	 *   - no name is provided, or
	 *   - the hash computation fails for any reason.
	 *
	 * @param {string|null} planetName
	 * @param {Function}    getResourceURL
	 * @returns {string}
	 */
	static getPlanetImage(planetName, getResourceURL) {
		if (!planetName) {
			return getResourceURL('pictures/astro/planet_unknown.png');
		}
		try {
			const imageId = PlanetaryReview._crc32(planetName) % 5;
			return getResourceURL(`pictures/astro/planet_${imageId}_small.png`);
		} catch (_) {
			return getResourceURL('pictures/astro/planet_unknown.png');
		}
	}

	// ─── Component lifecycle ─────────────────────────────────────────────────

	render() {
		this.element = this.createElement('div', { className: 'planetary-review' });

		// Planet image
		this._imgElement = this.createElement('img', {
			className: 'planet-image',
			src: PlanetaryReview.getPlanetImage(this._planetName, this.getResourceURL),
			alt: this._planetName || 'Unknown planet'
		});
		this.element.appendChild(this._imgElement);

		// Planet name label
		this._nameElement = this.createElement('p', { className: 'planet-name' },
			this._planetName || 'Unknown planet');
		this.element.appendChild(this._nameElement);

		return this.element;
	}

	/**
	 * Updates the displayed planet image and name.
	 * Safe to call before or after mounting.
	 *
	 * @param {string|null} planetName
	 */
	update(planetName) {
		this._planetName = planetName || null;

		if (!this._imgElement || !this._nameElement) return;

		const src = PlanetaryReview.getPlanetImage(this._planetName, this.getResourceURL);
		this._imgElement.src = src;
		this._imgElement.alt  = this._planetName || 'Unknown planet';
		this._nameElement.textContent = this._planetName || 'Unknown planet';
	}
}

if (typeof window !== 'undefined') {
	window.PlanetaryReview = PlanetaryReview;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = PlanetaryReview;
}
