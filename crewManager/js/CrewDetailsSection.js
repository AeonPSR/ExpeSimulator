/**
 * CrewDetailsSection Component
 *
 * Renders a PlayerCard for each of the 18 named characters in alphabetical order.
 * Remove buttons are hidden — these cards are read-only crew profiles.
 */
class CrewDetailsSection extends Component {
	constructor(options = {}) {
		super(options);
		this._cardByFilename = {};
		this._cardInstanceByFilename = {};
		this._activeCardsContainer = null;
		this._hiddenCardsContainer = null;
		this.onVisibilityChange = options.onVisibilityChange || null;
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-details-section' });
		this._activeCardsContainer = this.createElement('div', { className: 'crew-details-subsection crew-details-subsection--active' });
		this._hiddenCardsContainer = this.createElement('div', { className: 'crew-details-subsection crew-details-subsection--hidden' });
		this._hiddenCardsContainer.hidden = true;
		this.element.appendChild(this._activeCardsContainer);
		this.element.appendChild(this._hiddenCardsContainer);

		const characters = CharacterData.available
			.filter(c => c !== Constants.DEFAULT_AVATAR)
			.sort((a, b) => this._getCharacterName(a).localeCompare(this._getCharacterName(b)));
		const slotLimits = {
			pm:        12,
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
		const slotSkillRequirements = {
			paCore:    ['human/concepteur.png'],
			paComp:    ['human/informaticien.png', 'human/polymathe.png'],
			paFood:    ['human/cuistot.png', 'human/beta.png'],
			paGarden:  ['human/botanic.png', 'human/beta.png'],
			paHeal:    ['human/infirmier.png'],
			paPilgred: ['human/physicien.png'],
			paShoot:   ['human/gunman.png', 'human/beta.png'],
			paTech:    ['human/technician.png', 'human/beta.png'],
			paTorture: ['human/bourreau.png']
		};

		characters.forEach((filename, index) => {
			const player = {
				id:        index + 1,
				avatar:    filename,
				abilities: Array(Constants.ABILITY_SLOTS).fill(null),
				mushAbilities: Array(5).fill(null),
				items:     Array(Constants.ITEM_SLOTS).fill(null),
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
				human:     false,
				visible:   true
			};

			const updateSkillAvailability = (cardElement) => {
				if (!cardElement) return;
				Object.entries(slotSkillRequirements).forEach(([playerKey, skills]) => {
					const hasRequiredSkill = skills.some(skill => player.abilities.includes(skill));
					const slot = cardElement.querySelector(`[data-player-key="${playerKey}"]`);
					slot?.classList.toggle('skill-locked', !hasRequiredSkill);
				});
			};

			const onAbilityClick = (playerId, slotIndex) => {
				const cardInstance = this._cardInstanceByFilename[filename];

				// Partition skills into owned / apprentron / other for this character
				const owned = [];
				const apprentron = [];
				const other = [];
				for (const skill of AbilityData.humanSkills) {
					const owners = SkillOwnershipData[skill];
					if (Array.isArray(owners) && owners.includes(filename)) {
						owned.push(skill);
					} else if (Array.isArray(owners) && owners.includes('apprentron')) {
						apprentron.push(skill);
					} else {
						other.push(skill);
					}
				}

				const toItems = (list) => AbilityData.getSelectionItems(getResourceURL, list);
				const ownedItems = toItems(owned);
				ownedItems.unshift({ id: null, image: '', label: 'Clear' });

				new SelectionModal({
					sections: [
						{ items: ownedItems, backgroundImage: getResourceURL(`pictures/characters/${filename}`) },
						{ items: toItems(apprentron), backgroundImage: getResourceURL('pictures/ui/apprentron.jpg') },
						{ items: toItems(other) }
					],
					selectedId: player.abilities[slotIndex],
					columns:    8,
					itemSize:   'large',
					className:  'ability-selection crew-skill-modal',
					panelElement: cardInstance?.element?.closest('.app-panel'),
					onSelect: (item) => {
						player.abilities[slotIndex] = item.id;
						cardInstance?.updateAbility(slotIndex, item.id);
						updateSkillAvailability(cardInstance?.element);
					}
				}).open();
			};

			const onMushAbilityClick = (playerId, slotIndex) => {
				const cardInstance = this._cardInstanceByFilename[filename];
				const items = AbilityData.getSelectionItems(getResourceURL, AbilityData.mushSkills);
				items.unshift({ id: null, image: '', label: 'Clear' });

				new SelectionModal({
					items: items,
					selectedId: player.mushAbilities[slotIndex],
					columns: 5,
					itemSize: 'large',
					className: 'ability-selection item-selection crew-mush-skill-modal',
					panelElement: cardInstance?.element?.closest('.app-panel'),
					onSelect: (item) => {
						player.mushAbilities[slotIndex] = item.id;
						cardInstance?.updateMushAbility(slotIndex, item.id);
					}
				}).open();
			};

			const onSlotClick = (playerId, playerKey) => {
				const cardInstance = this._cardInstanceByFilename[filename];
				const current = player[playerKey];
				const input = prompt('', current.toString());
				if (input !== null) {
					const value = parseInt(input, 10);
					if (!isNaN(value) && value >= 0) {
						const limit = slotLimits[playerKey];
						const nextValue = typeof limit === 'number' ? Math.min(value, limit) : value;
						player[playerKey] = nextValue;
						cardInstance?.updateSlotValue(playerKey, nextValue);
					}
				}
			};

			const onHealthClick = () => {
				const cardInstance = this._cardInstanceByFilename[filename];
				const input = prompt('', player.health.toString());
				if (input !== null) {
					const value = parseInt(input, 10);
					if (!isNaN(value) && value >= 0) {
						player.health = value;
						cardInstance?.updateHealth(value);
					}
				}
			};

			const onToggleClick = (playerId, playerKey, isActive) => {
				player[playerKey] = isActive;
				if (playerKey === 'visible') {
					this._setCardHidden(filename, !isActive);
					this.onVisibilityChange?.(filename, isActive);
				}
			};

			const card = new PlayerCard({
				player:          player,
				getResourceURL:  getResourceURL,
				showRemove:      false,
				showItems:       false,
				onAbilityClick:  onAbilityClick,
				onMushAbilityClick: onMushAbilityClick,
				onHealthClick:   onHealthClick,
				extraSlots: [
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
				],
				toggleSlots: [
					{ className: 'dead-toggle-slot',  iconPath: 'pictures/ui/dead.png',                         playerKey: 'dead',  onToggle: onToggleClick },
					{ className: 'mush-toggle-slot',  iconPath: 'pictures/abilities/mush/esprit-mycelium.png', playerKey: 'mush',  onToggle: onToggleClick },
					{ className: 'human-toggle-slot', iconPath: 'pictures/ui/human.png',                       playerKey: 'human', onToggle: onToggleClick }
				],
				overlayToggleSlots: [
					{ className: 'visibility-toggle-slot', iconPath: 'pictures/ui/visibility.png', playerKey: 'visible', onToggle: onToggleClick }
				]
			});

			const el = card.render();
			el.dataset.filename = filename;
			updateSkillAvailability(el);
			this._cardByFilename[filename] = el;
			this._cardInstanceByFilename[filename] = card;
			this._appendCardSorted(this._activeCardsContainer, filename, el);
		});

		return this.element;
	}

	_getCharacterName(filename) {
		return filename.replace('.png', '').replace(/_/g, ' ');
	}

	_appendCardSorted(container, filename, card) {
		const cardName = this._getCharacterName(filename);
		const nextCard = Array.from(container.children).find(child => {
			return this._getCharacterName(child.dataset.filename).localeCompare(cardName) > 0;
		});
		container.insertBefore(card, nextCard || null);
	}

	_getCardRects() {
		return new Map(Object.values(this._cardByFilename).map(card => [card, card.getBoundingClientRect()]));
	}

	_animateCardMoves(previousRects) {
		Object.values(this._cardByFilename).forEach(card => {
			const previousRect = previousRects.get(card);
			if (!previousRect) return;

			const nextRect = card.getBoundingClientRect();
			const deltaX = previousRect.left - nextRect.left;
			const deltaY = previousRect.top - nextRect.top;
			if (deltaX === 0 && deltaY === 0) return;

			card.classList.remove('crew-card-moving');
			card.style.transition = 'none';
			card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
		});

		requestAnimationFrame(() => {
			Object.values(this._cardByFilename).forEach(card => {
				if (!card.style.transform) return;

				card.classList.add('crew-card-moving');
				card.style.transition = '';
				card.style.transform = '';
				card.addEventListener('transitionend', () => {
					card.classList.remove('crew-card-moving');
				}, { once: true });
			});
		});
	}

	_setCardHidden(filename, hidden) {
		const card = this._cardByFilename[filename];
		if (!card) return;
		const previousRects = this._getCardRects();

		const container = hidden ? this._hiddenCardsContainer : this._activeCardsContainer;
		if (hidden) {
			this._hiddenCardsContainer.hidden = false;
		}
		this._appendCardSorted(container, filename, card);
		this._hiddenCardsContainer.hidden = this._hiddenCardsContainer.children.length === 0;
		this._animateCardMoves(previousRects);
	}

	/**
	 * Scrolls to and highlights the card for the given character filename.
	 * @param {string} filename - e.g. 'andie.png'
	 */
	scrollAndHighlight(filename) {
		const card = this._cardByFilename[filename];
		if (!card) return;

		card.scrollIntoView({ behavior: 'smooth', block: 'center' });
		card.classList.remove('crew-highlight');
		void card.offsetWidth; // force reflow so animation replays
		card.classList.add('crew-highlight');
		card.addEventListener('animationend', () => {
			card.classList.remove('crew-highlight');
		}, { once: true });
	}
}

var _global = typeof window !== 'undefined' ? window : self;
_global.CrewDetailsSection = CrewDetailsSection;
