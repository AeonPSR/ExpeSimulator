/**
 * PlayerCard Component
 * 
 * Displays a single player profile with avatar, abilities, items, and health.
 * 
 * Features:
 * - Clickable avatar for character selection
 * - 4 regular ability slots
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
	 * @param {Function} [options.onMushAbilityClick] - Callback: (playerId, slotIndex) => void
	 * @param {Function} [options.onItemClick] - Callback: (playerId, slotIndex) => void
	 * @param {Function} [options.onHealthClick] - Callback: (playerId) => void
	 * @param {Function} [options.onRemove] - Callback: (playerId) => void
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 */
	constructor(options = {}) {
		super(options);
		this.player = options.player || { id: 0, avatar: Constants.DEFAULT_AVATAR, abilities: Array(Constants.ABILITY_SLOTS).fill(null), items: Array(Constants.ITEM_SLOTS).fill(null), health: Constants.DEFAULT_HEALTH };
		this.onAvatarClick = options.onAvatarClick || null;
		this.onAbilityClick = options.onAbilityClick || null;
		this.onMushAbilityClick = options.onMushAbilityClick || null;
		this.onItemClick = options.onItemClick || null;
		this.onHealthClick = options.onHealthClick || null;
		this.onRemove = options.onRemove || null;
		this.showRemove = options.showRemove !== false;
		this.showItems  = options.showItems  !== false;
		this.extraSlots = options.extraSlots || [];
		this.toggleSlots = options.toggleSlots || [];
		this.abilityActionSlots = options.abilityActionSlots || [];
		this.overlayToggleSlots = options.overlayToggleSlots || [];
		this.getResourceURL = options.getResourceURL || ((path) => path);
		this._toggleButtons = {};
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
		this.toggleSlots.forEach(slotDef => {
			this.element.classList.toggle(`player-${slotDef.playerKey}-active`, Boolean(this.player[slotDef.playerKey]));
		});
		this.overlayToggleSlots.forEach(slotDef => {
			this.element.classList.toggle(`player-${slotDef.playerKey}-active`, Boolean(this.player[slotDef.playerKey]));
		});

		// Avatar
		const avatar = this._createAvatar();
		this.element.appendChild(avatar);

		// Details (abilities + bottom row)
		const details = this._createDetails();
		this.element.appendChild(details);

		// Remove button
		if (this.showRemove) {
			const removeBtn = this._createRemoveButton();
			this.element.appendChild(removeBtn);
		}

		this._appendOverlayToggleSlots();

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
			src: this.getResourceURL(`pictures/characters/${this.player.avatar}`),
			alt: ''
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

		const mushAbilities = this._createMushAbilitiesRow();
		details.appendChild(mushAbilities);

		// Bottom row (items + health)
		const bottomRow = this._createBottomRow();
		details.appendChild(bottomRow);

		// Toggle row (dead, mush, human, etc.)
		const toggleRow = this._createToggleRow();
		if (toggleRow) {
			details.appendChild(toggleRow);
		}

		return details;
	}

	/**
	 * Gets the display icon for an ability, applying easter eggs
	 * @private
	 * @param {string} abilityFile - The ability filename (e.g. 'sprint.png')
	 * @returns {string} The icon path to use
	 */
	_getAbilityIcon(abilityFile) {
		// Easter egg: Terrence + Sprint = sprinter_disabled
		if (abilityFile === 'human/sprint.png' && this.player.avatar === 'terrence.png') {
			return this.getResourceURL('pictures/abilities/special/sprinter_disabled.png');
		}
		return this.getResourceURL(`pictures/abilities/${abilityFile}`);
	}

	/**
	 * Creates the abilities row
	 * @private
	 * @returns {HTMLElement}
	 */
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

		for (const slotDef of this.abilityActionSlots) {
			const slot = this.createElement('button', {
				className: `ability-slot ability-action-slot ${slotDef.className || ''}`.trim(),
				dataset: {
					playerKey: slotDef.playerKey
				}
			});
			const icon = this.createElement('img', {
				src: this.getResourceURL(slotDef.iconPath),
				alt: slotDef.title || ''
			});
			slot.appendChild(icon);
			this.addEventListener(slot, 'click', () => {
				slotDef.onClick?.(this.player.id, slotDef.playerKey);
			});
			abilitiesDiv.appendChild(slot);
		}

		return abilitiesDiv;
	}

	/**
	 * Creates the Mush abilities row
	 * @private
	 * @returns {HTMLElement}
	 */
	_createMushAbilitiesRow() {
		const abilitiesDiv = this.createElement('div', { className: 'player-abilities player-mush-abilities' });
		const mushAbilities = this.player.mushAbilities || Array(5).fill(null);

		for (let i = 0; i < 5; i++) {
			const ability = mushAbilities[i];

			const slot = this.createElement('div', {
				className: 'ability-slot mush-ability-slot',
				dataset: {
					type: 'mush-ability',
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
				this.onMushAbilityClick?.(this.player.id, i);
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
		if (this.showItems) {
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
		}

		// Health slot
		const healthSlot = this.createElement('div', {
			className: 'status-slot health-slot',
			dataset: { type: 'health', playerId: this.player.id.toString() }
		});
		const healthValue = this.createElement('span', {}, String(this.player.health));
		healthSlot.appendChild(healthValue);
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

		// Extra status slots (e.g. morale, spore)
		for (const slotDef of this.extraSlots) {
			const slot = this.createElement('div', {
				className: `status-slot ${slotDef.className}`,
				dataset: { playerKey: slotDef.playerKey }
			});
			const valueSpan = this.createElement('span', {}, String(this.player[slotDef.playerKey] ?? 0));
			slot.appendChild(valueSpan);
			const icon = this.createElement('img', {
				src: this.getResourceURL(slotDef.iconPath),
				alt: '',
				className: 'hp-icon'
			});
			slot.appendChild(icon);
			if (!this._slotValueSpans) this._slotValueSpans = {};
			this._slotValueSpans[slotDef.playerKey] = valueSpan;
			this.addEventListener(slot, 'click', () => {
				slotDef.onSlotClick?.(this.player.id, slotDef.playerKey);
			});
			bottomRow.appendChild(slot);
		}

		return bottomRow;
	}

	/**
	 * Creates the icon-only toggle row (dead, mush, human, etc.)
	 * @private
	 * @returns {HTMLElement|null}
	 */
	_createToggleRow() {
		if (!this.toggleSlots.length) {
			return null;
		}

		const toggleRow = this.createElement('div', { className: 'player-toggle-row' });

		for (const slotDef of this.toggleSlots) {
			const isActive = Boolean(this.player[slotDef.playerKey]);
			const slot = this.createElement('button', {
				className: `player-toggle-slot ${slotDef.className || ''}`.trim(),
				dataset: {
					playerKey: slotDef.playerKey,
					active: isActive.toString()
				}
			});
			const icon = this.createElement('img', {
				src: this.getResourceURL(slotDef.iconPath),
				alt: slotDef.title || ''
			});
			slot.appendChild(icon);
			this._toggleButtons[slotDef.playerKey] = slot;
			this.addEventListener(slot, 'click', () => {
				const nextActive = slot.dataset.active !== 'true';
				this.setToggleState(slotDef.playerKey, nextActive);
				slotDef.onToggle?.(this.player.id, slotDef.playerKey, nextActive);
			});
			toggleRow.appendChild(slot);
		}
		return toggleRow;
	}

	/**
	 * Adds icon-only toggle slots positioned over the card chrome.
	 * @private
	 */
	_appendOverlayToggleSlots() {
		this.overlayToggleSlots.forEach(slotDef => {
			const isActive = Boolean(this.player[slotDef.playerKey]);
			const slot = this.createElement('button', {
				className: `player-toggle-slot player-toggle-slot--overlay ${slotDef.className || ''}`.trim(),
				dataset: {
					playerKey: slotDef.playerKey,
					active: isActive.toString()
				}
			});
			const icon = this.createElement('img', {
				src: this.getResourceURL(slotDef.iconPath),
				alt: slotDef.alt || ''
			});
			slot.appendChild(icon);
			this._toggleButtons[slotDef.playerKey] = slot;
			this.addEventListener(slot, 'click', () => {
				const nextActive = slot.dataset.active !== 'true';
				this.setToggleState(slotDef.playerKey, nextActive);
				slotDef.onToggle?.(this.player.id, slotDef.playerKey, nextActive);
			});
			this.element.appendChild(slot);
		});
	}

	setToggleState(playerKey, isActive) {
		this.player[playerKey] = isActive;
		this._toggleButtons[playerKey]?.setAttribute('data-active', isActive.toString());
		this.element?.classList.toggle(`player-${playerKey}-active`, isActive);
	}

	/**
	 * Creates the remove button
	 * @private
	 * @returns {HTMLElement}
	 */
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
	 * Updates the displayed value for an extra status slot.
	 * @param {string} playerKey - e.g. 'morale', 'spore'
	 * @param {number} value
	 */
	updateSlotValue(playerKey, value) {
		this.player[playerKey] = value;
		if (this._slotValueSpans?.[playerKey]) {
			this._slotValueSpans[playerKey].textContent = String(value);
		}
	}

	/**
	 * Updates the avatar display
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
					src: this._getAbilityIcon(abilityFile),
					alt: 'Ability'
				});
				slot.appendChild(img);
			}
		}
	}

	/**
	 * Updates a Mush ability slot
	 * @param {number} slotIndex
	 * @param {string|null} abilityFile
	 */
	updateMushAbility(slotIndex, abilityFile) {
		if (!this.player.mushAbilities) {
			this.player.mushAbilities = Array(5).fill(null);
		}
		this.player.mushAbilities[slotIndex] = abilityFile;
		const slot = this.element?.querySelector(`[data-type="mush-ability"][data-slot="${slotIndex}"]`);
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
