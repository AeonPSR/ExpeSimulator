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
		this._updateDebounceTimer = null;
		this._state.setOnChange(() => this._scheduleUpdate());

		this._panel = null;
		this._sectorGrid = null;
		this._selectedSectorsComponent = null;
		this._exampleWorlds = null;
		this._tabContainer = null;
		this._planetaryReview = null;
		this._currentPlanetName = null;
		this._currentDirection = 'North';
		this._currentFuelCost = 0;
		this._lastReviewData = null;
		this._playerSection = null;
		this._probabilityDisplay = null;
		this._resultsDisplay = null;
		this._chatDetector = null;

		// Web Worker for background calculation
		this._worker = null;
		this._requestId = 0;
		this._baseURL = '';

		this._init();
	}

	_init() {
		this._panel = new Panel({
			title: 'Expedition Simulator',
			tongueIcon: getResourceURL('pictures/abilities/Aeonian astro.png'),
			getResourceURL: getResourceURL
		});
		this._panel.mount(document.body);
		this._createSections();

		// Start watching chat for expedition messages
		this._chatDetector = new ChatObserver({
			onImport: (sectors, planetName, nav) => this._onImportSectors(sectors, planetName, nav)
		});
		this._chatDetector.start();

		this._planetCardInjector = new PlanetCardInjector({
			onImport: (sectors, planetName, nav) => this._onImportSectors(sectors, planetName, nav)
		});
		this._planetCardInjector.start();

		// Initialize worker after all scripts are loaded
		this._initWorker();

		// Re-render dynamic content when the user switches language
		document.addEventListener('i18n:change', () => {
			this._selectedSectorsComponent?.update(this._state.getSectors());
			this._planetaryReview?.updateNav?.(this._currentDirection, this._currentFuelCost);
			this._scheduleUpdate();
		});
	}

	_createSections() {
		const contentArea = this._panel.getContentArea();

		this._sectorGrid = new SectorGrid({
			sectors: SectorData.sectors,
			getResourceURL: getResourceURL,
			sectorsWithFight: SectorData.sectorsWithFight,
			onSectorClick: (name) => this._onSectorClick(name),
			onDiplomacyToggle: (active) => this._onDiplomacyToggle(active),
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
		this._exampleWorlds.element.style.display = Settings.devtools ? '' : 'none';
		document.addEventListener('settings:devtools-change', (e) => {
			this._exampleWorlds.element.style.display = e.detail.devtools ? '' : 'none';
		});

		// Tabs: Planetary Review (future) and Expedition Simulation
		this._tabContainer = new TabContainer({
			tabs: [
				{ id: 'planetary-review', label: I18n.t('tab.planetary_review'), i18nKey: 'tab.planetary_review' },
				{ id: 'expedition-sim', label: I18n.t('tab.expedition_sim'), i18nKey: 'tab.expedition_sim' }
			],
			activeTab: 'planetary-review'
		});
		this._tabContainer.mount(contentArea);

		const reviewPanel = this._tabContainer.getTabPanel('planetary-review');
		const simPanel = this._tabContainer.getTabPanel('expedition-sim');

		// Planetary Review tab
		this._planetaryReview = new PlanetaryReview({
			getResourceURL: getResourceURL,
			onDiplomacyToggle: (active) => this._onDiplomacyToggle(active),
			onExportClick: () => this._onExportPlanetToClipboard(),
			onDirectionChange: (direction) => {
				this._currentDirection = direction;
				this._updatePlanetaryReview();
			},
			onFuelChange: (fuel) => {
				this._currentFuelCost = fuel;
				this._updatePlanetaryReview();
			},
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

	_onDiplomacyToggle(active) {
		if (active) {
			document.body.classList.add('diplomacy-active');
		} else {
			document.body.classList.remove('diplomacy-active');
		}

		this._sectorGrid?.setDiplomacyActive?.(active);
		this._planetaryReview?.setDiplomacyActive?.(active);
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

		const filtered = sectors.filter(s => s !== 'LANDING');
		this._state.setSectors(['LANDING', ...filtered]);
		this._selectedSectorsComponent.update(this._state.getSectors());
		this._currentPlanetName = worldName;
	}

	/**
	 * Imports sectors parsed from a chat message, replacing the current planet
	 * @param {string[]} sectorIds - Array of sector IDs (LANDING is always included automatically)
	 * @param {string|null} planetName
	 * @param {{ direction: string, fuel: number }|null} nav
	 * @private
	 */
	_onImportSectors(sectorIds, planetName = null, nav = null) {
		if (sectorIds.length === 0) return;
		this._currentPlanetName = planetName || null;
		this._currentDirection = nav?.direction ?? 'North';
		this._currentFuelCost = nav?.fuel ?? 0;
		this._planetaryReview?.updateNav?.(this._currentDirection, this._currentFuelCost);

		// Open the panel temporarily
		const panel = this._panel.element;
		const wasAlreadyOpen = panel.getBoundingClientRect().left >= 0;
		panel.classList.add('import-open');

		// Bring this panel to the front, same as hovering does
		document.querySelectorAll('.app-panel').forEach(p => p.classList.remove('panel-on-top'));
		panel.classList.add('panel-on-top');

		const filtered = sectorIds.filter(s => s !== 'LANDING');
		this._state.setSectors(['LANDING', ...filtered]);
		this._selectedSectorsComponent.update(this._state.getSectors());

		// Run scroll + highlight animation — deferred until the panel is fully open
		const runAnimation = () => {
			const grid = this._selectedSectorsComponent.element?.querySelector('.selected-grid');
			if (grid) {
				grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				grid.classList.remove('import-highlight');
				// Force reflow so the animation replays
				void grid.offsetWidth;
				grid.classList.add('import-highlight');
				grid.addEventListener('animationend', () => {
					grid.classList.remove('import-highlight');
					// Always remove import-open — pinned class already keeps the panel
					// open if needed, so leaving import-open causes a stuck-open bug.
					panel.classList.remove('import-open');
				}, { once: true });
			} else {
				// Fallback: close after a delay if grid not found
				setTimeout(() => {
					panel.classList.remove('import-open');
				}, 2000);
			}
		};

		if (wasAlreadyOpen) {
			runAnimation();
		} else {
			panel.addEventListener('transitionend', runAnimation, { once: true });
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

		const newHealth = prompt(I18n.t('player.health_prompt'), player.health.toString());
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

	_scheduleUpdate() {
		if (this._updateDebounceTimer) {
			clearTimeout(this._updateDebounceTimer);
		}
		this._updateDebounceTimer = setTimeout(() => {
			this._updateDebounceTimer = null;
			this._updateDisplays();
		}, 0);
	}

	_updateDisplays() {
		this._sectorGrid?.updateSectorAvailability?.();
		this._updateExploredSectors();
		this._updateFightingPower();
		this._updatePlanetaryReview();
		this._requestCalculation();
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

	_updatePlanetaryReview() {
		if (!this._planetaryReview) return;
		const sectors = this._state.getSectors();
		const diplomacy = this._sectorGrid?.isDiplomacyActive?.() || false;
		const reviewData = PlanetReviewScorer.score(sectors, { diplomacy, fuelCost: this._currentFuelCost });
		this._lastReviewData = reviewData;
		this._planetaryReview.update(this._currentPlanetName || null, reviewData);
	}

	_onExportPlanetToClipboard() {
		const name = this._currentPlanetName || 'Unknown planet';
		const sectors = this._state.getSectors();
		const axes = this._lastReviewData?.axes || [];
		const overall = this._lastReviewData?.overall ?? null;
		const diplomacy = this._sectorGrid?.isDiplomacyActive?.() || false;
		const nav = { direction: this._currentDirection, fuel: this._currentFuelCost };
		return Clipboard.copyPlanetSummary(name, sectors, axes, overall, diplomacy, nav, this._lastPlanetResources || null);
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
			// console.log(`[SectorSampling] Using sampling: ${exploredCount} explored / ${totalExplorableSectors} total`);
			results = ExpeditionPipeline.calculateWithSampling(
				sectorCounts,
				exploredCount,
				loadout,
				participatingPlayers,
				{ alwaysInclude }
			);
		} else {
			// Standard calculation - visit all sectors
			results = ExpeditionPipeline.calculate(sectors, loadout, participatingPlayers);
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

		// Planet-level resources: always computed over all sectors regardless of exploredCount,
		// so the star-rating quartile indicator is independent of team movement speed.
		// Diplomacy toggle is honoured here (removes FIGHT events → boosts resource probabilities)
		// but is NOT applied to the main expedition results above.
		const diplomacy = this._sectorGrid?.isDiplomacyActive?.() || false;
		const planetLoadout = (diplomacy && !loadout.abilities.includes('DIPLOMACY'))
			? { ...loadout, abilities: [...loadout.abilities, 'DIPLOMACY'] }
			: loadout;
		if (exploredCount < totalExplorableSectors) {
			const fullSectors = [];
			for (const [type, count] of Object.entries(sectorCounts)) {
				for (let i = 0; i < count; i++) fullSectors.push(type);
			}
			for (const s of alwaysInclude) fullSectors.push(s);
			results.planetResources = ResourceCalculator.calculate(fullSectors, planetLoadout, participatingPlayers);
		} else {
			results.planetResources = ResourceCalculator.calculate(sectors, planetLoadout, participatingPlayers);
		}

		return results;
	}

	_updateProbabilityDisplay(results) {
		if (!results) {
			this._probabilityDisplay.clear();
			this._lastPlanetResources = null;
			this._planetaryReview?.updateResources?.(null);
			return;
		}
		this._probabilityDisplay.update(results);
		const planetResources = results.planetResources || results.resources || null;
		this._lastPlanetResources = planetResources;
		this._planetaryReview?.updateResources?.(planetResources);
	}

	_updateResultsDisplay(results) {
		const players = this._state.getPlayers();

		if (players.length > 0 && results) {
			const resultsHTML = ResultsRenderer.render(
				players,
				results.healthByScenario || {},
				results.participationStatus || [],
				results.effectsByScenario || {},
				getResourceURL
			);
			this._resultsDisplay.setContent(resultsHTML);
			this._resultsDisplay.showDefaultLegend();
		} else {
			this._resultsDisplay.clear();
		}
	}

	// ========================================
	// Public API
	// ========================================

	getSelectedSectors() { return this._state.getSectors(); }
	getPlayers() { return this._state.getPlayers(); }
	getPanel() { return this._panel; }

	// ========================================
	// Web Worker
	// ========================================

	_initWorker() {
		if (typeof Worker === 'undefined') {
			console.warn('[Worker] Web Workers not available, using synchronous fallback');
			this._worker = null;
			return;
		}

		try {
			// Content scripts can't create workers via chrome.runtime.getURL() directly
			// (cross-origin restriction). Use a Blob wrapper — importScripts is not
			// subject to same-origin policy, so it can load extension resources.
			const workerScriptURL = getResourceURL('expeditionSimulator/js/workers/calculation-worker.js');
			this._baseURL = getResourceURL('');
			const blob = new Blob(
				[`importScripts("${workerScriptURL}");`],
				{ type: 'application/javascript' }
			);
			const blobURL = URL.createObjectURL(blob);
			this._worker = new Worker(blobURL);
			URL.revokeObjectURL(blobURL);
			this._worker.onmessage = (event) => this._onWorkerMessage(event);
			this._worker.onerror = (error) => this._onWorkerError(error);
		} catch (error) {
			console.warn('[Worker] Failed to initialize worker, using synchronous fallback:', error.message);
			this._worker = null;
		}
	}

	_requestCalculation() {
		const sectors = this._state.getSectors();
		if (sectors.length === 0) {
			this._updateProbabilityDisplay(null);
			this._updateResultsDisplay(null);
			return;
		}

		// Cancel any in-flight request by incrementing ID
		this._requestId++;
		const requestId = this._requestId;

		// Show loading state
		this._probabilityDisplay?.showLoading?.();

		// If no worker available, fall back to synchronous calculation
		if (!this._worker) {
			const results = this._calculateExpeditionResults();
			this._updateProbabilityDisplay(results);
			this._updateResultsDisplay(results);
			return;
		}

		// Send calculation to worker
		this._worker.postMessage({
			type: 'calculate',
			requestId,
			baseURL: this._baseURL,
			sectors,
			allPlayers: this._state.getPlayers(),
			antigravActive: this._state.isAntigravActive(),
			exploredCount: this._playerSection?.getExploredSectors?.() || 9,
			diplomacy: this._sectorGrid?.isDiplomacyActive?.() || false
		});
	}

	_onWorkerMessage(event) {
		const { type, requestId, results, error } = event.data;

		// Ignore stale results
		if (requestId !== this._requestId) return;

		if (type === 'result') {
			this._updateProbabilityDisplay(results);
			this._updateResultsDisplay(results);
		} else if (type === 'error') {
			console.error('[Worker]', error);
			this._probabilityDisplay?.showError?.();
		}
	}

	_onWorkerError(error) {
		console.error('[Worker] Unhandled error:', error.message);
		// Fall back to synchronous calculation if the worker crashes
		this._worker = null;
		this._requestCalculation();
	}
}

// Export
if (typeof window !== 'undefined') {
	window.ExpeditionSimulatorApp = ExpeditionSimulatorApp;
}
