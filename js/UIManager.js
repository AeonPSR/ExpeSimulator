// UI Management - Handles all UI creation and updates

class UIManager {
	constructor() {
		this.panel = null;
	}

	/**
	/**
	* Checks if a sector has fight events
	* @param {string} sectorName - Name of the sector
	* @returns {boolean} - True if sector has fight events
	*/
	hasFightEvents(sectorName) {
		const sectorsWithFight = ['RUINS', 'WRECK', 'CRISTAL_FIELD', 'RUMINANT', 'PREDATOR', 'INTELLIGENT', 'INSECT', 'MANKAROG'];
		return sectorsWithFight.includes(sectorName);
	}

	/**
	* Gets the negative level for a sector
	* @param {string} sectorName - Name of the sector
	* @returns {number} - Negative level of the sector
	*/
	getSectorNegativeLevel(sectorName) {
		const sectorConfig = PlanetSectorConfigData.find(s => s.sectorName === sectorName);
		if (!sectorConfig) return 0;
		
		// Check if both traitor and diplomacy toggles are active
		const isDiplomacyActive = document.body.classList.contains('diplomacy-active');
		const isTraitorActive = document.body.classList.contains('traitor-active');
		
		// If both are active, use non-combat negative level
		if (isDiplomacyActive && isTraitorActive) {
			return sectorConfig.nonCombatNegativeLevel;
		}
		
		return sectorConfig.negativeLevel;
	}

	/**
	* Gets the appropriate traitor icon based on negative level
	* @param {number} negativeLevel - The negative level value (percentage)
	* @returns {string|null} - Icon filename or null if no icon needed
	*/
	getTraitorIcon(negativeLevel) {
		if (negativeLevel === 0) {
			return null; // No icon for level 0
		} else if (negativeLevel >= 1 && negativeLevel <= 30) {
			return 'traitor.png'; // Level 1
		} else if (negativeLevel >= 31 && negativeLevel <= 60) {
			return 'traitor level2.png'; // Level 2
		} else if (negativeLevel >= 61) {
			return 'traitor level3.png'; // Level 3
		}
		return null;
	}

	/**
	* Creates a sector element for the gridthe main expedition simulator panel
	* @returns {HTMLElement} - The created panel element
	*/
	createPanel() {
		this.panel = document.createElement('div');
		this.panel.id = 'expedition-simulator';
		this.panel.className = 'expedition-panel';
		
		this.panel.innerHTML = this.getPanelHTML();
		document.body.appendChild(this.panel);
		
		return this.panel;
	}

	/**
	* Gets the HTML structure for the main panel
	* @returns {string} - HTML string for the panel
	*/
	getPanelHTML() {
		return `
			${this.getInlineStyles()}
			<div class="panel-tongue">
				<img src="${getResourceURL('astro/astrophysicist.png')}" alt="Expedition" />
			</div>
			<div class="panel-main">
				<div class="panel-header">
					<h3>Expedition Simulator</h3>
				</div>
				<div class="panel-content">
					<div class="section-selector">
						<div class="sectors-header">
							<h4>Available Sectors</h4>
							<div class="sectors-buttons">
								<button id="sectors-toggle-btn" class="sectors-toggle-btn" data-active="false">
									<img src="${getResourceURL('abilities/traitor.png')}" alt="Toggle Traitor" />
								</button>
								<button id="diplomacy-toggle-btn" class="diplomacy-toggle-btn" data-active="false">
									<img src="${getResourceURL('abilities/diplomacy.png')}" alt="Toggle Diplomacy" />
								</button>
							</div>
						</div>
						<div class="sector-grid" id="sector-grid"></div>
					</div>
					<div class="selected-sectors">
						<h4 id="selected-header">Selected Expedition (1/20)</h4>
						<div class="selected-grid" id="selected-grid"></div>
						<button id="clear-all" class="clear-btn">Clear All</button>
						<div class="example-worlds">
							<h4>Example Worlds</h4>
							<div class="debug-row">
								<button id="debug-rocky" class="debug-btn">Rocky World</button>
								<button id="debug-fugubos" class="debug-btn">Fugubos</button>
								<button id="debug-vie" class="debug-btn">Vie Heureuse</button>
							</div>
							<div class="debug-row">
								<button id="debug-loss" class="debug-btn">,̶ ̶'̶ ̶,̶ ̶|̶ ̶,̶'̶_̶'̶</button>
								<button id="debug-nurgle" class="debug-btn">Nurgle's Throne</button>
								<button id="debug-cuts" class="debug-btn">Thousands Cuts</button>
							</div>
							<div class="debug-row">
								<button id="debug-polyphemus" class="debug-btn">Polyphemus</button>
								<button id="debug-museum" class="debug-btn">Museum</button>
								<button id="debug-americas-dream" class="debug-btn">America's Dream</button>
							</div>
						</div>
					</div>
					<div class="players-section">
						<div class="players-header">
							<h4>Players</h4>
							<div class="players-controls">
								<button id="fighting-power-btn" class="fighting-power-btn">
									<span id="fighting-power-value">0</span>
									<img src="${getResourceURL('others/fight.png')}" alt="Fighting Power" class="fight-power-icon" />
								</button>
								<button id="players-mode-btn" class="players-mode-btn" data-mode="icarus">
									<img src="${getResourceURL('others/icarus_access.png')}" alt="Mode" />
								</button>
								<button id="antigrav-propeller-btn" class="antigrav-propeller-btn" data-active="false">
									<img src="${getResourceURL('others/icarus_antigrav_propeller.png')}" alt="Antigrav Propeller" />
								</button>
								<button id="players-toggle-btn" class="players-toggle-btn" data-active="false">
									<img src="${getResourceURL('others/base03.png')}" alt="Toggle" />
								</button>
							</div>
						</div>
						<div class="players-container" id="players-container">
							<button id="add-player-btn" class="add-player-btn">
								<span class="plus-icon">+</span>
							</button>
						</div>
					</div>
					<div class="probability-display">
						<h4>Event Probabilities</h4>
						<div class="prob-content" id="prob-content">
							Select sectors to see probabilities
						</div>
					</div>
					<div class="expedition-results">
						<h4>Expedition Results</h4>
						<div class="results-content" id="results-content">
							Add players to see expedition results
						</div>
						<div id="expedition-legend-container"></div>
					</div>
				</div>
			</div>
		`;
	}

	/**
	* Gets inline styles for the panel (to avoid conflicts)
	* @returns {string} - CSS styles as HTML string
	*/
	getInlineStyles() {
		return `
			<style>
				.sector-item, .selected-sector-item {
					-webkit-user-select: none;
					-moz-user-select: none;
					-ms-user-select: none;
					user-select: none;
					-webkit-touch-callout: none;
					-webkit-tap-highlight-color: transparent;
				}
				.sector-item img, .selected-sector-item img {
					-webkit-user-select: none;
					-moz-user-select: none;
					-ms-user-select: none;
					user-select: none;
					-webkit-touch-callout: none;
					-webkit-tap-highlight-color: transparent;
					pointer-events: none;
				}
				.sector-item:focus, .selected-sector-item:focus {
					outline: none;
				}
			</style>
		`;
	}

	/**
	* Populates the sector grid with available sectors
	* @param {Function} onSectorClick - Callback function for sector clicks
	*/
	populateSectorGrid(onSectorClick) {
		const grid = document.getElementById('sector-grid');
		const uniqueSectors = [...new Set(PlanetSectorConfigData.map(s => s.sectorName))];
		
		uniqueSectors.forEach(sectorName => {
			const sectorDiv = this.createSectorElement(sectorName, onSectorClick);
			grid.appendChild(sectorDiv);
		});
	}

	/**
	* Creates a sector element for the grid
	* @param {string} sectorName - Name of the sector
	* @param {Function} onSectorClick - Click handler function
	* @returns {HTMLElement} - Created sector element
	*/
	createSectorElement(sectorName, onSectorClick) {
		const sectorDiv = document.createElement('div');
		sectorDiv.className = 'sector-item';
		sectorDiv.dataset.sector = sectorName;
		
		const img = document.createElement('img');
		img.src = getResourceURL(`astro/${sectorName.toLowerCase()}.png`);
		img.alt = sectorName;
		img.title = formatSectorName(sectorName);
		img.className = 'sector-main-img';
		
		sectorDiv.appendChild(img);
		
		// Add fight icon if sector has fight events
		if (this.hasFightEvents(sectorName)) {
			const fightImg = document.createElement('img');
			fightImg.src = getResourceURL('others/fight.png');
			fightImg.alt = 'Fight';
			fightImg.className = 'fight-icon';
			sectorDiv.appendChild(fightImg);
		}
		
		// Add negative level icon if applicable
		const negativeLevel = this.getSectorNegativeLevel(sectorName);
		const traitorIcon = this.getTraitorIcon(negativeLevel);
		if (traitorIcon) {
			const negativeImg = document.createElement('img');
			negativeImg.src = getResourceURL(`abilities/${traitorIcon}`);
			negativeImg.alt = `Negative Level ${negativeLevel}`;
			negativeImg.className = 'negative-level-icon';
			negativeImg.title = `Negative Level: ${negativeLevel}`;
			sectorDiv.appendChild(negativeImg);
		}
		
		sectorDiv.addEventListener('click', () => onSectorClick(sectorName));
		
		return sectorDiv;
	}

	/**
	* Updates the selected sectors display
	* @param {Array<string>} selectedSectors - Array of selected sector names
	* @param {string} headerText - Header text to display
	* @param {Function} onRemoveClick - Callback for remove sector clicks
	*/
	updateSelectedDisplay(selectedSectors, headerText, onRemoveClick) {
		const selectedGrid = document.getElementById('selected-grid');
		const header = document.getElementById('selected-header');
		
		header.textContent = headerText;
		selectedGrid.innerHTML = '';
		
		selectedSectors.forEach((sectorName, index) => {
			const sectorDiv = this.createSelectedSectorElement(sectorName, index, onRemoveClick);
			selectedGrid.appendChild(sectorDiv);
		});
	}

	/**
	* Creates a selected sector element
	* @param {string} sectorName - Name of the sector
	* @param {number} index - Index of the sector
	* @param {Function} onRemoveClick - Remove click handler
	* @returns {HTMLElement} - Created selected sector element
	*/
	createSelectedSectorElement(sectorName, index, onRemoveClick) {
		const sectorDiv = document.createElement('div');
		sectorDiv.className = 'selected-sector-item';
		sectorDiv.dataset.index = index;
		sectorDiv.title = `${formatSectorName(sectorName)} - Click to remove`;
		
		const img = document.createElement('img');
		img.src = getResourceURL(`astro/${sectorName.toLowerCase()}.png`);
		img.alt = sectorName;
		
		sectorDiv.appendChild(img);
		
		// Add fight icon if sector has fight events
		if (this.hasFightEvents(sectorName)) {
			const fightImg = document.createElement('img');
			fightImg.src = getResourceURL('others/fight.png');
			fightImg.alt = 'Fight';
			fightImg.className = 'fight-icon';
			sectorDiv.appendChild(fightImg);
		}
		
		// Add negative level icon if applicable
		const negativeLevel = this.getSectorNegativeLevel(sectorName);
		const traitorIcon = this.getTraitorIcon(negativeLevel);
		if (traitorIcon) {
			const negativeImg = document.createElement('img');
			negativeImg.src = getResourceURL(`abilities/${traitorIcon}`);
			negativeImg.alt = `Negative Level ${negativeLevel}`;
			negativeImg.className = 'negative-level-icon';
			negativeImg.title = `Negative Level: ${negativeLevel}`;
			sectorDiv.appendChild(negativeImg);
		}
		
		sectorDiv.addEventListener('click', () => onRemoveClick(index));
		
		return sectorDiv;
	}

	/**
	* Updates sector availability in the grid
	* @param {Function} getSectorAvailability - Function to get sector availability info
	*/
	updateSectorAvailability(getSectorAvailability) {
		const grid = document.getElementById('sector-grid');
		const sectorItems = grid.querySelectorAll('.sector-item');
		
		sectorItems.forEach(sectorDiv => {
			const sectorName = sectorDiv.dataset.sector;
			const { shouldDisable, tooltipText } = getSectorAvailability(sectorName);
			
			if (shouldDisable) {
				sectorDiv.classList.add('sector-disabled');
				sectorDiv.style.pointerEvents = 'none';
			} else {
				sectorDiv.classList.remove('sector-disabled');
				sectorDiv.style.pointerEvents = 'auto';
			}
			
			// Update the title
			const img = sectorDiv.querySelector('img');
			if (img) {
				img.title = tooltipText;
			}
		});
	}

	/**
	* Updates the probability display content
	* @param {string} htmlContent - HTML content to display
	*/
	updateProbabilityDisplay(htmlContent) {
		const probContent = document.getElementById('prob-content');
		probContent.innerHTML = htmlContent;
	}

	/**
	* Updates the expedition results display content
	* @param {string} htmlContent - HTML content to display
	*/
	updateExpeditionResults(htmlContent) {
		const resultsContent = document.getElementById('results-content');
		if (resultsContent) {
			resultsContent.innerHTML = htmlContent;
		}
	}

	/**
	* Updates the expedition legend display
	* @param {string} legendHTML - Legend HTML content to display
	*/
	updateExpeditionLegend(legendHTML) {
		const legendContainer = document.getElementById('expedition-legend-container');
		if (legendContainer) {
			legendContainer.innerHTML = legendHTML;
		}
	}

	/**
	* Updates the fighting power display
	* @param {number} fightingPower - Current fighting power value
	*/
	updateFightingPower(fightingPower) {
		const fightingPowerValue = document.getElementById('fighting-power-value');
		if (fightingPowerValue) {
			fightingPowerValue.textContent = fightingPower;
		}
	}

	/**
	* Refreshes all negative level icons based on current toggle states
	*/
	refreshNegativeLevelIcons() {
		// Refresh icons in the main sector grid
		const sectorItems = document.querySelectorAll('#sector-grid .sector-item');
		sectorItems.forEach(sectorDiv => {
			const sectorName = sectorDiv.dataset.sector;
			this.updateNegativeLevelIcon(sectorDiv, sectorName);
		});

		// Refresh icons in the selected sectors grid
		const selectedItems = document.querySelectorAll('#selected-grid .selected-sector-item');
		selectedItems.forEach(sectorDiv => {
			const img = sectorDiv.querySelector('img');
			if (img && img.alt) {
				const sectorName = img.alt.toUpperCase();
				this.updateNegativeLevelIcon(sectorDiv, sectorName);
			}
		});
	}

	/**
	* Updates the negative level icon for a specific sector element
	* @param {HTMLElement} sectorDiv - The sector div element
	* @param {string} sectorName - The sector name
	*/
	updateNegativeLevelIcon(sectorDiv, sectorName) {
		// Remove existing negative level icon
		const existingIcon = sectorDiv.querySelector('.negative-level-icon');
		if (existingIcon) {
			existingIcon.remove();
		}

		// Add new negative level icon based on current state
		const negativeLevel = this.getSectorNegativeLevel(sectorName);
		const traitorIcon = this.getTraitorIcon(negativeLevel);
		if (traitorIcon) {
			const negativeImg = document.createElement('img');
			negativeImg.src = getResourceURL(`abilities/${traitorIcon}`);
			negativeImg.alt = `Negative Level ${negativeLevel}`;
			negativeImg.className = 'negative-level-icon';
			negativeImg.title = `Negative Level: ${negativeLevel}`;
			sectorDiv.appendChild(negativeImg);
		}
	}

	/**
	* Gets the main panel element
	* @returns {HTMLElement} - The panel element
	*/
	getPanel() {
		return this.panel;
	}
}
