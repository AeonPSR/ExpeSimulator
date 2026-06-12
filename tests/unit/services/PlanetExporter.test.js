/**
 * PlanetExporter.formatSummary tests
 *
 * formatSummary is a pure function: takes planet data, returns a formatted
 * chat-ready string. No DOM, no clipboard — those live in copyToClipboard.
 */

describe('PlanetExporter.formatSummary', () => {

	// =========================================================================
	// Title line
	// =========================================================================

	test('title always contains the planet name', () => {
		const result = PlanetExporter.formatSummary('MyPlanet', ['FOREST']);
		expect(result).toContain(':ic_planet_scanned: **MyPlanet**');
	});

	test('overall score is appended to title when provided', () => {
		const result = PlanetExporter.formatSummary('P', [], [], 4);
		expect(result).toContain('4★');
	});

	test('no star rating when overall is null', () => {
		const result = PlanetExporter.formatSummary('P', [], [], null);
		expect(result).not.toContain('★');
	});

	test('diplomacy flag appended when active', () => {
		const result = PlanetExporter.formatSummary('P', [], [], null, true);
		expect(result).toContain(':sk_diplomacy:');
	});

	test('no diplomacy flag when inactive', () => {
		const result = PlanetExporter.formatSummary('P', [], [], null, false);
		expect(result).not.toContain(':sk_diplomacy:');
	});

	// =========================================================================
	// Nav line
	// =========================================================================

	test('nav line includes fuel cost when nav is provided', () => {
		const result = PlanetExporter.formatSummary('P', [], [], null, false, { direction: 'North', fuel: 3 });
		expect(result).toContain('3 :fuel:');
	});

	test('no nav line when nav is null', () => {
		const result = PlanetExporter.formatSummary('P', [], [], null, false, null);
		expect(result).not.toContain(':fuel:');
	});

	// =========================================================================
	// Sector icons
	// =========================================================================

	test('LANDING sector is stripped from output', () => {
		const result = PlanetExporter.formatSummary('P', ['LANDING', 'FOREST']);
		expect(result).not.toContain('LANDING');
		expect(result).toContain(':as_forest:');
	});

	test('known sectors are replaced with their icon codes', () => {
		const result = PlanetExporter.formatSummary('P', ['FOREST', 'DESERT']);
		expect(result).toContain(':as_forest:');
		expect(result).toContain(':as_desert:');
	});

	test('multiple instances of the same sector produce repeated icons', () => {
		const result = PlanetExporter.formatSummary('P', ['FOREST', 'FOREST']);
		expect(result).toContain(':as_forest::as_forest:');
	});

	test('sectors in the same category group appear without separator between them', () => {
		// OXYGEN and HYDROCARBON are both in category group 1.
		// Group order is CRISTAL_FIELD → OXYGEN → HYDROCARBON, so regardless
		// of input order the output is oxygen icon then fuel icon, concatenated.
		const result = PlanetExporter.formatSummary('P', ['HYDROCARBON', 'OXYGEN']);
		expect(result).toContain(':as_oxygen::as_fuel:');
	});

	// =========================================================================
	// Axes
	// =========================================================================

	test('axes rendered as label: stars pairs', () => {
		const axes = [
			{ key: 'fruits', label: 'Fruits', stars: 3 },
			{ key: 'steaks', label: 'Steaks', stars: 1 },
		];
		const result = PlanetExporter.formatSummary('P', [], axes);
		expect(result).toContain('Fruits: 3★');
		expect(result).toContain('Steaks: 1★');
	});

	test('axis with 0 stars shows a dash', () => {
		const axes = [{ key: 'lethality', label: 'Lethality', stars: 0 }];
		const result = PlanetExporter.formatSummary('P', [], axes);
		expect(result).toContain('Lethality: -');
	});

	test('paired axes appear on the same line separated by |', () => {
		const axes = [
			{ key: 'fruits', label: 'Fruits', stars: 3 },
			{ key: 'steaks', label: 'Steaks', stars: 2 },
		];
		const result = PlanetExporter.formatSummary('P', [], axes);
		expect(result).toContain('Fruits: 3★ | Steaks: 2★');
	});

	// =========================================================================
	// Resource quartiles
	// =========================================================================

	test('resource quartile range shown when planetResources provided', () => {
		const axes = [{ key: 'fruits', label: 'Fruits', stars: 2 }];
		const planetResources = { fruits: { pessimist: 2, optimist: 5 } };
		const result = PlanetExporter.formatSummary('P', [], axes, null, false, null, planetResources);
		expect(result).toContain('*(2~5)*');
	});

	test('zero quartile shown as (0) when both bounds are 0', () => {
		const axes = [{ key: 'fruits', label: 'Fruits', stars: 0 }];
		const planetResources = { fruits: { pessimist: 0, optimist: 0 } };
		const result = PlanetExporter.formatSummary('P', [], axes, null, false, null, planetResources);
		expect(result).toContain('*(0)*');
	});

	// =========================================================================
	// Output structure
	// =========================================================================

	test('output starts with a newline', () => {
		const result = PlanetExporter.formatSummary('P', []);
		expect(result.startsWith('\n')).toBe(true);
	});

});
