/**
 * ExpeditionState
 * 
 * Manages the state of the expedition: sectors, players, settings.
 * Pure state management - no UI concerns.
 * 
 * @module core/ExpeditionState
 */
class ExpeditionState {
	constructor() {
		this._sectors = ['LANDING'];
		this._players = [];
		this._nextPlayerId = 1;
		this._centauriActive = false;
		this._antigravActive = false;
		this._onChange = null;

		// Initialize with 4 default players, first one with Pilot ability
		this._initializeDefaultPlayers();
	}

	/**
	 * Initializes the default player setup (4 players, first with Pilot)
	 * @private
	 */
	_initializeDefaultPlayers() {
		// Player 1: Has Pilot ability
		this._players.push({
			id: this._nextPlayerId++,
			avatar: Constants.DEFAULT_AVATAR,
			abilities: ['pilot.png', ...Array(Constants.ABILITY_SLOTS - 1).fill(null)],
			items: Array(Constants.ITEM_SLOTS).fill(null),
			health: Constants.DEFAULT_HEALTH
		});

		// Players 2-4: Default setup
		for (let i = 0; i < 3; i++) {
			this._players.push({
				id: this._nextPlayerId++,
				avatar: Constants.DEFAULT_AVATAR,
				abilities: Array(Constants.ABILITY_SLOTS).fill(null),
				items: Array(Constants.ITEM_SLOTS).fill(null),
				health: Constants.DEFAULT_HEALTH
			});
		}
	}

	/**
	 * Sets the callback for state changes
	 */
	setOnChange(callback) {
		this._onChange = callback;
	}

	_notifyChange() {
		if (this._onChange) {
			this._onChange();
		}
	}

	// ========================================
	// Sector Management
	// ========================================

	getSectors() {
		return [...this._sectors];
	}

	addSector(sectorName) {
		this._sectors.push(sectorName);
		this._notifyChange();
	}

	removeSector(index) {
		this._sectors.splice(index, 1);
		this._notifyChange();
	}

	clearSectors() {
		this._sectors = ['LANDING'];
		this._notifyChange();
	}

	setSectors(sectors) {
		this._sectors = [...sectors];
		this._notifyChange();
	}

	// ========================================
	// Player Management
	// ========================================

	getPlayers() {
		return this._players.map(p => ({ ...p }));
	}

	getPlayer(playerId) {
		return this._players.find(p => p.id === playerId);
	}

	addPlayer() {
		const player = {
			id: this._nextPlayerId++,
			avatar: Constants.DEFAULT_AVATAR,
			abilities: Array(Constants.ABILITY_SLOTS).fill(null),
			items: Array(Constants.ITEM_SLOTS).fill(null),
			health: Constants.DEFAULT_HEALTH
		};
		this._players.push(player);
		this._notifyChange();
		return player;
	}

	removePlayer(playerId) {
		this._players = this._players.filter(p => p.id !== playerId);
		this._notifyChange();
	}

	updatePlayer(playerId, updates) {
		const player = this._players.find(p => p.id === playerId);
		if (player) {
			Object.assign(player, updates);
			this._notifyChange();
		}
	}

	setPlayerAbility(playerId, slotIndex, abilityId) {
		const player = this._players.find(p => p.id === playerId);
		if (player) {
			player.abilities[slotIndex] = abilityId;
			this._notifyChange();
		}
	}

	setPlayerItem(playerId, slotIndex, itemId) {
		const player = this._players.find(p => p.id === playerId);
		if (player) {
			player.items[slotIndex] = itemId;
			this._notifyChange();
		}
	}

	setPlayerHealth(playerId, health) {
		const player = this._players.find(p => p.id === playerId);
		if (player) {
			player.health = health;
			this._notifyChange();
		}
	}

	setPlayerAvatar(playerId, avatar) {
		const player = this._players.find(p => p.id === playerId);
		if (player) {
			player.avatar = avatar;
			this._notifyChange();
		}
	}

	getPlayerCount() {
		return this._players.length;
	}

	// ========================================
	// Settings
	// ========================================

	isCentauriActive() {
		return this._centauriActive;
	}

	setCentauriActive(active) {
		this._centauriActive = active;
		this._notifyChange();
	}

	isAntigravActive() {
		return this._antigravActive;
	}

	setAntigravActive(active) {
		this._antigravActive = active;
		this._notifyChange();
	}
}

// Export
if (typeof window !== 'undefined') {
	window.ExpeditionState = ExpeditionState;
}
