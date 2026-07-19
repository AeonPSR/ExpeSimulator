/**
 * CrewDetailCardFactory
 *
 * Builds a decorated PlayerCard for the Crew details section.
 */
class CrewDetailCardFactory {
	static create(options = {}) {
		const {
			player,
			filename,
			onAbilityClick,
			onMushAbilityClick,
			onHealthClick,
			onSlotClick,
			onToggleClick,
			onNotesClick
		} = options;

		const card = new PlayerCard({
			player:          player,
			getResourceURL:  getResourceURL,
			showRemove:      false,
			showItems:       false,
			onAbilityClick:  onAbilityClick,
			onMushAbilityClick: onMushAbilityClick,
			onHealthClick:   onHealthClick,
			extraSlots: this._getExtraSlots(onSlotClick),
			toggleSlots: this._getToggleSlots(onToggleClick),
			abilityActionSlots: [
				{ className: 'notes-action-slot', iconPath: 'pictures/ui/notepade.png', playerKey: 'notes', onClick: onNotesClick }
			],
			overlayToggleSlots: [
				{ className: 'visibility-toggle-slot', iconPath: 'pictures/ui/visibility.png', playerKey: 'visible', onToggle: onToggleClick }
			]
		});

		const element = card.render();
		element.dataset.filename = filename;
		this._decorateAvatar(element);
		return { card, element };
	}

	static _getExtraSlots(onSlotClick) {
		return [
			{ className: 'morale-slot',  iconPath: 'pictures/ui/pmo.png',        playerKey: 'morale',    onSlotClick },
			{ className: 'spore-slot',   iconPath: 'pictures/ui/spore.png',      playerKey: 'spore',     onSlotClick },
			{ className: 'expert-slot pa-slot',       iconPath: 'pictures/ui/pa.png',         playerKey: 'pa',        onSlotClick },
			{ className: 'expert-slot pm-slot',       iconPath: 'pictures/ui/pm.png',         playerKey: 'pm',        onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_core.png',    playerKey: 'paCore',    onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_torture.png', playerKey: 'paTorture', onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_heal.png',    playerKey: 'paHeal',    onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_pilgred.png', playerKey: 'paPilgred', onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_tech.png',    playerKey: 'paTech',    onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_food.png',    playerKey: 'paFood',    onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_garden.png',  playerKey: 'paGarden',  onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_shoot.png',   playerKey: 'paShoot',   onSlotClick },
			{ className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_comp.png',    playerKey: 'paComp',    onSlotClick }
		];
	}

	static _getToggleSlots(onToggleClick) {
		return [
			{ className: 'dead-toggle-slot',           iconPath: 'pictures/ui/dead.png',           playerKey: 'dead',          onToggle: onToggleClick },
			{ className: 'mush-toggle-slot',           iconPath: 'pictures/ui/mush.png',           playerKey: 'mush',          onToggle: onToggleClick },
			{ className: 'human-toggle-slot',          iconPath: 'pictures/ui/human.png',          playerKey: 'human',         onToggle: onToggleClick },
			{ className: 'inactive-toggle-slot',       iconPath: 'pictures/ui/inactive.png',       playerKey: 'inactive',      onToggle: onToggleClick },
			{ className: 'grand-inactive-toggle-slot', iconPath: 'pictures/ui/grand inactive.png', playerKey: 'grandInactive', onToggle: onToggleClick }
		];
	}

	static _decorateAvatar(element) {
		const avatar = element.querySelector('.player-avatar');
		const avatarImg = avatar?.querySelector('img');
		const spriteAnchor = document.createElement('div');
		spriteAnchor.className = 'crew-sprite-anchor';
		if (avatar && avatarImg) {
			avatarImg.classList.add('crew-character-sprite');
			avatar.removeChild(avatarImg);
			spriteAnchor.appendChild(avatarImg);
			avatar.appendChild(spriteAnchor);
		}

		const deadIcon = document.createElement('img');
		deadIcon.className = 'crew-dead-icon crew-dead-icon--detail';
		deadIcon.src = getResourceURL('pictures/ui/dead.png');
		deadIcon.alt = '';
		spriteAnchor.appendChild(deadIcon);
	}
}

if (typeof window !== 'undefined') {
	window.CrewDetailCardFactory = CrewDetailCardFactory;
}