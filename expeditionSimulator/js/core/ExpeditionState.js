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
		this._players.push(this._createPlayer({ preferPilot: true }));

		// Players 2-4: Default setup
		for (let i = 0; i < 3; i++) {
			this._players.push(this._createPlayer());
		}
	}

	_createPlayer(options = {}) {
		const selection = options.preferPilot ? this._pickInitialPilotAvatar() : { avatar: this._pickRandomAvatar() };
		return {
			id: this._nextPlayerId++,
			avatar: selection.avatar,
			abilities: this._getInitialAbilities(selection.avatar, selection.fallbackAbilities),
			items: Array(Constants.ITEM_SLOTS).fill(null),
			health: Constants.DEFAULT_HEALTH
		};
	}

	_getInitialAbilities(avatar, fallbackAbilities = []) {
		const abilities = this._getCrewAvatarAbilities(avatar)
			.filter(ability => AbilityData.normal.includes(ability))
			.slice(0, Constants.ABILITY_SLOTS);

		if (abilities.length === 0) {
			abilities.push(...fallbackAbilities.slice(0, Constants.ABILITY_SLOTS));
		}

		return [
			...abilities,
			...Array(Constants.ABILITY_SLOTS - abilities.length).fill(null)
		];
	}

	_pickInitialPilotAvatar() {
		const used = new Set(this._players.map(p => p.avatar));
		const crewGroups = this._getCrewAvatarGroups();
		if (crewGroups) {
			const pilotGroups = this._filterAvatarGroups(
				crewGroups,
				filename => this._getCrewAvatarAbilities(filename).includes('human/pilot.png')
			);
			const pilotChoice = this._pickFromAvatarGroups(pilotGroups, used);
			if (pilotChoice) return { avatar: pilotChoice };
		}

		const ownerGroups = crewGroups
			? this._filterAvatarGroups(crewGroups, filename => SkillOwnershipData.canLearn('human/pilot.png', filename, false))
			: { available: SkillOwnershipData['human/pilot.png'] || [], dead: [], missing: [] };
		const ownerChoice = this._pickFromAvatarGroups(ownerGroups, used);
		if (ownerChoice) return { avatar: ownerChoice, fallbackAbilities: ['human/pilot.png'] };

		return { avatar: this._pickRandomAvatar() };
	}

	_filterAvatarGroups(groups, predicate) {
		return {
			available: (groups.available || []).filter(predicate),
			dead: (groups.dead || []).filter(predicate),
			missing: (groups.missing || []).filter(predicate)
		};
	}

	_getCrewAvatarAbilities(avatar) {
		if (typeof window === 'undefined') return [];
		return window.crewManagerApp?.getAvatarAbilities?.(avatar) || [];
	}

	/**
	 * Picks a random avatar not already used by any current player.
	 * Falls back to DEFAULT_AVATAR if all named characters are taken.
	 * @returns {string}
	 * @private
	 */
	_pickRandomAvatar() {
		const used = new Set(this._players.map(p => p.avatar));
		const crewGroups = this._getCrewAvatarGroups();
		if (crewGroups) {
			const crewChoice = this._pickFromAvatarGroups(crewGroups, used);
			if (crewChoice) return crewChoice;
		}

		const candidates = CharacterData.available.filter(
			c => c !== Constants.DEFAULT_AVATAR && !used.has(c)
		);
		if (candidates.length === 0) return Constants.DEFAULT_AVATAR;
		return candidates[Math.floor(Math.random() * candidates.length)];
	}

	_getCrewAvatarGroups() {
		if (typeof window === 'undefined') return null;
		return window.crewManagerApp?.getAvatarGroups?.() || null;
	}

	_pickFromAvatarGroups(groups, used) {
		const orderedGroups = [groups.available, groups.dead, groups.missing];
		for (const group of orderedGroups) {
			const candidates = (group || []).filter(filename => !used.has(filename));
			if (candidates.length > 0) {
				return candidates[Math.floor(Math.random() * candidates.length)];
			}
		}
		return null;
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
		const player = this._createPlayer({ preferPilot: this._players.length === 0 });
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
