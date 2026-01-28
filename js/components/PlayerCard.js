/**
 * PlayerCard Component
 * 
 * Displays a single player profile with avatar, abilities, items, and health.
 * 
 * Features:
 * - Clickable avatar for character selection
 * - 4 regular ability slots + 1 pink (traitor) slot
 * - 3 item slots
 * - Health display
 * - Remove button
 */
class PlayerCard extends Component {
	/**
	 * @param {Object} options
	 * @param {Object} options.player - Player data object
	 *   { id, avatar, abilities: [5], items: [3], health }
	 * @param {Function} [options.onAvatarClick] - Callback: (playerId) => void
	 * @param {Function} [options.onAbilityClick] - Callback: (playerId, slotIndex) => void
	 * @param {Function} [options.onItemClick] - Callback: (playerId, slotIndex) => void
	 * @param {Function} [options.onHealthClick] - Callback: (playerId) => void
	 * @param {Function} [options.onRemove] - Callback: (playerId) => void
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 */
	constructor(options = {}) {
		super(options);
		this.player = options.player || { id: 0, avatar: 'lambda_f.png', abilities: [null, null, null, null, null], items: [null, null, null], health: 14 };
		this.onAvatarClick = options.onAvatarClick || null;
		this.onAbilityClick = options.onAbilityClick || null;
		this.onItemClick = options.onItemClick || null;
		this.onHealthClick = options.onHealthClick || null;
		this.onRemove = options.onRemove || null;
		this.getResourceURL = options.getResourceURL || ((path) => path);
	}

	/**
	 * Creates the player card element
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', {
			className: 'player-profile',
			dataset: { playerId: this.player.id.toString() }
		});

		// Avatar
		const avatar = this._createAvatar();
		this.element.appendChild(avatar);

		// Details (abilities + bottom row)
		const details = this._createDetails();
		this.element.appendChild(details);

		// Remove button
		const removeBtn = this._createRemoveButton();
		this.element.appendChild(removeBtn);

		return this.element;
	}

	/**
	 * Creates the avatar element
	 * @private
	 * @returns {HTMLElement}
	 */
	_createAvatar() {
		const avatar = this.createElement('div', {
			className: 'player-avatar',
			dataset: { playerId: this.player.id.toString() }
		});

		const img = this.createElement('img', {
			src: this.getResourceURL(`characters/${this.player.avatar}`),
			alt: 'Player Avatar'
		});
		avatar.appendChild(img);

		this.addEventListener(avatar, 'click', () => {
			this.onAvatarClick?.(this.player.id);
		});

		return avatar;
	}

	/**
	 * Creates the details section (abilities + items + health)
	 * @private
	 * @returns {HTMLElement}
	 */
	_createDetails() {
		const details = this.createElement('div', { className: 'player-details' });

		// Abilities row
		const abilities = this._createAbilitiesRow();
		details.appendChild(abilities);

		// Bottom row (items + health)
		const bottomRow = this._createBottomRow();
		details.appendChild(bottomRow);

		return details;
	}

	/**
	 * Creates the abilities row
	 * @private
	 * @returns {HTMLElement}
	 */
	_createAbilitiesRow() {
		const abilitiesDiv = this.createElement('div', { className: 'player-abilities' });

		for (let i = 0; i < 5; i++) {
			const isPink = i === 4;
			const ability = this.player.abilities[i];

			const slot = this.createElement('div', {
				className: isPink ? 'ability-slot pink' : 'ability-slot',
				dataset: { 
					type: 'ability', 
					slot: i.toString(), 
					playerId: this.player.id.toString() 
				}
			});

			if (ability) {
				const img = this.createElement('img', {
					src: this.getResourceURL(`abilities/${ability}`),
					alt: 'Ability'
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

	/**
	 * Creates the bottom row (items + health)
	 * @private
	 * @returns {HTMLElement}
	 */
	_createBottomRow() {
		const bottomRow = this.createElement('div', { className: 'player-bottom-row' });

		// Item slots
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
					src: this.getResourceURL(`items_exploration/${item}`),
					alt: 'Item'
				});
				slot.appendChild(img);
			}

			this.addEventListener(slot, 'click', () => {
				this.onItemClick?.(this.player.id, i);
			});

			bottomRow.appendChild(slot);
		}

		// Health slot
		const healthSlot = this.createElement('div', {
			className: 'health-slot',
			dataset: { type: 'health', playerId: this.player.id.toString() }
		});
		healthSlot.textContent = this.player.health;

		const hpIcon = this.createElement('img', {
			src: this.getResourceURL('astro/hp.png'),
			alt: 'HP',
			className: 'hp-icon'
		});
		healthSlot.appendChild(hpIcon);

		this.addEventListener(healthSlot, 'click', () => {
			this.onHealthClick?.(this.player.id);
		});

		bottomRow.appendChild(healthSlot);

		return bottomRow;
	}

	/**
	 * Creates the remove button
	 * @private
	 * @returns {HTMLElement}
	 */
	_createRemoveButton() {
		const removeBtn = this.createElement('div', {
			className: 'player-remove-btn',
			dataset: { playerId: this.player.id.toString() }
		}, '×');

		this.addEventListener(removeBtn, 'click', () => {
			this.onRemove?.(this.player.id);
		});

		return removeBtn;
	}

	/**
	 * Updates the avatar display
	 * @param {string} avatarFile
	 */
	updateAvatar(avatarFile) {
		this.player.avatar = avatarFile;
		const img = this.element?.querySelector('.player-avatar img');
		if (img) {
			img.src = this.getResourceURL(`characters/${avatarFile}`);
		}
	}

	/**
	 * Updates an ability slot
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
					src: this.getResourceURL(`abilities/${abilityFile}`),
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
	updateItem(slotIndex, itemFile) {
		this.player.items[slotIndex] = itemFile;
		const slot = this.element?.querySelector(`[data-type="item"][data-slot="${slotIndex}"]`);
		if (slot) {
			slot.innerHTML = '';
			if (itemFile) {
				const img = this.createElement('img', {
					src: this.getResourceURL(`items_exploration/${itemFile}`),
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
	getPlayer() {
		return { ...this.player };
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.PlayerCard = PlayerCard;
}
