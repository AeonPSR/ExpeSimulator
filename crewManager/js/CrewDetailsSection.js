/**
 * CrewDetailsSection Component
 *
 * Renders a PlayerCard for each of the 18 named characters in alphabetical order.
 * Remove buttons are hidden; these cards are read-only crew profiles.
 */
class CrewDetailsSection extends Component {
	constructor(options = {}) {
		super(options);
		this._cardByFilename = {};
		this._cardInstanceByFilename = {};
		this._playerByFilename = {};
		this._timelineStepperByFilename = {};
		this._notesButtonByFilename = {};
		this._notesService = options.notesService || new GameNotepadService();
		this._skillSelectionService = options.skillSelectionService || new CrewSkillSelectionService();
		this._notesAvailabilityUnsubscribe = null;
		this._activeCardsContainer = null;
		this._deadCardsContainer = null;
		this._hiddenCardsContainer = null;
		this._cardActions = null;
		this._cardOrganizer = null;
		this.onVisibilityChange = options.onVisibilityChange || null;
		this.onDeadChange = options.onDeadChange || null;
		this.onStatusChange = options.onStatusChange || null;
		this.onActivityChange = options.onActivityChange || null;
		this.onTitleEligibilityChange = options.onTitleEligibilityChange || null;
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-details-section' });
		this._activeCardsContainer = this.createElement('div', { className: 'crew-details-subsection crew-details-subsection--active' });
		this._deadCardsContainer = this.createElement('div', { className: 'crew-details-subsection crew-details-subsection--dead' });
		this._hiddenCardsContainer = this.createElement('div', { className: 'crew-details-subsection crew-details-subsection--hidden' });
		this._deadCardsContainer.hidden = true;
		this._hiddenCardsContainer.hidden = true;
		this.element.appendChild(this._activeCardsContainer);
		this.element.appendChild(this._deadCardsContainer);
		this.element.appendChild(this._hiddenCardsContainer);
		this._cardOrganizer = new CrewDetailCardOrganizer({
			cardByFilename: this._cardByFilename,
			playerByFilename: this._playerByFilename,
			activeCardsContainer: this._activeCardsContainer,
			deadCardsContainer: this._deadCardsContainer,
			hiddenCardsContainer: this._hiddenCardsContainer,
			getCharacterName: filename => this._getCharacterName(filename)
		});
		this._cardActions = new CrewDetailCardActions({
			cardInstanceByFilename: this._cardInstanceByFilename,
			notesService: this._notesService,
			skillSelectionService: this._skillSelectionService,
			onDeathStateChange: filename => this._syncDeathState(filename),
			onVisibilityToggle: (filename, isActive) => this._syncVisibilityState(filename, isActive),
			onStatusChange: (filename, status) => this.onStatusChange?.(filename, status),
			onActivityChange: (filename, activity) => this.onActivityChange?.(filename, activity),
			onTitleEligibilityChange: (filename, canReceiveTitle) => this.onTitleEligibilityChange?.(filename, canReceiveTitle),
			onSkillAvailabilityChange: (cardElement, player) => CrewDetailSkillAvailability.update(cardElement, player)
		});

		const characters = CharacterData.available
			.filter(c => c !== Constants.DEFAULT_AVATAR)
			.sort((a, b) => this._getCharacterName(a).localeCompare(this._getCharacterName(b)));
		characters.forEach((filename, index) => {
			const startsHuman = CrewCharacterState.startsHuman(filename);
			const player = CrewCharacterState.create(filename, index);
			const handlers = this._cardActions.createHandlers(filename, player);

			const { card, element: el } = CrewDetailCardFactory.create({
				player,
				filename,
				...handlers
			});
			this._insertTimelineStepper(filename, player, el);
			this._notesButtonByFilename[filename] = el.querySelector('.notes-action-slot');
			CrewDetailSkillAvailability.update(el, player);
			this._cardByFilename[filename] = el;
			this._cardInstanceByFilename[filename] = card;
			this._playerByFilename[filename] = player;
			this._cardOrganizer.appendSorted(this._activeCardsContainer, filename, el);
			if (startsHuman) {
				this.onStatusChange?.(filename, 'human');
			}
		});

		this._observeNotesAvailability();

		return this.element;
	}

	onDestroy() {
		this._notesAvailabilityUnsubscribe?.();
		this._notesAvailabilityUnsubscribe = null;
		this._notesService.disconnect();
	}

	_getCharacterName(filename) {
		return filename.replace('.png', '').replace(/_/g, ' ');
	}

	_setNotesAvailability(isAvailable) {
		Object.values(this._notesButtonByFilename).forEach(button => {
			if (!button) return;
			button.disabled = !isAvailable;
			button.classList.toggle('notes-action-slot--disabled', !isAvailable);
		});
	}

	_observeNotesAvailability() {
		if (this._notesAvailabilityUnsubscribe) return;
		this._notesAvailabilityUnsubscribe = this._notesService.observeAvailability(
			isAvailable => this._setNotesAvailability(isAvailable)
		);
	}

	_syncDeathState(filename) {
		const player = this._playerByFilename[filename];
		const card = this._cardByFilename[filename];
		if (!player || !card) return;

		const isDead = CrewCharacterState.isDead(player);
		card.classList.toggle('player-dead-active', isDead);
		this._cardOrganizer.moveCardToCurrentSubsection(filename);
		this.onDeadChange?.(filename, isDead);
		this.onTitleEligibilityChange?.(filename, !isDead && !player.inactive && !player.grandInactive);
	}

	_syncVisibilityState(filename, isVisible) {
		this._cardOrganizer.moveCardToCurrentSubsection(filename);
		this.onVisibilityChange?.(filename, isVisible);
	}

	_insertTimelineStepper(filename, player, cardElement) {
		const abilityRow = cardElement.querySelector('.player-abilities:not(.player-mush-abilities)');
		const notesButton = abilityRow?.querySelector('.notes-action-slot');
		if (!abilityRow || !notesButton) return;

		const stepper = new CrewTimelineStepper({ player });
		abilityRow.insertBefore(stepper.render(), notesButton);
		this._timelineStepperByFilename[filename] = stepper;
	}

	reset(options = {}) {
		CrewDetailsResetService.reset({
			cardByFilename: this._cardByFilename,
			cardInstanceByFilename: this._cardInstanceByFilename,
			playerByFilename: this._playerByFilename,
			timelineStepperByFilename: this._timelineStepperByFilename,
			hiddenCharacters: options.hiddenCharacters,
			activeCardsContainer: this._activeCardsContainer,
			hiddenCardsContainer: this._hiddenCardsContainer,
			organizer: this._cardOrganizer,
			onVisibilityChange: (filename, isVisible) => this.onVisibilityChange?.(filename, isVisible),
			onDeadChange: (filename, isDead) => this.onDeadChange?.(filename, isDead),
			onStatusChange: (filename, status) => this.onStatusChange?.(filename, status),
			onActivityChange: (filename, activity) => this.onActivityChange?.(filename, activity),
			onTitleEligibilityChange: (filename, canReceiveTitle) => this.onTitleEligibilityChange?.(filename, canReceiveTitle)
		});
	}

	scrollAndHighlight(filename) {
		this._cardOrganizer.scrollAndHighlight(filename);
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewDetailsSection = CrewDetailsSection;
