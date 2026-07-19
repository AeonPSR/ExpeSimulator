/**
 * CrewCharacterState
 *
 * Creates and resets Crew Manager character state objects.
 */
class CrewCharacterState {
	static create(filename, index) {
		const startsHuman = this.startsHuman(filename);
		return {
			id:        index + 1,
			avatar:    filename,
			abilities: Array(Constants.ABILITY_SLOTS).fill(null),
			mushAbilities: Array(5).fill(null),
			items:     Array(Constants.ITEM_SLOTS).fill(null),
			...this.getResetValues(startsHuman),
			visible:   true
		};
	}

	static startsHuman(filename) {
		return filename === 'chun.png';
	}

	static isDead(player) {
		return Boolean(player?.dead || player?.health <= 0 || player?.morale <= 0);
	}

	static getResetValues(startsHuman = false) {
		return {
			health:    Constants.DEFAULT_HEALTH,
			morale:    14,
			spore:     0,
			pa:        0,
			pm:        0,
			paCore:    0,
			paComp:    0,
			paFood:    0,
			paGarden:  0,
			paHeal:    0,
			paPilgred: 0,
			paShoot:   0,
			paTech:    0,
			paTorture: 0,
			dead:      false,
			mush:      false,
			human:     startsHuman,
			inactive:  false,
			grandInactive: false,
			day:       1,
			cycle:     1
		};
	}

	static reset(player, filename) {
		Object.assign(player, this.getResetValues(this.startsHuman(filename)), {
			abilities: Array(Constants.ABILITY_SLOTS).fill(null),
			mushAbilities: Array(5).fill(null),
			items: Array(Constants.ITEM_SLOTS).fill(null)
		});
		return player;
	}
}

if (typeof window !== 'undefined') {
	window.CrewCharacterState = CrewCharacterState;
}