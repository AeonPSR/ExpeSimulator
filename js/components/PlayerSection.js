/**
 * PlayerSection Component
 * 
 * Container for player management with header controls and player cards.
 * 
 * Features:
 * - Header with fighting power display
 * - Mode toggle (icarus/patrol)
 * - Antigrav propeller toggle
 * - Base toggle
 * - Add player button
 * - Container for PlayerCard components
 */
class PlayerSection extends Component {
	/**
	 * @param {Object} options
	 * @param {number} [options.maxPlayers=8] - Maximum players allowed
	 * @param {Function} [options.onAddPlayer] - Callback: () => void
	 * @param {Function} [options.onModeToggle] - Callback: (mode) => void ('icarus'|'patrol')
	 * @param {Function} [options.onAntigravToggle] - Callback: (isActive) => void
	 * @param {Function} [options.onBaseToggle] - Callback: (isActive) => void
	 * @param {Function} [options.getResourceURL] - Resource URL resolver
	 */
	constructor(options = {}) {
		super(options);
		this.maxPlayers = options.maxPlayers || 8;
		this.onAddPlayer = options.onAddPlayer || null;
		this.onModeToggle = options.onModeToggle || null;
		this.onAntigravToggle = options.onAntigravToggle || null;
		this.onBaseToggle = options.onBaseToggle || null;
		this.getResourceURL = options.getResourceURL || ((path) => path);

		// State
		this._currentMode = 'icarus';
		this._fightingPower = 0;
		this._playerCards = [];

		// Internal references
		this._playersContainer = null;
		this._addPlayerBtn = null;
		this._fightingPowerBtn = null;
		this._fightingPowerValue = null;
		this._fightingPowerBtn = null;
		this._modeBtn = null;
		this._antigravToggle = null;
		this._baseToggle = null;
	}

	/**
	 * Creates the player section
	 * @returns {HTMLElement}
	 */
	render() {
		this.element = this.createElement('div', { className: 'players-section' });

		// Header
		const header = this._createHeader();
		this.element.appendChild(header);

		// Players container
		this._playersContainer = this.createElement('div', {
			className: 'players-container',
			id: 'players-container'
		});

		// Add player button
		this._addPlayerBtn = this._createAddButton();
		this._playersContainer.appendChild(this._addPlayerBtn);

		this.element.appendChild(this._playersContainer);

		return this.element;
	}

	/**
	 * Creates the header with controls
	 * @private
	 * @returns {HTMLElement}
	 */
	_createHeader() {
		const header = this.createElement('div', { className: 'players-header' });

		// Title
		const title = this.createElement('h4', {}, 'Players');
		header.appendChild(title);

		// Controls container
		const controls = this.createElement('div', { className: 'players-controls' });

		// Fighting power button (display only)
		this._fightingPowerBtn = this.createElement('button', {
			id: 'fighting-power-btn',
			className: 'fighting-power-btn'
		});
		this._fightingPowerValue = this.createElement('span', { id: 'fighting-power-value' }, '0');
		this._fightingPowerBtn.appendChild(this._fightingPowerValue);
		const fpIcon = this.createElement('img', {
			src: this.getResourceURL('others/fight.png'),
			alt: 'Fighting Power',
			className: 'fight-power-icon'
		});
		this._fightingPowerBtn.appendChild(fpIcon);
		controls.appendChild(this._fightingPowerBtn);

		// Mode button (icarus/patrol)
		this._modeBtn = this.createElement('button', {
			id: 'players-mode-btn',
			className: 'players-mode-btn',
			dataset: { mode: 'icarus' }
		});
		const modeImg = this.createElement('img', {
			src: this.getResourceURL('others/icarus_access.png'),
			alt: 'Mode'
		});
		this._modeBtn.appendChild(modeImg);
		this.addEventListener(this._modeBtn, 'click', () => this._toggleMode());
		controls.appendChild(this._modeBtn);

		// Antigrav propeller toggle
		this._antigravToggle = new ToggleButton({
			id: 'antigrav-propeller-btn',
			className: 'antigrav-propeller-btn',
			icon: this.getResourceURL('others/icarus_antigrav_propeller.png'),
			alt: 'Antigrav Propeller',
			activeColor: 'orange',
			onToggle: (isActive) => this.onAntigravToggle?.(isActive)
		});
		this._antigravToggle.render();
		controls.appendChild(this._antigravToggle.element);

		// Base toggle
		this._baseToggle = new ToggleButton({
			id: 'players-toggle-btn',
			className: 'players-toggle-btn',
			icon: this.getResourceURL('others/base03.png'),
			alt: 'Toggle Base',
			activeColor: 'orange',
			onToggle: (isActive) => this.onBaseToggle?.(isActive)
		});
		this._baseToggle.render();
		controls.appendChild(this._baseToggle.element);

		header.appendChild(controls);
		return header;
	}

	/**
	 * Creates the add player button
	 * @private
	 * @returns {HTMLElement}
	 */
	_createAddButton() {
		const btn = this.createElement('button', {
			id: 'add-player-btn',
			className: 'add-player-btn'
		});

		const plusIcon = this.createElement('span', { className: 'plus-icon' }, '+');
		btn.appendChild(plusIcon);

		this.addEventListener(btn, 'click', () => this.onAddPlayer?.());

		return btn;
	}

	/**
	 * Toggles between icarus and patrol mode
	 * @private
	 */
	_toggleMode() {
		this._currentMode = this._currentMode === 'icarus' ? 'patrol' : 'icarus';
		
		if (this._modeBtn) {
			this._modeBtn.dataset.mode = this._currentMode;
			const img = this._modeBtn.querySelector('img');
			if (img) {
				const iconName = this._currentMode === 'icarus' ? 'icarus_access.png' : 'patrol_ship.png';
				img.src = this.getResourceURL(`others/${iconName}`);
			}
		}

		this.onModeToggle?.(this._currentMode);
	}

	/**
	 * Adds a player card to the section
	 * @param {PlayerCard} playerCard
	 */
	addPlayerCard(playerCard) {
		if (this._playerCards.length >= this.maxPlayers) return;

		this._playerCards.push(playerCard);

		// Insert before add button
		if (this._playersContainer && this._addPlayerBtn) {
			playerCard.render();
			this._playersContainer.insertBefore(playerCard.element, this._addPlayerBtn);
		}

		this._updateAddButtonVisibility();
	}

	/**
	 * Removes a player card by ID
	 * @param {number} playerId
	 */
	removePlayerCard(playerId) {
		const index = this._playerCards.findIndex(card => card.player.id === playerId);
		if (index !== -1) {
			const card = this._playerCards[index];
			card.destroy();
			this._playerCards.splice(index, 1);
		}

		this._updateAddButtonVisibility();
	}

	/**
	 * Updates add button visibility based on player count
	 * @private
	 */
	_updateAddButtonVisibility() {
		if (this._addPlayerBtn) {
			this._addPlayerBtn.style.display = this._playerCards.length >= this.maxPlayers ? 'none' : 'flex';
		}
	}

	/**
	 * Updates the fighting power display
	 * @param {number} power
	 */
	setFightingPower(power) {
		this._fightingPower = power;
		if (this._fightingPowerValue) {
			this._fightingPowerValue.textContent = power.toString();
			console.log('Fighting power UI updated to:', power);
		} else {
			console.warn('_fightingPowerValue element not found');
		}
	}

	/**
	 * Gets all player cards
	 * @returns {Array<PlayerCard>}
	 */
	getPlayerCards() {
		return [...this._playerCards];
	}

	/**
	 * Gets player card by ID
	 * @param {number} playerId
	 * @returns {PlayerCard|null}
	 */
	getPlayerCard(playerId) {
		return this._playerCards.find(card => card.player.id === playerId) || null;
	}

	/**
	 * Gets player count
	 * @returns {number}
	 */
	getPlayerCount() {
		return this._playerCards.length;
	}

	/**
	 * Gets current mode
	 * @returns {string}
	 */
	getMode() {
		return this._currentMode;
	}

	/**
	 * Checks if antigrav is active
	 * @returns {boolean}
	 */
	isAntigravActive() {
		return this._antigravToggle?.getActive() || false;
	}

	/**
	 * Checks if base is active
	 * @returns {boolean}
	 */
	isBaseActive() {
		return this._baseToggle?.getActive() || false;
	}
}

// Export for use in other modules
if (typeof window !== 'undefined') {
	window.PlayerSection = PlayerSection;
}
