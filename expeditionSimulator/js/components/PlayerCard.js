/**
 * PlayerCard Component
 * 
 * Displays a single player profile with avatar, abilities, items, and health.
 */
class PlayerCard extends Component {
	/**
	 * @param {Object} options
	 * @param {Object} options.player - Player state: { id, avatar, abilities, items, health }
	 * @param {Function} [options.onAvatarClick] - Called with (playerId)
	 * @param {Function} [options.onAbilityClick] - Called with (playerId, slotIndex)
	 * @param {Function} [options.onItemClick] - Called with (playerId, slotIndex)
	 * @param {Function} [options.onHealthClick] - Called with (playerId)
	 * @param {Function} [options.onRemove] - Called with (playerId)
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 */
	constructor(options = {}) {
		super(options);
		this.player = options.player || { id: 0, avatar: Constants.DEFAULT_AVATAR, abilities: Array(Constants.ABILITY_SLOTS).fill(null), items: Array(Constants.ITEM_SLOTS).fill(null), health: Constants.DEFAULT_HEALTH };
		this.onAvatarClick = options.onAvatarClick || null;
		this.onAbilityClick = options.onAbilityClick || null;
		this.onItemClick = options.onItemClick || null;
		this.onHealthClick = options.onHealthClick || null;
		this.onRemove = options.onRemove || null;
		this.showRemove = options.showRemove !== false;
		this.getResourceURL = options.getResourceURL || ((path) => path);
	}

	render() {
		this.element = this.createElement('div', {
			className: 'player-profile',
			dataset: { playerId: this.player.id.toString() }
		});

		const avatar = this._createAvatar();
		this.element.appendChild(avatar);

		const details = this._createDetails();
		this.element.appendChild(details);

		if (this.showRemove) {
			const removeBtn = this._createRemoveButton();
			this.element.appendChild(removeBtn);
		}

		return this.element;
	}

	_createAvatar() {
		const avatar = this.createElement('div', {
			className: 'player-avatar',
			dataset: { playerId: this.player.id.toString() }
		});

		const img = this.createElement('img', {
			src: this.getResourceURL(`pictures/characters/${this.player.avatar}`),
			alt: ''
		});
		avatar.appendChild(img);

		this.addEventListener(avatar, 'click', () => {
			this.onAvatarClick?.(this.player.id);
		});

		return avatar;
	}

	_createDetails() {
		const details = this.createElement('div', { className: 'player-details' });

		const abilities = this._createAbilitiesRow();
		details.appendChild(abilities);

		const bottomRow = this._createBottomRow();
		details.appendChild(bottomRow);

		return details;
	}

	_getAbilityIcon(abilityFile) {
		// Easter egg: Terrence + Sprint = sprinter_disabled
		if (abilityFile === 'sprint.png' && this.player.avatar === 'terrence.png') {
			return this.getResourceURL('pictures/abilities/sprinter_disabled.png');
		}
		return this.getResourceURL(`pictures/abilities/${abilityFile}`);
	}

	_createAbilitiesRow() {
		const abilitiesDiv = this.createElement('div', { className: 'player-abilities' });

		for (let i = 0; i < Constants.ABILITY_SLOTS; i++) {
			const ability = this.player.abilities[i];

			const slot = this.createElement('div', {
				className: 'ability-slot',
				dataset: { 
					type: 'ability', 
					slot: i.toString(), 
					playerId: this.player.id.toString() 
				}
			});

			if (ability) {
				const img = this.createElement('img', {
					src: this._getAbilityIcon(ability),
					alt: ''
				});
				slot.appendChild(img);
			}

			this.addEventListener(slot, 'click', () => {
				this.onAbilityClick?.(this.player.id, i);
			});

			abilitiesDiv.appendChild(slot);
		}

		return abilitiesDiv;
	}

	_createBottomRow() {
		const bottomRow = this.createElement('div', { className: 'player-bottom-row' });

		for (let i = 0; i < 3; i++) {
			const item = this.player.items[i];

			const slot = this.createElement('div', {
				className: 'item-slot',
				dataset: { 
					type: 'item', 
					slot: i.toString(), 
					playerId: this.player.id.toString() 
				}
			});

			if (item) {
				const img = this.createElement('img', {
					src: this.getResourceURL(`pictures/gear/${item}`),
					alt: ''
				});
				slot.appendChild(img);
			}

			this.addEventListener(slot, 'click', () => {
				this.onItemClick?.(this.player.id, i);
			});

			bottomRow.appendChild(slot);
		}

		const healthSlot = this.createElement('div', {
			className: 'health-slot',
			dataset: { type: 'health', playerId: this.player.id.toString() }
		});
		healthSlot.textContent = this.player.health;

		const hpIcon = this.createElement('img', {
			src: this.getResourceURL('pictures/ui/hp.png'),
			alt: '',
			className: 'hp-icon'
		});
		healthSlot.appendChild(hpIcon);

		this.addEventListener(healthSlot, 'click', () => {
			this.onHealthClick?.(this.player.id);
		});

		bottomRow.appendChild(healthSlot);

		return bottomRow;
	}

	_createRemoveButton() {
		const removeBtn = this.createElement('div', {
			className: 'expe-close-btn',
			dataset: { playerId: this.player.id.toString() }
		});
		const icon = this.createElement('img', {
			src: this.getResourceURL('pictures/ui/bin.png'),
			alt: ''
		});
		removeBtn.appendChild(icon);

		this.addEventListener(removeBtn, 'click', () => {
			this.onRemove?.(this.player.id);
		});

		return removeBtn;
	}

	/**
	 * @param {string} avatarFile
	 */
	updateAvatar(avatarFile) {
		this.player.avatar = avatarFile;
		const img = this.element?.querySelector('.player-avatar img');
		if (img) {
			img.src = this.getResourceURL(`pictures/characters/${avatarFile}`);
		}
		// Refresh ability icons (easter egg: Terrence + Sprint)
		for (let i = 0; i < this.player.abilities.length; i++) {
			const ability = this.player.abilities[i];
			if (ability === 'sprint.png') {
				const slot = this.element?.querySelector(`[data-type="ability"][data-slot="${i}"] img`);
				if (slot) {
					slot.src = this._getAbilityIcon(ability);
				}
			}
		}
	}

	/**
	 * @param {number} slotIndex
	 * @param {string|null} abilityFile
	 */
	updateAbility(slotIndex, abilityFile) {
		this.player.abilities[slotIndex] = abilityFile;
		const slot = this.element?.querySelector(`[data-type="ability"][data-slot="${slotIndex}"]`);
		if (slot) {
			slot.innerHTML = '';
			if (abilityFile) {
				const img = this.createElement('img', {
					src: this._getAbilityIcon(abilityFile),
					alt: 'Ability'
				});
				slot.appendChild(img);
			}
		}
	}

	/**
	 * Updates an item slot
	 * @param {number} slotIndex
	 * @param {string|null} itemFile
	 */
	/**
	 * @param {number} slotIndex
	 * @param {string|null} itemFile
	 */
	updateItem(slotIndex, itemFile) {
		this.player.items[slotIndex] = itemFile;
		const slot = this.element?.querySelector(`[data-type="item"][data-slot="${slotIndex}"]`);
		if (slot) {
			slot.innerHTML = '';
			if (itemFile) {
				const img = this.createElement('img', {
					src: this.getResourceURL(`pictures/gear/${itemFile}`),
					alt: 'Item'
				});
				slot.appendChild(img);
			}
		}
	}

	/**
	 * Updates health display
	 * @param {number} health
	 */
	/**
	 * @param {number} health
	 */
	updateHealth(health) {
		this.player.health = health;
		const healthSlot = this.element?.querySelector('[data-type="health"]');
		if (healthSlot) {
			// Keep the HP icon, just update the text
			const hpIcon = healthSlot.querySelector('.hp-icon');
			healthSlot.textContent = health;
			if (hpIcon) {
				healthSlot.appendChild(hpIcon);
			}
		}
	}

	/**
	 * Gets the player data
	 * @returns {Object}
	 */
	/**
	 * @returns {Object} Copy of the player state.
	 */
	getPlayer() {
		return { ...this.player };
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.PlayerCard = PlayerCard;
}
