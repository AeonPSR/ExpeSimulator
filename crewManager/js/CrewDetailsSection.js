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
	}

	render() {
		this.element = this.createElement('div', { className: 'crew-details-section' });

		const characters = CharacterData.available.filter(c => c !== Constants.DEFAULT_AVATAR);

		characters.forEach((filename, index) => {
			const player = {
				id:        index + 1,
				avatar:    filename,
				abilities: Array(Constants.ABILITY_SLOTS).fill(null),
				items:     Array(Constants.ITEM_SLOTS).fill(null),
				health:    Constants.DEFAULT_HEALTH,
				morale:    14,
				spore:     0
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
						{ items: ownedItems },
						{ items: toItems(apprentron) },
						{ items: toItems(other) }
					],
					selectedId: player.abilities[slotIndex],
					columns:    8,
					itemSize:   'large',
					className:  'ability-selection crew-skill-modal',
					onSelect: (item) => {
						player.abilities[slotIndex] = item.id;
						cardInstance?.updateAbility(slotIndex, item.id);
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
						player[playerKey] = value;
						cardInstance?.updateSlotValue(playerKey, value);
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

			const card = new PlayerCard({
				player:          player,
				getResourceURL:  getResourceURL,
				showRemove:      false,
				showItems:       false,
				onAbilityClick:  onAbilityClick,
				onHealthClick:   onHealthClick,
				extraSlots: [
					{ className: 'morale-slot', iconPath: 'pictures/ui/pmo.png',   playerKey: 'morale', onSlotClick },
					{ className: 'spore-slot',  iconPath: 'pictures/ui/spore.png', playerKey: 'spore',  onSlotClick }
				]
			});

			const el = card.render();
			this._cardByFilename[filename] = el;
			this._cardInstanceByFilename[filename] = card;
			this.element.appendChild(el);
		});

		return this.element;
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
