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
		this._tabContainer = null;
		this._planetaryReview = null;
		this._playerSection = null;
		this._probabilityDisplay = null;
		this._resultsDisplay = null;
		this._chatDetector = null;

		this._init();
	}

	_init() {
		this._panel = new Panel({
			title: 'Expedition Simulator',
			tongueIcon: getResourceURL('pictures/astro/astrophysicist.png'),
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);
		this._createSections();

		// Start watching chat for expedition messages
		this._chatDetector = new ChatMessageDetector({
			onImport: (sectors) => this._onImportSectors(sectors)
		});
		this._chatDetector.start();
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

		// Tabs: Planetary Review (future) and Expedition Simulation
		this._tabContainer = new TabContainer({
			tabs: [
				{ id: 'planetary-review', label: 'Planetary Review' },
				{ id: 'expedition-sim', label: 'Expedition Simulation' }
			],
			activeTab: 'expedition-sim'
		});
		this._tabContainer.mount(contentArea);

		const reviewPanel = this._tabContainer.getTabPanel('planetary-review');
		const simPanel = this._tabContainer.getTabPanel('expedition-sim');

		// Planetary Review tab
		this._planetaryReview = new PlanetaryReview({
			getResourceURL: getResourceURL
		});
		this._planetaryReview.mount(reviewPanel);

		// Expedition Simulation tab — existing components
		this._playerSection = new PlayerSection({
			maxPlayers: Constants.MAX_PLAYERS,
			getResourceURL: getResourceURL,
			onAddPlayer: () => this._onAddPlayer(),
			onModeToggle: (mode) => this._updateDisplays(),
			onAntigravToggle: (active) => this._state.setAntigravActive(active),
			onBaseToggle: (active) => this._state.setCentauriActive(active)
		});
		this._playerSection.mount(simPanel);

		this._probabilityDisplay = new ProbabilityDisplay();
		this._probabilityDisplay.mount(simPanel);

		this._resultsDisplay = new ResultsDisplay();
		this._resultsDisplay.mount(simPanel);

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
			const card = this._createPlayerCard(player);
			this._playerSection.addPlayerCard(card);
		}
	}

	/**
	 * Creates a PlayerCard instance with standard callback wiring
	 * @param {Object} player - Player data object
	 * @returns {PlayerCard}
	 * @private
	 */
	_createPlayerCard(player) {
		return new PlayerCard({
			player: player,
			getResourceURL: getResourceURL,
			onAvatarClick: (id) => this._onAvatarClick(id),
			onAbilityClick: (id, slot) => this._onAbilityClick(id, slot),
			onItemClick: (id, slot) => this._onItemClick(id, slot),
			onHealthClick: (id) => this._onHealthClick(id),
			onRemove: (id) => this._onRemovePlayer(id)
		});
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
		this._planetaryReview?.update(worldName);
	}

	/**
	 * Imports sectors parsed from a chat message, replacing the current planet
	 * @param {string[]} sectorIds - Array of sector IDs (LANDING is always included automatically)
	 * @private
	 */
	_onImportSectors(sectorIds) {
		if (sectorIds.length === 0) return;

		// Open the panel temporarily
		const panel = this._panel.element;
		panel.classList.add('import-open');

		this._state.clearSectors();
		sectorIds
			.filter(s => s !== 'LANDING')
			.forEach(s => this._state.addSector(s));
		this._selectedSectorsComponent.update(this._state.getSectors());

		// Scroll the selected sectors into view and highlight
		const grid = this._selectedSectorsComponent.element?.querySelector('.selected-grid');
		if (grid) {
			grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			grid.classList.remove('import-highlight');
			// Force reflow so the animation replays
			void grid.offsetWidth;
			grid.classList.add('import-highlight');
			grid.addEventListener('animationend', () => {
				grid.classList.remove('import-highlight');
				// Close the panel after the highlight unless it's pinned
				if (!panel.classList.contains('pinned')) {
					panel.classList.remove('import-open');
				}
			}, { once: true });
		} else {
			// Fallback: close after a delay if grid not found
			setTimeout(() => {
				if (!panel.classList.contains('pinned')) {
					panel.classList.remove('import-open');
				}
			}, 2000);
		}
	}

	// ========================================
	// Player Events
	// ========================================

	_onAddPlayer() {
		if (this._state.getPlayerCount() >= Constants.MAX_PLAYERS) return;

		const player = this._state.addPlayer();
		const card = this._createPlayerCard(player);
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
		this._updateExploredSectors();
		this._updateFightingPower();
		const results = this._calculateExpeditionResults();
		this._updateProbabilityDisplay(results);
		this._updateResultsDisplay(results);
	}

	_updateExploredSectors() {
		// Base sectors: 9 for icarus, 3 for patrol
		const mode = this._playerSection?.getMode?.() || 'icarus';
		let sectors = mode === 'icarus' ? 9 : 3;

		// +1 for each player with the Sprint ability
		const allPlayers = this._state.getPlayers();
		for (const player of allPlayers) {
			if (player.abilities && player.abilities.includes('sprint.png')) {
				sectors += 1;
			}
		}

		this._playerSection?.setExploredSectors?.(sectors);
	}

	_updateFightingPower() {
		// Only count fighting power from players who can participate
		const sectors = this._state.getSectors();
		const allPlayers = this._state.getPlayers();
		const participatingPlayers = OxygenService.getParticipatingPlayers(allPlayers, sectors);
		
		const power = FightingPowerService.calculateTotalFightingPower(
			participatingPlayers,
			this._state.isCentauriActive()
		);
		this._playerSection?.setFightingPower?.(power);
	}

	/**
	 * Calculates all expedition results from a single source.
	 * This is the ONLY place where calculation happens.
	 * @returns {Object|null} Complete calculation results or null if no sectors
	 * @private
	 */
	_calculateExpeditionResults() {
		const sectors = this._state.getSectors();
		if (sectors.length === 0) {
			return null;
		}

		const allPlayers = this._state.getPlayers();
		
		// Filter to only players who can participate (have oxygen access)
		const participatingPlayers = OxygenService.getParticipatingPlayers(allPlayers, sectors);
		
		const loadout = LoadoutBuilder.build(participatingPlayers, {
			antigravActive: this._state.isAntigravActive()
		});

		// Get explored sector count (movement speed)
		const exploredCount = this._playerSection?.getExploredSectors?.() || 9;

		// Build sector counts map (excluding special sectors like LANDING)
		const sectorCounts = {};
		const alwaysInclude = [];
		for (const sector of sectors) {
			if (SectorData.isSpecialSector(sector)) {
				// LANDING is always visited for free, LOST appears based on oxygen
				alwaysInclude.push(sector);
			} else {
				sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
			}
		}

		// Calculate total explorable sectors (excluding special sectors)
		const totalExplorableSectors = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

		// Use sampling if movement speed < total explorable sectors
		let results;
		if (exploredCount < totalExplorableSectors) {
			console.log(`[SectorSampling] Using sampling: ${exploredCount} explored / ${totalExplorableSectors} total`);
			results = EventWeightCalculator.calculateWithSampling(
				sectorCounts,
				exploredCount,
				loadout,
				participatingPlayers,
				{ alwaysInclude }
			);
		} else {
			// Standard calculation - visit all sectors
			results = EventWeightCalculator.calculate(sectors, loadout, participatingPlayers);
		}

		// Add player health calculations to the results (only for participating players)
		if (participatingPlayers.length > 0 && results) {
			// Use DamageSpreader to properly distribute damage instances to players
			// Each instance knows its type (FIGHT, TIRED, ACCIDENT, DISASTER) and distribution rules
			const fightInstances = results.combat?.damageInstances || {};
			const eventInstances = results.eventDamage?.damageInstances || {};

			const damageByScenario = DamageSpreader.distributeAllScenarios(
				fightInstances, eventInstances, participatingPlayers
			);

			// Apply Survival reduction per-instance (-1 per damage instance, min 0)
			const scenarios = Constants.SCENARIO_KEYS;
			const finalHealth = {};
			const effectsByScenario = {};

			for (const scenario of scenarios) {
				const scenarioResult = damageByScenario[scenario];
				
				// Start with effects from damage distribution (e.g., rope immunity)
				const playerEffects = scenarioResult.appliedEffects.map(arr => [...arr]);
				
				// Reduction steps: each applies a reduction and tracks it as an effect
				const reductionSteps = [
					{
						apply: (players, breakdown) => DamageSpreader.applySurvivalReduction(players, breakdown),
						hasEffect: player => player.abilities?.some(a => a && filenameToId(a) === 'SURVIVAL'),
						effectType: 'SURVIVAL'
					},
					{
						apply: (players, breakdown) => DamageSpreader.applyArmorReduction(players, breakdown),
						hasEffect: player => player.items?.some(item => item && filenameToId(item) === 'PLASTENITE_ARMOR'),
						effectType: 'PLASTENITE_ARMOR'
					}
				];

				let modifiedBreakdown = scenarioResult.breakdown;
				for (const step of reductionSteps) {
					const beforeBreakdown = modifiedBreakdown;
					modifiedBreakdown = step.apply(participatingPlayers, beforeBreakdown);
					
					// Track reductions as effects (compare before/after)
					for (let i = 0; i < participatingPlayers.length; i++) {
						if (step.hasEffect(participatingPlayers[i])) {
							const beforeDamage = beforeBreakdown[i]?.reduce((sum, inst) => sum + inst.damage, 0) || 0;
							const afterDamage = modifiedBreakdown[i]?.reduce((sum, inst) => sum + inst.damage, 0) || 0;
							const damageReduced = beforeDamage - afterDamage;
							if (damageReduced > 0) {
								playerEffects[i].push({ type: step.effectType, reductions: damageReduced });
							}
						}
					}
				}

				// Calculate per-player total damage after all reductions
				const damagePerPlayer = modifiedBreakdown.map(breakdown =>
					breakdown.reduce((sum, inst) => sum + inst.damage, 0)
				);

				// Calculate final health
				finalHealth[scenario] = DamageSpreader.calculateFinalHealth(
					participatingPlayers, damagePerPlayer
				);
				effectsByScenario[scenario] = playerEffects;
			}

			results.healthByScenario = finalHealth;
			results.effectsByScenario = effectsByScenario;
		}
		
		// Store participation info for rendering
		results.participationStatus = OxygenService.getParticipationStatus(allPlayers, sectors);

		return results;
	}

	_updateProbabilityDisplay(results) {
		if (!results) {
			this._probabilityDisplay.clear();
			return;
		}
		this._probabilityDisplay.update(results);
	}

	_updateResultsDisplay(results) {
		const players = this._state.getPlayers();
		
		if (players.length > 0 && results) {
			const resultsHTML = this._renderExpeditionResults(
				players, 
				results.healthByScenario || {}, 
				results.participationStatus || [],
				results.effectsByScenario || {}
			);
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
	 * @param {Array} participationStatus - Participation status for each player
	 * @param {Object} effectsByScenario - { pessimist, average, optimist, worstCase } effect arrays per player
	 * @returns {string} - HTML string for expedition results
	 */
	_renderExpeditionResults(players, healthByScenario, participationStatus, effectsByScenario = {}) {
		// Build a map of participating player indices for health lookup
		let participatingIndex = 0;
		
		return players.map((player, playerIndex) => {
			const status = participationStatus[playerIndex];
			const canParticipate = status?.canParticipate ?? true;
			
			// If player can't participate, show stuck in ship icon in each scenario
			if (!canParticipate) {
				const stuckIcon = `<img src="${getResourceURL('pictures/others/stuck_in_ship.png')}" alt="Stuck in Ship" class="stuck-icon" title="No oxygen - stuck in ship" />`;
				return `
					<div class="expedition-result-card">
						<div class="expedition-result-avatar">
							<img src="${getResourceURL(`pictures/characters/${player.avatar}`)}" alt="Player Avatar" />
						</div>
						<div class="expedition-result-health-container">
							<div class="expedition-result-health optimist health-stuck">
								${stuckIcon}
							</div>
							<div class="expedition-result-health median health-stuck">
								${stuckIcon}
							</div>
							<div class="expedition-result-health pessimist health-stuck">
								${stuckIcon}
							</div>
							<div class="expedition-result-health worst health-stuck">
								${stuckIcon}
							</div>
						</div>
					</div>
				`;
			}
			
			// Get health values for this participating player
			const optimist = healthByScenario.optimist?.[participatingIndex] ?? player.health;
			const average = healthByScenario.average?.[participatingIndex] ?? player.health;
			const pessimist = healthByScenario.pessimist?.[participatingIndex] ?? player.health;
			const worst = healthByScenario.worstCase?.[participatingIndex] ?? player.health;
			
			// Get effects for this participating player
			const optimistEffects = effectsByScenario.optimist?.[participatingIndex] || [];
			const averageEffects = effectsByScenario.average?.[participatingIndex] || [];
			const pessimistEffects = effectsByScenario.pessimist?.[participatingIndex] || [];
			const worstEffects = effectsByScenario.worstCase?.[participatingIndex] || [];
			
			// Collect all unique effects for card-level display (deduplicated by type)
			const allEffects = [optimistEffects, averageEffects, pessimistEffects, worstEffects];
			const cardLevelEffects = [];
			const seenCardTypes = new Set();
			for (const scenarioEffects of allEffects) {
				for (const effect of scenarioEffects) {
					if (!seenCardTypes.has(effect.type)) {
						seenCardTypes.add(effect.type);
						cardLevelEffects.push(effect);
					}
				}
			}
			
			participatingIndex++;

			return `
				<div class="expedition-result-card">
					<div class="expedition-result-avatar">
						<img src="${getResourceURL(`pictures/characters/${player.avatar}`)}" alt="Player Avatar" />
					</div>
					<div class="expedition-result-health-container">
						<div class="expedition-result-health optimist ${this._getHealthClass(optimist)}">
							${this._renderHealthValue(optimist)}
						</div>
						<div class="expedition-result-health median ${this._getHealthClass(average)}">
							${this._renderHealthValue(average)}
						</div>
						<div class="expedition-result-health pessimist ${this._getHealthClass(pessimist)}">
							${this._renderHealthValue(pessimist)}
						</div>
						<div class="expedition-result-health worst ${this._getHealthClass(worst)}">
							${this._renderHealthValue(worst)}
						</div>
					</div>
					${cardLevelEffects.length > 0 ? `<div class="expedition-result-effects">${this._renderEffectIcons(cardLevelEffects)}</div>` : ''}
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
			return `<img src="${getResourceURL('pictures/others/dead.png')}" alt="Dead" class="dead-icon" />`;
		}
		return `${health}<img src="${getResourceURL('pictures/astro/hp.png')}" alt="HP" class="hp-icon" />`;
	}

	/**
	 * Renders effect icons for items/abilities that triggered
	 * @param {Array} effects - Array of { type, ... } effect objects
	 * @returns {string} - HTML string with effect icons
	 */
	_renderEffectIcons(effects) {
		if (!effects || effects.length === 0) return '';
		
		// Map effect types to their icon paths
		const effectIcons = {
			'ROPE': 'pictures/items_exploration/rope.jpg',
			'SURVIVAL': 'pictures/abilities/survival.png',
			'PLASTENITE_ARMOR': 'pictures/items_exploration/plastenite_armor.jpg'
		};
		
		// Deduplicate effects by type
		const seenTypes = new Set();
		const uniqueEffects = effects.filter(e => {
			if (seenTypes.has(e.type)) return false;
			seenTypes.add(e.type);
			return true;
		});
		
		return uniqueEffects.map(effect => {
			const iconPath = effectIcons[effect.type];
			if (!iconPath) return '';
			
			const title = effect.type === 'ROPE' 
				? `Rope blocked ${effect.damagePrevented || '?'} damage`
				: effect.type === 'SURVIVAL'
				? `Survival reduced ${effect.reductions || '?'} damage`
				: effect.type === 'PLASTENITE_ARMOR'
				? `Armor reduced ${effect.reductions || '?'} combat damage`
				: effect.type;
			
			return `<img src="${getResourceURL(iconPath)}" alt="${effect.type}" class="effect-icon" title="${title}" />`;
		}).join('');
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
