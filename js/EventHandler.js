// Event Handler - Manages all event listeners and user interactions

class EventHandler {
    constructor(sectorManager, uiManager, probabilityCalculator, playerManager) {
        this.sectorManager = sectorManager;
        this.uiManager = uiManager;
        this.probabilityCalculator = probabilityCalculator;
        this.playerManager = playerManager;
        
        // Set the sectorManager reference in probabilityCalculator
        this.probabilityCalculator.setSectorManager(sectorManager);
    }

    /**
     * Attaches all event listeners to the UI
     */
    attachEventListeners() {
        this.attachClearAllListener();
        this.attachDebugPlanetListeners();
        this.attachSectorsToggleListener();
        this.attachDiplomacyToggleListener();
    }

    /**
     * Handles sector addition clicks
     * @param {string} sectorName - Name of the sector to add
     */
    handleAddSector(sectorName) {
        const wasAdded = this.sectorManager.addSector(sectorName);
        
        if (wasAdded) {
            this.updateAllDisplays();
        }
        // If not added, it was silently ignored due to limits
    }

    /**
     * Handles sector removal clicks
     * @param {number} index - Index of the sector to remove
     */
    handleRemoveSector(index) {
        const wasRemoved = this.sectorManager.removeSector(index);
        
        if (wasRemoved) {
            this.updateAllDisplays();
        }
    }

    /**
     * Handles clear all button click
     */
    handleClearAll() {
        this.sectorManager.clearAll();
        this.updateAllDisplays();
    }

    /**
     * Updates all UI displays after a change
     */
    updateAllDisplays() {
        this.updateSelectedDisplay();
        this.updateSectorAvailability();
        this.updateProbabilityDisplay();
        this.updateExpeditionResults();
    }

    /**
     * Updates the selected sectors display
     */
    updateSelectedDisplay() {
        const selectedSectors = this.sectorManager.getSelectedSectors();
        const headerText = this.sectorManager.getHeaderText();
        
        this.uiManager.updateSelectedDisplay(
            selectedSectors,
            headerText,
            (index) => this.handleRemoveSector(index)
        );
    }

    /**
     * Updates sector availability in the grid
     */
    updateSectorAvailability() {
        this.uiManager.updateSectorAvailability(
            (sectorName) => this.sectorManager.getSectorAvailability(sectorName)
        );
    }

    /**
     * Updates the probability display
     */
    updateProbabilityDisplay() {
        const selectedSectors = this.sectorManager.getSelectedSectorsWithIds();
        const players = this.playerManager ? this.playerManager.getPlayers() : [];
        const htmlContent = this.probabilityCalculator.calculateProbabilities(selectedSectors, players, this.playerManager);
        this.uiManager.updateProbabilityDisplay(htmlContent);
    }

    /**
     * Updates the expedition results display
     */
    updateExpeditionResults() {
        const selectedSectors = this.sectorManager.getSelectedSectors();
        if (!selectedSectors || selectedSectors.length === 0) {
            this.uiManager.updateExpeditionResults('');
            this.uiManager.updateExpeditionLegend('');
            return;
        }
        if (this.playerManager) {
            const resultsContent = this.playerManager.renderExpeditionResults();
            this.uiManager.updateExpeditionResults(resultsContent);
            // Legend is now integrated within the results cards; clear the separate container
            this.uiManager.updateExpeditionLegend('');
        }
    }

    /**
     * Attaches the clear all button listener
     */
    attachClearAllListener() {
        const clearAllButton = document.getElementById('clear-all');
        if (clearAllButton) {
            clearAllButton.addEventListener('click', () => this.handleClearAll());
        }
    }

    /**
     * Attaches debug planet button listeners
     */
    attachDebugPlanetListeners() {
        const rockyButton = document.getElementById('debug-rocky');
        const fugubosButton = document.getElementById('debug-fugubos');
        const vieButton = document.getElementById('debug-vie');
        const lossButton = document.getElementById('debug-loss');
        const nurgleButton = document.getElementById('debug-nurgle');
        const cutsButton = document.getElementById('debug-cuts');
        const polyphemusButton = document.getElementById('debug-polyphemus');
        const museumButton = document.getElementById('debug-museum');
        const americasDreamButton = document.getElementById('debug-americas-dream');

        if (rockyButton) {
            rockyButton.addEventListener('click', () => this.loadDebugPlanet('rocky'));
        }
        if (fugubosButton) {
            fugubosButton.addEventListener('click', () => this.loadDebugPlanet('fugubos'));
        }
        if (vieButton) {
            vieButton.addEventListener('click', () => this.loadDebugPlanet('vie'));
        }
        if (lossButton) {
            lossButton.addEventListener('click', () => this.loadDebugPlanet('loss'));
        }
        if (nurgleButton) {
            nurgleButton.addEventListener('click', () => this.loadDebugPlanet('nurgle'));
        }
        if (cutsButton) {
            cutsButton.addEventListener('click', () => this.loadDebugPlanet('cuts'));
        }
        if (polyphemusButton) {
            polyphemusButton.addEventListener('click', () => this.loadDebugPlanet('polyphemus'));
        }
        if (museumButton) {
            museumButton.addEventListener('click', () => this.loadDebugPlanet('museum'));
        }
        if (americasDreamButton) {
            americasDreamButton.addEventListener('click', () => this.loadDebugPlanet('americas_dream'));
        }
    }

    /**
     * Attaches the sectors toggle button listener
     */
    attachSectorsToggleListener() {
        const sectorsToggleButton = document.getElementById('sectors-toggle-btn');
        if (sectorsToggleButton) {
            sectorsToggleButton.addEventListener('click', () => {
                const currentState = sectorsToggleButton.getAttribute('data-active') === 'true';
                const newState = !currentState;
                sectorsToggleButton.setAttribute('data-active', newState);
                
                // Toggle traitor mode - controls negative level icons visibility
                if (newState) {
                    document.body.classList.add('traitor-active');
                    console.log('Traitor toggle state: ON');
                    console.log('Negative level icons: VISIBLE');
                } else {
                    document.body.classList.remove('traitor-active');
                    console.log('Traitor toggle state: OFF');
                    console.log('Negative level icons: HIDDEN');
                }

                // Refresh negative level icons to reflect current toggle states
                if (this.uiManager) {
                    this.uiManager.refreshNegativeLevelIcons();
                }
            });
        }
    }

    /**
     * Attaches the diplomacy toggle button listener
     */
    attachDiplomacyToggleListener() {
        const diplomacyToggleButton = document.getElementById('diplomacy-toggle-btn');
        if (diplomacyToggleButton) {
            diplomacyToggleButton.addEventListener('click', () => {
                const currentState = diplomacyToggleButton.getAttribute('data-active') === 'true';
                const newState = !currentState;
                diplomacyToggleButton.setAttribute('data-active', newState);
                
                // Toggle fight icons visibility
                if (newState) {
                    document.body.classList.add('diplomacy-active');
                } else {
                    document.body.classList.remove('diplomacy-active');
                }
                
                console.log('Diplomacy toggle state:', newState ? 'ON' : 'OFF');
                console.log('Fight icons:', newState ? 'HIDDEN' : 'VISIBLE');

                // Refresh negative level icons to reflect current toggle states
                if (this.uiManager) {
                    this.uiManager.refreshNegativeLevelIcons();
                }
            });
        }
    }

    /**
     * Loads a debug planet configuration
     * @param {string} planetType - Type of planet to load
     */
    loadDebugPlanet(planetType) {
        // Clear current selection first
        this.handleClearAll();

        let sectors = [];
        
        switch (planetType) {
            case 'rocky':
                // Rocky World - Hydrocarbon, Crystal field, two mountains
                sectors = ['LANDING', 'HYDROCARBON', 'CRISTAL_FIELD', 'MOUNTAIN', 'MOUNTAIN'];
                break;
                
            case 'fugubos':
                // Fugubos - Insect, Forest, intelligent x2, desert, oxygen, ruminant, cold, fruit trees, ocean, predator, windy
                sectors = ['LANDING', 'INSECT', 'FOREST', 'INTELLIGENT', 'INTELLIGENT', 'DESERT', 
                          'OXYGEN', 'RUMINANT', 'COLD', 'FRUIT_TREES', 'OCEAN', 'PREDATOR', 'STRONG_WIND'];
                break;
                
            case 'vie':
                // Vie Heureuse - Hydro, mankarog, hot, insect, intelligent x2, sismique, windy, swamp, cold, cold, oxygen, forest, desert x2, volcan, forest, ruin
                sectors = ['LANDING', 'HYDROCARBON', 'MANKAROG', 'HOT', 'INSECT', 'INTELLIGENT', 'INTELLIGENT',
                          'SEISMIC_ACTIVITY', 'STRONG_WIND', 'SWAMP', 'COLD', 'COLD', 'OXYGEN', 'FOREST',
                          'DESERT', 'DESERT', 'VOLCANIC_ACTIVITY', 'FOREST', 'RUINS'];
                break;
                
            case 'loss':
                // Loss - 4 wind, 4 intelligent, 4 forest, 4 cold, 3 ocean, 1 crystal field
                sectors = ['LANDING', 'STRONG_WIND', 'STRONG_WIND', 'STRONG_WIND', 'STRONG_WIND',
                          'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT',
                          'FOREST', 'FOREST', 'FOREST', 'FOREST',
                          'COLD', 'COLD', 'COLD', 'COLD',
                          'OCEAN', 'OCEAN', 'OCEAN',
                          'CRISTAL_FIELD'];
                break;
                
            case 'nurgle':
                // Nurgle's throne - 4 insects, 4 forests, 4 swamps
                sectors = ['LANDING', 'INSECT', 'INSECT', 'INSECT', 'INSECT',
                          'FOREST', 'FOREST', 'FOREST', 'FOREST',
                          'SWAMP', 'SWAMP', 'SWAMP', 'SWAMP'];
                break;
                
            case 'cuts':
                // Thousands cuts - 4 mountains, 4 caves, 4 ruminants, 4 predators, 4 insects
                sectors = ['LANDING', 'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN',
                          'CAVE', 'CAVE', 'CAVE', 'CAVE',
                          'RUMINANT', 'RUMINANT', 'RUMINANT', 'RUMINANT',
                          'PREDATOR', 'PREDATOR', 'PREDATOR', 'PREDATOR',
                          'INSECT', 'INSECT', 'INSECT', 'INSECT'];
                break;
                
            case 'polyphemus':
                // Polyphemus - 4 seismic, 4 volcan, mankarog, crystal field, 15 lost
                sectors = ['LANDING', 'SEISMIC_ACTIVITY', 'SEISMIC_ACTIVITY', 'SEISMIC_ACTIVITY', 'SEISMIC_ACTIVITY',
                          'VOLCANIC_ACTIVITY', 'VOLCANIC_ACTIVITY', 'VOLCANIC_ACTIVITY', 'VOLCANIC_ACTIVITY',
						  'OCEAN', 'OCEAN', 'OCEAN', 'OCEAN',
                          'MANKAROG', 'RUMINANT', 'RUMINANT', 'CRISTAL_FIELD',
                          'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST', 'LOST',
                          'LOST', 'LOST', 'LOST', 'LOST', 'LOST'];
                break;
                
            case 'museum':
                // Museum - 4 caves, 4 wrecks, 4 ruins, 4 intelligent, 1 mankarog, 1 crystal field
                sectors = ['LANDING', 'CAVE', 'CAVE', 'CAVE', 'CAVE',
                          'WRECK', 'WRECK', 'WRECK', 'WRECK',
                          'RUINS', 'RUINS', 'RUINS', 'RUINS',
                          'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT', 'INTELLIGENT',
                          'MANKAROG', 'CRISTAL_FIELD'];
                break;
                
            case 'americas_dream':
                // America's Dream - 2 hydro, 4 wrecks, 4 caves, 4 mountains
                sectors = ['LANDING', 'HYDROCARBON', 'HYDROCARBON',
                          'WRECK', 'WRECK', 'WRECK', 'WRECK',
                          'CAVE', 'CAVE', 'CAVE', 'CAVE',
                          'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN', 'MOUNTAIN'];
                break;
        }

        // Add each sector to the selection
        sectors.forEach(sectorName => {
            this.sectorManager.addSector(sectorName);
        });

        // Update UI using the existing method that updates everything
        this.updateAllDisplays();
    }

    /**
     * Gets the sector click handler function for UI manager
     * @returns {Function} - The sector click handler
     */
    getSectorClickHandler() {
        return (sectorName) => this.handleAddSector(sectorName);
    }
}
