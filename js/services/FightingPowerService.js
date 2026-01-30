/**
 * Fighting Power Service
 * 
 * Calculates total fighting power from players, items, and abilities.
 * Pure calculation logic separated from UI concerns.
 * 
 * Note: Grenades are counted separately for the simulator.
 * UI displays max theoretical power (base + all grenades).
 */
class FightingPowerService {
	/**
	 * Gets grenade power from config
	 * @returns {number} Power per grenade
	 */
	static getGrenadePower() {
		return ItemEffects?.grenade?.effects?.combatPowerBonus || 3;
	}

	/**
	 * Calculates base fighting power (without grenades)
	 * @param {Array<Object>} players - Array of player objects
	 * @param {boolean} centauriActive - Whether Centauri base effect is active
	 * @returns {number} Base fighting power
	 */
	static calculateBaseFightingPower(players, centauriActive = false) {
		const basePower = players.length;
		const itemPower = this.calculateItemPower(players, centauriActive);
		const abilityPower = this.calculateAbilityPower(players);
		
		return basePower + itemPower + abilityPower;
	}

	/**
	 * Calculates max theoretical fighting power (including all grenades)
	 * This is what the UI displays to show max potential power
	 * @param {Array<Object>} players - Array of player objects
	 * @param {boolean} centauriActive - Whether Centauri base effect is active
	 * @returns {number} Max theoretical fighting power
	 */
	static calculateTotalFightingPower(players, centauriActive = false) {
		const basePower = this.calculateBaseFightingPower(players, centauriActive);
		const grenadeCount = this.countGrenades(players);
		
		return basePower + (grenadeCount * this.getGrenadePower());
	}

	/**
	 * Counts the number of grenades in the team
	 * @param {Array<Object>} players - Array of player objects
	 * @returns {number} Total grenade count
	 */
	static countGrenades(players) {
		let count = 0;
		
		players.forEach(player => {
			if (player.items && Array.isArray(player.items)) {
				player.items.forEach(itemIcon => {
					if (itemIcon) {
						const itemName = itemIcon.replace(/\.(jpg|png)$/i, '').toLowerCase();
						if (itemName === 'grenade') {
							count++;
						}
					}
				});
			}
		});
		
		return count;
	}

	/**
	 * Calculates fighting power from all player items (excluding grenades)
	 * Grenades are handled separately via countGrenades()
	 * @param {Array<Object>} players - Array of player objects
	 * @param {boolean} centauriActive - Whether Centauri base effect is active
	 * @returns {number} Total item power
	 */
	static calculateItemPower(players, centauriActive = false) {
		let totalPower = 0;
		
		players.forEach(player => {
			if (player.items && Array.isArray(player.items)) {
				player.items.forEach(itemIcon => {
					// Skip null/empty items and grenades (grenades handled separately)
					if (itemIcon) {
						const itemName = itemIcon.replace(/\.(jpg|png)$/i, '').toLowerCase();
						if (itemName !== 'grenade') {
							totalPower += this.getItemPower(itemIcon, centauriActive);
						}
					}
				});
			}
		});
		
		return totalPower;
	}

	/**
	 * Calculates fighting power from all player abilities
	 * @param {Array<Object>} players - Array of player objects
	 * @returns {number} Total ability power
	 */
	static calculateAbilityPower(players) {
		let totalPower = 0;
		
		players.forEach(player => {
			if (player.abilities && Array.isArray(player.abilities)) {
				player.abilities.forEach(abilityIcon => {
					// Skip null/empty abilities
					if (abilityIcon) {
						totalPower += this.getAbilityPower(abilityIcon, player);
					}
				});
			}
		});
		
		return totalPower;
	}

	/**
	 * Gets fighting power from a single item
	 * @param {string} itemIcon - Item icon filename
	 * @param {boolean} centauriActive - Whether Centauri base effect is active
	 * @returns {number} Item power
	 */
	static getItemPower(itemIcon, centauriActive = false) {
		const itemName = itemIcon.replace(/\.(jpg|png)$/i, '').toLowerCase();
		const itemConfig = ItemEffects[itemName];
		
		let power = itemConfig?.effects?.combatPowerBonus || 0;
		
		// Apply Centauri base effect for blasters
		if (centauriActive && itemName === 'blaster') {
			power += BaseEffects?.centauri?.effects?.blasterCombatBonus || 0;
		}
		
		return power;
	}

	/**
	 * Gets fighting power from a single ability
	 * @param {string} abilityIcon - Ability icon filename  
	 * @param {Object} player - Player object (needed for gunman validation)
	 * @returns {number} Ability power
	 */
	static getAbilityPower(abilityIcon, player) {
		const abilityName = abilityIcon.replace(/\.(jpg|png)$/i, '').toLowerCase();
		const abilityConfig = AbilityEffects[abilityName];
		
		if (!abilityConfig?.effects) return 0;
		
		// Handle gunman ability - only works if player has a gun
		if (abilityName === 'gunman') {
			return this.validateGunmanBonus(abilityConfig, player);
		}
		
		return abilityConfig.effects.combatPowerBonus || 0;
	}

	/**
	 * Validates gunman ability bonus based on player equipment
	 * @param {Object} abilityConfig - Gunman ability configuration
	 * @param {Object} player - Player object
	 * @returns {number} Gunman power bonus (0 if no valid gun)
	 */
	static validateGunmanBonus(abilityConfig, player) {
		const effects = abilityConfig.effects;
		if (!effects.requiresGun || !effects.gunTypes || !player.items) return 0;
		
		// Normalize gun types (config uses names without extensions)
		const gunTypes = effects.gunTypes.map(gun => gun.toLowerCase());
		
		// Check if player has any gun (normalize item names by removing extension)
		const hasGun = player.items.some(item => {
			if (!item) return false;
			// Remove both .jpg and .png extensions
			const itemName = item.replace(/\.(jpg|png)$/i, '').toLowerCase();
			return gunTypes.includes(itemName);
		});
		
		return hasGun ? (effects.combatPowerBonus || 0) : 0;
	}
}

// Export
if (typeof window !== 'undefined') {
	window.FightingPowerService = FightingPowerService;
}