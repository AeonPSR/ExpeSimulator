/**
 * ExpeditionSimulator Application
 * 
 * Main application class that orchestrates all UI components.
 * This is the entry point that wires everything together.
 */
class ExpeditionSimulatorApp {
	constructor() {
		// State - Initialize with LANDING sector automatically selected
		this._selectedSectors = ['LANDING'];
		this._players = [];
		this._nextPlayerId = 1;

		// Component instances
		this._panel = null;
		this._sectorGrid = null;
		this._selectedSectorsComponent = null;
		this._exampleWorlds = null;
		this._playerSection = null;
		this._probabilityDisplay = null;
		this._resultsDisplay = null;

		// Initialize
		this._init();
	}

	/**
	 * Initializes the application
	 * @private
	 */
	_init() {
		// Create main panel
		this._panel = new Panel({
			title: 'Expedition Simulator',
			tongueIcon: getResourceURL('astro/astrophysicist.png'),
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);

		// Create and add all sections
		this._createSections();
	}

	/**
	 * Creates all UI sections
	 * @private
	 */
	_createSections() {
		const contentArea = this._panel.getContentArea();

		// 1. Sector Grid
		this._sectorGrid = new SectorGrid({
			sectors: SectorData.sectors,
			getResourceURL: getResourceURL,
			sectorsWithFight: SectorData.sectorsWithFight,
			onSectorClick: (sectorName) => this._handleSectorClick(sectorName),
			onDiplomacyToggle: (isActive) => this._handleDiplomacyToggle(isActive),
			getSectorAvailability: (sectorName) => this._getSectorAvailability(sectorName)
		});
		this._sectorGrid.mount(contentArea);

		// 2. Selected Sectors
		this._selectedSectorsComponent = new SelectedSectors({
			maxSectors: Constants.MAX_SECTORS,
			getResourceURL: getResourceURL,
			sectorsWithFight: SectorData.sectorsWithFight,
			onSectorRemove: (index) => this._handleSectorRemove(index),
			onClearAll: () => this._handleClearAllSectors()
		});
		this._selectedSectorsComponent.mount(contentArea);

		// 3. Example Worlds
		this._exampleWorlds = new ExampleWorlds({
			onWorldSelect: (worldName) => this._handleWorldSelect(worldName)
		});
		this._exampleWorlds.mount(contentArea);

		// 4. Player Section
		this._playerSection = new PlayerSection({
			maxPlayers: Constants.MAX_PLAYERS,
			getResourceURL: getResourceURL,
			onAddPlayer: () => this._handleAddPlayer(),
			onModeToggle: (mode) => this._handleModeToggle(mode),
			onAntigravToggle: (isActive) => this._handleAntigravToggle(isActive),
			onBaseToggle: (isActive) => this._handleBaseToggle(isActive)
		});
		this._playerSection.mount(contentArea);

		// 5. Probability Display
		this._probabilityDisplay = new ProbabilityDisplay();
		this._probabilityDisplay.mount(contentArea);

		// 6. Results Display
		this._resultsDisplay = new ResultsDisplay();
		this._resultsDisplay.mount(contentArea);

		// Initial update to show LANDING sector
		this._selectedSectorsComponent.update(this._selectedSectors);
		this._updateDisplays();
	}

	// ========================================
	// Sector Handlers
	// ========================================

	/**
	 * Handles sector click in the grid
	 * @private
	 * @param {string} sectorName
	 */
	_handleSectorClick(sectorName) {
		// Check per-sector limit first
		const sectorValidation = ValidationUtils.validateSectorLimit(sectorName, this._selectedSectors);
		if (!sectorValidation.isValid) {
			console.log(sectorValidation.message);
			// TODO: Show user-friendly error message/notification
			return;
		}

		// Only apply total sector limit to regular sectors (not special sectors)
		const isSpecialSector = SectorData.isSpecialSector(sectorName);
		if (!isSpecialSector) {
			const totalValidation = ValidationUtils.validateTotalSectorLimit(this._selectedSectors);
			if (!totalValidation.isValid) {
				console.log(totalValidation.message);
				// TODO: Show user-friendly error message/notification
				return;
			}
		}

		this._selectedSectors.push(sectorName);
		this._selectedSectorsComponent.update(this._selectedSectors);
		this._updateDisplays();

		console.log(`Added sector: ${sectorName}`, this._selectedSectors);
	}

	/**
	 * Handles removing a sector from selection
	 * @private
	 * @param {number} index
	 */
	_handleSectorRemove(index) {
		this._selectedSectors.splice(index, 1);
		this._selectedSectorsComponent.update(this._selectedSectors);
		this._updateDisplays();

		console.log(`Removed sector at index ${index}`, this._selectedSectors);
	}

	/**
	 * Handles clearing all selected sectors
	 * @private
	 */
	_handleClearAllSectors() {
		// Clear all sectors and automatically add LANDING back
		this._selectedSectors = ['LANDING'];
		this._selectedSectorsComponent.update(this._selectedSectors);
		this._updateDisplays();

		console.log('Cleared all sectors, LANDING automatically added');
	}


	/**
	 * Handles diplomacy toggle
	 * @private
	 * @param {boolean} isActive
	 */
	_handleDiplomacyToggle(isActive) {
		console.log(`Diplomacy toggle: ${isActive}`);
		this._updateDisplays();
	}

	/**
	 * Gets sector availability information for UI display
	 * @private
	 * @param {string} sectorName
	 * @returns {Object} availability info with shouldDisable and tooltipText
	 */
	_getSectorAvailability(sectorName) {
		const validation = ValidationUtils.validateSectorLimit(sectorName, this._selectedSectors);
		const isSpecialSector = SectorData.isSpecialSector(sectorName);
		
		let shouldDisable = false;
		let tooltipText = `${formatSectorName(sectorName)} (${validation.currentCount}/${validation.maxAllowed})`;
		
		// Check per-sector limit first
		if (!validation.isValid) {
			shouldDisable = true;
			tooltipText = `Maximum ${validation.maxAllowed} ${sectorName} sectors allowed (currently have ${validation.currentCount})`;
		} 
		// Only apply total sector limit to regular sectors (not special sectors)
		else if (!isSpecialSector) {
			const totalValidation = ValidationUtils.validateTotalSectorLimit(this._selectedSectors);
			if (!totalValidation.isValid) {
				shouldDisable = true;
				tooltipText = `Maximum ${totalValidation.maxTotal} regular sectors allowed (currently have ${totalValidation.currentTotal})`;
			}
		}
		
		return { shouldDisable, tooltipText };
	}

	// ========================================
	// World Handlers
	// ========================================

	/**
	 * Handles example world selection
	 * @private
	 * @param {string} worldName
	 */
	_handleWorldSelect(worldName) {
		const sectors = WorldData.getWorldConfiguration(worldName);
		if (sectors.length === 0) {
			console.warn(`Unknown world: ${worldName}`);
			return;
		}

		this._loadWorldSectors(sectors);
		console.log(`Loaded ${worldName}:`, this._selectedSectors);
	}

	/**
	 * Loads a world's sector configuration
	 * @private
	 * @param {Array<string>} sectors
	 */
	_loadWorldSectors(sectors) {
		this._handleClearAllSectors();
		sectors.filter(s => s !== 'LANDING').forEach(sectorName => {
			this._selectedSectors.push(sectorName);
		});
		this._selectedSectorsComponent.update(this._selectedSectors);
		this._updateDisplays();
	}

	// ========================================
	// Player Handlers
	// ========================================

	/**
	 * Handles adding a new player
	 * @private
	 */
	_handleAddPlayer() {
		if (this._players.length >= Constants.MAX_PLAYERS) {
			console.log('Max players reached');
			return;
		}

		const playerId = this._nextPlayerId++;

		const player = {
			id: playerId,
			avatar: Constants.DEFAULT_AVATAR,
			abilities: [null, null, null, null, null],
			items: [null, null, null],
			health: Constants.DEFAULT_HEALTH
		};

		this._players.push(player);

		const playerCard = new PlayerCard({
			player: player,
			getResourceURL: getResourceURL,
			onAvatarClick: (id) => this._handleAvatarClick(id),
			onAbilityClick: (id, slot) => this._handleAbilityClick(id, slot),
			onItemClick: (id, slot) => this._handleItemClick(id, slot),
			onHealthClick: (id) => this._handleHealthClick(id),
			onRemove: (id) => this._handleRemovePlayer(id)
		});

		this._playerSection.addPlayerCard(playerCard);
		this._updateDisplays();

		console.log(`Added player ${playerId}`, player);
	}

	/**
	 * Handles removing a player
	 * @private
	 * @param {number} playerId
	 */
	_handleRemovePlayer(playerId) {
		this._players = this._players.filter(p => p.id !== playerId);
		this._playerSection.removePlayerCard(playerId);
		this._updateDisplays();

		console.log(`Removed player ${playerId}`);
	}

	/**
	 * Handles avatar click (open character selection)
	 * @private
	 * @param {number} playerId
	 */
	_handleAvatarClick(playerId) {
		const player = this._players.find(p => p.id === playerId);
		if (!player) return;

		const modal = new SelectionModal({
			title: 'Select Character',
			items: CharacterData.getSelectionItems(getResourceURL),
			selectedId: player.avatar,
			columns: 6,
			onSelect: (item) => {
				player.avatar = item.id;
				const card = this._playerSection.getPlayerCard(playerId);
				card?.updateAvatar(item.id);
				console.log(`Player ${playerId} avatar changed to ${item.id}`);
			}
		});
		modal.open();
	}

	/**
	 * Handles ability slot click
	 * @private
	 * @param {number} playerId
	 * @param {number} slotIndex
	 */
	_handleAbilityClick(playerId, slotIndex) {
		const player = this._players.find(p => p.id === playerId);
		if (!player) return;

		const items = AbilityData.getSelectionItems(getResourceURL);

		// Add "clear" option
		items.unshift({ id: null, image: '', label: 'Clear' });

		const modal = new SelectionModal({
			title: 'Select Ability',
			items: items,
			selectedId: player.abilities[slotIndex],
			columns: 4,
			itemSize: 'large',
			className: 'ability-selection',
			onSelect: (item) => {
				player.abilities[slotIndex] = item.id;
				const card = this._playerSection.getPlayerCard(playerId);
				card?.updateAbility(slotIndex, item.id);
				this._updateDisplays();
				console.log(`Player ${playerId} ability[${slotIndex}] changed to ${item.id}`);
			}
		});
		modal.open();
	}

	/**
	 * Handles item slot click
	 * @private
	 * @param {number} playerId
	 * @param {number} slotIndex
	 */
	_handleItemClick(playerId, slotIndex) {
		const player = this._players.find(p => p.id === playerId);
		if (!player) return;

		const items = ItemData.getSelectionItems(getResourceURL);

		// Add "clear" option
		items.unshift({ id: null, image: '', label: 'Clear' });

		const modal = new SelectionModal({
			title: 'Select Item',
			items: items,
			selectedId: player.items[slotIndex],
			columns: 5,
			itemSize: 'large',
			className: 'item-selection',
			onSelect: (item) => {
				player.items[slotIndex] = item.id;
				const card = this._playerSection.getPlayerCard(playerId);
				card?.updateItem(slotIndex, item.id);
				this._updateDisplays();
				console.log(`Player ${playerId} item[${slotIndex}] changed to ${item.id}`);
			}
		});
		modal.open();
	}

	/**
	 * Handles health click (edit health)
	 * @private
	 * @param {number} playerId
	 */
	_handleHealthClick(playerId) {
		const player = this._players.find(p => p.id === playerId);
		if (!player) return;

		const newHealth = prompt('Enter health value:', player.health.toString());
		if (newHealth !== null) {
			const healthValue = parseInt(newHealth, 10);
			if (!isNaN(healthValue) && healthValue >= 0) {
				player.health = healthValue;
				const card = this._playerSection.getPlayerCard(playerId);
				card?.updateHealth(healthValue);
				this._updateDisplays();
				console.log(`Player ${playerId} health changed to ${healthValue}`);
			}
		}
	}

	// ========================================
	// Mode Handlers
	// ========================================

	/**
	 * Handles mode toggle
	 * @private
	 * @param {string} mode
	 */
	_handleModeToggle(mode) {
		console.log(`Mode changed to: ${mode}`);
		this._updateDisplays();
	}

	/**
	 * Handles antigrav toggle
	 * @private
	 * @param {boolean} isActive
	 */
	_handleAntigravToggle(isActive) {
		console.log(`Antigrav: ${isActive}`);
		this._updateDisplays();
	}

	/**
	 * Handles base toggle
	 * @private
	 * @param {boolean} isActive
	 */
	_handleBaseToggle(isActive) {
		console.log(`Base: ${isActive}`);
		this._updateDisplays();
	}

	// ========================================
	// Display Updates
	// ========================================

	/**
	 * Updates probability and results displays
	 * @private
	 */
	_updateDisplays() {
		// Update sector availability states
		if (this._sectorGrid && this._sectorGrid.updateSectorAvailability) {
			this._sectorGrid.updateSectorAvailability();
		}

		// Update probability display
		if (this._selectedSectors.length > 0) {
			this._probabilityDisplay.setContent(`
				<div class="outcome-category">
					<h5>Selected Sectors</h5>
					<p>${this._selectedSectors.length} sectors selected</p>
					<p><em>Probability calculations will be added when backend is connected</em></p>
				</div>
			`);
		} else {
			this._probabilityDisplay.clear();
		}

		// Update results display
		if (this._players.length > 0) {
			this._resultsDisplay.setContent(`
				<p>${this._players.length} player(s) configured</p>
				<p><em>Expedition results will be calculated when backend is connected</em></p>
			`);
			this._resultsDisplay.showDefaultLegend();
		} else {
			this._resultsDisplay.clear();
		}
	}

	// ========================================
	// Public API
	// ========================================

	/**
	 * Gets the selected sectors
	 * @returns {Array<string>}
	 */
	getSelectedSectors() {
		return [...this._selectedSectors];
	}

	/**
	 * Gets the players
	 * @returns {Array<Object>}
	 */
	getPlayers() {
		return this._players.map(p => ({ ...p }));
	}

	/**
	 * Gets the main panel
	 * @returns {Panel}
	 */
	getPanel() {
		return this._panel;
	}
}

// Export
if (typeof window !== 'undefined') {
	window.ExpeditionSimulatorApp = ExpeditionSimulatorApp;
}
