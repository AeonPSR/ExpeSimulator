/**
 * CrewDetailsResetService
 *
 * Restores all Crew detail cards to their timeline-specific defaults.
 */
class CrewDetailsResetService {
	static reset(options = {}) {
		const {
			cardByFilename,
			cardInstanceByFilename,
			playerByFilename,
			timelineStepperByFilename,
			hiddenCharacters,
			activeCardsContainer,
			hiddenCardsContainer,
			organizer,
			onVisibilityChange,
			onDeadChange,
			onStatusChange,
			onActivityChange,
			onTitleEligibilityChange
		} = options;

		const previousRects = organizer.getCardRects();
		const hiddenCharacterSet = new Set(hiddenCharacters || []);

		Object.keys(cardByFilename).forEach(filename => {
			const player = playerByFilename[filename];
			const card = cardByFilename[filename];
			const cardInstance = cardInstanceByFilename[filename];
			if (!player || !cardInstance || !card) return;

			const startsHuman = CrewCharacterState.startsHuman(filename);
			const resetValues = CrewCharacterState.getResetValues(startsHuman);
			CrewCharacterState.reset(player, filename);
			timelineStepperByFilename[filename]?.reset();

			this._resetSlots(player, cardInstance, resetValues);
			this._resetAbilities(cardInstance);
			this._resetToggles(player, cardInstance, startsHuman, !hiddenCharacterSet.has(filename));

			CrewDetailSkillAvailability.update(card, player);
			organizer.appendSorted(player.visible ? activeCardsContainer : hiddenCardsContainer, filename, card);
			onVisibilityChange?.(filename, player.visible);
			onDeadChange?.(filename, false);
			onStatusChange?.(filename, startsHuman ? 'human' : null);
			onActivityChange?.(filename, null);
			onTitleEligibilityChange?.(filename, true);
		});

		organizer.updateSubsectionVisibility();
		organizer.animateCardMoves(previousRects);
	}

	static _resetSlots(player, cardInstance, resetValues) {
		Object.entries(resetValues).forEach(([playerKey, value]) => {
			if (['dead', 'mush', 'human', 'inactive', 'grandInactive', 'day', 'cycle'].includes(playerKey)) return;
			player[playerKey] = value;
			cardInstance.updateSlotValue(playerKey, value);
		});
		cardInstance.updateHealth(Constants.DEFAULT_HEALTH);
	}

	static _resetAbilities(cardInstance) {
		for (let index = 0; index < Constants.ABILITY_SLOTS; index++) {
			cardInstance.updateAbility(index, null);
		}
		for (let index = 0; index < 5; index++) {
			cardInstance.updateMushAbility(index, null);
		}
	}

	static _resetToggles(player, cardInstance, startsHuman, isVisible) {
		['dead', 'mush', 'inactive', 'grandInactive'].forEach(playerKey => {
			player[playerKey] = false;
			cardInstance.setToggleState(playerKey, false);
		});
		player.human = startsHuman;
		cardInstance.setToggleState('human', startsHuman);
		player.visible = isVisible;
		cardInstance.setToggleState('visible', isVisible);
	}
}

if (typeof window !== 'undefined') {
	window.CrewDetailsResetService = CrewDetailsResetService;
}