/**
 * ResultsRenderer tests
 *
 * Covers all four static helpers extracted from App._renderExpeditionResults.
 * These tests serve as the safety-net snapshot required by §8.3 of the
 * reorganization proposal — they lock in the HTML contract before and after
 * the extraction.
 */

describe('ResultsRenderer', () => {

	// Convenience: mirrors chrome.runtime.getURL in the test environment
	const url = path => path;

	// =========================================================================
	// getHealthClass
	// =========================================================================

	describe('getHealthClass', () => {

		test.each([
			[0,  'health-dead'],
			[-1, 'health-dead'],
			[1,  'health-critical'],
			[3,  'health-critical'],
			[4,  'health-low'],
			[6,  'health-low'],
			[7,  'health-medium'],
			[10, 'health-medium'],
			[11, 'health-high'],
			[14, 'health-high'],
		])('health %i → %s', (health, expected) => {
			expect(ResultsRenderer.getHealthClass(health)).toBe(expected);
		});

	});

	// =========================================================================
	// renderHealthValue
	// =========================================================================

	describe('renderHealthValue', () => {

		test('returns dead icon when health is 0', () => {
			const html = ResultsRenderer.renderHealthValue(0, url);
			expect(html).toContain('dead.png');
			expect(html).not.toContain('hp.png');
		});

		test('returns dead icon when health is negative', () => {
			const html = ResultsRenderer.renderHealthValue(-2, url);
			expect(html).toContain('dead.png');
		});

		test('returns health number and HP icon when alive', () => {
			const html = ResultsRenderer.renderHealthValue(8, url);
			expect(html).toContain('8');
			expect(html).toContain('hp.png');
			expect(html).not.toContain('dead.png');
		});

		test('getURL is used for the icon path', () => {
			const mockGetURL = jest.fn(p => `chrome-ext://${p}`);
			const html = ResultsRenderer.renderHealthValue(5, mockGetURL);
			expect(mockGetURL).toHaveBeenCalledWith('pictures/astro/hp.png');
			expect(html).toContain('chrome-ext://pictures/astro/hp.png');
		});

	});

	// =========================================================================
	// renderEffectIcons
	// =========================================================================

	describe('renderEffectIcons', () => {

		test('returns empty string for empty array', () => {
			expect(ResultsRenderer.renderEffectIcons([], url)).toBe('');
		});

		test('returns empty string for null', () => {
			expect(ResultsRenderer.renderEffectIcons(null, url)).toBe('');
		});

		test('renders ROPE icon with damage prevented in title', () => {
			const html = ResultsRenderer.renderEffectIcons([{ type: 'ROPE', damagePrevented: 3 }], url);
			expect(html).toContain('rope.jpg');
			expect(html).toContain('blocked 3 damage');
		});

		test('renders SURVIVAL icon with reductions in title', () => {
			const html = ResultsRenderer.renderEffectIcons([{ type: 'SURVIVAL', reductions: 2 }], url);
			expect(html).toContain('survival.png');
			expect(html).toContain('reduced 2 damage');
		});

		test('renders PLASTENITE_ARMOR icon', () => {
			const html = ResultsRenderer.renderEffectIcons([{ type: 'PLASTENITE_ARMOR', reductions: 1 }], url);
			expect(html).toContain('plastenite_armor.jpg');
			expect(html).toContain('combat damage');
		});

		test('deduplicates effects of the same type', () => {
			const effects = [{ type: 'ROPE', damagePrevented: 2 }, { type: 'ROPE', damagePrevented: 1 }];
			const html = ResultsRenderer.renderEffectIcons(effects, url);
			expect((html.match(/rope\.jpg/g) || []).length).toBe(1);
		});

		test('renders multiple different effect types', () => {
			const effects = [{ type: 'ROPE' }, { type: 'SURVIVAL' }];
			const html = ResultsRenderer.renderEffectIcons(effects, url);
			expect(html).toContain('rope.jpg');
			expect(html).toContain('survival.png');
		});

		test('skips unknown effect types silently', () => {
			const html = ResultsRenderer.renderEffectIcons([{ type: 'UNKNOWN_EFFECT' }], url);
			expect(html).toBe('');
		});

	});

	// =========================================================================
	// render — full card
	// =========================================================================

	describe('render', () => {

		const player = { avatar: 'bob_random_avatar.png', health: 14 };

		test('returns one card per player', () => {
			const html = ResultsRenderer.render([player, player], {}, [], {}, url);
			expect((html.match(/expedition-result-card/g) || []).length).toBe(2);
		});

		test('shows stuck-in-ship card for non-participating player', () => {
			const html = ResultsRenderer.render(
				[player],
				{},
				[{ canParticipate: false }],
				{},
				url
			);
			expect(html).toContain('stuck_in_ship.png');
			expect(html).toContain('health-stuck');
			expect(html).not.toContain('hp.png');
		});

		test('shows player avatar', () => {
			const html = ResultsRenderer.render([player], {}, [{ canParticipate: true }], {}, url);
			expect(html).toContain('bob_random_avatar.png');
		});

		test('shows health values from healthByScenario for participating player', () => {
			const healthByScenario = {
				optimist: [14], average: [10], pessimist: [6], worstCase: [1],
			};
			const html = ResultsRenderer.render(
				[player],
				healthByScenario,
				[{ canParticipate: true }],
				{},
				url
			);
			expect(html).toContain('14');
			expect(html).toContain('10');
			expect(html).toContain('6');
			expect(html).toContain('1');
		});

		test('shows dead icon when a scenario health is 0', () => {
			const healthByScenario = {
				optimist: [0], average: [0], pessimist: [0], worstCase: [0],
			};
			const html = ResultsRenderer.render(
				[player],
				healthByScenario,
				[{ canParticipate: true }],
				{},
				url
			);
			expect(html).toContain('dead.png');
		});

		test('applies correct health CSS classes', () => {
			const healthByScenario = {
				optimist: [14], average: [7], pessimist: [2], worstCase: [0],
			};
			const html = ResultsRenderer.render(
				[player],
				healthByScenario,
				[{ canParticipate: true }],
				{},
				url
			);
			expect(html).toContain('health-high');
			expect(html).toContain('health-medium');
			expect(html).toContain('health-critical');
			expect(html).toContain('health-dead');
		});

		test('renders effect icons strip when effects present', () => {
			const effectsByScenario = {
				optimist: [[{ type: 'ROPE', damagePrevented: 2 }]],
				average: [], pessimist: [], worstCase: [],
			};
			const html = ResultsRenderer.render(
				[player],
				{ optimist: [14], average: [14], pessimist: [14], worstCase: [14] },
				[{ canParticipate: true }],
				effectsByScenario,
				url
			);
			expect(html).toContain('rope.jpg');
			expect(html).toContain('expedition-result-effects');
		});

		test('canParticipate defaults to true when status entry is missing', () => {
			const html = ResultsRenderer.render([player], {}, [], {}, url);
			expect(html).not.toContain('stuck_in_ship.png');
			expect(html).toContain('hp.png');
		});

	});

});
