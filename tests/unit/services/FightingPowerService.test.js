/**
 * FightingPowerService Tests
 * 
 * Tests for fighting power calculations from players, items, and abilities.
 */

describe('FightingPowerService', () => {

	// Store originals for restoration
	let originalItemEffects;
	let originalAbilityEffects;
	let originalBaseEffects;
	let originalFilenameToId;

	beforeAll(() => {
		// Save originals
		originalItemEffects = global.ItemEffects;
		originalAbilityEffects = global.AbilityEffects;
		originalBaseEffects = global.BaseEffects;
		originalFilenameToId = global.filenameToId;

		// Mock ItemEffects
		global.ItemEffects = {
			grenade: { effects: { combatPowerBonus: 3 } },
			blaster: { effects: { combatPowerBonus: 6 } },
			old_faithful: { effects: { combatPowerBonus: 6 } },
			knife: { effects: { combatPowerBonus: 2 } },
			natamy: { effects: { combatPowerBonus: 3 } },
			plastenite_armor: { effects: { } }
		};

		// Mock AbilityEffects
		global.AbilityEffects = {
			shooter: { effects: { combatPowerBonus: 1 } },
			gunman: { 
				effects: { 
					combatPowerBonus: 2, 
					requiresGun: true,
					gunTypes: ['blaster', 'old_faithful', 'natamy']
				} 
			},
			wrestler: { effects: { combatPowerBonus: 1 } }
		};

		// Mock BaseEffects
		global.BaseEffects = {
			centauri: { effects: { blasterCombatBonus: 2 } }
		};

		// Mock filenameToId
		global.filenameToId = jest.fn((filename) => {
			if (!filename) return '';
			return filename.replace(/\.(jpg|png)$/, '').toUpperCase();
		});
	});

	afterAll(() => {
		global.ItemEffects = originalItemEffects;
		global.AbilityEffects = originalAbilityEffects;
		global.BaseEffects = originalBaseEffects;
		global.filenameToId = originalFilenameToId;
	});

	beforeEach(() => {
		filenameToId.mockClear();
	});

	// ========================================
	// getGrenadePower()
	// ========================================

	describe('getGrenadePower', () => {

		test('returns grenade power from config', () => {
			const power = FightingPowerService.getGrenadePower();
			expect(power).toBe(3);
		});

		test('defaults to 3 if config missing', () => {
			const orig = global.ItemEffects;
			global.ItemEffects = null;
			
			const power = FightingPowerService.getGrenadePower();
			expect(power).toBe(3);
			
			global.ItemEffects = orig;
		});
	});

	// ========================================
	// calculateBaseFightingPower()
	// ========================================

	describe('calculateBaseFightingPower', () => {

		test('includes 1 power per player', () => {
			const players = [
				{ abilities: [], items: [] },
				{ abilities: [], items: [] }
			];
			const power = FightingPowerService.calculateBaseFightingPower(players);

			// 2 players = 2 base power
			expect(power).toBe(2);
		});

		test('adds item power', () => {
			const players = [
				{ abilities: [], items: ['blaster.jpg'] }
			];
			const power = FightingPowerService.calculateBaseFightingPower(players);

			// 1 player + 6 blaster = 7
			expect(power).toBe(7);
		});

		test('adds ability power', () => {
			const players = [
				{ abilities: ['shooter.png'], items: [] }
			];
			const power = FightingPowerService.calculateBaseFightingPower(players);

			// 1 player + 1 shooter = 2
			expect(power).toBe(2);
		});

		test('excludes grenades from base power', () => {
			const players = [
				{ abilities: [], items: ['grenade.jpg', 'grenade.jpg'] }
			];
			const power = FightingPowerService.calculateBaseFightingPower(players);

			// 1 player, grenades excluded = 1
			expect(power).toBe(1);
		});
	});

	// ========================================
	// calculateTotalFightingPower()
	// ========================================

	describe('calculateTotalFightingPower', () => {

		test('includes grenade power', () => {
			const players = [
				{ abilities: [], items: ['grenade.jpg', 'grenade.jpg'] }
			];
			const power = FightingPowerService.calculateTotalFightingPower(players);

			// 1 player + 2 grenades × 3 = 7
			expect(power).toBe(7);
		});

		test('combines base and grenade power', () => {
			const players = [
				{ abilities: [], items: ['blaster.jpg', 'grenade.jpg'] }
			];
			const power = FightingPowerService.calculateTotalFightingPower(players);

			// 1 player + 6 blaster + 1 grenade × 3 = 10
			expect(power).toBe(10);
		});
	});

	// ========================================
	// countGrenades()
	// ========================================

	describe('countGrenades', () => {

		test('counts grenades across players', () => {
			const players = [
				{ items: ['grenade.jpg'] },
				{ items: ['grenade.jpg', 'grenade.jpg'] }
			];
			const count = FightingPowerService.countGrenades(players);

			expect(count).toBe(3);
		});

		test('returns 0 for no grenades', () => {
			const players = [
				{ items: ['blaster.jpg', 'knife.jpg'] }
			];
			const count = FightingPowerService.countGrenades(players);

			expect(count).toBe(0);
		});

		test('handles empty items array', () => {
			const players = [
				{ items: [] },
				{ items: null }
			];
			const count = FightingPowerService.countGrenades(players);

			expect(count).toBe(0);
		});
	});

	// ========================================
	// calculateItemPower()
	// ========================================

	describe('calculateItemPower', () => {

		test('sums power from all items', () => {
			const players = [
				{ items: ['blaster.jpg', 'knife.jpg'] }
			];
			const power = FightingPowerService.calculateItemPower(players);

			// 6 blaster + 2 knife = 8
			expect(power).toBe(8);
		});

		test('excludes grenades', () => {
			const players = [
				{ items: ['grenade.jpg', 'blaster.jpg'] }
			];
			const power = FightingPowerService.calculateItemPower(players);

			// Only blaster = 6
			expect(power).toBe(6);
		});

		test('applies Centauri bonus to blasters', () => {
			const players = [
				{ items: ['blaster.jpg'] }
			];
			const power = FightingPowerService.calculateItemPower(players, true);

			// 6 blaster + 2 centauri = 8
			expect(power).toBe(8);
		});

		test('handles null items', () => {
			const players = [
				{ items: [null, 'blaster.jpg', null] }
			];
			const power = FightingPowerService.calculateItemPower(players);

			expect(power).toBe(6);
		});
	});

	// ========================================
	// calculateAbilityPower()
	// ========================================

	describe('calculateAbilityPower', () => {

		test('sums power from all abilities', () => {
			const players = [
				{ abilities: ['shooter.png', 'wrestler.png'], items: [] }
			];
			const power = FightingPowerService.calculateAbilityPower(players);

			// 1 shooter + 1 wrestler = 2
			expect(power).toBe(2);
		});

		test('handles null abilities', () => {
			const players = [
				{ abilities: [null, 'shooter.png'] }
			];
			const power = FightingPowerService.calculateAbilityPower(players);

			expect(power).toBe(1);
		});
	});

	// ========================================
	// getItemPower()
	// ========================================

	describe('getItemPower', () => {

		test('returns power from config', () => {
			const power = FightingPowerService.getItemPower('blaster.jpg');
			expect(power).toBe(6);
		});

		test('returns 0 for unknown item', () => {
			const power = FightingPowerService.getItemPower('unknown.jpg');
			expect(power).toBe(0);
		});

		test('applies Centauri bonus to blaster', () => {
			const power = FightingPowerService.getItemPower('blaster.jpg', true);
			expect(power).toBe(8);
		});

		test('Centauri bonus only applies to blaster', () => {
			const power = FightingPowerService.getItemPower('knife.jpg', true);
			expect(power).toBe(2);  // No bonus for knife
		});
	});

	// ========================================
	// getAbilityPower()
	// ========================================

	describe('getAbilityPower', () => {

		test('returns power from config', () => {
			const player = { items: [] };
			const power = FightingPowerService.getAbilityPower('shooter.png', player);
			expect(power).toBe(1);
		});

		test('returns 0 for unknown ability', () => {
			const player = { items: [] };
			const power = FightingPowerService.getAbilityPower('unknown.png', player);
			expect(power).toBe(0);
		});
	});

	// ========================================
	// validateGunmanBonus()
	// ========================================

	describe('validateGunmanBonus', () => {

		test('returns bonus when player has a gun', () => {
			const abilityConfig = AbilityEffects.gunman;
			const player = { items: ['blaster.jpg'] };
			
			const power = FightingPowerService.validateGunmanBonus(abilityConfig, player);
			expect(power).toBe(2);
		});

		test('returns 0 when player has no gun', () => {
			const abilityConfig = AbilityEffects.gunman;
			const player = { items: ['knife.jpg'] };
			
			const power = FightingPowerService.validateGunmanBonus(abilityConfig, player);
			expect(power).toBe(0);
		});

		test('works with old_faithful gun', () => {
			const abilityConfig = AbilityEffects.gunman;
			const player = { items: ['old_faithful.jpg'] };
			
			const power = FightingPowerService.validateGunmanBonus(abilityConfig, player);
			expect(power).toBe(2);
		});

		test('returns 0 when player has no items', () => {
			const abilityConfig = AbilityEffects.gunman;
			const player = { items: null };
			
			const power = FightingPowerService.validateGunmanBonus(abilityConfig, player);
			expect(power).toBe(0);
		});
	});
});
