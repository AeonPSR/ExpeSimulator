/**
 * ExpeditionSimulator Application
 * 
 * Main application class - orchestrates components and state.
 * Delegates state management to ExpeditionState.
 * Delegates data transformation to services.
 */
class ExpeditionSimulatorApp {
	constructor() {
		this._state = new ExpeditionState();
		this._state.setOnChange(() => this._updateDisplays());

		this._panel = null;
		this._sectorGrid = null;
		this._selectedSectorsComponent = null;
		this._exampleWorlds = null;
		this._playerSection = null;
		this._probabilityDisplay = null;
		this._resultsDisplay = null;

		this._init();
	}

	_init() {
		this._panel = new Panel({
			title: 'Expedition Simulator',
			tongueIcon: getResourceURL('astro/astrophysicist.png'),
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);
		this._createSections();
	}

	_createSections() {
		const contentArea = this._panel.getContentArea();

		this._sectorGrid = new SectorGrid({
			sectors: SectorData.sectors,
			getResourceURL: getResourceURL,
			sectorsWithFight: SectorData.sectorsWithFight,
			onSectorClick: (name) => this._onSectorClick(name),
			onDiplomacyToggle: (active) => this._updateDisplays(),
			getSectorAvailability: (name) => this._getSectorAvailability(name)
		});
		this._sectorGrid.mount(contentArea);

		this._selectedSectorsComponent = new SelectedSectors({
			maxSectors: Constants.MAX_SECTORS,
			getResourceURL: getResourceURL,
			sectorsWithFight: SectorData.sectorsWithFight,
			onSectorRemove: (index) => this._onSectorRemove(index),
			onClearAll: () => this._onClearSectors()
		});
		this._selectedSectorsComponent.mount(contentArea);

		this._exampleWorlds = new ExampleWorlds({
			onWorldSelect: (name) => this._onWorldSelect(name)
		});
		this._exampleWorlds.mount(contentArea);

		this._playerSection = new PlayerSection({
			maxPlayers: Constants.MAX_PLAYERS,
			getResourceURL: getResourceURL,
			onAddPlayer: () => this._onAddPlayer(),
			onModeToggle: (mode) => this._updateDisplays(),
			onAntigravToggle: (active) => this._state.setAntigravActive(active),
			onBaseToggle: (active) => this._state.setCentauriActive(active)
		});
		this._playerSection.mount(contentArea);

		this._probabilityDisplay = new ProbabilityDisplay();
		this._probabilityDisplay.mount(contentArea);

		this._resultsDisplay = new ResultsDisplay();
		this._resultsDisplay.mount(contentArea);

		this._selectedSectorsComponent.update(this._state.getSectors());
		
		// Render initial players from state
		this._renderInitialPlayers();
		
		this._updateDisplays();
	}

	/**
	 * Renders player cards for any players already in state (e.g., default players)
	 * @private
	 */
	_renderInitialPlayers() {
		const players = this._state.getPlayers();
		for (const player of players) {
			const card = new PlayerCard({
				player: player,
				getResourceURL: getResourceURL,
				onAvatarClick: (id) => this._onAvatarClick(id),
				onAbilityClick: (id, slot) => this._onAbilityClick(id, slot),
				onItemClick: (id, slot) => this._onItemClick(id, slot),
				onHealthClick: (id) => this._onHealthClick(id),
				onRemove: (id) => this._onRemovePlayer(id)
			});
			this._playerSection.addPlayerCard(card);
		}
	}

	// ========================================
	// Sector Events
	// ========================================

	_onSectorClick(sectorName) {
		const sectors = this._state.getSectors();
		const validation = ValidationUtils.validateSectorLimit(sectorName, sectors);
		if (!validation.isValid) return;

		if (!SectorData.isSpecialSector(sectorName)) {
			const totalValidation = ValidationUtils.validateTotalSectorLimit(sectors);
			if (!totalValidation.isValid) return;
		}

		this._state.addSector(sectorName);
		this._selectedSectorsComponent.update(this._state.getSectors());
	}

	_onSectorRemove(index) {
		this._state.removeSector(index);
		this._selectedSectorsComponent.update(this._state.getSectors());
	}

	_onClearSectors() {
		this._state.clearSectors();
		this._selectedSectorsComponent.update(this._state.getSectors());
	}

	_getSectorAvailability(sectorName) {
		const sectors = this._state.getSectors();
		const validation = ValidationUtils.validateSectorLimit(sectorName, sectors);
		
		let shouldDisable = !validation.isValid;
		let tooltipText = `${formatSectorName(sectorName)} (${validation.currentCount}/${validation.maxAllowed})`;

		if (!shouldDisable && !SectorData.isSpecialSector(sectorName)) {
			const totalValidation = ValidationUtils.validateTotalSectorLimit(sectors);
			if (!totalValidation.isValid) {
				shouldDisable = true;
				tooltipText = `Maximum ${totalValidation.maxTotal} regular sectors`;
			}
		}

		return { shouldDisable, tooltipText };
	}

	// ========================================
	// World Events
	// ========================================

	_onWorldSelect(worldName) {
		const sectors = WorldData.getWorldConfiguration(worldName);
		if (sectors.length === 0) return;

		this._state.clearSectors();
		sectors.filter(s => s !== 'LANDING').forEach(s => this._state.addSector(s));
		this._selectedSectorsComponent.update(this._state.getSectors());
	}

	// ========================================
	// Player Events
	// ========================================

	_onAddPlayer() {
		if (this._state.getPlayerCount() >= Constants.MAX_PLAYERS) return;

		const player = this._state.addPlayer();
		const card = new PlayerCard({
			player: player,
			getResourceURL: getResourceURL,
			onAvatarClick: (id) => this._onAvatarClick(id),
			onAbilityClick: (id, slot) => this._onAbilityClick(id, slot),
			onItemClick: (id, slot) => this._onItemClick(id, slot),
			onHealthClick: (id) => this._onHealthClick(id),
			onRemove: (id) => this._onRemovePlayer(id)
		});
		this._playerSection.addPlayerCard(card);
	}

	_onRemovePlayer(playerId) {
		this._state.removePlayer(playerId);
		this._playerSection.removePlayerCard(playerId);
	}

	_onAvatarClick(playerId) {
		const player = this._state.getPlayer(playerId);
		if (!player) return;

		new SelectionModal({
			title: 'Select Character',
			items: CharacterData.getSelectionItems(getResourceURL),
			selectedId: player.avatar,
			columns: 6,
			onSelect: (item) => {
				this._state.setPlayerAvatar(playerId, item.id);
				this._playerSection.getPlayerCard(playerId)?.updateAvatar(item.id);
			}
		}).open();
	}

	_onAbilityClick(playerId, slotIndex) {
		const player = this._state.getPlayer(playerId);
		if (!player) return;

		const items = AbilityData.getSelectionItems(getResourceURL);
		items.unshift({ id: null, image: '', label: 'Clear' });

		new SelectionModal({
			title: 'Select Ability',
			items: items,
			selectedId: player.abilities[slotIndex],
			columns: 4,
			itemSize: 'large',
			className: 'ability-selection',
			onSelect: (item) => {
				this._state.setPlayerAbility(playerId, slotIndex, item.id);
				this._playerSection.getPlayerCard(playerId)?.updateAbility(slotIndex, item.id);
			}
		}).open();
	}

	_onItemClick(playerId, slotIndex) {
		const player = this._state.getPlayer(playerId);
		if (!player) return;

		const items = ItemData.getSelectionItems(getResourceURL);
		items.unshift({ id: null, image: '', label: 'Clear' });

		new SelectionModal({
			title: 'Select Item',
			items: items,
			selectedId: player.items[slotIndex],
			columns: 5,
			itemSize: 'large',
			className: 'item-selection',
			onSelect: (item) => {
				this._state.setPlayerItem(playerId, slotIndex, item.id);
				this._playerSection.getPlayerCard(playerId)?.updateItem(slotIndex, item.id);
			}
		}).open();
	}

	_onHealthClick(playerId) {
		const player = this._state.getPlayer(playerId);
		if (!player) return;

		const newHealth = prompt('Enter health value:', player.health.toString());
		if (newHealth !== null) {
			const value = parseInt(newHealth, 10);
			if (!isNaN(value) && value >= 0) {
				this._state.setPlayerHealth(playerId, value);
				this._playerSection.getPlayerCard(playerId)?.updateHealth(value);
			}
		}
	}

	// ========================================
	// Display Updates
	// ========================================

	_updateDisplays() {
		this._sectorGrid?.updateSectorAvailability?.();
		this._updateFightingPower();
		this._updateProbabilityDisplay();
		this._updateResultsDisplay();
	}

	_updateFightingPower() {
		const power = FightingPowerService.calculateTotalFightingPower(
			this._state.getPlayers(),
			this._state.isCentauriActive()
		);
		this._playerSection?.setFightingPower?.(power);
	}

	_updateProbabilityDisplay() {
		const sectors = this._state.getSectors();
		if (sectors.length === 0) {
			this._probabilityDisplay.clear();
			return;
		}

		const players = this._state.getPlayers();
		const loadout = LoadoutBuilder.build(players, {
			antigravActive: this._state.isAntigravActive()
		});
		const results = EventWeightCalculator.calculate(sectors, loadout, players);
		this._probabilityDisplay.update(results);
	}

	_updateResultsDisplay() {
		const players = this._state.getPlayers();
		if (players.length > 0) {
			// Get sectors and build loadout
			const sectors = this._state.getSectors();
			const loadout = LoadoutBuilder.build(players, {
				antigravActive: this._state.isAntigravActive()
			});

			// Calculate damage from both sources
			const fightResult = FightCalculator.calculate(sectors, loadout, players);
			const eventResult = EventDamageCalculator.calculate(sectors, loadout, players);

			// Distribute damage to players for all scenarios
			const damageByScenario = DamageSpreader.distributeAllScenarios(
				fightResult.damageInstances,
				eventResult.damageInstances,
				players.length
			);

			// Calculate final health for all scenarios
			const healthByScenario = DamageSpreader.calculateAllFinalHealth(players, damageByScenario);

			const resultsHTML = this._renderExpeditionResults(players, healthByScenario);
			this._resultsDisplay.setContent(resultsHTML);
			this._resultsDisplay.showDefaultLegend();
		} else {
			this._resultsDisplay.clear();
		}
	}

	/**
	 * Renders expedition results HTML for all players
	 * @param {Array} players - Array of player objects
	 * @param {Object} healthByScenario - { pessimist, average, optimist, worstCase } health arrays
	 * @returns {string} - HTML string for expedition results
	 */
	_renderExpeditionResults(players, healthByScenario) {
		return players.map((player, index) => {
			const optimist = healthByScenario.optimist[index] ?? player.health;
			const average = healthByScenario.average[index] ?? player.health;
			const pessimist = healthByScenario.pessimist[index] ?? player.health;
			const worst = healthByScenario.worstCase[index] ?? player.health;

			return `
				<div class="expedition-result-card">
					<div class="expedition-result-avatar">
						<img src="${getResourceURL(`characters/${player.avatar}`)}" alt="Player Avatar" />
					</div>
					<div class="expedition-result-health-container">
						<div class="expedition-result-health optimist ${this._getHealthClass(optimist)}">
							${this._renderHealthValue(optimist)}
						</div>
						<div class="expedition-result-health average ${this._getHealthClass(average)}">
							${this._renderHealthValue(average)}
						</div>
						<div class="expedition-result-health pessimist ${this._getHealthClass(pessimist)}">
							${this._renderHealthValue(pessimist)}
						</div>
						<div class="expedition-result-health worst ${this._getHealthClass(worst)}">
							${this._renderHealthValue(worst)}
						</div>
					</div>
				</div>
			`;
		}).join('');
	}

	/**
	 * Renders the health value display (number + icon or dead icon)
	 * @param {number} health - Health value
	 * @returns {string} - HTML string
	 */
	_renderHealthValue(health) {
		if (health <= 0) {
			return `<img src="${getResourceURL('others/dead.png')}" alt="Dead" class="dead-icon" />`;
		}
		return `${health}<img src="${getResourceURL('astro/hp.png')}" alt="HP" class="hp-icon" />`;
	}

	/**
	 * Gets the CSS class for health status coloring
	 * @param {number} health - Health value
	 * @returns {string} - CSS class name
	 */
	_getHealthClass(health) {
		if (health <= 0) return 'health-dead';
		if (health <= 3) return 'health-critical';
		if (health <= 6) return 'health-low';
		if (health <= 10) return 'health-medium';
		return 'health-high';
	}

	// ========================================
	// Public API
	// ========================================

	getSelectedSectors() { return this._state.getSectors(); }
	getPlayers() { return this._state.getPlayers(); }
	getPanel() { return this._panel; }
}

// Export
if (typeof window !== 'undefined') {
	window.ExpeditionSimulatorApp = ExpeditionSimulatorApp;
}
