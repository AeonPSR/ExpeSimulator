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
		this._controlsCard = null;
		this._controlsTimeline = { day: null, cycle: null };
		this._controlsTimelineStepper = null;
		this._controlsResources = {};
		this._controlsResourceSlots = {};
		this._controlsApplyButton = null;
		this._cardActions = null;
		this._cardOrganizer = null;
		this.onVisibilityChange = options.onVisibilityChange || null;
		this.onDeadChange = options.onDeadChange || null;
		this.onStatusChange = options.onStatusChange || null;
		this.onActivityChange = options.onActivityChange || null;
		this.onTitleEligibilityChange = options.onTitleEligibilityChange || null;
		this.onPlayerChange = options.onPlayerChange || null;
		this._savedPlayers = options.savedPlayers || {};
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
		this._controlsCard = this._renderControlsCard();
		this._activeCardsContainer.appendChild(this._controlsCard);
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
				onSkillAvailabilityChange: (cardElement, player) => {
					CrewDetailSkillAvailability.update(cardElement, player);
					this._updateControlsResourceAvailability();
				},
				onPlayerChange: () => this._notifyPlayerChange()
		});

		const characters = CharacterData.available
			.filter(c => c !== Constants.DEFAULT_AVATAR)
			.sort((a, b) => this._getCharacterName(a).localeCompare(this._getCharacterName(b)));
		characters.forEach((filename, index) => {
			const startsHuman = CrewCharacterState.startsHuman(filename);
			const player = this._restorePlayer(filename, CrewCharacterState.create(filename, index));
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
			this._cardOrganizer.appendSorted(this._cardOrganizer.getCardSubsection(filename), filename, el);
			this._syncRestoredState(filename, player, el);
		});
		this._cardOrganizer.updateSubsectionVisibility();
		this._updateControlsResourceAvailability();

		this._observeNotesAvailability();

		return this.element;
	}

	setControlsVisible(visible) {
		if (this._controlsCard) this._controlsCard.hidden = !visible;
	}

	applyNewDay() {
		Object.entries(this._playerByFilename).forEach(([filename, player]) => {
			if (CrewCharacterState.isDead(player)) return;
			player.morale = Math.max(0, player.morale - 1);
			player.health = Math.min(20, player.health + 1);
			this._cardInstanceByFilename[filename]?.updateSlotValue('morale', player.morale);
			this._cardInstanceByFilename[filename]?.updateHealth(player.health);
			this._syncDeathState(filename);
		});
		this._notifyPlayerChange();
	}

	_renderControlsCard() {
		const card = this.createElement('div', {
			className: 'player-profile crew-controls-card',
			hidden: true
		});
		const details = this.createElement('div', { className: 'player-details' });
		const controlsRow = this.createElement('div', { className: 'player-abilities crew-controls-row' });
		this._controlsTimelineStepper = new CrewTimelineStepper({
			player: this._controlsTimeline,
			cycleFirst: true,
			onChange: () => this._updateControlsState()
		});
		controlsRow.appendChild(this._controlsTimelineStepper.render());

		const actions = this.createElement('div', { className: 'player-bottom-row crew-controls-actions' });
		this._getControlResourceDefinitions().forEach(definition => {
			this._controlsResources[definition.playerKey] = null;
			const slot = this.createElement('button', {
				className: `status-slot crew-control-resource ${definition.className}`,
				dataset: { playerKey: definition.playerKey, active: 'false' }
			});
			const value = this.createElement('span', {}, '-');
			const icon = this.createElement('img', {
				src: getResourceURL(definition.iconPath),
				alt: '',
				className: 'hp-icon'
			});
			slot.appendChild(value);
			slot.appendChild(icon);
			this.addEventListener(slot, 'click', () => this._promptControlResource(definition));
			this._controlsResourceSlots[definition.playerKey] = slot;
			actions.appendChild(slot);
		});
		this._controlsApplyButton = this.createElement('button', {
			className: 'crew-apply-all-btn',
			dataset: { active: 'false' },
			'data-i18n': 'crewmanager.controls.apply_all'
		}, I18n.t('crewmanager.controls.apply_all'));
		this._controlsApplyButton.disabled = true;
		this.addEventListener(this._controlsApplyButton, 'click', () => this._confirmApplyControls());
		actions.appendChild(this._controlsApplyButton);

		details.appendChild(controlsRow);
		details.appendChild(actions);
		card.appendChild(details);
		return card;
	}

	_getControlResourceDefinitions() {
		return [
			{ playerKey: 'health',    className: 'health-slot',               iconPath: 'pictures/ui/hp.png',         limit: 20 },
			{ playerKey: 'morale',    className: 'morale-slot',               iconPath: 'pictures/ui/pmo.png',        limit: 20 },
			{ playerKey: 'spore',     className: 'spore-slot',                iconPath: 'pictures/ui/spore.png',      limit: 20 },
			{ playerKey: 'pa',        className: 'expert-slot pa-slot',       iconPath: 'pictures/ui/pa.png',         limit: 50 },
			{ playerKey: 'pm',        className: 'expert-slot pm-slot',       iconPath: 'pictures/ui/pm.png',         limit: 50 },
			{ playerKey: 'paCore',    className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_core.png',    limit: 4 },
			{ playerKey: 'paTorture', className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_torture.png', limit: 2 },
			{ playerKey: 'paHeal',    className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_heal.png',    limit: 4 },
			{ playerKey: 'paPilgred', className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_pilgred.png', limit: 2 },
			{ playerKey: 'paTech',    className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_tech.png',    limit: 2 },
			{ playerKey: 'paFood',    className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_food.png',    limit: 8 },
			{ playerKey: 'paGarden',  className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_garden.png',  limit: 4 },
			{ playerKey: 'paShoot',   className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_shoot.png',   limit: 6 },
			{ playerKey: 'paComp',    className: 'expert-slot pa-other-slot', iconPath: 'pictures/ui/pa_comp.png',    limit: 6 }
		];
	}

	_promptControlResource(definition) {
		const current = this._controlsResources[definition.playerKey];
		const input = prompt('', current ?? '');
		if (input === null) return;

		const trimmed = input.trim();
		const value = trimmed === '' || trimmed === '-' ? null : parseInt(trimmed, 10);
		if (value !== null && (isNaN(value) || value < 0)) return;

		this._controlsResources[definition.playerKey] = value === null ? null : Math.min(value, definition.limit);
		this._updateControlResourceSlot(definition.playerKey);
		this._updateControlsState();
	}

	_updateControlResourceSlot(playerKey) {
		const slot = this._controlsResourceSlots[playerKey];
		if (!slot) return;
		const value = this._controlsResources[playerKey];
		slot.dataset.active = String(value !== null);
		const valueElement = slot.querySelector('span');
		if (valueElement) valueElement.textContent = value ?? '-';
	}

	_updateControlsResourceAvailability() {
		this._getControlResourceDefinitions().forEach(definition => {
			const slot = this._controlsResourceSlots[definition.playerKey];
			if (!slot) return;
			const available = Object.keys(this._playerByFilename).some(filename =>
				this._playerHasResource(filename, definition.playerKey)
			);
			slot.hidden = !available;
			if (!available && this._controlsResources[definition.playerKey] !== null) {
				this._controlsResources[definition.playerKey] = null;
				this._updateControlResourceSlot(definition.playerKey);
			}
		});
		this._updateControlsState();
	}

	_playerHasResource(filename, playerKey) {
		const card = this._cardByFilename[filename];
		if (!card) return false;
		if (playerKey === 'health') return Boolean(card.querySelector('.health-slot'));
		const slot = card.querySelector(`[data-player-key="${playerKey}"]`);
		return Boolean(slot && !slot.classList.contains('skill-locked'));
	}

	_updateControlsState() {
		const hasValue = this._controlsTimeline.day !== null
			|| this._controlsTimeline.cycle !== null
			|| Object.values(this._controlsResources).some(value => value !== null);
		if (this._controlsApplyButton) {
			this._controlsApplyButton.disabled = !hasValue;
			this._controlsApplyButton.dataset.active = String(hasValue);
		}
	}

	_confirmApplyControls() {
		new ConfirmationModal({
			title: I18n.t('crewmanager.controls.apply_confirm'),
			confirmLabel: I18n.t('crewmanager.controls.apply'),
			cancelLabel: I18n.t('crewmanager.controls.cancel'),
			panelElement: this.element?.closest('.app-panel'),
			onConfirm: () => this._applyControlsToAll()
		}).open();
	}

	_applyControlsToAll() {
		const { day, cycle } = this._controlsTimeline;
		Object.entries(this._playerByFilename).forEach(([filename, player]) => {
			const nextDay = day ?? player.day;
			const nextCycle = cycle ?? player.cycle;
			player.day = nextDay;
			player.cycle = nextCycle;
			this._timelineStepperByFilename[filename]?.setTimeline(nextDay, nextCycle, true);
			Object.entries(this._controlsResources).forEach(([playerKey, value]) => {
				if (value === null || !this._playerHasResource(filename, playerKey)) return;
				player[playerKey] = value;
				if (playerKey === 'health') {
					this._cardInstanceByFilename[filename]?.updateHealth(value);
				} else {
					this._cardInstanceByFilename[filename]?.updateSlotValue(playerKey, value);
				}
			});
		});
		if (this._controlsResources.health !== null || this._controlsResources.morale !== null) {
			Object.keys(this._playerByFilename).forEach(filename => this._syncDeathState(filename));
		}
		this._notifyPlayerChange();
		this._controlsTimelineStepper.clear();
		Object.keys(this._controlsResources).forEach(playerKey => {
			this._controlsResources[playerKey] = null;
			this._updateControlResourceSlot(playerKey);
		});
		this._updateControlsState();
	}

	_restorePlayer(filename, player) {
		const saved = this._savedPlayers[filename];
		if (!saved || typeof saved !== 'object') return player;
		return Object.assign(player, saved, {
			id: player.id,
			avatar: filename,
			abilities: this._restoreArray(saved.abilities, Constants.ABILITY_SLOTS),
			mushAbilities: this._restoreArray(saved.mushAbilities, 5),
			items: Array(Constants.ITEM_SLOTS).fill(null),
			visible: saved.visible !== false
		});
	}

	_restoreArray(value, length) {
		return Array.from({ length }, (_, index) => Array.isArray(value) ? value[index] || null : null);
	}

	_syncRestoredState(filename, player, cardElement) {
		const isDead = CrewCharacterState.isDead(player);
		cardElement.classList.toggle('player-dead-active', isDead);
		this.onVisibilityChange?.(filename, player.visible);
		this.onDeadChange?.(filename, isDead);
		this.onStatusChange?.(filename, player.mush ? 'mush' : player.human ? 'human' : null);
		this.onActivityChange?.(filename, player.grandInactive ? 'grandInactive' : player.inactive ? 'inactive' : null);
		this.onTitleEligibilityChange?.(filename, !isDead && !player.inactive && !player.grandInactive);
	}

	_notifyPlayerChange() {
		this.onPlayerChange?.(this.getPlayerState());
	}

	getPlayerState() {
		return Object.fromEntries(
			Object.entries(this._playerByFilename).map(([filename, player]) => [filename, { ...player }])
		);
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

		const stepper = new CrewTimelineStepper({
			player,
			onChange: () => this._notifyPlayerChange()
		});
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
		this._notifyPlayerChange();
		this._updateControlsResourceAvailability();
	}

	scrollAndHighlight(filename) {
		this._cardOrganizer.scrollAndHighlight(filename);
	}

	getAvatarGroups() {
		const groups = {
			available: [],
			dead: [],
			missing: []
		};

		Object.entries(this._playerByFilename).forEach(([filename, player]) => {
			if (!player.visible) {
				groups.missing.push(filename);
			} else if (CrewCharacterState.isDead(player)) {
				groups.dead.push(filename);
			} else {
				groups.available.push(filename);
			}
		});

		return groups;
	}

	getAvatarAbilities(filename) {
		return [...(this._playerByFilename[filename]?.abilities || [])];
	}

	getAvatarHealth(filename) {
		return this._playerByFilename[filename]?.health ?? null;
	}

	importAvatarAbilities(filename, abilities, mushAbilities = []) {
		const player = this._playerByFilename[filename];
		const card = this._cardByFilename[filename];
		const cardInstance = this._cardInstanceByFilename[filename];
		if (!player || !cardInstance || !card) return;

		const nextAbilities = Array.from({ length: Constants.ABILITY_SLOTS }, (_, index) => abilities[index] || null);
		nextAbilities.forEach((ability, index) => cardInstance.updateAbility(index, ability));
		if (mushAbilities.length > 0) {
			const nextMushAbilities = Array.from({ length: 5 }, (_, index) => mushAbilities[index] || null);
			nextMushAbilities.forEach((ability, index) => cardInstance.updateMushAbility(index, ability));
			player.mush = true;
			player.human = false;
			cardInstance.setToggleState('mush', true);
			cardInstance.setToggleState('human', false);
			this.onStatusChange?.(filename, 'mush');
		}
		CrewDetailSkillAvailability.update(card, player);
		this._updateControlsResourceAvailability();
		this._notifyPlayerChange();
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewDetailsSection = CrewDetailsSection;
