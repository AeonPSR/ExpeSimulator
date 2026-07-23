/**
 * CrewDetailCardActions
 *
 * Creates behavior callbacks for Crew detail cards.
 */
class CrewDetailCardActions {
	constructor(options = {}) {
		this._cardInstanceByFilename = options.cardInstanceByFilename;
		this._notesService = options.notesService;
		this._skillSelectionService = options.skillSelectionService;
		this._onDeathStateChange = options.onDeathStateChange;
		this._onVisibilityToggle = options.onVisibilityToggle;
		this._onStatusChange = options.onStatusChange;
		this._onActivityChange = options.onActivityChange;
		this._onTitleEligibilityChange = options.onTitleEligibilityChange;
		this._onSkillAvailabilityChange = options.onSkillAvailabilityChange;
		this._onPlayerChange = options.onPlayerChange;
	}

	createHandlers(filename, player) {
		return {
			onAbilityClick: (playerId, slotIndex) => this._openHumanSkillSelection(filename, player, slotIndex),
			onMushAbilityClick: (playerId, slotIndex) => this._openMushSkillSelection(filename, player, slotIndex),
			onSlotClick: (playerId, playerKey) => this._promptSlotValue(filename, player, playerKey),
			onHealthClick: () => this._promptHealth(filename, player),
			onNotesClick: () => this._notesService.openCharacterNotes(filename),
			onToggleClick: (playerId, playerKey, isActive) => this._togglePlayerState(filename, player, playerKey, isActive)
		};
	}

	_openHumanSkillSelection(filename, player, slotIndex) {
		const cardInstance = this._getCardInstance(filename);
		this._skillSelectionService.openHumanSkillSelection({
			filename,
			player,
			slotIndex,
			cardInstance,
			onSelect: (item) => {
				player.abilities[slotIndex] = item.id;
				cardInstance?.updateAbility(slotIndex, item.id);
				this._onSkillAvailabilityChange?.(cardInstance?.element, player);
				this._onPlayerChange?.(filename);
			}
		});
	}

	_openMushSkillSelection(filename, player, slotIndex) {
		const cardInstance = this._getCardInstance(filename);
		this._skillSelectionService.openMushSkillSelection({
			player,
			slotIndex,
			cardInstance,
			onSelect: (item) => {
				player.mushAbilities[slotIndex] = item.id;
				cardInstance?.updateMushAbility(slotIndex, item.id);
				this._onPlayerChange?.(filename);
			}
		});
	}

	_promptSlotValue(filename, player, playerKey) {
		const cardInstance = this._getCardInstance(filename);
		const current = player[playerKey];
		const input = prompt('', current.toString());
		if (input === null) return;

		const value = parseInt(input, 10);
		if (isNaN(value) || value < 0) return;

		const limit = this._getSlotLimits()[playerKey];
		const nextValue = typeof limit === 'number' ? Math.min(value, limit) : value;
		player[playerKey] = nextValue;
		cardInstance?.updateSlotValue(playerKey, nextValue);
		this._onPlayerChange?.(filename);
		if (playerKey === 'morale') {
			this._onDeathStateChange?.(filename);
		}
	}

	_promptHealth(filename, player) {
		const cardInstance = this._getCardInstance(filename);
		const input = prompt('', player.health.toString());
		if (input === null) return;

		const value = parseInt(input, 10);
		if (isNaN(value) || value < 0) return;

		player.health = Math.min(value, 20);
		cardInstance?.updateHealth(player.health);
		this._onPlayerChange?.(filename);
		this._onDeathStateChange?.(filename);
	}

	_togglePlayerState(filename, player, playerKey, isActive) {
		player[playerKey] = isActive;
		const cardInstance = this._getCardInstance(filename);

		if (playerKey === 'mush' && isActive) {
			player.human = false;
			cardInstance?.setToggleState('human', false);
		} else if (playerKey === 'human' && isActive) {
			player.mush = false;
			cardInstance?.setToggleState('mush', false);
		}
		if (playerKey === 'inactive' && !isActive) {
			player.grandInactive = false;
			cardInstance?.setToggleState('grandInactive', false);
		}

		this._notifyActivityChange(filename, player, playerKey);
		this._notifyTitleEligibilityChange(filename, player, playerKey);
		this._notifyDeathChange(filename, playerKey);
		this._notifyStatusChange(filename, player, playerKey);
		this._notifyVisibilityChange(filename, playerKey, isActive);
		this._onPlayerChange?.(filename);
	}

	_notifyActivityChange(filename, player, playerKey) {
		if (playerKey !== 'inactive' && playerKey !== 'grandInactive') return;
		const activity = player.grandInactive ? 'grandInactive' : player.inactive ? 'inactive' : null;
		this._onActivityChange?.(filename, activity);
	}

	_notifyTitleEligibilityChange(filename, player, playerKey) {
		if (playerKey !== 'inactive' && playerKey !== 'grandInactive') return;
		const canReceiveTitle = !CrewCharacterState.isDead(player) && !player.inactive && !player.grandInactive;
		this._onTitleEligibilityChange?.(filename, canReceiveTitle);
	}

	_notifyDeathChange(filename, playerKey) {
		if (playerKey === 'dead') {
			this._onDeathStateChange?.(filename);
		}
	}

	_notifyStatusChange(filename, player, playerKey) {
		if (playerKey !== 'mush' && playerKey !== 'human') return;
		const status = player.mush ? 'mush' : player.human ? 'human' : null;
		this._onStatusChange?.(filename, status);
	}

	_notifyVisibilityChange(filename, playerKey, isActive) {
		if (playerKey !== 'visible') return;
		this._onVisibilityToggle?.(filename, isActive);
	}

	_getCardInstance(filename) {
		return this._cardInstanceByFilename[filename];
	}

	_getSlotLimits() {
		return {
			morale:    20,
			spore:     20,
			pa:        50,
			pm:        50,
			paCore:    4,
			paComp:    6,
			paFood:    8,
			paGarden:  4,
			paHeal:    4,
			paPilgred: 2,
			paShoot:   6,
			paTech:    2,
			paTorture: 2
		};
	}

}

if (typeof window !== 'undefined') {
	window.CrewDetailCardActions = CrewDetailCardActions;
}