/**
 * LoadoutBuilder Tests
 * 
 * Tests for building loadout data from player state.
 */

describe('LoadoutBuilder', () => {

	// Store originals for restoration
	let originalFilenameToId;
	let originalConstants;
	let originalConsoleLog;

	beforeAll(() => {
		// Save originals
		originalFilenameToId = global.filenameToId;
		originalConstants = global.Constants;
		originalConsoleLog = console.log;

		// Suppress console.log during tests
		console.log = jest.fn();

		// Mock filenameToId
		global.filenameToId = jest.fn((filename) => {
			if (!filename) return '';
			return filename.replace(/\.(jpg|png)$/, '').toUpperCase();
		});

		// Mock Constants
		global.Constants = {
			ABILITY_ALIASES: {
				'SKILLFUL': ['DIPLOMACY', 'BOTANIC'],
				'COMMANDER': ['LEADER']
			}
		};
	});

	afterAll(() => {
		global.filenameToId = originalFilenameToId;
		global.Constants = originalConstants;
		console.log = originalConsoleLog;
	});

	beforeEach(() => {
		filenameToId.mockClear();
	});

	// ========================================
	// build()
	// ========================================

	describe('build', () => {

		test('returns loadout with abilities, items, and projects', () => {
			const players = [
				{ abilities: ['pilot.png'], items: ['blaster.jpg'] }
			];
			const result = LoadoutBuilder.build(players);

			expect(result).toHaveProperty('abilities');
			expect(result).toHaveProperty('items');
			expect(result).toHaveProperty('projects');
		});

		test('collects abilities from all players', () => {
			const players = [
				{ abilities: ['pilot.png'], items: [] },
				{ abilities: ['tracker.png'], items: [] }
			];
			const result = LoadoutBuilder.build(players);

			expect(result.abilities).toContain('PILOT');
			expect(result.abilities).toContain('TRACKER');
		});

		test('collects items from all players', () => {
			const players = [
				{ abilities: [], items: ['blaster.jpg'] },
				{ abilities: [], items: ['white_flag.jpg'] }
			];
			const result = LoadoutBuilder.build(players);

			expect(result.items).toContain('BLASTER');
			expect(result.items).toContain('WHITE_FLAG');
		});

		test('deduplicates abilities', () => {
			const players = [
				{ abilities: ['pilot.png'], items: [] },
				{ abilities: ['pilot.png'], items: [] }
			];
			const result = LoadoutBuilder.build(players);

			const pilotCount = result.abilities.filter(a => a === 'PILOT').length;
			expect(pilotCount).toBe(1);
		});

		test('deduplicates items', () => {
			const players = [
				{ abilities: [], items: ['blaster.jpg'] },
				{ abilities: [], items: ['blaster.jpg'] }
			];
			const result = LoadoutBuilder.build(players);

			const blasterCount = result.items.filter(i => i === 'BLASTER').length;
			expect(blasterCount).toBe(1);
		});

		test('expands ability aliases', () => {
			const players = [
				{ abilities: ['skillful.png'], items: [] }
			];
			const result = LoadoutBuilder.build(players);

			expect(result.abilities).toContain('SKILLFUL');
			expect(result.abilities).toContain('DIPLOMACY');
			expect(result.abilities).toContain('BOTANIC');
		});

		test('adds ANTIGRAV_PROPELLER project when active', () => {
			const players = [
				{ abilities: [], items: [] }
			];
			const result = LoadoutBuilder.build(players, { antigravActive: true });

			expect(result.projects).toContain('ANTIGRAV_PROPELLER');
		});

		test('projects empty when antigrav not active', () => {
			const players = [
				{ abilities: [], items: [] }
			];
			const result = LoadoutBuilder.build(players, { antigravActive: false });

			expect(result.projects).toEqual([]);
		});

		test('handles empty players array', () => {
			const result = LoadoutBuilder.build([]);

			expect(result.abilities).toEqual([]);
			expect(result.items).toEqual([]);
			expect(result.projects).toEqual([]);
		});

		test('handles null abilities and items', () => {
			const players = [
				{ abilities: null, items: null }
			];
			const result = LoadoutBuilder.build(players);

			expect(result.abilities).toEqual([]);
			expect(result.items).toEqual([]);
		});

		test('skips null entries in abilities', () => {
			const players = [
				{ abilities: [null, 'pilot.png', null], items: [] }
			];
			const result = LoadoutBuilder.build(players);

			expect(result.abilities).toEqual(['PILOT']);
		});
	});

	// ========================================
	// _collectAbilities()
	// ========================================

	describe('_collectAbilities', () => {

		test('adds ability identifiers to set', () => {
			const player = { abilities: ['pilot.png', 'tracker.png'] };
			const abilities = new Set();

			LoadoutBuilder._collectAbilities(player, abilities);

			expect(abilities.has('PILOT')).toBe(true);
			expect(abilities.has('TRACKER')).toBe(true);
		});

		test('expands aliases', () => {
			const player = { abilities: ['skillful.png'] };
			const abilities = new Set();

			LoadoutBuilder._collectAbilities(player, abilities);

			expect(abilities.has('SKILLFUL')).toBe(true);
			expect(abilities.has('DIPLOMACY')).toBe(true);
			expect(abilities.has('BOTANIC')).toBe(true);
		});

		test('handles empty abilities array', () => {
			const player = { abilities: [] };
			const abilities = new Set();

			LoadoutBuilder._collectAbilities(player, abilities);

			expect(abilities.size).toBe(0);
		});
	});

	// ========================================
	// _collectItems()
	// ========================================

	describe('_collectItems', () => {

		test('adds item identifiers to set', () => {
			const player = { items: ['blaster.jpg', 'knife.jpg'] };
			const items = new Set();

			LoadoutBuilder._collectItems(player, items);

			expect(items.has('BLASTER')).toBe(true);
			expect(items.has('KNIFE')).toBe(true);
		});

		test('handles empty items array', () => {
			const player = { items: [] };
			const items = new Set();

			LoadoutBuilder._collectItems(player, items);

			expect(items.size).toBe(0);
		});

		test('skips null items', () => {
			const player = { items: [null, 'blaster.jpg'] };
			const items = new Set();

			LoadoutBuilder._collectItems(player, items);

			expect(items.has('BLASTER')).toBe(true);
			expect(items.size).toBe(1);
		});
	});

	// ========================================
	// idToFilename()
	// ========================================

	describe('idToFilename', () => {

		test('converts ID to lowercase filename', () => {
			const filename = LoadoutBuilder.idToFilename('PILOT');
			expect(filename).toBe('pilot.png');
		});

		test('uses default png extension', () => {
			const filename = LoadoutBuilder.idToFilename('BLASTER');
			expect(filename).toBe('blaster.png');
		});

		test('uses custom extension', () => {
			const filename = LoadoutBuilder.idToFilename('BLASTER', 'jpg');
			expect(filename).toBe('blaster.jpg');
		});

		test('handles underscores', () => {
			const filename = LoadoutBuilder.idToFilename('WHITE_FLAG');
			expect(filename).toBe('white_flag.png');
		});
	});
});
