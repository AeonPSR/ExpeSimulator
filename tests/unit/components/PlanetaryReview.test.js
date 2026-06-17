/**
 * PlanetaryReview Tests
 *
 * Covers getPlanetImage — the static helper that maps a planet name to
 * one of the five planet images using Hash.crc32.
 * The crc32 algorithm itself is tested in tests/unit/utils/Hash.test.js.
 */

describe('PlanetaryReview', () => {

	// Convenience: mirrors what getResourceURL() does in the jsdom test env
	// (chrome.runtime.getURL returns the path as-is)
	const url = (path) => path;

	describe('getPlanetImage', () => {

		// ── Fallback cases ────────────────────────────────────────────────────

		test('returns planet_unknown when name is null', () => {
			expect(PlanetaryReview.getPlanetImage(null, url))
				.toBe('pictures/planets/planet_unknown.png');
		});

		test('returns planet_unknown when name is undefined', () => {
			expect(PlanetaryReview.getPlanetImage(undefined, url))
				.toBe('pictures/planets/planet_unknown.png');
		});

		test('returns planet_unknown when name is an empty string', () => {
			expect(PlanetaryReview.getPlanetImage('', url))
				.toBe('pictures/planets/planet_unknown.png');
		});

		// ── Image index [0-4] ─────────────────────────────────────────────────

		test('returned path is always one of planet_0_small … planet_4_small', () => {
			const validPaths = Array.from({ length: 5 }, (_, i) =>
				`pictures/planets/planet_${i}_small.png`
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
				.toBe(`pictures/planets/planet_${expectedId}_small.png`);
		});

		// ── getResourceURL is called with the correct path ────────────────────

		test('passes the resolved asset path through getResourceURL', () => {
			const mockGetURL = jest.fn((path) => `chrome-extension://abc/${path}`);
			const result = PlanetaryReview.getPlanetImage('Fugubos', mockGetURL);

			expect(mockGetURL).toHaveBeenCalledWith('pictures/planets/planet_0_small.png');
			expect(result).toBe('chrome-extension://abc/pictures/planets/planet_0_small.png');
		});

		test('passes planet_unknown through getResourceURL on fallback', () => {
			const mockGetURL = jest.fn((path) => `chrome-extension://abc/${path}`);
			const result = PlanetaryReview.getPlanetImage(null, mockGetURL);

			expect(mockGetURL).toHaveBeenCalledWith('pictures/planets/planet_unknown.png');
			expect(result).toBe('chrome-extension://abc/pictures/planets/planet_unknown.png');
		});
	});
});
