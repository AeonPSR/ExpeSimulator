/**
 * OxygenService Tests
 * 
 * Tests for oxygen and participation requirements.
 */

describe('OxygenService', () => {

	// Store originals for restoration
	let originalFilenameToId;

	beforeAll(() => {
		// Save originals
		originalFilenameToId = global.filenameToId;

		// Mock filenameToId
		global.filenameToId = jest.fn((filename) => {
			if (!filename) return '';
			return filename.replace(/\.(jpg|png)$/, '').toLowerCase();
		});
	});

	afterAll(() => {
		global.filenameToId = originalFilenameToId;
	});

	beforeEach(() => {
		filenameToId.mockClear();
	});

	// ========================================
	// planetHasOxygen()
	// ========================================

	describe('planetHasOxygen', () => {

		test('returns true when OXYGEN sector present', () => {
			const sectors = ['FOREST', 'OXYGEN', 'DESERT'];
			expect(OxygenService.planetHasOxygen(sectors)).toBe(true);
		});

		test('returns false when no OXYGEN sector', () => {
			const sectors = ['FOREST', 'DESERT', 'HYDROCARBON'];
			expect(OxygenService.planetHasOxygen(sectors)).toBe(false);
		});

		test('returns false for empty sectors', () => {
			expect(OxygenService.planetHasOxygen([])).toBe(false);
		});
	});

	// ========================================
	// playerHasSpacesuit()
	// ========================================

	describe('playerHasSpacesuit', () => {

		test('returns true when player has space_suit', () => {
			const player = { items: ['blaster.jpg', 'space_suit.jpg'] };
			expect(OxygenService.playerHasSpacesuit(player)).toBe(true);
		});

		test('returns false when player has no spacesuit', () => {
			const player = { items: ['blaster.jpg', 'knife.jpg'] };
			expect(OxygenService.playerHasSpacesuit(player)).toBe(false);
		});

		test('returns false for empty items', () => {
			const player = { items: [] };
			expect(OxygenService.playerHasSpacesuit(player)).toBe(false);
		});

		test('returns false for null items', () => {
			const player = { items: null };
			expect(OxygenService.playerHasSpacesuit(player)).toBe(false);
		});

		test('handles null entries in items array', () => {
			const player = { items: [null, 'space_suit.jpg', null] };
			expect(OxygenService.playerHasSpacesuit(player)).toBe(true);
		});
	});

	// ========================================
	// canParticipate()
	// ========================================

	describe('canParticipate', () => {

		test('everyone can participate when planet has oxygen', () => {
			const player = { items: [] };
			const sectors = ['OXYGEN', 'FOREST'];

			expect(OxygenService.canParticipate(player, sectors)).toBe(true);
		});

		test('player with spacesuit can participate without oxygen', () => {
			const player = { items: ['space_suit.jpg'] };
			const sectors = ['FOREST', 'DESERT'];

			expect(OxygenService.canParticipate(player, sectors)).toBe(true);
		});

		test('player without spacesuit cannot participate without oxygen', () => {
			const player = { items: ['blaster.jpg'] };
			const sectors = ['FOREST', 'DESERT'];

			expect(OxygenService.canParticipate(player, sectors)).toBe(false);
		});
	});

	// ========================================
	// getParticipatingPlayers()
	// ========================================

	describe('getParticipatingPlayers', () => {

		test('returns all players when planet has oxygen', () => {
			const players = [
				{ id: 1, items: [] },
				{ id: 2, items: [] }
			];
			const sectors = ['OXYGEN', 'FOREST'];

			const result = OxygenService.getParticipatingPlayers(players, sectors);

			expect(result.length).toBe(2);
		});

		test('filters out players without spacesuit when no oxygen', () => {
			const players = [
				{ id: 1, items: ['space_suit.jpg'] },
				{ id: 2, items: [] },
				{ id: 3, items: ['space_suit.jpg'] }
			];
			const sectors = ['FOREST', 'DESERT'];

			const result = OxygenService.getParticipatingPlayers(players, sectors);

			expect(result.length).toBe(2);
			expect(result[0].id).toBe(1);
			expect(result[1].id).toBe(3);
		});

		test('returns empty array when no one can participate', () => {
			const players = [
				{ id: 1, items: [] },
				{ id: 2, items: ['blaster.jpg'] }
			];
			const sectors = ['FOREST', 'DESERT'];

			const result = OxygenService.getParticipatingPlayers(players, sectors);

			expect(result.length).toBe(0);
		});
	});

	// ========================================
	// getParticipationStatus()
	// ========================================

	describe('getParticipationStatus', () => {

		test('returns status for each player with oxygen', () => {
			const players = [
				{ id: 1, items: [] },
				{ id: 2, items: [] }
			];
			const sectors = ['OXYGEN', 'FOREST'];

			const result = OxygenService.getParticipationStatus(players, sectors);

			expect(result.length).toBe(2);
			expect(result[0].canParticipate).toBe(true);
			expect(result[0].reason).toBe('Planet has oxygen');
		});

		test('indicates spacesuit for players who have one', () => {
			const players = [
				{ id: 1, items: ['space_suit.jpg'] }
			];
			const sectors = ['FOREST', 'DESERT'];

			const result = OxygenService.getParticipationStatus(players, sectors);

			expect(result[0].canParticipate).toBe(true);
			expect(result[0].reason).toBe('Has spacesuit');
		});

		test('indicates stuck in ship for players without spacesuit', () => {
			const players = [
				{ id: 1, items: [] }
			];
			const sectors = ['FOREST', 'DESERT'];

			const result = OxygenService.getParticipationStatus(players, sectors);

			expect(result[0].canParticipate).toBe(false);
			expect(result[0].reason).toBe('Stuck in ship (no oxygen)');
		});

		test('includes player reference in status', () => {
			const players = [
				{ id: 1, name: 'Player 1', items: [] }
			];
			const sectors = ['OXYGEN'];

			const result = OxygenService.getParticipationStatus(players, sectors);

			expect(result[0].player).toBe(players[0]);
		});
	});
});
