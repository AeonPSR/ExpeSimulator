/**
 * ExpeditionState Tests
 * 
 * Tests for the expedition state management.
 */

describe('ExpeditionState', () => {

	// Store originals
	let originalConstants;

	beforeAll(() => {
		// Save original
		originalConstants = global.Constants;

		// Mock Constants
		global.Constants = {
			DEFAULT_AVATAR: 'lambda_f.png',
			DEFAULT_HEALTH: 14,
			ABILITY_SLOTS: 4,
			ITEM_SLOTS: 3
		};
	});

	afterAll(() => {
		global.Constants = originalConstants;
	});

	// ========================================
	// Constructor & Initialization
	// ========================================

	describe('constructor', () => {

		test('initializes with LANDING sector', () => {
			const state = new ExpeditionState();
			expect(state.getSectors()).toEqual(['LANDING']);
		});

		test('initializes with 4 players', () => {
			const state = new ExpeditionState();
			expect(state.getPlayerCount()).toBe(4);
		});

		test('first player has Pilot ability', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			expect(players[0].abilities[0]).toBe('pilot.png');
		});

		test('other players have no abilities', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			expect(players[1].abilities.every(a => a === null)).toBe(true);
		});

		test('players have default health', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			expect(players[0].health).toBe(14);
		});
	});

	// ========================================
	// Sector Management
	// ========================================

	describe('Sector Management', () => {

		test('getSectors returns copy of sectors', () => {
			const state = new ExpeditionState();
			const sectors = state.getSectors();
			sectors.push('MODIFIED');
			expect(state.getSectors()).not.toContain('MODIFIED');
		});

		test('addSector adds to end', () => {
			const state = new ExpeditionState();
			state.addSector('DESERT');
			expect(state.getSectors()).toContain('DESERT');
		});

		test('removeSector removes by index', () => {
			const state = new ExpeditionState();
			state.addSector('DESERT');
			state.removeSector(1);
			expect(state.getSectors()).toEqual(['LANDING']);
		});

		test('clearSectors resets to LANDING only', () => {
			const state = new ExpeditionState();
			state.addSector('DESERT');
			state.addSector('FOREST');
			state.clearSectors();
			expect(state.getSectors()).toEqual(['LANDING']);
		});

		test('setSectors replaces all sectors', () => {
			const state = new ExpeditionState();
			state.setSectors(['OXYGEN', 'DESERT', 'FOREST']);
			expect(state.getSectors()).toEqual(['OXYGEN', 'DESERT', 'FOREST']);
		});
	});

	// ========================================
	// Player Management
	// ========================================

	describe('Player Management', () => {

		test('getPlayers returns copies of players', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			players[0].health = 999;
			expect(state.getPlayers()[0].health).toBe(14);
		});

		test('getPlayer finds by ID', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			const found = state.getPlayer(players[0].id);
			expect(found).toBeDefined();
			expect(found.id).toBe(players[0].id);
		});

		test('addPlayer returns new player', () => {
			const state = new ExpeditionState();
			const player = state.addPlayer();
			expect(player).toBeDefined();
			expect(player.health).toBe(14);
		});

		test('addPlayer increments count', () => {
			const state = new ExpeditionState();
			const initial = state.getPlayerCount();
			state.addPlayer();
			expect(state.getPlayerCount()).toBe(initial + 1);
		});

		test('removePlayer removes by ID', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			const targetId = players[0].id;
			state.removePlayer(targetId);
			expect(state.getPlayer(targetId)).toBeUndefined();
		});

		test('updatePlayer modifies player', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			state.updatePlayer(players[0].id, { health: 10 });
			expect(state.getPlayer(players[0].id).health).toBe(10);
		});

		test('setPlayerAbility sets specific slot', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			state.setPlayerAbility(players[1].id, 0, 'technician.png');
			expect(state.getPlayer(players[1].id).abilities[0]).toBe('technician.png');
		});

		test('setPlayerItem sets specific slot', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			state.setPlayerItem(players[0].id, 0, 'blaster.jpg');
			expect(state.getPlayer(players[0].id).items[0]).toBe('blaster.jpg');
		});

		test('setPlayerHealth updates health', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			state.setPlayerHealth(players[0].id, 8);
			expect(state.getPlayer(players[0].id).health).toBe(8);
		});

		test('setPlayerAvatar updates avatar', () => {
			const state = new ExpeditionState();
			const players = state.getPlayers();
			state.setPlayerAvatar(players[0].id, 'custom.png');
			expect(state.getPlayer(players[0].id).avatar).toBe('custom.png');
		});
	});

	// ========================================
	// Settings
	// ========================================

	describe('Settings', () => {

		test('Centauri setting defaults to false', () => {
			const state = new ExpeditionState();
			expect(state.isCentauriActive()).toBe(false);
		});

		test('setCentauriActive updates state', () => {
			const state = new ExpeditionState();
			state.setCentauriActive(true);
			expect(state.isCentauriActive()).toBe(true);
		});

		test('Antigrav setting defaults to false', () => {
			const state = new ExpeditionState();
			expect(state.isAntigravActive()).toBe(false);
		});

		test('setAntigravActive updates state', () => {
			const state = new ExpeditionState();
			state.setAntigravActive(true);
			expect(state.isAntigravActive()).toBe(true);
		});
	});

	// ========================================
	// Change Notifications
	// ========================================

	describe('Change Notifications', () => {

		test('setOnChange sets callback', () => {
			const state = new ExpeditionState();
			const callback = jest.fn();
			state.setOnChange(callback);
			state.addSector('DESERT');
			expect(callback).toHaveBeenCalled();
		});

		test('addSector triggers change', () => {
			const state = new ExpeditionState();
			const callback = jest.fn();
			state.setOnChange(callback);
			state.addSector('DESERT');
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test('removeSector triggers change', () => {
			const state = new ExpeditionState();
			state.addSector('DESERT');
			const callback = jest.fn();
			state.setOnChange(callback);
			state.removeSector(1);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test('addPlayer triggers change', () => {
			const state = new ExpeditionState();
			const callback = jest.fn();
			state.setOnChange(callback);
			state.addPlayer();
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test('updatePlayer triggers change', () => {
			const state = new ExpeditionState();
			const callback = jest.fn();
			state.setOnChange(callback);
			const players = state.getPlayers();
			state.updatePlayer(players[0].id, { health: 5 });
			expect(callback).toHaveBeenCalledTimes(1);
		});

		test('setCentauriActive triggers change', () => {
			const state = new ExpeditionState();
			const callback = jest.fn();
			state.setOnChange(callback);
			state.setCentauriActive(true);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
