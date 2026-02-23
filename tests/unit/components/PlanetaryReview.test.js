/**
 * PlanetaryReview Tests
 *
 * Covers the two static helpers that implement the server-side planet image
 * selection algorithm:
 *
 *   imageId = intval(hash('crc32', $planet->getName()->toString()), 16) % 5
 */

describe('PlanetaryReview', () => {

	// Convenience: mirrors what getResourceURL() does in the jsdom test env
	// (chrome.runtime.getURL returns the path as-is)
	const url = (path) => path;

	// =========================================================================
	// _crc32
	// =========================================================================

	describe('_crc32', () => {

		test('returns an unsigned 32-bit integer (>= 0)', () => {
			const result = PlanetaryReview._crc32('anything');
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(0xFFFFFFFF);
		});

		test('is deterministic — same input always yields the same output', () => {
			expect(PlanetaryReview._crc32('Vie Heureuse')).toBe(PlanetaryReview._crc32('Vie Heureuse'));
		});

		test('is sensitive to case', () => {
			expect(PlanetaryReview._crc32('fugubos')).not.toBe(PlanetaryReview._crc32('Fugubos'));
		});

		// Ground-truth values verified against PHP hash('crc32', ...) via the
		// same CRC32b algorithm used by the game server.
		test.each([
			['Rocky World',    3223245548],
			['Fugubos',        4136742940],
			['Vie Heureuse',   2855688966],
			['Polyphemus',     1378042749],
			['Museum',         1709916481],
			['Thousands Cuts', 2534595022],
		])('matches PHP crc32 for "%s"', (name, expected) => {
			expect(PlanetaryReview._crc32(name)).toBe(expected);
		});
	});

	// =========================================================================
	// getPlanetImage
	// =========================================================================

	describe('getPlanetImage', () => {

		// ── Fallback cases ────────────────────────────────────────────────────

		test('returns planet_unknown when name is null', () => {
			expect(PlanetaryReview.getPlanetImage(null, url))
				.toBe('pictures/astro/planet_unknown.png');
		});

		test('returns planet_unknown when name is undefined', () => {
			expect(PlanetaryReview.getPlanetImage(undefined, url))
				.toBe('pictures/astro/planet_unknown.png');
		});

		test('returns planet_unknown when name is an empty string', () => {
			expect(PlanetaryReview.getPlanetImage('', url))
				.toBe('pictures/astro/planet_unknown.png');
		});

		// ── Image index [0-4] ─────────────────────────────────────────────────

		test('returned path is always one of planet_0_small … planet_4_small', () => {
			const validPaths = Array.from({ length: 5 }, (_, i) =>
				`pictures/astro/planet_${i}_small.png`
			);
			const names = ['Rocky World', 'Fugubos', 'Vie Heureuse', 'Polyphemus', 'Museum'];
			for (const name of names) {
				expect(validPaths).toContain(PlanetaryReview.getPlanetImage(name, url));
			}
		});

		// ── Known mappings (ground-truth from PHP algorithm) ──────────────────

		test.each([
			['Rocky World',    3],
			['Fugubos',        0],
			['Vie Heureuse',   1],
			['Polyphemus',     4],
			['Museum',         1],
			['Thousands Cuts', 2],
		])('"%s" maps to planet_%i_small.png', (name, expectedId) => {
			expect(PlanetaryReview.getPlanetImage(name, url))
				.toBe(`pictures/astro/planet_${expectedId}_small.png`);
		});

		// ── getResourceURL is called with the correct path ────────────────────

		test('passes the resolved asset path through getResourceURL', () => {
			const mockGetURL = jest.fn((path) => `chrome-extension://abc/${path}`);
			const result = PlanetaryReview.getPlanetImage('Fugubos', mockGetURL);

			expect(mockGetURL).toHaveBeenCalledWith('pictures/astro/planet_0_small.png');
			expect(result).toBe('chrome-extension://abc/pictures/astro/planet_0_small.png');
		});

		test('passes planet_unknown through getResourceURL on fallback', () => {
			const mockGetURL = jest.fn((path) => `chrome-extension://abc/${path}`);
			const result = PlanetaryReview.getPlanetImage(null, mockGetURL);

			expect(mockGetURL).toHaveBeenCalledWith('pictures/astro/planet_unknown.png');
			expect(result).toBe('chrome-extension://abc/pictures/astro/planet_unknown.png');
		});
	});
});
